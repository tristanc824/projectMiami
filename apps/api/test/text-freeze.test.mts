import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
let sends = 0, balanceReads = 0;
const metadata = { tp_on: true, tp_pin: 'test-hash', nest_frozen: true };
mock.module('../lib/server/http.ts', { namedExports: { allow: () => true } });
mock.module('../lib/server/privy.ts', { namedExports: { userByPhone: async () => ({ id: 'owner', custom_metadata: metadata }), createUserForPhone: async () => { throw new Error('Should not invite while frozen'); } } });
mock.module('../lib/server/signer.mjs', { namedExports: {
  checkPin: () => true, textPaymentsReady: () => true,
  embeddedSolanaWallet: () => ({ walletId: 'wallet', address: '11111111111111111111111111111111' }),
  setTextSettings: async () => {}, sendWithServerSigner: async () => { sends++; },
} });
mock.module('../lib/server/solana.mjs', { namedExports: { connection: () => { throw new Error('Frozen sends must not query transaction status'); }, usdcBalance: async () => { balanceReads++; return 10_000_000n; } } });
const { handleText } = await import('../lib/server/textPayments.ts');
test('Lock Nest stops SMS SEND before RPC, inviting recipients, counting spending or signing', async () => {
  const replies: string[] = [];
  await handleText('+13055550123', 'SEND 2 +13055550100 PIN 4821', async (_to, text) => { replies.push(text); });
  assert.equal(sends, 0); assert.equal(balanceReads, 0); assert.match(replies[0], /Nest is locked/);
  await handleText('+13055550123', 'BAL PIN 4821', async (_to, text) => { replies.push(text); });
  assert.equal(balanceReads, 1); assert.match(replies[1], /10.00/);
});
