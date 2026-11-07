import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,240.50');
});

test('welcome screen opens the demo and remains accessible from account', async ({ page }) => {
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Open sign-in screen', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Protect what matters.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sign-in is not connected');
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,240.50');
});

test('login globe visibly rotates and stops rendering when leaving login', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/sign-in');
  const globe = page.getByTestId('login-globe');
  await expect(globe.locator('canvas')).toBeVisible();
  const firstFrame = await globe.screenshot();
  await expect.poll(async () => (await globe.screenshot()).equals(firstFrame), { timeout: 5000 }).toBe(false);
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('login respects reduced motion and restores animation when the preference changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/sign-in');
  const globe = page.getByTestId('login-globe');
  await expect(globe).toBeVisible();
  await expect(globe.locator('canvas')).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(globe.locator('canvas')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(globe.locator('canvas')).toHaveCount(0);
});

test('the iPhone Expo Go manifest targets SDK 58', async ({ request }) => {
  const response = await request.get('/', { headers: { 'Expo-Platform': 'ios', Accept: 'application/expo+json' } });
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.extra.expoClient.sdkVersion).toBe('58.0.0');
  expect(manifest.runtimeVersion).toBe('exposdk:58.0.0');
});

test('send, receipt, and persistent activity work together without a real transaction', async ({ page }) => {
  await page.getByRole('button', { name: 'Send to Ernesto', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('25.01');
  await page.getByLabel('Payment note').fill('Browser demo check');
  await page.getByTestId('review-transfer').click();
  await expect(page.getByText('Total from demo balance')).toBeVisible();
  await page.getByTestId('confirm-transfer').click();
  await expect(page.getByText('Not sent', { exact: true })).toBeVisible();
  await expect(page.getByText('Not initiated', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,215.49');
  await expect(page).toHaveURL('http://127.0.0.1:8081/');
  await page.reload();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,215.49');
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByRole('button', { name: 'Ernesto, sent $25.01, view receipt', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sent', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Carlos Torres, received $75.00, view receipt', exact: true })).toHaveCount(0);
});

test('funding, family-goal contribution, filtering, and reset remain coherent', async ({ page }) => {
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,340.50');
  await page.getByRole('tab', { name: 'Family', exact: true }).click();
  const buttons = page.getByRole('button', { name: 'Contribute', exact: true });
  await expect(buttons).toHaveCount(2);
  await buttons.nth(0).click();
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,280.50');
  await page.getByRole('tab', { name: 'Family', exact: true }).click();
  await expect(page.getByText('Goal reached', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await page.getByRole('button', { name: 'Reset demo data', exact: true }).click();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$1,240.50');
});

test('appearance setting switches between light and dark and persists', async ({ page }) => {
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  const heading = page.getByText('Your little corner.', { exact: true });
  await page.getByTestId('appearance-dark').click();
  await expect(heading).toHaveCSS('color', 'rgb(242, 243, 245)');
  await page.screenshot({ path: 'test-results/appearance-dark.png' });
  await page.reload();
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await expect(heading).toHaveCSS('color', 'rgb(242, 243, 245)');
  await page.getByTestId('appearance-light').click();
  await expect(heading).toHaveCSS('color', 'rgb(16, 17, 20)');
});
