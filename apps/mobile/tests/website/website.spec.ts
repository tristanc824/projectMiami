import { mockPin, createPin, approvePayment } from '../helpers/pin';
import { expect, test, type Page } from '@playwright/test';
test.skip(process.env.NEST_TEST_REVIEW === 'true', 'Ordinary transfers are tested with review disabled; review.spec.ts covers Safe Holds.');

async function mockPayments(page: Page, rejectSubmit = false) {
  let balance = 30;
  let loseNextSubmit = false, lostSubmit = false;
  let incoming: { signature: string; amountCents: number; createdAt: string }[] = [];
  let gate: Promise<void> | undefined;
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === '/api/balance') { await gate; await route.fulfill({ json: { balance } }); return; }
    if (request.headers().authorization !== 'Bearer test-session-token') { await route.fulfill({ status: 401, json: { error: 'Sign in required.' } }); return; }
    const body = request.postDataJSON() as Record<string, unknown>;
    calls.push({ path, body });
    if (path === '/api/activity') { await route.fulfill({ json: { payments: incoming } }); return; }
    if (path === '/api/deposit/test-card') { expect(request.headers()['x-nest-pin']).toMatch(/^test-pin-grant-/); balance += Number(body.amount); await route.fulfill({ json: { signature: `mock-deposit-${body.amount}` } }); return; }
    if (path === '/api/recipient') { await route.fulfill({ json: { phone: body.phone, address: 'recipient-wallet', invited: false } }); return; }
    if (path === '/api/transfer/prepare') { await route.fulfill({ json: { message: 'AQIDBA==', lastValidBlockHeight: 100 } }); return; }
    if (path === '/api/transfer/submit') {
      expect(body).toEqual({ message: 'AQIDBA==', signature: Buffer.alloc(64, 7).toString('base64'), lastValidBlockHeight: 100 });
      if (lostSubmit) { lostSubmit = false; await route.fulfill({ json: { signature: 'mock-devnet-signature' } }); return; }
      if (rejectSubmit) { await route.fulfill({ status: 503, json: { error: 'The test transfer service is unavailable. Please try again later.' } }); return; }
      balance -= Number(calls.filter(call => call.path === '/api/transfer/prepare').at(-1)!.body.amount);
      if (loseNextSubmit) { loseNextSubmit = false; lostSubmit = true; await route.abort('failed'); return; }
      await route.fulfill({ json: { signature: 'mock-devnet-signature' } }); return;
    }
    await route.fulfill({ status: 404, json: { error: 'Unexpected test request.' } });
  });
  await mockPin(page);
  return Object.assign(calls, {
    loseSubmitResponse: () => { loseNextSubmit = true; },
    receive: (dollars: number, signature = 'same-sender-and-recipient-signature') => { balance += dollars; incoming = [{ signature, amountCents: Math.round(dollars * 100), createdAt: new Date().toISOString() }, ...incoming]; },
    holdBalance: () => { let release!: () => void; gate = new Promise<void>(resolve => { release = resolve; }); return () => { gate = undefined; release(); }; },
  });
}
async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('link', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/app/sign-in');
  await expect(page.getByRole('button', { name: 'Demo', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Phone number', { exact: true }).fill('3055550123');
  await page.getByRole('button', { name: 'Text me a code', exact: true }).click();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await createPin(page);
  await expect(page.getByTestId('home-balance')).toHaveText('$30.00');
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByTestId('activity-loading')).toHaveCount(0);
}

test('website login sends through the authenticated browser wallet, records a receipt, and restores the account', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const calls = await mockPayments(page);
  await login(page);
  await page.getByRole('button', { name: 'Send money', exact: true }).click();
  await page.getByLabel('Search name or phone number', { exact: true }).fill('3055550100');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('7.35');
  await page.getByLabel('Payment note', { exact: true }).fill('Sent from the website');
  await page.getByTestId('review-transfer').click();
  expect(calls.filter(call => call.path.includes('/transfer/'))).toHaveLength(0);
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible();
  await expect(page.getByTestId('receipt-details').getByText('Sent from the website', { exact: true })).toBeVisible();
  expect(calls.find(call => call.path === '/api/transfer/prepare')?.body).toEqual({ recipient: 'recipient-wallet', amount: '7.35' });
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(1);
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.getByTestId('home-balance')).toHaveText('$22.65');
  await page.reload();
  await expect(page.getByTestId('home-balance')).toHaveText('$22.65');
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Protect what matters.', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('failed transfers stay on review and do not change the account balance', async ({ page }) => {
  const calls = await mockPayments(page, true);
  await login(page);
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('alert')).toContainText('test transfer service is unavailable');
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(1);
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await page.goto('/app');
  await expect(page.getByTestId('home-balance')).toHaveText('$30.00');
});

test('mobile website exposes login and protected routes cannot send before authentication', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Log in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await expect(page.getByRole('button', { name: 'Sign in to send', exact: true })).toBeVisible();
  await expect(page.getByTestId('confirm-transfer')).toHaveCount(0);
  await page.goto('/app');
  await expect(page).toHaveURL('/app/sign-in');
});

test('devnet payment links return to the browser payment flow after login', async ({ page }) => {
  await mockPayments(page);
  await page.goto('/app/pay?mode=devnet&recipient=%2B13055550100&amount=5&note=Web%20request');
  await page.getByRole('button', { name: 'Sign in to pay', exact: true }).click();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Phone number', { exact: true }).fill('3055550123');
  await page.getByRole('button', { name: 'Text me a code', exact: true }).click();
  await page.getByLabel('Verification code', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await createPin(page);
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('5');
  await expect(page.getByLabel('Payment note', { exact: true })).toHaveValue('Web request');
  await page.goto('/app/request');
  await page.getByLabel('Request amount', { exact: true }).fill('5');
  await expect(page.getByTestId('request-link')).toContainText('/app/pay?');
});


test('completed sends open a receipt without waiting for the balance service', async ({ page }) => {
  const calls = await mockPayments(page);
  await login(page);
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click();
  const release = calls.holdBalance();
  try {
    await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
    await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible({ timeout: 2000 });
    expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(1);
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(page.getByTestId('home-balance')).toHaveText('$25.00');
    await page.getByRole('button', { name: 'Send money', exact: true }).click();
    await page.getByLabel('Search name or phone number', { exact: true }).fill('3055550100');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByTestId('amount-input').fill('2');
    await page.getByTestId('review-transfer').click();
    await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
    await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible({ timeout: 2000 });
    expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(2);
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(page.getByTestId('home-balance')).toHaveText('$23.00');
  } finally { release(); }
  await expect(page.getByTestId('home-balance')).toHaveText('$23.00');
  await expect(page.getByText('Money just landed.', { exact: true })).toHaveCount(0);
});

test('new incoming dollars announce once, open their receipt, and never replay historical activity', async ({ page }) => {
  const calls = await mockPayments(page);
  await login(page);
  calls.receive(12.5);
  const signature = 'same-sender-and-recipient-signature';
  await expect(page.getByRole('button', { name: 'Received $12.50, view receipt', exact: true })).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('home-balance')).toHaveText('$42.50');
  await page.getByRole('button', { name: 'Received $12.50, view receipt', exact: true }).click();
  await expect(page.getByTestId('receipt-details').getByText('$12.50 test dollars', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View on Solana Explorer', exact: true })).toBeVisible();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy transaction ID', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Transaction ID copied', exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(signature);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('guard.live.11111111111111111111111111111111.activity')!));
  expect(stored.filter((item: { signature?: string }) => item.signature === signature)).toHaveLength(1);
  await page.reload();
  await expect(page.getByTestId('receipt-details')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy transaction ID', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View on Solana Explorer', exact: true })).toBeVisible();
  await expect(page.getByText('Money just landed.', { exact: true })).toHaveCount(0);
});

test('app PIN can change, lock, reject a wrong PIN, and unlock with the new PIN', async ({ page }) => {
  await mockPayments(page);
  await login(page);
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'App PIN', exact: true }).click();
  await page.getByLabel('Current app PIN', { exact: true }).fill('654321');
  await page.getByLabel('New app PIN', { exact: true }).fill('246810');
  await page.getByLabel('Confirm new app PIN', { exact: true }).fill('246811');
  await page.getByRole('button', { name: 'Save new PIN', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('do not match');
  await page.getByLabel('Confirm new app PIN', { exact: true }).fill('246810');
  await page.getByRole('button', { name: 'Save new PIN', exact: true }).click();
  await expect(page.getByText('Your app PIN was changed.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Lock Nest now', exact: true }).click();
  await approvePayment(page, '246810');
  await expect(page.getByRole('heading', { name: 'Unlock Nest', exact: true })).toBeVisible();
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('654321');
  await page.getByRole('button', { name: 'Unlock account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Wrong PIN');
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('246810');
  await page.getByRole('button', { name: 'Unlock account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unlock Nest', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Lock Nest now', exact: true })).toBeVisible();
});

test('50 and 1000 dollar deposits work and low supply blocks payment before Stripe starts', async ({ page }) => {
  const calls = await mockPayments(page);
  await login(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const amount of ['50', '1000']) {
    await page.goto('/app/money?mode=add');
    await page.getByTestId('amount-input').fill(amount);
    await page.getByRole('button', { name: 'Review details', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add money', exact: true })).toBeVisible();
    const heading = await page.getByRole('heading', { name: 'Add money', exact: true }).boundingBox();
    expect(heading!.y).toBeGreaterThanOrEqual(0);
    await page.getByRole('button', { name: 'Add money', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Back to home', exact: true })).toBeVisible();
  }
  const deposits = calls.filter(call => call.path === '/api/deposit/test-card');
  expect(deposits.map(call => call.body.amount)).toEqual([50, 1000]);
  await page.route('**/api/deposit/status', route => route.fulfill({ json: { maxDepositDollars: 1000, availableDollars: 1, fundingWallet: 'test-funding-wallet' } }));
  await page.goto('/app/money?mode=add');
  await page.getByTestId('amount-input').fill('10');
  await expect(page.getByRole('alert')).toContainText('Only $1');
  await expect(page.getByRole('button', { name: 'Review details', exact: true })).toBeDisabled();
  expect(calls.filter(call => call.path === '/api/deposit/test-card')).toHaveLength(2);
});

test('contact payment links copy the exact recipient, amount and note into a shareable URL', async ({ page }) => {
  await mockPayments(page);
  await login(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/app/contact?phone=%2B13055550100');
  await page.getByRole('button', { name: 'Create payment link', exact: true }).click();
  await page.getByLabel('Request amount', { exact: true }).fill('50');
  await page.getByLabel('Request note', { exact: true }).fill('Books & supplies 🧡');
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const url = new URL(link);
  expect(url.pathname).toBe('/app/pay');
  expect(url.searchParams.get('recipient')).toBe('+13055550100');
  expect(url.searchParams.get('amount')).toBe('50');
  expect(url.searchParams.get('note')).toBe('Books & supplies 🧡');
  await page.goto(link);
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('50');
  await expect(page.getByLabel('Payment note', { exact: true })).toHaveValue('Books & supplies 🧡');
});

test('a lost transfer response retries the same transaction and never pays twice', async ({ page }) => {
  const calls = await mockPayments(page);
  await login(page);
  calls.loseSubmitResponse();
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('alert')).toContainText('Could not reach');
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/transfer/prepare')).toHaveLength(1);
  const submissions = calls.filter(call => call.path === '/api/transfer/submit');
  expect(submissions).toHaveLength(2); expect(submissions[0].body).toEqual(submissions[1].body);
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$25.00');
  await expect(page.getByText('Sent by text message', { exact: true })).toHaveCount(0);
});

test('an expired server PIN session relocks and resumes payment after unlock', async ({ page }) => {
  const calls = await mockPayments(page);
  await login(page);
  let reject = true;
  await page.route('**/api/transfer/prepare', async route => {
    if (reject) { reject = false; return route.fulfill({ status: 401, json: { error: 'Unlock Nest with your app PIN.', code: 'PIN_REQUIRED' } }); }
    return route.fallback();
  });
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Unlock Nest', exact: true })).toBeVisible();
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('654321');
  await page.getByRole('button', { name: 'Unlock account', exact: true }).click();
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(1);
});

test('incomplete funding confirmations cannot display a successful top-up', async ({ page }) => {
  await mockPayments(page); await login(page);
  await page.route('**/api/deposit/test-card', route => route.fulfill({ json: {} }));
  await page.goto('/app/money?mode=add');
  await page.getByTestId('amount-input').fill('10');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('confirmation was incomplete');
  await expect(page).toHaveURL(/money/);
});

test('confirmed outside sends backfill their real receipt without being called SMS or incoming payments', async ({ page }) => {
  await mockPayments(page); await login(page);
  await page.route('**/api/activity', route => route.fulfill({ json: { payments: [], outgoing: [{ signature: 'outside-send-signature', amountCents: 300, createdAt: new Date().toISOString(), kind: 'send' }] } }));
  await page.goto('/app/activity');
  await expect(page.getByRole('button', { name: 'Another wallet, sent $3.00, view receipt', exact: true })).toBeVisible({ timeout: 8000 });
  await expect(page.getByText('Money just landed.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Another wallet, sent $3.00, view receipt', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy transaction ID', exact: true })).toBeVisible();
});

test('corrupted stored history recovers safely and sample family requests cannot spend live funds', async ({ page }) => {
  await mockPayments(page); await login(page);
  await page.evaluate(() => localStorage.setItem('guard.live.11111111111111111111111111111111.activity', JSON.stringify([{ id: 'live-corrupt', kind: 'send', amountCents: null }])));
  await page.goto('/app/activity');
  await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible();
  await page.goto('/app/family');
  for (const button of await page.getByRole('button', { name: 'Contribute', exact: true }).all()) await expect(button).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Send to Mamá', exact: true })).toBeDisabled();
});

test('payment approval rejects a wrong app PIN, cancels without signing, and permits a later retry', async ({ page }) => {
  const calls = await mockPayments(page); await login(page);
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('111111');
  await page.getByRole('button', { name: 'Approve with PIN', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Wrong PIN');
  expect(calls.filter(call => call.path.includes('/transfer/'))).toHaveLength(0);
  await page.getByRole('button', { name: 'Cancel approval', exact: true }).click();
  await expect(page.getByTestId('confirm-transfer')).toBeEnabled();
  expect(calls.filter(call => call.path.includes('/transfer/'))).toHaveLength(0);
  await page.getByTestId('confirm-transfer').click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(1);
});

test('Security removes safe word, saves a trusted contact honestly, and Lock Nest requires a valid PIN to resume', async ({ page }) => {
  const calls = await mockPayments(page); await login(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/app/security');
  await expect(page.getByText('Family safe word', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^Trusted contact,/ }).click();
  await page.getByLabel('Trusted contact name', { exact: true }).fill('Family');
  await page.getByLabel('Trusted contact phone', { exact: true }).fill('+13055550100');
  await page.getByRole('button', { name: 'Save trusted contact', exact: true }).click();
  await approvePayment(page);
  await expect(page.getByText('Contact saved. Account recovery still requires provider setup.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Trusted contact,/ }).click();
  await expect(page.getByRole('button', { name: 'Call contact', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Text contact', exact: true })).toBeVisible();
  await expect(page.getByText('Contact-only account recovery is not available yet. Saving someone here does not let them restore your wallet or sign in for you.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Lock Nest', exact: true }).click();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Unlock Nest', exact: true })).toBeVisible();
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('111111');
  await page.getByRole('button', { name: 'Unlock account', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Wrong PIN');
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(0);
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('654321');
  await page.getByRole('button', { name: 'Unlock account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Lock Nest', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results-website/security-controls.png', fullPage: true });
});

for (const resolution of ['confirmed', 'failed', 'expired'] as const) test(`pending sends survive reload without false success or duplicate payment, then resolve as ${resolution}`, async ({ page }) => {
  const calls = await mockPayments(page); await login(page);
  let state: 'pending' | typeof resolution = 'pending', submits = 0;
  const signature = 'pending-transfer-original-reference';
  await page.route('**/api/transfer/submit', async route => { submits++; await route.fulfill({ status: 202, json: { status: 'pending', signature, lastValidBlockHeight: 100 } }); });
  await page.route('**/api/transactions/status', async route => {
    expect(route.request().postDataJSON().transactions).toEqual([{ signature, kind: 'send', amountCents: 500, lastValidBlockHeight: 100 }]);
    await route.fulfill({ json: { transactions: [{ signature, status: state, ...(state === 'confirmed' ? { amountCents: 500, createdAt: '2026-11-08T09:00:00Z' } : {}) }] } });
  });
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click(); await page.getByTestId('confirm-transfer').click(); await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Payment pending.', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Send again', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'View on Solana Explorer', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Payment pending.', exact: true })).toBeVisible();
  await page.goto('/app/send?phone=%2B13055550100&amount=5');
  await page.getByTestId('review-transfer').click(); await page.getByTestId('confirm-transfer').click();
  await expect(page.getByRole('alert')).toContainText('previous payment is still pending');
  expect(submits).toBe(1);
  expect(calls.filter(call => call.path === '/api/transfer/prepare')).toHaveLength(1);
  await page.getByRole('button', { name: 'Check Activity', exact: true }).click();
  await page.getByRole('button', { name: /pending.*view receipt/i }).click();
  state = resolution;
  await expect(page.getByRole('heading', { name: 'Payment pending.', exact: true })).toHaveCount(0, { timeout: 12_000 });
  if (resolution !== 'confirmed') await expect(page.getByRole('heading', { name: `Payment ${resolution}.`, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send again', exact: true })).toBeVisible();
  expect(submits).toBe(1);
});

 test('returning with an expired approval grant does not lock browsing but the next send still asks for approval', async ({ page }) => {
  const calls = await mockPayments(page); await login(page);
  await page.evaluate(() => { for (const key of Object.keys(sessionStorage)) if (key.startsWith('nest.app-pin.')) sessionStorage.removeItem(key); });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock Nest', exact: true })).toHaveCount(0);
  await page.goto('/app/send?phone=%2B13055550100&amount=1');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await expect(page.getByRole('heading', { name: 'Approve payment', exact: true })).toBeVisible();
  expect(calls.filter(call => call.path === '/api/transfer/submit')).toHaveLength(0);
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Money sent.', exact: true })).toBeVisible();
});
test('changing your account profile requires approval before saving', async ({ page }) => {
  await mockPayments(page); await login(page);
  await page.goto('/app/account');
  await page.getByRole('button', { name: 'Edit display name', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Approved name');
  await page.getByRole('button', { name: 'Save display name', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Approve payment', exact: true })).toBeVisible();
  await approvePayment(page);
  await expect(page.getByRole('heading', { name: 'Approved name', exact: true })).toBeVisible();
});
