import { createHmac, timingSafeEqual } from 'node:crypto';

export function signTicket(value, secret, lifetimeSeconds = 600) {
  if (!secret || secret.length < 24) throw new Error('Review signing is not configured on the server.');
  const payload = Buffer.from(JSON.stringify({ ...value, expires: Math.floor(Date.now() / 1000) + lifetimeSeconds })).toString('base64url');
  const signature = createHmac('sha256', secret).update(`nest-review-v1:${payload}`).digest('base64url');
  return `${payload}.${signature}`;
}
export function verifyTicket(ticket, secret, purpose) {
  if (typeof ticket !== 'string' || ticket.length > 12000 || !secret || secret.length < 24) throw new Error('Review expired. Check this payment again.');
  const [payload, signature, extra] = ticket.split('.');
  if (!payload || !signature || extra) throw new Error('Invalid review receipt.');
  const expected = createHmac('sha256', secret).update(`nest-review-v1:${payload}`).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid review receipt.');
  const result = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (result.purpose !== purpose || !Number.isSafeInteger(result.expires) || result.expires <= Math.floor(Date.now() / 1000)) throw new Error('Review expired. Check this payment again.');
  return result;
}
