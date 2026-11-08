import { chromium, devices, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Run with the Expo web server on localhost:8081. Uses an isolated demo session.
const output = fileURLToPath(new URL('../../../design/previews/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const capture = async (name, anchor) => {
    if (anchor) await anchor.scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode().catch(() => undefined)));
    });
    await page.screenshot({ path: `${output}nest-${name}.png`, animations: 'disabled' });
  };
  await page.goto('http://127.0.0.1:8081');
  await page.getByRole('button', { name: 'Demo', exact: true }).waitFor();
  await capture('welcome');
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$0.00');
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('4280.12');
  await page.getByRole('button', { name: 'Review details', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up', exact: true }).click();
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await expect(page.getByTestId('home-balance')).toHaveText('$4,280.12');
  await capture('home', page.getByTestId('home-balance'));
  for (const [id, amount] of [['rainy-day', '620'], ['school-fees', '430'], ['first-home', '1090']]) {
    await page.goto(`http://127.0.0.1:8081/goal?id=${id}`);
    await page.getByRole('button', { name: 'Add money', exact: true }).click();
    await page.getByLabel('Savings amount', { exact: true }).fill(amount);
    await page.getByRole('button', { name: 'Set aside', exact: true }).click();
    await expect(page.getByTestId('goal-balance')).toContainText(amount === '1090' ? '$1,090' : `$${amount}`);
    if (id === 'rainy-day') await capture('goal', page.getByTestId('goal-balance'));
  }
  await page.goto('http://127.0.0.1:8081/save');
  await page.getByText('Your goals', { exact: true }).waitFor();
  await capture('save');
  await page.getByRole('tab', { name: 'Security', exact: true }).click();
  await page.getByText('Your money. Your say.', { exact: true }).waitFor();
  await capture('security');
  await page.getByRole('tab', { name: 'You', exact: true }).click();
  await page.getByRole('heading', { name: 'You', exact: true }).waitFor();
  await capture('you');
  await page.goto('http://127.0.0.1:8081/send');
  await page.getByRole('heading', { name: 'Send to', exact: true }).waitFor();
  await capture('people');
  await page.getByRole('button', { name: 'Choose Mamá', exact: true }).click();
  await page.getByLabel('Amount in USDC', { exact: true }).fill('250');
  await page.getByLabel('Amount in USDC', { exact: true }).blur();
  await capture('send', page.getByRole('button', { name: 'Change recipient', exact: true }));
  await page.getByTestId('review-transfer').click();
  await page.getByRole('heading', { name: 'Review payment', exact: true }).waitFor();
  await capture('review', page.getByRole('heading', { name: 'Review payment', exact: true }));
  await page.getByTestId('confirm-transfer').click();
  await page.getByText('Not sent', { exact: true }).waitFor();
  await capture('receipt', page.getByRole('heading', { name: 'A little closer.', exact: true }));
  await page.getByRole('button', { name: 'Back to home', exact: true }).click();
  await page.getByRole('button', { name: 'See all', exact: true }).click();
  await page.getByRole('heading', { name: 'Activity', exact: true }).waitFor();
  await capture('activity');
  await page.goto('http://127.0.0.1:8081/request');
  await page.getByLabel('Your phone number', { exact: true }).fill('3055550100');
  await page.getByLabel('Scan to open your Nest payment request', { exact: true }).waitFor();
  await page.getByLabel('Your phone number', { exact: true }).blur();
  await capture('receive', page.getByRole('heading', { name: 'Receive', exact: true }));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('http://127.0.0.1:8081');
  await page.getByTestId('home-balance').waitFor();
  await capture('small-phone', page.getByTestId('home-balance'));
  await page.goto('http://127.0.0.1:8081/sign-in');
  await page.getByRole('button', { name: 'Create account', exact: true }).waitFor();
  await capture('welcome-small-phone');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:8081');
  await page.getByTestId('home-balance').waitFor();
  await capture('desktop', page.getByTestId('home-balance'));
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Saved 15 Nest previews to ${output}. No browser runtime errors.`);
} finally {
  await browser.close();
}
