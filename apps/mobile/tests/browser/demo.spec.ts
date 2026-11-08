import { expect, test, type Page } from '@playwright/test';

async function addMoney(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill(amount);
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$0.00');
});

test('welcome screen opens the demo and remains accessible from account', async ({ page }) => {
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Open sign-in screen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Protect what matters.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sign-in is not connected');
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$0.00');
});

test('welcome fits small phones and uses the Nest photo identity without a globe', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Protect what matters.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await addMoney(page, '10000');
  await expect(page.getByTestId('home-balance')).toHaveText('$10,000.00');
  expect(await page.getByTestId('home-balance').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the iPhone Expo Go manifest targets SDK 58', async ({ request }) => {
  const response = await request.get('/', { headers: { 'Expo-Platform': 'ios', Accept: 'application/expo+json' } });
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.extra.expoClient.sdkVersion).toBe('58.0.0');
  expect(manifest.runtimeVersion).toBe('exposdk:58.0.0');
});

test('send, receipt, and persistent activity work together without a real transaction', async ({ page }) => {
  await addMoney(page, '100');
  await page.getByRole('button', { name: 'Send money', exact: true }).click();
  await page.getByLabel('Search name or phone number', { exact: true }).fill('3055550100');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('25.01');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByLabel('Recipient phone number', { exact: true }).fill('(305) 555-0100');
  await page.getByLabel('Payment note').fill('Browser demo check');
  await page.getByTestId('review-transfer').click();
  await expect(page.getByText('Total from demo balance')).toBeVisible();
  await page.getByTestId('confirm-transfer').click();
  await expect(page.getByText('Not sent', { exact: true })).toBeVisible();
  await expect(page.getByText('Not initiated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$74.99');
  await expect(page).toHaveURL('/');
  await page.reload();
  await expect(page.getByTestId('home-balance')).toHaveText('$74.99');
  await page.getByRole('button', { name: 'See all', exact: true }).click();
  await expect(page.getByRole('button', { name: '(305) 555-0100, sent $25.01, view receipt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sent', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Carlos Torres, received $75.00, view receipt', exact: true })).toHaveCount(0);
});

test('funding, family-goal contribution, filtering, and reset remain coherent', async ({ page }) => {
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$100.00');
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Your people', exact: true }).click();
  const buttons = page.getByRole('button', { name: 'Contribute', exact: true });
  await expect(buttons).toHaveCount(2);
  await buttons.nth(0).click();
  await page.getByLabel('Recipient phone number', { exact: true }).fill('3055550100');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$40.00');
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Your people', exact: true }).click();
  await expect(page.getByText('Goal reached', { exact: true })).toBeVisible();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$0.00');
});

test('appearance setting switches between light and dark and persists', async ({ page }) => {
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  const heading = page.getByRole('heading', { name: 'You', exact: true });
  await page.getByTestId('appearance-dark').click();
  await expect(heading).toHaveCSS('color', 'rgb(243, 240, 234)');
  await page.screenshot({ path: 'test-results/appearance-dark.png' });
  await page.reload();
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await expect(heading).toHaveCSS('color', 'rgb(243, 240, 234)');
  await page.getByTestId('appearance-light').click();
  await expect(heading).toHaveCSS('color', 'rgb(23, 32, 26)');
});


test('copied request links work in another browser and preserve amount and note', async ({ page, browser }) => {
  await page.getByRole('button', { name: 'Receive', exact: true }).click();
  await page.getByLabel('Request amount', { exact: true }).fill('25.01');
  await page.getByLabel('Your phone number', { exact: true }).fill('3055550100');
  const note = 'Books & supplies + a little love 🧡';
  await page.getByLabel('Request note', { exact: true }).fill(note);
  const url = (await page.getByTestId('request-link').innerText()).trim();
  expect(new URL(url).pathname).toBe('/pay');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy link', exact: true }).click();
  await expect(page.getByText('Request link copied.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  await page.screenshot({ path: 'test-results/request-link-iphone.png', fullPage: true });

  const sender = await browser.newContext();
  try {
    const payer = await sender.newPage();
    await payer.goto(url);
    await expect(payer.getByRole('heading', { name: 'A little something requested.', exact: true })).toBeVisible();
    await expect(payer.getByText(note, { exact: true })).toBeVisible();
    await payer.screenshot({ path: 'test-results/payment-request.png', fullPage: true });
    await payer.getByRole('button', { name: 'Continue to payment', exact: true }).click();
    await expect(payer.getByLabel('Amount in USDC', { exact: true })).toHaveValue('25.01');
    await expect(payer.getByLabel('Payment note', { exact: true })).toHaveValue(note);
    await expect(payer.getByLabel('Recipient phone number', { exact: true })).toHaveValue('+13055550100');
    await expect(payer.getByTestId('review-transfer')).toBeDisabled();
    await expect(payer.getByText('This is more than your available demo balance.', { exact: true })).toBeVisible();
    await payer.goto('/');
    await payer.getByRole('button', { name: 'Demo', exact: true }).click();
    await addMoney(payer, '100');
    await payer.goto(url);
    await payer.getByRole('button', { name: 'Continue to payment', exact: true }).click();
    await expect(payer.getByTestId('review-transfer')).toBeEnabled();
    await payer.getByTestId('review-transfer').click();
    await expect(payer.getByText('(305) 555-0100', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await payer.getByTestId('confirm-transfer').click();
    await payer.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(payer.getByTestId('home-balance')).toHaveText('$74.99');
    await payer.reload();
    await expect(payer.getByTestId('home-balance')).toHaveText('$74.99');
  } finally { await sender.close(); }
});

test('invalid request links cannot open a payment, and devnet requests require the app', async ({ page }) => {
  await page.goto('/pay?mode=demo&recipient=mama&amount=-10');
  await expect(page.getByText('Request unavailable', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toHaveCount(0);
  await page.goto('/pay?mode=devnet&recipient=%2B15555550142&amount=10&note=Test');
  await expect(page.getByRole('button', { name: 'Open in Nest', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toHaveCount(0);
});


test('phone entry rejects incomplete numbers and accepts international recipients', async ({ page }) => {
  await addMoney(page, '100');
  await expect(page.getByRole('button', { name: 'Send to Ernesto', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Send money', exact: true }).click();
  await page.getByLabel('Search name or phone number', { exact: true }).fill('3055550100');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByLabel('Amount in USDC', { exact: true }).fill('10');
  await page.getByLabel('Recipient phone number', { exact: true }).fill('555-0100');
  await expect(page.getByTestId('review-transfer')).toBeDisabled();
  await expect(page.getByText('Enter a full phone number.', { exact: true })).toBeVisible();
  await page.getByLabel('Recipient phone number', { exact: true }).fill('+44 20 7946 0958');
  await page.getByTestId('review-transfer').click();
  await expect(page.getByText('+442079460958', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await expect(page.getByLabel('Recipient phone number', { exact: true })).toHaveValue('+44 20 7946 0958');
  await page.getByLabel('Recipient phone number', { exact: true }).fill('3055550100');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await expect(page.getByText('To (305) 555-0100', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$90.00');
});


test('savings reserve available funds, survive reload, and can be released', async ({ page }) => {
  await addMoney(page, '100');
  await page.getByRole('tab', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Open Rainy day', exact: true }).click();
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Savings amount', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Set aside', exact: true }).click();
  await expect(page.getByTestId('goal-balance')).toHaveText('$60.00');
  await page.reload();
  await expect(page.getByTestId('goal-balance')).toHaveText('$60.00');
  await page.goto('/send?phone=%2B13055550100&amount=50');
  await expect(page.getByTestId('review-transfer')).toBeDisabled();
  await expect(page.getByText('This is more than your available demo balance.', { exact: true })).toBeVisible();
  await page.goto('/goal?id=rainy-day');
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await page.getByLabel('Savings amount', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Return to available balance', exact: true }).click();
  await expect(page.getByTestId('goal-balance')).toHaveText('$40.00');
  await page.goto('/send?phone=%2B13055550100&amount=50');
  await expect(page.getByTestId('review-transfer')).toBeEnabled();
  await page.goto('/');
  await expect(page.getByTestId('home-balance')).toHaveText('$100.00');
});

test('new goals and protection previews are usable and honestly labeled', async ({ page }) => {
  await page.getByRole('tab', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'New goal', exact: true }).last().click();
  await page.getByLabel('Goal name', { exact: true }).fill('A little adventure');
  await page.getByLabel('Goal target', { exact: true }).fill('500');
  await page.getByRole('button', { name: 'Create goal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open A little adventure', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Security', exact: true }).click();
  await page.getByRole('button', { name: '24-hour undo, Preview', exact: true }).click();
  await expect(page.getByText('The mockups include a 24-hour hold', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Security', exact: true })).toHaveAttribute('aria-selected', 'true');
});
