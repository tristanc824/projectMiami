import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDemoCommand, createInitialWallet, decodeWallet, parseAmount, type DemoCommand } from '../src/domain/wallet';

const transfer = (overrides: Partial<DemoCommand> = {}): DemoCommand => ({
  id: 'demo-test-1', kind: 'send', amountCents: 2501, contactId: 'mama', createdAt: '2026-11-07T12:00:00Z', ...overrides,
});

test('amounts are exact integer cents and reject malformed or unsupported precision', () => {
  assert.equal(parseAmount('0.29'), 29);
  assert.equal(parseAmount('10.01'), 1001);
  assert.equal(parseAmount('10000'), 1_000_000);
  for (const value of ['0', '-10', 'NaN', '1e3', '10.001', '1,000', '10000.01', '', '.']) assert.equal(parseAmount(value), null, value);
});
test('a transfer debits once, records the exact amount, and leaves the original state untouched', () => {
  const state = createInitialWallet();
  const next = applyDemoCommand(state, transfer());
  assert.equal(state.balanceCents, 124050);
  assert.equal(next.balanceCents, 121549);
  assert.equal(next.activity[0].amountCents, 2501);
  assert.equal(next.activity[0].name, 'Ernesto');
  assert.equal(next.activity.length, state.activity.length + 1);
});
test('repeated confirmation with the same request reference cannot debit twice', () => {
  const first = applyDemoCommand(createInitialWallet(), transfer());
  assert.equal(applyDemoCommand(first, transfer()), first);
});
test('withdrawals require enough balance for both the amount and the fee', () => {
  const state = createInitialWallet();
  assert.throws(() => applyDemoCommand(state, transfer({ kind: 'withdraw', amountCents: state.balanceCents })), /balance/);
  const next = applyDemoCommand(state, transfer({ kind: 'withdraw', amountCents: state.balanceCents - 50 }));
  assert.equal(next.balanceCents, 0);
  assert.equal(next.activity[0].feeCents, 50);
});
test('family contributions cannot overfund a goal or go to another recipient', () => {
  const state = createInitialWallet();
  assert.throws(() => applyDemoCommand(state, transfer({ goalId: 'school', amountCents: 6001 })), /request still needs/);
  assert.throws(() => applyDemoCommand(state, transfer({ goalId: 'school', contactId: 'diego' })), /unavailable/);
  const next = applyDemoCommand(state, transfer({ goalId: 'school', amountCents: 6000 }));
  assert.equal(next.goals[0].fundedCents, next.goals[0].targetCents);
});
test('unknown contacts, nonpositive amounts, unsafe numbers, and invalid dates are rejected', () => {
  const state = createInitialWallet();
  for (const amountCents of [-1, 0, 0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER]) assert.throws(() => applyDemoCommand(state, transfer({ amountCents })));
  assert.throws(() => applyDemoCommand(state, transfer({ contactId: 'attacker' })), /saved recipient/);
  assert.throws(() => applyDemoCommand(state, transfer({ createdAt: 'invalid' })), /date/);
});
test('demo storage restores valid state and recovers safely from corrupt data', () => {
  const state = applyDemoCommand(createInitialWallet(), transfer());
  assert.deepEqual(decodeWallet(JSON.stringify(state)), state);
  for (const raw of [null, '', 'not-json', '{}', JSON.stringify({ ...state, balanceCents: -1 }), JSON.stringify({ ...state, activity: [{ id: 'real-transfer' }] })]) assert.deepEqual(decodeWallet(raw), createInitialWallet());
});
