import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/'); await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await page.getByRole('button', { name: 'Talk to Nest', exact: true }).click();
});
test('voice draft uses normal review; cancellation blocks payment', async ({ page }) => {
  await page.getByLabel('Voice request', { exact: true }).fill('Send fifty dollars');
  await page.getByLabel('Voice recipient phone', { exact: true }).fill('3055550100');
  await expect(page.getByText(/Your draft is \$50.00/)).toBeVisible();
  await page.screenshot({ path: 'test-results/voice-draft.png', fullPage: true });
  await page.getByLabel('Voice request', { exact: true }).fill("Don't send fifty dollars");
  await expect(page.getByRole('button', { name: 'Review transfer', exact: true })).toBeDisabled();
  await expect(page.getByText('Cancelled. Nothing has been sent.')).toBeVisible();
  await page.getByLabel('Voice request', { exact: true }).fill('Send 50.25 dollars');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('50.25');
  await expect(page.getByLabel('Recipient phone number', { exact: true })).toHaveValue('+13055550100');
  await expect(page.getByTestId('confirm-transfer')).toHaveCount(0);
});
test('ambiguous amount never enables review', async ({ page }) => {
  await page.getByLabel('Voice recipient phone', { exact: true }).fill('3055550100');
  await page.getByLabel('Voice request', { exact: true }).fill('Send 50 500 dollars');
  await expect(page.getByRole('button', { name: 'Review transfer', exact: true })).toBeDisabled();
});
test('microphone recognition events fill the draft and end listening', async ({ page }) => {
  await page.evaluate(() => {
    class FakeRecognition extends EventTarget {
      start() { setTimeout(() => { const event = new Event('result'); Object.assign(event, { resultIndex: 0, results: [Object.assign([{ transcript: 'Send fifty dollars', confidence: 1 }], { isFinal: true })] }); this.dispatchEvent(event); this.dispatchEvent(new Event('end')); }, 100); }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.dispatchEvent(new Event('end')); }
    }
    Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition });
  });
  await page.getByRole('button', { name: 'Start speaking', exact: true }).click();
  await expect(page.getByLabel('Voice request', { exact: true })).toHaveValue('Send fifty dollars');
  await expect(page.getByRole('button', { name: 'Start speaking', exact: true })).toBeVisible();
});
test('a spoken saved contact cannot silently use a different entered phone', async ({ page }) => {
  await page.getByLabel('Voice request', { exact: true }).fill('Send fifty dollars to Daniela');
  await page.getByLabel('Voice recipient phone', { exact: true }).fill('3055550999');
  await expect(page.getByText('The spoken contact and entered number do not match. Correct the name or number before continuing.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review transfer', exact: true })).toBeDisabled();
});
test('denied speech leaves a usable typed fallback', async ({ page }) => {
  await page.evaluate(() => {
    class DeniedRecognition extends EventTarget {
      start() { setTimeout(() => { const event = new Event('error'); Object.assign(event, { error: 'not-allowed', message: 'Permission denied' }); this.dispatchEvent(event); this.dispatchEvent(new Event('end')); }, 100); }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.dispatchEvent(new Event('end')); }
    }
    Object.assign(window, { SpeechRecognition: DeniedRecognition, webkitSpeechRecognition: DeniedRecognition });
  });
  await page.getByRole('button', { name: 'Start speaking', exact: true }).click();
  await expect(page.getByText(/Voice recognition stopped/)).toBeVisible();
  await page.getByLabel('Voice request', { exact: true }).fill('Send one dollar');
  await page.getByLabel('Voice recipient phone', { exact: true }).fill('3055550100');
  await expect(page.getByRole('button', { name: 'Review transfer', exact: true })).toBeEnabled();
});
test('Spanish voice recognizes es-MX and prepares a dollar draft with Spanish readback', async ({ page }) => {
  await page.getByRole('radio', { name: 'Español', exact: true }).click();
  await page.evaluate(() => {
    class SpanishRecognition extends EventTarget {
      lang = '';
      start() { Object.assign(window, { selectedVoiceLocale: this.lang }); setTimeout(() => { const event = new Event('result'); Object.assign(event, { resultIndex: 0, results: [Object.assign([{ transcript: 'Envía cincuenta dólares', confidence: 1 }], { isFinal: true })] }); this.dispatchEvent(event); this.dispatchEvent(new Event('end')); }, 100); }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.dispatchEvent(new Event('end')); }
    }
    Object.assign(window, { SpeechRecognition: SpanishRecognition, webkitSpeechRecognition: SpanishRecognition });
  });
  await page.getByRole('button', { name: 'Empezar a hablar', exact: true }).click();
  await expect(page.getByLabel('Voice request', { exact: true })).toHaveValue('Envía cincuenta dólares');
  expect(await page.evaluate(() => (window as unknown as { selectedVoiceLocale: string }).selectedVoiceLocale)).toBe('es-MX');
  await page.getByLabel('Voice recipient phone', { exact: true }).fill('3055550100');
  await expect(page.getByText(/Tu borrador es de \$50.00/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Escuchar resumen', exact: true })).toBeEnabled();
  await page.getByLabel('Voice request', { exact: true }).fill('No envíes cincuenta dólares');
  await expect(page.getByRole('button', { name: 'Revisar transferencia', exact: true })).toBeDisabled();
  await page.getByLabel('Voice request', { exact: true }).fill('Envía 1,25 dólares');
  await page.getByRole('button', { name: 'Revisar transferencia', exact: true }).click();
  await expect(page.getByLabel('Amount in USDC', { exact: true })).toHaveValue('1.25');
});
