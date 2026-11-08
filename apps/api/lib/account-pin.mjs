import { randomUUID } from 'node:crypto';
import { hashPin, checkPin } from './server/signer.mjs';
export const PIN_LOCK_MS = 5 * 60_000;
export function validAppPin(pin) { return typeof pin === 'string' && /^\d{6}$/.test(pin); }
export function accountPinChange(metadata, input, now = Date.now()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Use a 6-digit PIN.');
  const { action, pin, currentPin } = input;
  const stored = metadata ?? {};
  if (!['create', 'verify', 'change'].includes(action) || !validAppPin(pin)) throw new Error('Use a 6-digit PIN.');
  if (Number(stored.nest_pin_locked_until || 0) > now) throw new Error('Too many wrong PINs. Wait five minutes and try again.');
  const configured = typeof stored.nest_pin_hash === 'string';
  if (action === 'create' && configured) throw new Error('A PIN already exists. Unlock or change it instead.');
  if (action !== 'create' && !configured) throw new Error('Create your app PIN first.');
  const candidate = action === 'change' ? currentPin : pin;
  if (configured && (!validAppPin(candidate) || !checkPin(candidate, stored.nest_pin_hash))) {
    const previousFails = Number(stored.nest_pin_fails || 0);
    const fails = (previousFails >= 5 && Number(stored.nest_pin_locked_until || 0) <= now ? 0 : previousFails) + 1;
    return { ok: false, changes: { nest_pin_fails: fails, nest_pin_locked_until: fails >= 5 ? now + PIN_LOCK_MS : 0 }, error: fails >= 5 ? 'Too many wrong PINs. Wait five minutes and try again.' : `Wrong PIN. ${5 - fails} tries left.` };
  }
  return { ok: true, changes: action === 'verify' ? { nest_pin_fails: 0, nest_pin_locked_until: 0 } : { nest_pin_hash: hashPin(pin), nest_pin_version: randomUUID(), nest_pin_fails: 0, nest_pin_locked_until: 0 } };
}
