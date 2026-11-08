import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
let metadata: Record<string, unknown> = {}, authenticated = true;
const me = () => ({ id: 'owner', wallet: { toBase58: () => 'wallet' }, profile: { id: 'owner', custom_metadata: metadata } });
mock.module('../lib/server/http.ts', { namedExports: {
  allow: () => true, json: (body: unknown, status = 200) => Response.json(body, { status }),
  fail: (error: string, status = 400) => Response.json({ error }, { status }),
  requireUser: async () => me(), route: (handler: any) => handler,
} });
mock.module('../lib/server/paymentAuth.ts', { namedExports: { requirePinUser: async () => authenticated ? me() : Response.json({ code: 'PIN_REQUIRED' }, { status: 401 }) } });
mock.module('../lib/server/signer.mjs', { namedExports: { setTextSettings: async (_user: unknown, changes: Record<string, unknown>) => { metadata = { ...metadata, ...changes }; return metadata; } } });
mock.module('../lib/server/privy.ts', { namedExports: { userByPhone: async (phone: string) => phone === '+13055550100' ? { id: 'contact' } : phone === '+13055550123' ? { id: 'owner' } : null } });
const { GET, POST } = await import('../app/api/account/security/route.ts');
const req = (body: unknown) => new Request('https://nest.test/api/account/security', { method: 'POST', body: JSON.stringify(body) });
test('freeze persists across reads, blocks unauthenticated unfreeze, and unlock resumes payments', async () => {
  const locked = await POST(req({ action: 'freeze' }));
  assert.equal(locked.status, 200);
  const { unlockToken } = await locked.json();
  assert.equal((await (await GET(req({}))).json()).frozen, true);
  authenticated = false;
  assert.equal((await POST(req({ action: 'unfreeze' }))).status, 401);
  assert.equal(metadata.nest_frozen, true);
  authenticated = true;
  for (const token of [undefined, 'bad', 'ab'.repeat(32)]) assert.equal((await POST(req({ action: 'unfreeze', unlockToken: token }))).status, 403);
  assert.equal((await (await POST(req({ action: 'freeze' }))).json()).unlockToken, undefined);
  assert.equal((await POST(req({ action: 'trusted-contact', phone: '+13055550100', name: 'Family' }))).status, 423);
  assert.equal((await POST(req({ action: 'unfreeze', unlockToken }))).status, 200);
  assert.equal(metadata.nest_frozen, false);
  assert.equal(metadata.nest_unlock_hash, '');
});
test('trusted contacts must be another existing Nest account; recovery is never falsely advertised', async () => {
  for (const phone of ['bad', '+13055550123', '+13055550999']) assert.equal((await POST(req({ action: 'trusted-contact', phone, name: 'Family' }))).status, 400);
  const saved = await POST(req({ action: 'trusted-contact', phone: '+13055550100', name: 'Family' }));
  assert.equal(saved.status, 200); assert.equal(metadata.nest_trusted_id, 'contact');
  const status = await (await GET(req({}))).json();
  assert.deepEqual(status.trustedContact, { phone: '+13055550100', name: 'Family' });
  assert.equal(status.recoveryAvailable, false);
  await POST(req({ action: 'remove-trusted-contact' }));
  assert.equal((await (await GET(req({}))).json()).trustedContact, null);
});
