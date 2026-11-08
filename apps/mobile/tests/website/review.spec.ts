import { mockPin, createPin, approvePayment } from '../helpers/pin';
import { expect, test, type Page } from '@playwright/test';
test.skip(process.env.NEST_TEST_REVIEW !== 'true', 'Run NEST_TEST_REVIEW=true npm run test:website for the enabled review/hold build.');
const owner = '11111111111111111111111111111111';
const phone = '+13055550100';
const state = 'test-hold-state';
type Hold = { state: string; sender: string; approver: string; recipient: string; amountCents: number; releaseAfter: number; reviewHash: string };
async function setup(page: Page, mode: 'ok' | 'failed' | 'unavailable' = 'ok') {
  let balance = 30;
  let holds: Hold[] = [];
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let prepared: Record<string, unknown> = {};
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (path === '/api/balance') return route.fulfill({ json: { balance } });
    expect(req.headers().authorization).toBe('Bearer test-session-token');
    const body = req.method() === 'POST' ? req.postDataJSON() as Record<string, unknown> : {};
    calls.push({ path, body });
    if (path === '/api/activity') return route.fulfill({ json: { payments: [] } });
    if (path === '/api/text-payments') return route.fulfill({ json: { available: false, on: false } });
    if (path === '/api/recipient') return route.fulfill({ json: { phone, address: 'recipient-wallet', invited: false } });
    if (path === '/api/review') {
      expect(body.transcript).not.toContain(phone);
      expect(body.recipient).toBe('recipient-wallet');
      expect(body.case).toMatchObject({ recipient_in_contacts: false });
      if (mode === 'failed') return route.fulfill({ status: 502, json: { error: 'no-receipt', hold_policy: { required: true } } });
      return route.fulfill({ json: { offline: false, verdict: { decision: 'hold', sentence: 'This recipient is unfamiliar. Check who you are paying.' }, signals: [{ code: 'recipient_not_in_contacts', level: 'high', text: 'This number is not saved.' }], hold_policy: { required: true, hold_seconds: 86400, review_hash: 'ab'.repeat(32), reasons: ['watchdog:recipient_not_in_contacts'] }, reviewTicket: 'signed-review-ticket' } });
    }
    if (path === '/api/transfer/prepare') return route.fulfill({ json: { message: 'AQIDBA==', lastValidBlockHeight: 100 } });
    if (path === '/api/transfer/submit') { balance -= 5; return route.fulfill({ json: { signature: 'test-send-signature' } }); }
    if (path === '/api/holds' && req.method() === 'GET') return route.fulfill({ json: { available: mode !== 'unavailable', reason: mode === 'unavailable' ? 'The Safe Hold program has not been deployed to devnet yet.' : undefined, holds } });
    if (path === '/api/holds' && body.step === 'prepare') {
      if (mode === 'unavailable') return route.fulfill({ status: 400, json: { error: 'The Safe Hold program has not been deployed to devnet yet.' } });
      prepared = body;
      if (body.action === 'deposit') { expect(body.pin).toBe('123456'); expect(body.reviewTicket).toBe('signed-review-ticket'); }
      if (body.action === 'release-early') expect(body.verified).toBe(true);
      return route.fulfill({ json: { message: 'AQIDBA==', preparedTicket: 'signed-action-ticket', state, simulation: 'passed' } });
    }
    if (path === '/api/holds' && body.step === 'submit') {
      expect(body.preparedTicket).toBe('signed-action-ticket');
      expect(body).not.toHaveProperty('pin');
      if (prepared.action === 'deposit') { balance -= 5; holds = [{ state, sender: owner, approver: owner, recipient: 'recipient-wallet', amountCents: 500, releaseAfter: Math.floor(Date.now() / 1000) + 86400, reviewHash: 'ab'.repeat(32) }]; }
      else { if (prepared.action === 'refund') balance += 5; holds = []; }
      return route.fulfill({ json: { signature: 'test-hold-signature', state, amountCents: 500, action: prepared.action } });
    }
    return route.fulfill({ status: 404, json: { error: 'Unexpected test request.' } });
  });
  await mockPin(page);
  await page.goto('/app/sign-in');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Phone number', { exact: true }).fill('3055550123');
  await page.getByRole('button', { name: 'Text me a code', exact: true }).click();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await createPin(page);
  await expect(page.getByTestId('home-balance')).toHaveText('$30.00');
  return { calls, setHolds: (items: Hold[]) => { holds = items; } };
}
async function reviewUnknown(page: Page) {
  await page.goto(`/app/send?phone=${encodeURIComponent(phone)}&amount=5`);
  await page.getByTestId('review-transfer').click();
  await expect(page.getByTestId('family-check-held')).toBeVisible();
  await expect(page.getByTestId('confirm-transfer')).toHaveCount(0);
}
async function createHold(page: Page) {
  await reviewUnknown(page);
  await expect(page.getByTestId('confirm-safe-hold')).toBeDisabled();
  await page.getByLabel('Safe Hold release PIN', { exact: true }).fill('123456');
  await page.getByTestId('confirm-safe-hold').click();
  await approvePayment(page);
  await expect(page.getByText('$5.00 in Safe Hold', { exact: true })).toBeVisible();
}
for (const known of ['saved contact', 'previous recipient']) test(`${known} sends immediately without an AI review or hold`, async ({ page }) => {
  const { calls } = await setup(page);
  await page.evaluate(({ owner, phone, known }) => {
    if (known === 'saved contact') localStorage.setItem(`nest:contacts:v1:wallet:${owner}`, JSON.stringify([{ phone, name: 'Teammate' }]));
    else localStorage.setItem(`guard.live.${owner}.activity`, JSON.stringify([{ id: 'live-previous', kind: 'send', recipientPhone: phone, amountCents: 100, feeCents: 0, name: phone, note: 'Previous payment', createdAt: new Date().toISOString(), live: true }]));
  }, { owner, phone, known });
  await page.goto(`/app/send?phone=${encodeURIComponent(phone)}&amount=5`);
  await page.getByTestId('review-transfer').click();
  await expect(page.getByTestId('confirm-transfer')).toBeEnabled();
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/review' || call.path === '/api/holds')).toHaveLength(0);
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(1);
});
test('unknown recipient enters a self-approved hold, can cancel, and gets the exact funds back', async ({ page }) => {
  const { calls } = await setup(page);
  await createHold(page);
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(0);
  await page.getByRole('button', { name: 'Cancel and return money', exact: true }).click();
  await expect(page.getByText('This returns the held test dollars', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
  await approvePayment(page);
  await expect(page.getByText('Hold cancelled. The test dollars are back in your wallet.', { exact: true })).toBeVisible();
  await page.goto('/app');
  await expect(page.getByTestId('home-balance')).toHaveText('$30.00');
});
test('early release requires an explicit warning, the PIN, and a distinct override action', async ({ page }) => {
  const { calls } = await setup(page);
  await createHold(page);
  await page.getByRole('button', { name: 'Release early', exact: true }).click();
  await expect(page.getByText('Call or text the person using a trusted number', { exact: false })).toBeVisible();
  const release = page.getByRole('button', { name: 'I verified them — release early', exact: true });
  await expect(release).toBeDisabled();
  await page.getByLabel('Release PIN', { exact: true }).fill('123456');
  await release.click();
  await approvePayment(page);
  await expect(page.getByText('Hold released. The test dollars were sent to the recipient.', { exact: true })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/holds' && call.body.step === 'prepare').at(-1)?.body.action).toBe('release-early');
});
test('after the cooling-off period normal release is offered', async ({ page }) => {
  const { setHolds } = await setup(page);
  setHolds([{ state, sender: owner, approver: owner, recipient: 'recipient-wallet', amountCents: 500, releaseAfter: Math.floor(Date.now() / 1000) - 1, reviewHash: 'ab'.repeat(32) }]);
  await page.goto('/app/hold');
  await expect(page.getByRole('button', { name: 'Release payment', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Release early', exact: true })).toHaveCount(0);
});
test('review failures never approve, sign or move money', async ({ page }) => {
  const { calls } = await setup(page, 'failed');
  await page.goto(`/app/send?phone=${encodeURIComponent(phone)}&amount=5`);
  await page.getByTestId('review-transfer').click();
  await expect(page.getByRole('alert')).toContainText('could not seal');
  await expect(page.getByTestId('confirm-transfer')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Check again', exact: true })).toBeVisible();
  expect(calls.filter(call => call.path.startsWith('/api/transfer') || call.path === '/api/holds')).toHaveLength(0);
});
test('undeployed program is explained without pretending that a hold was created', async ({ page }) => {
  const { calls } = await setup(page, 'unavailable');
  await reviewUnknown(page);
  await page.getByLabel('Safe Hold release PIN', { exact: true }).fill('123456');
  await page.getByTestId('confirm-safe-hold').click();
  await approvePayment(page);
  await expect(page.getByRole('alert').filter({ hasText: 'not been deployed' })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/holds' && call.body.step === 'submit')).toHaveLength(0);
});


test('hold and early-release screens stay usable on a narrow phone', async ({ page }) => {
  const { setHolds } = await setup(page);
  setHolds([{ state, sender: owner, approver: owner, recipient: 'recipient-wallet', amountCents: 500, releaseAfter: Math.floor(Date.now() / 1000) + 86400, reviewHash: 'ab'.repeat(32) }]);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/app/hold');
  await expect(page.getByRole('button', { name: 'Release early', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/hold-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Release early', exact: true }).click();
  await page.getByLabel('Release PIN', { exact: true }).fill('123456');
  await expect(page.getByLabel('Release PIN', { exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: 'test-results/hold-release-warning.png', fullPage: true });
});
