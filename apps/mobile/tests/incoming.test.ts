import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeIncomingActivity } from '../src/domain/incoming';
import type { Activity } from '../src/domain/wallet';
const payment = { signature: 'sender-and-recipient-see-this-signature', amountCents: 5000, createdAt: '2026-11-08T06:00:00.000Z' };
const old: Activity = { id: 'live-old-inferred-receipt', kind: 'receive', name: 'Money received', amountCents: 5000, feeCents: 0, createdAt: payment.createdAt, note: 'Arrived in your wallet', live: true };
test('incoming signature is stored once across repeated sync and reload', () => {
  const first = mergeIncomingActivity([], [payment]);
  assert.equal(first[0].signature, payment.signature);
  assert.equal(first[0].id, `live-chain-${payment.signature}`);
  assert.deepEqual(mergeIncomingActivity(JSON.parse(JSON.stringify(first)), [payment]), first);
});
test('an old inferred receipt is repaired while preserving its existing receipt link', () => {
  const result = mergeIncomingActivity([old], [payment]);
  assert.equal(result.length, 1); assert.equal(result[0].id, old.id); assert.equal(result[0].signature, payment.signature);
});
test('multiple same-amount payments remain separate receipts', () => {
  const result = mergeIncomingActivity([], [payment, { ...payment, signature: 'second-payment' }]);
  assert.equal(result.length, 2); assert.notEqual(result[0].signature, result[1].signature);
});
test('own card deposits and refunds with the same signature are not duplicated or renamed', () => {
  const deposit: Activity = { ...old, kind: 'add', signature: payment.signature, name: 'Added with test card' };
  assert.deepEqual(mergeIncomingActivity([deposit], [payment]), [deposit]);
});

test('ambiguous old aggregate receipts are replaced by separate chain records rather than assigned an arbitrary signature', () => {
  const result = mergeIncomingActivity([old], [payment, { ...payment, signature: 'another-identical-amount' }]);
  assert.equal(result.length, 2);
  assert(result.every(item => item.id !== old.id));
});

test('confirmed outgoing history backfills without receive notifications or duplicating a locally recorded send', () => {
  const outgoing = { ...payment, kind: 'send' as const };
  const result = mergeIncomingActivity([], [outgoing]);
  assert.equal(result[0].kind, 'send'); assert.equal(result[0].signature, payment.signature);
  assert.equal(mergeIncomingActivity(result, [outgoing]).length, 1);
  assert.deepEqual(mergeIncomingActivity([{ ...old, kind: 'send', recipientPhone: '+13055550100', signature: payment.signature }], [outgoing])[0].recipientPhone, '+13055550100');
});

test('pending receipts resolve in place only for the exact signature and amount and survive failed confirmation', async () => {
  const { reconcilePendingActivity, mergeIncomingActivity } = await import('../src/domain/incoming');
  const item = { id: 'live-pending', kind: 'send' as const, name: 'Family', amountCents: 500, feeCents: 0, note: 'Note', createdAt: '2026-11-08T09:00:00Z', signature: 'signature', status: 'pending' as const, lastValidBlockHeight: 100, live: true };
  assert.equal(reconcilePendingActivity([item], [{ signature: 'other', status: 'confirmed', amountCents: 500 }])[0].status, 'pending');
  assert.equal(reconcilePendingActivity([item], [{ signature: 'signature', status: 'confirmed', amountCents: 600 }])[0].status, 'pending');
  assert.equal(reconcilePendingActivity([item], [{ signature: 'signature', status: 'confirmed', amountCents: 500 }])[0].status, undefined);
  assert.equal(reconcilePendingActivity([item], [{ signature: 'signature', status: 'failed' }])[0].status, 'failed');
  const merged = mergeIncomingActivity([item], [{ signature: 'signature', amountCents: 500, kind: 'send', createdAt: '2026-11-08T09:01:00Z' }]);
  assert.equal(merged.length, 1); assert.equal(merged[0].status, undefined); assert.equal(merged[0].id, item.id);
});
