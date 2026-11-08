import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { depositAmount } from '../lib/funding.mjs';
let balance = 1_000_000n, creates: any[] = [], deliveries = 0, charges = 0, rpcFailure = false, intentStatus = 'requires_confirmation';
mock.module('../lib/server/paymentAuth.ts', { namedExports: { requirePaymentUser: async () => ({ id: 'user', wallet: { toBase58: () => 'wallet' } }) } });
mock.module('../lib/server/solana.mjs', { namedExports: { treasury: () => ({ publicKey: 'treasury' }), usdcBalance: async () => { if (rpcFailure) throw new Error('RPC unavailable'); return balance; } } });
mock.module('../lib/server/stripe.ts', { namedExports: {
  parseDeposit: (value: unknown) => depositAmount(value, 1000),
  stripe: () => ({ paymentIntents: { retrieve: async () => ({ id: 'intent', status: intentStatus }), create: async (body: unknown) => { creates.push(body); return { id: 'intent', status: 'requires_confirmation', client_secret: 'test-client-secret' }; }, confirm: async () => { charges++; return { id: 'intent', status: 'succeeded' }; } } }),
  fulfill: async () => { deliveries++; return 'signature'; },
} });
const testCard = (await import('../app/api/deposit/test-card/route.ts')).POST;
const intent = (await import('../app/api/deposit/intent/route.ts')).POST;
const request = (amount: unknown) => new Request('https://nest.test/api/deposit', { method: 'POST', body: JSON.stringify({ amount }) });
test('both deposit routes reject insufficient funding before confirming or charging any Stripe intent', async () => {
  for (const route of [testCard, intent]) {
    const result = await route(request(50));
    assert.equal(result.status, 503); assert.match((await result.json()).error, /No card payment was started/);
  }
  assert.equal(charges, 0); assert.equal(deliveries, 0);
});
test('funded 50 and 1000 dollar deposits use the exact amount, while over-cap and coerced amounts are rejected', async () => {
  balance = 2_000_000_000n;
  for (const amount of [50, 1000]) assert.equal((await testCard(request(amount))).status, 200);
  assert.deepEqual(creates.slice(1).map(item => item.amount), [5000, 100000]);
  for (const amount of [1001, true, 0, 1.5]) assert.equal((await testCard(request(amount))).status, 400);
  assert.equal(charges, 2); assert.equal(deliveries, 2);
});
test('RPC failures cannot start a payment or masquerade as a low balance', async () => {
  rpcFailure = true;
  const original = console.error; console.error = () => {};
  try { const result = await intent(request(10)); assert.equal(result.status, 500); assert.doesNotMatch((await result.json()).error, /funding is temporarily low/); }
  finally { console.error = original; }
  assert.equal(charges, 2);
});


test('replaying an already-paid intent bypasses low funding and cannot charge again', async () => {
  rpcFailure = true; intentStatus = 'succeeded';
  const chargedBefore = charges;
  const result = await testCard(request(50));
  assert.equal(result.status, 200); assert.equal(charges, chargedBefore);
});
