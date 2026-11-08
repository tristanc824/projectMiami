import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePaymentRequest, type RequestParams } from '../src/domain/paymentRequest';

test('request details round-trip with punctuation and unicode', () => {
  const request = { mode: 'demo', recipient: '+15555550142', amount: '25.01', note: 'Books & supplies + love 🧡' };
  assert.deepEqual(parsePaymentRequest(Object.fromEntries(new URLSearchParams(new URLSearchParams(request).toString()))), request);
  assert.equal(parsePaymentRequest({ ...request, mode: 'devnet', recipient: '+15555550142' })?.recipient, '+15555550142');
});

test('malformed amounts, recipients, modes and repeated fields cannot create payments', () => {
  const request = { mode: 'demo', recipient: '+15555550142', amount: '25.01', note: '' };
  for (const overrides of [
    { amount: '-1' }, { amount: '0' }, { amount: '1e2' }, { amount: '10.001' }, { amount: '10000.01' },
    { recipient: 'unknown' }, { mode: 'mainnet' }, { mode: 'devnet', recipient: 'mama' },
    { note: 'x'.repeat(141) }, { amount: ['1', '2'] }, { recipient: ['+15555550142', '+13055550100'] },
  ] satisfies RequestParams[]) assert.equal(parsePaymentRequest({ ...request, ...overrides }), null);
});

test('shared URLs preserve the deployed base path and request fields without Expo or unsafe schemes', async () => {
  const { paymentRequestUrl } = await import('../src/domain/paymentRequest');
  const request = { mode: 'devnet', recipient: '+15555550142', amount: '50', note: 'Books & love 🧡' } as const;
  const url = new URL(paymentRequestUrl(request, 'https://nest.example/app/')!);
  assert.equal(url.pathname, '/app/pay');
  assert.deepEqual(parsePaymentRequest(Object.fromEntries(url.searchParams)), request);
  for (const base of ['', 'lazo://', 'exp://192.168.1.10', 'javascript:alert(1)', 'http://nest.example', 'https://user:password@nest.example', 'https://nest.example/app?x=1']) assert.equal(paymentRequestUrl(request, base), null);
  assert.equal(new URL(paymentRequestUrl(request, 'http://localhost:5176/app', true)!).pathname, '/app/pay');
});
