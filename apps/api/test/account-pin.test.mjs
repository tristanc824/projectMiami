import test from 'node:test';
import assert from 'node:assert/strict';
import { accountPinChange, PIN_LOCK_MS } from '../lib/account-pin.mjs';
import { signTicket, verifyTicket } from '../lib/review-ticket.mjs';
import { depositAmount, depositCap } from '../lib/funding.mjs';

test('app PIN is salted, verifies, cannot be recreated, and change invalidates the grant version', () => {
  const first = accountPinChange({}, { action: 'create', pin: '123456' }).changes;
  const second = accountPinChange({}, { action: 'create', pin: '123456' }).changes;
  assert.notEqual(first.nest_pin_hash, second.nest_pin_hash);
  assert.ok(!JSON.stringify(first).includes('123456'));
  assert.equal(accountPinChange(first, { action: 'verify', pin: '123456' }).ok, true);
  assert.throws(() => accountPinChange(first, { action: 'create', pin: '999999' }), /already exists/);
  assert.equal(accountPinChange(first, { action: 'change', pin: '999999', currentPin: '000000' }).ok, false);
  const changed = { ...first, ...accountPinChange(first, { action: 'change', pin: '999999', currentPin: '123456' }).changes };
  assert.notEqual(first.nest_pin_version, changed.nest_pin_version);
  assert.equal(accountPinChange(changed, { action: 'verify', pin: '123456' }).ok, false);
  assert.equal(accountPinChange(changed, { action: 'verify', pin: '999999' }).ok, true);
});
test('five wrong PINs lock the account, including correct guesses, until the timer expires', () => {
  let state = accountPinChange({}, { action: 'create', pin: '123456' }, 1000).changes;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const result = accountPinChange(state, { action: 'verify', pin: '000000' }, 1000);
    state = { ...state, ...result.changes };
    assert.equal(result.ok, false); assert.equal(state.nest_pin_fails, attempt);
  }
  assert.throws(() => accountPinChange(state, { action: 'verify', pin: '123456' }, 1001), /five minutes/);
  assert.equal(accountPinChange(state, { action: 'verify', pin: '123456' }, 1000 + PIN_LOCK_MS).ok, true);
  assert.equal(accountPinChange(state, { action: 'verify', pin: '000000' }, 1000 + PIN_LOCK_MS).changes.nest_pin_fails, 1);
});
test('PIN grants are purpose-bound, tamper resistant and expiring', () => {
  const secret = 'test-secret-that-is-long-enough-for-signing';
  const grant = signTicket({ purpose: 'app-pin', owner: 'wallet', version: 'v1' }, secret);
  assert.equal(verifyTicket(grant, secret, 'app-pin').owner, 'wallet');
  assert.throws(() => verifyTicket(grant, secret, 'review'));
  assert.throws(() => verifyTicket(grant + 'x', secret, 'app-pin'));
  assert.throws(() => verifyTicket(signTicket({ purpose: 'app-pin' }, secret, -1), secret, 'app-pin'));
});
test('deposit cap is 1000, validated, and amounts reject fractions, coercions and overflow', () => {
  assert.equal(depositCap(), 1000);
  for (const value of ['no', '-1', '1.5', 'Infinity', '0', '100001']) assert.equal(depositCap(value), 1000);
  assert.equal(depositCap('2000'), 2000);
  for (const value of [50, 1000, '1000']) assert.equal(depositAmount(value, 1000), Number(value));
  for (const value of [null, true, false, '', ' ', 0, -1, 1.01, 1001, Infinity]) assert.equal(depositAmount(value, 1000), null);
});
