import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import nacl from 'tweetnacl';
import { createHash } from 'node:crypto';
import { Keypair } from '@solana/web3.js';
import { signTicket } from '../lib/review-ticket.mjs';
import { HOLD_PROGRAM_ID, holdAddresses } from '../lib/hold.mjs';
const owner = Keypair.generate(), recipient = Keypair.generate().publicKey, payer = Keypair.generate(), mint = Keypair.generate().publicKey;
process.env.REVIEW_SIGNING_SECRET = 'isolated-test-signing-secret-32-characters';
let deployed = true, stored: any = null, sent = 0, simulationChecks: boolean[] = [];
const chainTime = Math.floor(Date.now() / 1000);
let genesis = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const conn = {
  getGenesisHash: async () => genesis,
  getAccountInfo: async (key: any) => key.equals(HOLD_PROGRAM_ID) ? deployed ? { executable: true } : null : stored,
  getLatestBlockhash: async () => ({ blockhash: Keypair.generate().publicKey.toBase58(), lastValidBlockHeight: 999 }),
  simulateTransaction: async (_tx: unknown, options: any) => { simulationChecks.push(options.sigVerify); return { value: { err: null } }; },
  sendTransaction: async () => { sent++; return 'local-test-signature'; },
  confirmTransaction: async () => ({ value: { err: null } }),
  getSlot: async () => 100,
  getBlockTime: async () => chainTime,
};
mock.module('../lib/server/solana.mjs', { namedExports: { connection: () => conn, feePayer: () => payer, USDC_MINT: mint, usdcBalance: async () => 100_000_000n } });
const { prepareSafeHold, submitSafeHold, holdAvailability } = await import('../lib/server/holds.ts');
const secret = process.env.REVIEW_SIGNING_SECRET;
const ticket = () => signTicket({ purpose: 'review', owner: owner.publicKey.toBase58(), recipient: recipient.toBase58(), amountCents: 500, held: true, reviewHash: 'ab'.repeat(32) }, secret);
function activeHold() {
  const { state, vault } = holdAddresses(owner.publicKey, owner.publicKey, recipient, mint);
  const data = Buffer.alloc(243); data[0] = 1;
  for (const [offset, value] of [[1, owner.publicKey], [33, owner.publicKey], [65, recipient], [97, mint], [129, vault]] as const) value.toBuffer().copy(data, offset);
  data.writeBigUInt64LE(5_000_000n, 161); createHash('sha256').update('123456').digest().copy(data, 170);
  data.writeBigInt64LE(BigInt(chainTime + 86400), 202); Buffer.from('ab'.repeat(32), 'hex').copy(data, 210); data[242] = 1;
  stored = { owner: HOLD_PROGRAM_ID, data };
  return state.toBase58();
}
test.beforeEach(() => { deployed = true; stored = null; sent = 0; simulationChecks = []; genesis = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'; });
test('deposit simulates first, then submits only the exact server-ticketed message signed by its owner', async () => {
  const prepared = await prepareSafeHold(owner.publicKey, { action: 'deposit', reviewTicket: ticket(), pin: '123456' });
  assert.equal(prepared.simulation, 'passed'); assert.deepEqual(simulationChecks, [false]); assert.equal(sent, 0);
  const signature = Buffer.from(nacl.sign.detached(Buffer.from(prepared.message, 'base64'), owner.secretKey)).toString('base64');
  const result = await submitSafeHold(owner.publicKey, { preparedTicket: prepared.preparedTicket, signature });
  assert.equal(result.action, 'deposit'); assert.equal(result.amountCents, 500); assert.equal(sent, 1); assert.deepEqual(simulationChecks, [false, true]);
});
test('forged receipts, wrong signatures, wrong users and undeployed programs cannot spend funds', async () => {
  await assert.rejects(prepareSafeHold(recipient, { action: 'deposit', reviewTicket: ticket(), pin: '123456' }), /new safety review/);
  await assert.rejects(prepareSafeHold(owner.publicKey, { action: 'deposit', reviewTicket: 'forged', pin: '123456' }));
  const prepared = await prepareSafeHold(owner.publicKey, { action: 'deposit', reviewTicket: ticket(), pin: '123456' });
  await assert.rejects(submitSafeHold(owner.publicKey, { preparedTicket: prepared.preparedTicket, signature: Buffer.alloc(64).toString('base64') }), /Invalid wallet signature/);
  deployed = false;
  await assert.rejects(prepareSafeHold(owner.publicKey, { action: 'deposit', reviewTicket: ticket(), pin: '123456' }), /not been deployed/);
  assert.equal(sent, 0);
});
test('other clusters are rejected', async () => { genesis = 'mainnet'; await assert.rejects(holdAvailability(), /devnet only/); });
test('normal release waits; early release needs explicit verification and the correct PIN', async () => {
  const state = activeHold();
  await assert.rejects(prepareSafeHold(owner.publicKey, { action: 'release', state, pin: '123456' }), /not finished/);
  await assert.rejects(prepareSafeHold(owner.publicKey, { action: 'release-early', state, pin: '123456' }), /trusted number/);
  await assert.rejects(prepareSafeHold(owner.publicKey, { action: 'release-early', state, pin: '999999', verified: true }), /does not match/);
  const prepared = await prepareSafeHold(owner.publicKey, { action: 'release-early', state, pin: '123456', verified: true });
  const signature = Buffer.from(nacl.sign.detached(Buffer.from(prepared.message, 'base64'), owner.secretKey)).toString('base64');
  const result = await submitSafeHold(owner.publicKey, { preparedTicket: prepared.preparedTicket, signature });
  assert.equal(result.action, 'release-early'); assert.equal(sent, 1);
});
test('normal release after the wait and cancellation are prepared for the sender only', async () => {
  const state = activeHold(); stored.data.writeBigInt64LE(BigInt(chainTime - 1), 202);
  await prepareSafeHold(owner.publicKey, { action: 'release', state, pin: '123456' });
  await prepareSafeHold(owner.publicKey, { action: 'refund', state });
  await assert.rejects(prepareSafeHold(recipient, { action: 'refund', state }), /Only the sender/);
  assert.equal(sent, 0);
});
