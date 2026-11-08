import { expect, test, type Page } from '@playwright/test';

async function fund(page: Page, amount = '100') {
  await page.goto('/money?mode=add');
  await page.getByLabel('Amount in USDC', { exact: true }).fill(amount);
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
}
async function doubleTapConfirmation(page: Page) {
  await expect(page.getByRole('dialog', { name: 'Confirm Apple Cash demo', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Double-tap to confirm demo withdrawal', exact: true }).dblclick();
}
async function send(page: Page, phone = '+13055550100', amount = '10') {
  await page.goto(`/send?phone=${encodeURIComponent(phone)}`);
  await page.getByLabel('Amount in USDC', { exact: true }).fill(amount);
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await expect(page.getByText('Not sent', { exact: true })).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$0.00');
});

test('Apple Cash and bank withdrawals both record accurate demo destinations and fees', async ({ page }) => {
  await fund(page);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [destination, balance] of [['Apple Cash', '$79.50'], ['Bank account', '$59.00']]) {
    await page.goto('/money?mode=withdraw');
    await page.getByRole('radio', { name: `Withdraw to ${destination}`, exact: true }).click();
    await page.getByLabel('Amount in USDC', { exact: true }).fill('20');
    await page.getByLabel('Amount in USDC', { exact: true }).blur();
    await page.getByRole('heading', { name: 'Withdraw', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/withdraw-${destination.replace(' ', '-')}.png`, fullPage: true });
    await expect(page.getByRole('button', { name: 'Digit 0', exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole('button', { name: 'Review details', exact: true }).click();
    await expect(page.getByText('Not connected · preview only', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
    if (destination === 'Apple Cash') {
      await doubleTapConfirmation(page);
      await expect(page.getByRole('dialog', { name: 'Apple Cash demo animation' })).toBeVisible();
      await page.getByRole('button', { name: 'View demo receipt', exact: true }).click();
    }
    await expect(page.getByTestId('receipt-details').getByText(destination, { exact: true })).toBeVisible();
    await expect(page.getByText('Not initiated', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Back to home', exact: true }).click();
    await expect(page.getByTestId('home-balance')).toHaveText(balance);
  }
  await page.reload();
  await expect(page.getByTestId('home-balance')).toHaveText('$59.00');
});

test('Apple Cash demo is reachable from You and completes from an empty demo balance', async ({ page }) => {
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Withdraw money', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Withdraw to Bank account', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Withdraw to Apple Cash', exact: true })).toBeVisible();
  await page.goto('/account');
  await page.getByRole('button', { name: 'Apple Cash demo', exact: true }).click();
  await expect(page.getByRole('radio', { name: 'Withdraw to Apple Cash', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByLabel('Amount in USDC', { exact: true }).fill('25');
  await expect(page.getByRole('button', { name: 'Review details', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add $100 demo dollars', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Add money', exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Amount in USDC', exact: true }).fill('100');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$100.00');
  await page.goto('/money?mode=withdraw&destination=apple-cash');
  await expect(page.getByText('$99.50 available to withdraw', { exact: true })).toBeVisible();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await expect(page.getByText('Account balance after', { exact: true })).toBeVisible();
  await expect(page.getByText('$74.50', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  await doubleTapConfirmation(page);
  await expect(page.getByRole('dialog', { name: 'Apple Cash demo animation' })).toBeVisible();
  await expect(page.getByText('Demo complete', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/apple-cash-animation.png', fullPage: true });
  await page.getByRole('button', { name: 'View demo receipt', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Demo withdrawal complete.', exact: true })).toBeVisible();
  await expect(page.getByTestId('receipt-details').getByText('Apple Cash', { exact: true })).toBeVisible();
  await expect(page.getByText('Apple Cash payout', { exact: true })).toBeVisible();
  await expect(page.getByText('Not initiated', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Demo withdrawal complete.', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/apple-cash-demo-receipt.png', fullPage: true });
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$74.50');
});

test('Apple Cash double-tap waits for confirmation, expires a lone tap, and supports cancellation', async ({ page }) => {
  await fund(page);
  await page.goto('/money?mode=withdraw&destination=apple-cash');
  await page.getByLabel('Amount in USDC', { exact: true }).fill('25');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Double-tap to confirm demo withdrawal', exact: true });
  await confirm.click();
  await expect(page.getByText('Tap once more', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lazo.demo-wallet.v1')!).balanceCents)).toBe(10000);
  await expect(page.getByText('Double-tap to confirm', { exact: true })).toBeVisible();
  await confirm.click();
  await expect(page.getByText('Tap once more', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lazo.demo-wallet.v1')!).balanceCents)).toBe(10000);
  await expect(page.getByRole('button', { name: 'Cancel withdrawal', exact: true })).toBeInViewport({ ratio: 1 });
  await page.screenshot({ path: 'test-results/apple-cash-double-tap.png', fullPage: true });
  await page.getByRole('button', { name: 'Cancel withdrawal', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Confirm Apple Cash demo', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lazo.demo-wallet.v1')!).balanceCents)).toBe(10000);
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  await doubleTapConfirmation(page);
  await page.getByRole('button', { name: 'View demo receipt', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$74.50');
  await page.reload();
  await expect(page.getByTestId('home-balance')).toHaveText('$74.50');
});

test('Apple Cash single-tap accessibility option still requires explicit confirmation', async ({ page }) => {
  await fund(page);
  await page.goto('/money?mode=withdraw&destination=apple-cash');
  await page.getByLabel('Amount in USDC', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  await page.getByRole('button', { name: 'Use single-tap confirmation', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lazo.demo-wallet.v1')!).balanceCents)).toBe(10000);
  await page.getByRole('button', { name: 'Confirm demo withdrawal with one tap', exact: true }).click();
  await page.getByRole('button', { name: 'View demo receipt', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$89.50');
});

test('Apple Cash animation respects reduced motion and never replays or debits on receipt reload', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fund(page);
  await page.goto('/money?mode=withdraw&destination=apple-cash');
  await page.getByLabel('Amount in USDC', { exact: true }).fill('10');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  await doubleTapConfirmation(page);
  await expect(page.getByRole('dialog', { name: 'Apple Cash demo animation' })).toBeVisible();
  await expect(page.getByText('Demo complete', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View demo receipt', exact: true }).click();
  await expect(page).toHaveURL(/animation=played/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Demo withdrawal complete.', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Apple Cash demo animation' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$89.50');
});

// Savings and family goals were removed from the app (Nov 7). Kept for reference.
test.skip('withdraw available balance accounts for savings and the example fee', async ({ page }) => {
  await fund(page);
  await page.goto('/goal?id=rainy-day');
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Savings amount', { exact: true }).fill('60');
  await page.getByRole('button', { name: 'Set aside', exact: true }).click();
  await page.goto('/money?mode=withdraw');
  await page.getByRole('button', { name: 'Use available balance', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('39.50');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$60.00');
  await page.goto('/money?mode=withdraw');
  await page.getByLabel('Amount in USDC', { exact: true }).fill('1');
  await expect(page.getByRole('button', { name: 'Review details', exact: true })).toBeDisabled();
});

// Savings and family goals were removed from the app (Nov 7). Kept for reference.
test.skip('Apple Cash uses the account balance after sends, protects savings, and updates bank availability', async ({ page }) => {
  await fund(page, '123.45');
  await page.goto('/goal?id=rainy-day');
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Savings amount', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Set aside', exact: true }).click();
  await send(page, '+13055550100', '3.20');
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$120.25');
  await page.goto('/money?mode=withdraw&destination=apple-cash');
  await expect(page.getByText('$99.75 available to withdraw', { exact: true })).toBeVisible();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('100.25');
  await expect(page.getByRole('button', { name: 'Review details', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Use available balance', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('99.75');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await expect(page.getByText('$20.00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm demo withdrawal', exact: true }).click();
  await doubleTapConfirmation(page);
  await page.getByRole('button', { name: 'View demo receipt', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$20.00');
  await page.reload();
  await expect(page.getByTestId('home-balance')).toHaveText('$20.00');
  await page.goto('/money?mode=withdraw');
  await expect(page.getByText('$0.00 available to withdraw', { exact: true })).toBeVisible();
  await page.goto('/goal?id=rainy-day');
  await expect(page.getByTestId('goal-balance')).toHaveText('$20.00');
});

test('saved contact names persist across receipts, activity, search, and repeat payments', async ({ page }) => {
  await fund(page);
  await send(page);
  await page.getByRole('button', { name: 'Save contact name', exact: true }).click();
  await page.getByLabel('Contact name', { exact: true }).fill('Alex Rivera');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByText('To Alex Rivera', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('To Alex Rivera', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send again', exact: true }).click();
  await expect(page.getByLabel('Recipient phone number', { exact: true })).toHaveValue('+13055550100');
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('0');
  await expect(page.getByTestId('review-transfer')).toBeDisabled();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('5');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$85.00');
  await page.getByRole('button', { name: 'Send money', exact: true }).click();
  await page.getByLabel('Search name or phone number', { exact: true }).fill('aLeX');
  await expect(page.getByRole('button', { name: 'Pay Alex Rivera', exact: true })).toHaveCount(1);
  await expect(page.getByText('2 payments', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Pay Alex Rivera', exact: true }).click();
  await expect(page.getByLabel('Recipient phone number', { exact: true })).toHaveValue('+13055550100');
  await page.goto('/activity');
  await page.getByLabel('Search activity', { exact: true }).fill('ALEX');
  await expect(page.getByRole('button', { name: 'Alex Rivera, sent $5.00, view receipt', exact: true })).toBeVisible();
  await page.goto('/contacts');
  await page.getByRole('button', { name: 'Contact Alex Rivera', exact: true }).click();
  await page.getByRole('button', { name: 'Edit contact name', exact: true }).click();
  await page.getByLabel('Contact name', { exact: true }).fill('Alex');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByTestId('contact-display-name')).toHaveText('Alex');
});

test('focused fields remain visible in a short viewport and the keypad yields to text entry', async ({ page }) => {
  await fund(page);
  await page.goto('/send?phone=%2B13055550100');
  await page.setViewportSize({ width: 390, height: 400 });
  const note = page.getByLabel('Payment note', { exact: true });
  await note.fill('Can see what I type');
  await expect(note).toBeFocused();
  await expect(page.getByRole('button', { name: 'Digit 1', exact: true })).toHaveCount(0);
  await expect(note).toBeInViewport({ ratio: 1 });
  await expect(page.getByTestId('review-transfer')).toBeInViewport({ ratio: 1 });
  await page.getByLabel('Recipient phone number', { exact: true }).fill('+44 20 7946 0958');
  await expect(page.getByLabel('Recipient phone number', { exact: true })).toBeInViewport({ ratio: 1 });
  await page.getByLabel('Amount in USDC', { exact: true }).fill('1');
  await page.getByTestId('review-transfer').click();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await expect(note).toHaveValue('Can see what I type');
  await page.goto('/save');
  await page.getByRole('button', { name: 'New goal', exact: true }).last().click();
  const target = page.getByLabel('Goal target', { exact: true });
  await target.fill('100');
  await expect(target).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await page.goto('/request');
  const requestNote = page.getByLabel('Request note', { exact: true });
  await requestNote.fill('Visible request details');
  await expect(requestNote).toBeInViewport({ ratio: 1 });
});

test('all main screens render on narrow phones and desktop without runtime errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    for (const path of ['/', '/save', '/security', '/account', '/contacts', '/activity', '/request', '/money?mode=withdraw', '/family', '/goal?id=rainy-day']) {
      await page.goto(path);
      await expect(page.getByRole('button').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
