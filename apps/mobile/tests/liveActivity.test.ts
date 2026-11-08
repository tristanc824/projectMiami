import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeLiveActivity } from '../src/domain/liveActivity';
const valid = { id: 'live-1', kind: 'send', name: 'Teammate', note: 'Lunch', amountCents: 500, feeCents: 0, createdAt: '2026-11-08T12:00:00Z', recipientPhone: '+13055550100', signature: 'signature' };
test('damaged local history is discarded without trusting invalid records or displaying NaN receipts', () => {
  for (const raw of ['not json', 'null', '{}']) assert.deepEqual(decodeLiveActivity(raw), []);
  const invalid = [{ id: 'live-damaged' }, { ...valid, amountCents: null }, { ...valid, kind: 'made-up' }, { ...valid, createdAt: 'broken' }, { ...valid, recipientPhone: '123' }];
  assert.deepEqual(decodeLiveActivity(JSON.stringify([...invalid, valid, valid])), [valid]);
});
