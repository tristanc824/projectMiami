// Adapter for Chad's deployed program format. Wallet signing retains the app's existing v0 messages.
import { createHash } from 'node:crypto';
import { PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY, TransactionInstruction, TransactionMessage } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';

export const HOLD_PROGRAM_ID = new PublicKey('5ZucuntpueZMRDBEs31gL3HrUpZ13NZRahu7T9rLWzv6');
export const HOLD_SECONDS = 86400;
const meta = (pubkey, isSigner = false, isWritable = false) => ({ pubkey, isSigner, isWritable });
export function holdAddresses(sender, approver, recipient, mint) {
  const [state] = PublicKey.findProgramAddressSync([Buffer.from('hold'), sender.toBuffer(), approver.toBuffer(), recipient.toBuffer(), mint.toBuffer()], HOLD_PROGRAM_ID);
  const [vault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), state.toBuffer()], HOLD_PROGRAM_ID);
  return { state, vault };
}
export function decodeHold(state, account, mint) {
  if (!account || !account.owner.equals(HOLD_PROGRAM_ID) || account.data.length !== 243 || account.data[0] !== 1) throw new Error('This is not an active Safe Hold.');
  const data = account.data;
  const key = offset => new PublicKey(data.subarray(offset, offset + 32));
  const sender = key(1), approver = key(33), recipient = key(65);
  if (!key(97).equals(mint)) throw new Error('Unexpected hold token.');
  const expected = holdAddresses(sender, approver, recipient, mint);
  if (!expected.state.equals(state) || !expected.vault.equals(key(129))) throw new Error('Invalid hold accounts.');
  const units = data.readBigUInt64LE(161);
  if (units === 0n || units % 10000n !== 0n || units > 100_000_000_000n || data[242] !== 1) throw new Error('Unsupported hold amount or format.');
  const releaseAfter = Number(data.readBigInt64LE(202));
  if (!Number.isSafeInteger(releaseAfter) || releaseAfter <= 0) throw new Error('Invalid hold release time.');
  return { state: state.toBase58(), vault: expected.vault.toBase58(), sender: sender.toBase58(), approver: approver.toBase58(), recipient: recipient.toBase58(), mint: mint.toBase58(), amountCents: Number(units / 10000n), releaseAfter, reviewHash: data.subarray(210, 242).toString('hex'), pinHash: data.subarray(170, 202).toString('hex') };
}
function pinBytes(pin) {
  if (typeof pin !== 'string' || !/^\d{6}$/.test(pin)) throw new Error('Choose a 6-digit release PIN.');
  return Buffer.from(pin, 'ascii');
}
export function buildHoldMessage({ action, feePayer, sender, approver, recipient, mint, amount, reviewHash, pin, blockhash }) {
  if (recipient.equals(approver)) throw new Error('The recipient must be different from the sender.');
  if (sender.equals(feePayer) || approver.equals(feePayer)) throw new Error('The fee payer cannot be a family signer.');
  const { state, vault } = holdAddresses(sender, approver, recipient, mint);
  const senderToken = getAssociatedTokenAddressSync(mint, sender);
  let keys, data;
  const instructions = [];
  if (action === 'deposit') {
    if (typeof amount !== 'bigint' || amount <= 0n || amount > 100_000_000_000n || amount % 10000n !== 0n) throw new Error('Invalid hold amount.');
    if (!/^[a-f0-9]{64}$/i.test(reviewHash ?? '') || /^0+$/.test(reviewHash)) throw new Error('A reviewed payment is required.');
    data = Buffer.alloc(81); data[0] = 0;
    data.writeBigUInt64LE(amount, 1);
    createHash('sha256').update(pinBytes(pin)).digest().copy(data, 9);
    data.writeBigUInt64LE(BigInt(HOLD_SECONDS), 41);
    Buffer.from(reviewHash, 'hex').copy(data, 49);
    keys = [meta(feePayer, true, true), meta(sender, true), meta(approver), meta(recipient), meta(mint), meta(senderToken, false, true), meta(vault, false, true), meta(state, false, true), meta(TOKEN_PROGRAM_ID), meta(SystemProgram.programId)];
  } else if (action === 'refund') {
    data = Buffer.from([1]);
    instructions.push(createAssociatedTokenAccountIdempotentInstruction(feePayer, senderToken, sender, mint));
    keys = [meta(feePayer, true, true), meta(sender, true, true), meta(state, false, true), meta(vault, false, true), meta(senderToken, false, true), meta(mint), meta(TOKEN_PROGRAM_ID)];
  } else if (action === 'release' || action === 'release-early') {
    if (action === 'release-early' && !sender.equals(approver)) throw new Error('Only self-approved holds can be released early.');
    data = Buffer.concat([Buffer.from([action === 'release-early' ? 3 : 2]), pinBytes(pin)]);
    const destination = getAssociatedTokenAddressSync(mint, recipient);
    instructions.push(createAssociatedTokenAccountIdempotentInstruction(feePayer, destination, recipient, mint));
    keys = [meta(feePayer, true, true), meta(sender, true, true), meta(approver, true), meta(state, false, true), meta(vault, false, true), meta(destination, false, true), meta(mint), meta(TOKEN_PROGRAM_ID), meta(SYSVAR_INSTRUCTIONS_PUBKEY)];
  } else throw new Error('Unknown hold action.');
  instructions.push(new TransactionInstruction({ programId: HOLD_PROGRAM_ID, keys, data }));
  return new TransactionMessage({ payerKey: feePayer, recentBlockhash: blockhash, instructions }).compileToV0Message();
}
