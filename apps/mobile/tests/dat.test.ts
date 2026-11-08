import assert from 'node:assert/strict';
import test from 'node:test';
import { bytesToBase64, centsToAmount, spendableCents, formatPhone, normalizePhone, normalizeSignature } from '../src/services/dat';

const sig = Uint8Array.from({ length: 64 }, (_, i) => (i * 37 + 11) % 256);
const sigB64 = Buffer.from(sig).toString('base64');
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function toBase58(bytes: Uint8Array) {
  let n = BigInt(`0x${Buffer.from(bytes).toString('hex')}`); let out = '';
  while (n > 0n) { out = B58[Number(n % 58n)] + out; n /= 58n; }
  for (const b of bytes) { if (b !== 0) break; out = `1${out}`; }
  return out;
}

test('base64 encoding matches Node for every padding length', () => {
  for (const length of [0, 1, 2, 3, 4, 5, 64]) {
    const bytes = sig.slice(0, length);
    assert.equal(bytesToBase64(bytes), Buffer.from(bytes).toString('base64'));
  }
});

test('signatures are accepted as base64, base58 or bytes and always sent as base64', () => {
  assert.equal(normalizeSignature(sigB64), sigB64);
  assert.equal(normalizeSignature(toBase58(sig)), sigB64);
  assert.equal(normalizeSignature(sig), sigB64);
  const leadingZeros = Uint8Array.from([0, 0, ...sig.slice(2)]);
  assert.equal(normalizeSignature(toBase58(leadingZeros)), Buffer.from(leadingZeros).toString('base64'));
});

test('signatures of the wrong size are rejected rather than sent', () => {
  for (const bad of ['', 'not a signature', Buffer.from(sig.slice(0, 32)).toString('base64'), sig.slice(0, 63)]) {
    assert.throws(() => normalizeSignature(bad), /unexpected signature/);
  }
});

test('amounts are sent as exact dollar strings', () => {
  assert.equal(centsToAmount(500), '5.00');
  assert.equal(centsToAmount(1), '0.01');
  assert.equal(centsToAmount(123456), '1234.56');
  for (const bad of [0, -1, 1.5, NaN]) assert.throws(() => centsToAmount(bad));
});

test('phone numbers follow the backend rules', () => {
  assert.equal(normalizePhone('(555) 555-0142'), '+15555550142');
  assert.equal(normalizePhone('1 555 555 0142'), '+15555550142');
  assert.equal(normalizePhone('+44 20 7946 0958'), '+442079460958');
  for (const bad of ['', '555-0142', '+1234', 'abc']) assert.equal(normalizePhone(bad), null);
  assert.equal(formatPhone('+15555550142'), '(555) 555-0142');
});


test('available cents never round devnet USDC dust up into an unspendable balance', () => {
  assert.equal(spendableCents(30.919999), 3091);
  assert.equal(spendableCents(1.15), 115);
  assert.equal(spendableCents(0.009999), 0);
  assert.equal(spendableCents(0.01), 1);
  for (const value of [NaN, Infinity, -1]) assert.throws(() => spendableCents(value));
});

test('text links keep iOS and Android message bodies intact without sending a message', async () => {
  const { textPaymentLink } = await import('../src/services/dat');
  const body = 'Nest link: https://nest.example/app/pay?amount=50&note=hello + love 🪺';
  assert.equal(textPaymentLink('+13055550100', body, 'ios'), `sms:+13055550100&body=${encodeURIComponent(body)}`);
  assert.equal(textPaymentLink('+13055550100', body, 'android'), `sms:+13055550100?body=${encodeURIComponent(body)}`);
});
