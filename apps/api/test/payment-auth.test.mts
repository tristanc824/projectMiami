import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';

import { signTicket } from '../lib/review-ticket.mjs';
process.env.REVIEW_SIGNING_SECRET = 'isolated-payment-auth-test-secret-32';
const wallet = Keypair.generate().publicKey;
let profile: any = { custom_metadata: { nest_pin_hash: 'salted-hash', nest_pin_version: 'v2' } };
mock.module('../lib/server/http.ts', { namedExports: {
  json: (body: unknown, status = 200) => Response.json(body, { status }),
  requireUser: async () => ({ id: 'user', wallet, profile }),
} });
let smsStatus: any = null, smsHeight = 90, smsPending: any = null;
mock.module('../lib/server/textStore.mjs', { namedExports: { activeTextPayment: () => smsPending } });
mock.module('../lib/server/solana.mjs', { namedExports: { connection: () => ({ getSignatureStatuses: async () => ({ value: [smsStatus] }), getBlockHeight: async () => smsHeight }), feePayer: () => ({ publicKey: wallet }), USDC_MINT: wallet, usdcBalance: async () => 0n } });
const { requirePaymentUser, requirePinUser } = await import('../lib/server/paymentAuth.ts');
const grant = (changes = {}, lifetime = 600) => signTicket({ purpose: 'app-pin', owner: wallet.toBase58(), version: 'v2', ...changes }, process.env.REVIEW_SIGNING_SECRET, lifetime);
const request = (ticket?: string) => new Request('https://nest.test/api/transfer/prepare', { headers: ticket ? { 'x-nest-pin': ticket } : {} });
test('money-changing API auth rejects missing, forged, expired, wrong-purpose, wrong-wallet and old-version PIN grants', async () => {
  for (const ticket of [undefined, 'forged', grant({ purpose: 'review' }), grant({ owner: Keypair.generate().publicKey.toBase58() }), grant({ version: 'v1' }), grant({}, -1)]) {
    const result = await requirePaymentUser(request(ticket));
    assert.ok(result instanceof Response); assert.equal(result.status, 401);
    assert.equal((await result.json()).code, 'PIN_REQUIRED');
  }
  const authenticated = await requirePaymentUser(request(grant()));
  assert.ok(!(authenticated instanceof Response));
  profile = { custom_metadata: {} };
  const result = await requirePaymentUser(request(grant()));
  assert.ok(result instanceof Response); assert.equal(result.status, 401);
});
test('pending SMS prevents an app transfer until the same transaction is confirmed or expired', async () => {
  profile = { custom_metadata: { nest_pin_hash: 'salted-hash', nest_pin_version: 'v2' } };
  smsPending = { status: 'pending', signature: 'sms-signature', lastValidBlockHeight: 100 };
  smsStatus = null; smsHeight = 90;
  {
    const pending = await requirePaymentUser(request(grant()));
    assert.ok(pending instanceof Response); assert.equal(pending.status, 409); assert.equal((await pending.json()).code, 'PAYMENT_PENDING');
    smsStatus = { err: null, confirmationStatus: 'confirmed' };
    assert.ok(!(await requirePaymentUser(request(grant())) instanceof Response));
    smsStatus = null; smsHeight = 101;
    assert.ok(!(await requirePaymentUser(request(grant())) instanceof Response));
  }
});
test('a frozen account cannot move money even with a valid grant, while security unlock remains accessible', async () => {
  smsPending = null;
  profile = { custom_metadata: { nest_pin_hash: 'salted-hash', nest_pin_version: 'v2', nest_frozen: true } };
  const frozen = await requirePaymentUser(request(grant()));
  assert.ok(frozen instanceof Response); assert.equal(frozen.status, 423);
  assert.equal((await frozen.json()).code, 'NEST_LOCKED');
  assert.ok(!(await requirePinUser(request(grant())) instanceof Response));
  profile.custom_metadata.nest_frozen = false;
  assert.ok(!(await requirePaymentUser(request(grant())) instanceof Response));
});
