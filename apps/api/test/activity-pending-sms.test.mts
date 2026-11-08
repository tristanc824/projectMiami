import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

const owner = Keypair.generate().publicKey, mint = Keypair.generate().publicKey, ata = getAssociatedTokenAddressSync(mint, owner).toBase58();
const signature = 'original-sms-signature';
let checkpoint: any = { transaction: 'signed', signature, blockhash: 'blockhash', lastValidBlockHeight: 100, status: 'pending', id: 'a'.repeat(32), phone: '+13055550100', recipient: 'recipient', amount: 5000000n };
let confirmed = false, writes = 0;
const balance = (amount: string) => ({ accountIndex: 0, mint: mint.toBase58(), owner: owner.toBase58(), uiTokenAmount: { amount, decimals: 6 } });
mock.module('../lib/server/http.ts', { namedExports: { requireUser: async () => ({ id: 'owner', wallet: owner, profile: { id: 'owner', custom_metadata: {} } }), route: (handler: any) => handler, json: (body: unknown) => Response.json(body) } });
mock.module('../lib/incoming.mjs', { namedExports: { createIncomingReader: () => async () => [], incomingPayment: (tx: any, options: any) => {
  if (!tx || options.owner !== owner.toBase58()) return null;
  return { signature, amountCents: 500, createdAt: '2026-11-08T09:00:00Z' };
}, outgoingPayment: (tx: any, options: any) => {
  if (!tx || options.owner !== owner.toBase58()) return null;
  return { signature, amountCents: 500, createdAt: '2026-11-08T09:00:00Z' };
} } });
mock.module('../lib/server/solana.mjs', { namedExports: { USDC_MINT: mint, connection: () => ({
  getSignatureStatuses: async () => ({ value: [confirmed ? { err: null, confirmationStatus: 'confirmed' } : null] }),
  getBlockHeight: async () => 90,
  getParsedTransactions: async () => [{ blockTime: 1794120000, transaction: { signatures: [signature], message: { accountKeys: [{ pubkey: ata }] } }, meta: { err: null, preTokenBalances: [balance('10000000')], postTokenBalances: [balance('5000000')] } }],
}) } });
mock.module('../lib/server/textStore.mjs', { namedExports: { activeTextPayment: () => checkpoint, smsStore: () => ({ finish: () => { writes++; checkpoint = null; } }) } });
const { GET } = await import('../app/api/activity/route.ts');
test('a pending SMS appears in app activity with its exact proof, then reconciles and clears only its own durable checkpoint', async () => {
  const first = await (await GET(new Request('https://nest.test/api/activity'))).json();
  assert.equal(first.pendingPayments.length, 1); assert.equal(first.pendingPayments[0].signature, signature);
  assert.equal(first.pendingPayments[0].recipientPhone, '+13055550100'); assert.equal(writes, 0);
  confirmed = true;
  const second = await (await GET(new Request('https://nest.test/api/activity'))).json();
  assert.equal(second.pendingPayments.length, 0); assert.equal(second.outgoing[0].signature, signature);
  assert.equal(checkpoint, null); assert.equal(writes, 1);
});
