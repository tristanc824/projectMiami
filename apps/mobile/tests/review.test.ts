import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const facts = { amountCents: 5000, requestedCents: 5000, contributedCents: 0, recipientInContacts: false, priorTransfers: 0, note: 'school supplies', recipientAddress: 'recipient-wallet', session: 'draft-test-123' };
const response = { offline: false, verdict: { decision: 'hold', sentence: 'Check this unfamiliar recipient.' }, hold_policy: { required: true, reasons: ['unknown_recipient'] }, reviewTicket: 'server-signed-ticket', signals: [{ code: 'low', level: 'low', text: 'First payment' }, { code: 'high', level: 'high', text: 'Unknown recipient' }] };
test('review authenticates, keeps identity out of the model transcript and sorts high signals first', async () => {
  process.env.EXPO_PUBLIC_DAT_API_URL = 'same-origin';
  const { reviewTransfer } = await import('../src/services/review');
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal((options?.headers as Record<string, string>).authorization, 'Bearer test-token');
    assert.equal(body.recipient, facts.recipientAddress);
    assert.equal(body.amountCents, 5000);
    assert.equal(body.case.amount_usdc, '50');
    assert.equal(body.transcript, 'Send 50 dollars. It is for school supplies.');
    return Response.json(response);
  };
  const result = await reviewTransfer(facts, true, async () => 'test-token');
  assert.equal(result.held, true); assert.equal(result.signals[0].level, 'high'); assert.equal(result.reviewTicket, 'server-signed-ticket');
});
test('offline, malformed, failed and unsigned review results never approve', async () => {
  const { reviewTransfer } = await import('../src/services/review');
  for (const change of [{ offline: true }, { verdict: { decision: 'approve' } }, { reviewTicket: undefined }, { error: 'no-receipt' }]) {
    globalThis.fetch = async () => Response.json({ ...response, ...change });
    await assert.rejects(reviewTransfer(facts, true, async () => 'test-token'));
  }
  await assert.rejects(reviewTransfer(facts, true, async () => null), /Sign in/);
});
test('invalid provider JSON and network failure fail closed', async () => {
  const { reviewTransfer } = await import('../src/services/review');
  globalThis.fetch = async () => new Response('<html>gateway failure</html>', { status: 502 });
  await assert.rejects(reviewTransfer(facts, true, async () => 'test-token'));
  globalThis.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(reviewTransfer(facts, true, async () => 'test-token'), /Nothing was sent/);
});
test('voice review preserves the spoken warning context and binds the actual draft amount', async () => {
  const { reviewTransfer } = await import('../src/services/review');
  const transcript = 'Send fifty dollars. They said it is urgent and told me not to call.';
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    assert.equal(body.transcript, transcript);
    assert.equal(body.amountCents, 5000);
    assert.equal(body.case.amount_usdc, '50');
    return Response.json(response);
  };
  const result = await reviewTransfer({ ...facts, transcript }, true, async () => 'test-token');
  assert.equal(result.held, true);
});
