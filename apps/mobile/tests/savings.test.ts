import assert from 'node:assert/strict';
import test from 'node:test';
import { applySavings, initialSavings, reservedCents } from '../src/domain/savings';
import { applyDemoCommand, createInitialWallet, decodeWallet } from '../src/domain/wallet';

test('reserved savings cannot be spent, overfunded, or withdrawn twice', () => {
  const goals = applySavings(initialSavings(), 10000, { kind: 'add', goalId: 'rainy-day', amountCents: 6000 });
  assert.equal(reservedCents(goals), 6000);
  assert.throws(() => applySavings(goals, 10000, { kind: 'add', goalId: 'school-fees', amountCents: 4001 }), /available balance/);
  const state = { ...createInitialWallet(), balanceCents: 10000, savings: goals };
  const command = { id: 'demo-savings-send', kind: 'send' as const, amountCents: 5000, recipientPhone: '+13055550100', createdAt: '2026-11-07T12:00:00Z' };
  assert.throws(() => applyDemoCommand(state, command), /balance/);
  assert.equal(applyDemoCommand(state, { ...command, amountCents: 4000 }).balanceCents, 6000);
  const released = applySavings(goals, 10000, { kind: 'withdraw', goalId: 'rainy-day', amountCents: 6000 });
  assert.equal(reservedCents(released), 0);
  assert.throws(() => applySavings(released, 10000, { kind: 'withdraw', goalId: 'rainy-day', amountCents: 1 }));
  assert.equal(decodeWallet(JSON.stringify(state)).savings?.[0].savedCents, 6000);
});

test('invalid or overreserved stored savings recover safely, while old wallets still load', () => {
  const state = { ...createInitialWallet(), balanceCents: 10000 };
  const legacy = { ...state, savings: undefined };
  assert.equal(decodeWallet(JSON.stringify(legacy)).balanceCents, 10000);
  for (const savedCents of [-1, 0.1, 10001, Infinity]) {
    const corrupt = { ...state, savings: [{ ...initialSavings()[0], savedCents }] };
    assert.deepEqual(decodeWallet(JSON.stringify(corrupt)), createInitialWallet());
  }
  assert.throws(() => applySavings(initialSavings(), 10000, { kind: 'create', name: ' ', targetCents: 10000, id: 'new' }));
  assert.throws(() => applySavings(initialSavings(), 10000, { kind: 'create', name: 'Duplicate', targetCents: 10000, id: 'rainy-day' }));
});
