import { expect, type Page } from '@playwright/test';
export async function mockPin(page: Page) {
  let pin = '', ticket = '', version = 0, frozen = false;
  let trustedContact: { name: string; phone: string } | null = null;
  await page.route('**/api/account/pin', async route => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill({ json: { configured: !!pin, frozen, sessionValid: !!ticket && request.headers()['x-nest-pin'] === ticket } });
    const body = request.postDataJSON();
    if (body.action !== 'create' && (body.action === 'change' ? body.currentPin : body.pin) !== pin) return route.fulfill({ status: 403, json: { error: 'Wrong PIN. Try again.' } });
    if (body.action === 'create' && pin) return route.fulfill({ status: 403, json: { error: 'A PIN already exists.' } });
    if (body.unlock === true) frozen = false;
    pin = body.pin; ticket = `test-pin-grant-${++version}`;
    return route.fulfill({ json: { ticket, expiresAt: Date.now() + 43_200_000 } });
  });
  await page.route('**/api/account/security', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { frozen, trustedContact, recoveryAvailable: false } });
    const body = route.request().postDataJSON();
    if (body.action === 'freeze') frozen = true;
    if (body.action === 'unfreeze') frozen = false;
    if (body.action === 'trusted-contact') trustedContact = { phone: body.phone, name: body.name };
    if (body.action === 'remove-trusted-contact') trustedContact = null;
    return route.fulfill({ json: { frozen, trustedContact, recoveryAvailable: false } });
  });
  await page.route('**/api/deposit/status', route => route.fulfill({ json: { maxDepositDollars: 1000, availableDollars: 1000, fundingWallet: 'test-funding-wallet' } }));
}
export async function createPin(page: Page) {
  await expect(page.getByRole('heading', { name: 'Create your app PIN', exact: true })).toBeVisible();
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill('654321');
  await page.getByLabel('Confirm app PIN', { exact: true }).fill('654321');
  await page.getByRole('button', { name: 'Create PIN and continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create your app PIN', exact: true })).toHaveCount(0);
}

export async function approvePayment(page: Page, pin = '654321') {
  await expect(page.getByRole('heading', { name: 'Approve payment', exact: true })).toBeVisible();
  await page.getByLabel('App PIN', { exact: true }).and(page.locator('input')).fill(pin);
  await page.getByRole('button', { name: 'Approve with PIN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Approve payment', exact: true })).toHaveCount(0);
}
