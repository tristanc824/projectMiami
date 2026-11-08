import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$0.00');
});

test('amount keypad handles 50, fast taps, decimals, deletion and full-width values without clipping', async ({ page }) => {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/money?mode=add', '/money?mode=withdraw', '/send?phone=%2B13055550100']) {
      await page.goto(path);
      const amount = page.getByTestId('amount-input');
      await page.getByRole('button', { name: 'Digit 5', exact: true }).click();
      await page.getByRole('button', { name: 'Digit 0', exact: true }).click();
      await expect(amount).toHaveValue('50');
      await page.getByRole('button', { name: 'Digit 0', exact: true }).dblclick({ delay: 10 });
      await expect(amount).toHaveValue('5000');
      await page.getByRole('button', { name: 'Decimal point', exact: true }).click();
      await page.getByRole('button', { name: 'Digit 5', exact: true }).click();
      await page.getByRole('button', { name: 'Digit 0', exact: true }).click();
      await page.getByRole('button', { name: 'Digit 9', exact: true }).click();
      await expect(amount).toHaveValue('5000.50');
      await page.getByRole('button', { name: 'Delete digit', exact: true }).click();
      await expect(amount).toHaveValue('5000.5');
      await amount.fill('99999.99');
      await expect(amount).toHaveValue('99999.99');
      expect(await amount.evaluate((element: HTMLInputElement) => {
        const style = getComputedStyle(element);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        context.font = `${style.fontSize} ${style.fontFamily}`;
        return context.measureText(element.value).width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) <= element.clientWidth;
      }), `${path} at ${width}px fits every glyph`).toBe(true);
      await amount.fill('00050');
      await expect(amount).toHaveValue('50');
      for (let index = 0; index < 3; index++) await page.getByRole('button', { name: 'Delete digit', exact: true }).click();
      await expect(amount).toHaveValue('0');
    }
  }
});

test('settings groups tools separately and saves a name and a removable blank-by-default profile photo', async ({ page }) => {
  await page.goto('/account');
  await expect(page.getByTestId('avatar-self').locator('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Reset demo', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Saved contacts', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit display name', exact: true }).click();
  await page.getByLabel('Display name', { exact: true }).fill('Alex');
  await page.getByRole('button', { name: 'Save display name', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Change profile photo', exact: true }).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose photo', exact: true }).click();
  await (await chooser).setFiles('assets/nest/avatar-ana.jpg');
  await expect(page.getByRole('button', { name: 'Choose photo', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('avatar-self').locator('img')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Alex', exact: true })).toBeVisible();
  await expect(page.getByTestId('avatar-self').locator('img')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true }).getByTestId('avatar-self').locator('img')).toHaveCount(1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Change profile photo', exact: true }).click();
  await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
  await expect(page.getByTestId('avatar-self').locator('img')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose photo', exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/settings-polished.png', fullPage: true });
});

test('completed transfers acknowledge success, preserve review edits and debit only once on a double tap', async ({ page }) => {
  await page.goto('/money?mode=add');
  await page.getByTestId('amount-input').fill('100');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await page.goto('/send?phone=%2B13055550100');
  await page.getByTestId('amount-input').fill('50');
  await page.getByLabel('Payment note', { exact: true }).fill('For the demo');
  await page.getByTestId('review-transfer').click();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click();
  await expect(page.getByTestId('amount-input')).toHaveValue('50');
  await page.getByTestId('review-transfer').click();
  await page.getByTestId('confirm-transfer').dblclick({ delay: 10 });
  await expect(page.getByRole('heading', { name: 'Demo money sent.', exact: true })).toBeVisible();
  await expect(page.getByTestId('transfer-celebration')).toBeVisible();
  await page.screenshot({ path: 'test-results/transfer-success.png' });
  await expect(page).not.toHaveURL(/celebrate=1/);
  await page.reload();
  await expect(page.getByTestId('receipt-details')).toBeVisible();
  await expect(page.getByTestId('transfer-celebration')).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$50.00');
  const wallet = await page.evaluate(() => JSON.parse(localStorage.getItem('lazo.demo-wallet.v1')!));
  expect(wallet.activity.filter((item: { kind: string }) => item.kind === 'send')).toHaveLength(1);
});
