import { createHash } from 'node:crypto';
import nacl from 'tweetnacl';
import { PublicKey, VersionedMessage, VersionedTransaction } from '@solana/web3.js';
import { buildHoldMessage, decodeHold, holdAddresses, HOLD_PROGRAM_ID } from '../hold.mjs';
import { signTicket, verifyTicket } from '../review-ticket.mjs';
import { connection, feePayer, USDC_MINT, usdcBalance } from './solana.mjs';

export const reviewSecret = () => process.env.REVIEW_SIGNING_SECRET || process.env.PRIVY_APP_SECRET || '';
const devnetGenesis = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export async function holdAvailability() {
  if ((await connection().getGenesisHash()) !== devnetGenesis) throw new Error('Safe Holds are available on Solana devnet only.');
  const info = await connection().getAccountInfo(HOLD_PROGRAM_ID);
  if (!info?.executable) return { available: false, reason: 'The Safe Hold program has not been deployed to devnet yet.' };
  return { available: true };
}
export async function readSafeHold(state: string) {
  const address = new PublicKey(state);
  const info = await connection().getAccountInfo(address);
  if (!info) throw new Error('This hold is no longer active. Refresh to see the latest state.');
  return decodeHold(address, info, USDC_MINT);
}
export async function listSafeHolds(owner: PublicKey) {
  const groups = await Promise.all([1, 33, 65].map(offset => connection().getProgramAccounts(HOLD_PROGRAM_ID, { filters: [{ dataSize: 243 }, { memcmp: { offset, bytes: owner.toBase58() } }] })));
  const holds = new Map();
  for (const group of groups) for (const account of group) {
    try { const hold = decodeHold(account.pubkey, account.account, USDC_MINT); holds.set(hold.state, hold); } catch { /* Ignore other token mints and unsupported program versions. */ }
  }
  return [...holds.values()];
}
const pub = (value: string) => new PublicKey(value);
export async function prepareSafeHold(owner: PublicKey, body: Record<string, unknown>) {
  const availability = await holdAvailability();
  if (!availability.available) throw new Error(availability.reason);
  const action = body.action;
  if (!['deposit', 'refund', 'release', 'release-early'].includes(String(action))) throw new Error('Choose a valid hold action.');
  let sender: PublicKey, approver: PublicKey, recipient: PublicKey, amount: bigint | undefined, reviewHash: string | undefined;
  let state: string;
  let amountCents: number;
  if (action === 'deposit') {
    const review = verifyTicket(body.reviewTicket, reviewSecret(), 'review');
    if (review.owner !== owner.toBase58() || !review.held || !/^[0-9a-f]{64}$/i.test(review.reviewHash ?? '')) throw new Error('This payment needs a new safety review.');
    if (!Number.isSafeInteger(review.amountCents) || review.amountCents <= 0 || review.amountCents > 10_000_000) throw new Error('Invalid reviewed amount.');
    sender = owner; approver = owner; recipient = pub(review.recipient);
    amountCents = review.amountCents; amount = BigInt(amountCents) * 10000n; reviewHash = review.reviewHash;
    if (await usdcBalance(owner) < amount) throw new Error('You do not have enough available test dollars.');
  } else {
    const hold = await readSafeHold(String(body.state ?? ''));
    if (hold.sender !== owner.toBase58()) throw new Error('Only the sender can start this action.');
    sender = pub(hold.sender); approver = pub(hold.approver); recipient = pub(hold.recipient); amountCents = hold.amountCents;
    if (action === 'release' || action === 'release-early') {
      const now = await connection().getBlockTime(await connection().getSlot('confirmed'));
      if (now === null || action === 'release' && now < hold.releaseAfter) throw new Error('The 24-hour cooling-off period has not finished.');
      if (action === 'release-early' && (hold.approver !== hold.sender || body.verified !== true)) throw new Error('Confirm that you checked the recipient using a trusted number.');
      if (typeof body.pin !== 'string' || createHash('sha256').update(body.pin).digest('hex') !== hold.pinHash) throw new Error('That release PIN does not match.');
    }
  }
  const payer = feePayer();
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash('confirmed');
  const message = buildHoldMessage({ action, feePayer: payer.publicKey, sender, approver, recipient, mint: USDC_MINT, amount, reviewHash, pin: body.pin, blockhash });
  state = holdAddresses(sender, approver, recipient, USDC_MINT).state.toBase58();
  if (action === 'deposit' && await connection().getAccountInfo(pub(state))) throw new Error('A hold is already open for this recipient and approver. Manage it from Safe Holds.');
  const simulation = await connection().simulateTransaction(new VersionedTransaction(message), { sigVerify: false, commitment: 'confirmed' });
  if (simulation.value.err) throw new Error('The hold could not be prepared. No funds moved. Check the balance and hold status.');
  const encoded = Buffer.from(message.serialize()).toString('base64');
  const preparedTicket = signTicket({ purpose: 'hold-action', action, state, sender: sender.toBase58(), approver: approver.toBase58(), recipient: recipient.toBase58(), amountCents, message: encoded, lastValidBlockHeight }, reviewSecret(), 90);
  return { message: encoded, preparedTicket, state, amountCents, simulation: 'passed', expiresInSeconds: 90 };
}
function signature(value: unknown, message: Uint8Array, signer: PublicKey) {
  if (typeof value !== 'string') throw new Error('A wallet signature is required.');
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length !== 64 || !nacl.sign.detached.verify(message, bytes, signer.toBytes())) throw new Error('Invalid wallet signature.');
  return bytes;
}
export async function submitSafeHold(owner: PublicKey, body: Record<string, unknown>) {
  const prepared = verifyTicket(body.preparedTicket, reviewSecret(), 'hold-action');
  if (!['deposit', 'refund', 'release', 'release-early'].includes(prepared.action)) throw new Error('Invalid hold action.');
  const required = prepared.sender;
  if (owner.toBase58() !== required) throw new Error('This action needs the correct family wallet.');
  const availability = await holdAvailability();
  if (!availability.available) throw new Error(availability.reason);
  const bytes = Buffer.from(prepared.message, 'base64');
  const message = VersionedMessage.deserialize(bytes);
  const payer = feePayer();
  if (!message.staticAccountKeys[0].equals(payer.publicKey)) throw new Error('The fee payer changed. Prepare this action again.');
  const tx = new VersionedTransaction(message);
  tx.addSignature(owner, signature(body.signature, bytes, owner));
  if (prepared.approver !== prepared.sender) throw new Error('This app manages sender-approved holds only.');
  tx.sign([payer]);
  const result = await connection().simulateTransaction(tx, { sigVerify: true, commitment: 'confirmed' });
  if (result.value.err) throw new Error('The hold action is no longer valid. Refresh and try again. No new funds moved.');
  const signatureId = await connection().sendTransaction(tx, { skipPreflight: false, maxRetries: 2 });
  const confirmed = await connection().confirmTransaction({ signature: signatureId, blockhash: message.recentBlockhash, lastValidBlockHeight: prepared.lastValidBlockHeight }, 'confirmed');
  if (confirmed.value.err) throw new Error('The hold action failed on devnet. Refresh its status.');
  return { signature: signatureId, state: prepared.state, amountCents: prepared.amountCents, action: prepared.action };
}
