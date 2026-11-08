import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
let unlocked = false, ready = true, writes = 0;
const user: any = { id: 'owner', custom_metadata: { tp_on: true } };
const me = () => ({ id: user.id, profile: user });
mock.module('../lib/server/http.ts', { namedExports: {
  requireUser: async () => me(), route: (handler: any) => handler,
  json: (body: unknown) => Response.json(body), fail: (error: string, status = 400) => Response.json({ error }, { status }),
} });
mock.module('../lib/server/paymentAuth.ts', { namedExports: { requirePaymentUser: async () => unlocked ? me() : Response.json({ code: 'PIN_REQUIRED' }, { status: 401 }) } });
mock.module('../lib/server/textPayments.ts', { namedExports: { gatewayNumber: () => '+15555550199' } });
mock.module('../lib/server/signer.mjs', { namedExports: {
  signerConfig: () => ({ signerId: 'signer', policyId: 'policy' }), textPaymentsReady: () => ready,
  hashPin: () => 'salted-hash', setTextSettings: async (_user: unknown, changes: unknown) => { writes++; user.custom_metadata = { ...user.custom_metadata, ...changes as object }; },
} });
const { GET, POST } = await import('../app/api/text-payments/route.ts');
const req = (body: unknown) => new Request('https://nest.test/api/text-payments', { method: 'POST', body: JSON.stringify(body) });
test('granting text-payment access requires the app PIN and a ready persistent store; disabling remains possible while locked', async () => {
  assert.equal((await POST(req({ on: true, pin: '1234' }))).status, 401); assert.equal(writes, 0);
  assert.equal((await POST(req({ on: false }))).status, 200); assert.equal(user.custom_metadata.tp_on, false);
  unlocked = true; ready = false;
  assert.equal((await POST(req({ on: true, pin: '1234' }))).status, 503); assert.equal(writes, 1);
  user.custom_metadata.tp_on = true;
  const status = await (await GET(new Request('https://nest.test/api/text-payments'))).json();
  assert.equal(status.available, false); assert.equal(status.on, true);
  ready = true;
  assert.equal((await POST(req({ on: true, pin: '1234' }))).status, 200);
  assert.equal(user.custom_metadata.tp_pin, 'salted-hash');
});
