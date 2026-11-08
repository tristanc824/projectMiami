import { expect, test, type Page } from '@playwright/test';

async function mockPayments(page: Page, rejectSubmit = false) {
  let balance = 30;
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  await page.route('**/api/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path === '/api/balance') { await route.fulfill({ json: { balance } }); return; }
    if (path === '/api/history') { await route.fulfill({ json: { items: [] } }); return; }
    if (request.headers().authorization !== 'Bearer test-session-token') { await route.fulfill({ status: 401, json: { error: 'Sign in required.' } }); return; }
    const body = request.postDataJSON() as Record<string, unknown>;
    calls.push({ path, body });
    if (path === '/api/recipient') { await route.fulfill({ json: { phone: body.phone, address: 'recipient-wallet', invited: false } }); return; }
    if (path === '/api/transfer/prepare') { await route.fulfill({ json: { message: 'AQIDBA==', lastValidBlockHeight: 100 } }); return; }
    if (path === '/api/transfer/submit') {
      expect(body).toEqual({ message: 'AQIDBA==', signature: Buffer.alloc(64, 7).toString('base64'), lastValidBlockHeight: 100 });
      if (rejectSubmit) { await route.fulfill({ status: 503, json: { error: 'The test transfer service is unavailable. Please try again later.' } }); return; }
      balance -= Number(calls.find(call => call.path === '/api/transfer/prepare')!.body.amount);
      await route.fulfill({ json: { signature: 'mock-devnet-signature' } }); return;
    }
    await route.fulfill({ status: 404, json: { error: 'Unexpected test request.' } });
  });
  return calls;
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
  await expect(page.getByTestId('home-balance')).toHaveText('$30.00');
  await expect(page).toHaveURL(/\/app\/?$/);
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
  await expect(page.getByRole('heading', { name: 'On its way.', exact: true })).toBeVisible();
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
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('5');
  await expect(page.getByLabel('Payment note', { exact: true })).toHaveValue('Web request');
  await page.goto('/app/request');
  await page.getByLabel('Request amount', { exact: true }).fill('5');
  await expect(page.getByTestId('request-link')).toContainText('/app/pay?');
});
