import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SmsStore } from '../lib/server/textStore.mjs';
const payment = { id: 'first', phone: '+13055550100', recipient: 'recipient', amount: 5_000_000n, day: '2026-11-08' };
test('a durable SMS checkpoint survives restart, deduplicates forever, and reserves daily usage atomically', () => {
  const filename = path.join(mkdtempSync(path.join(tmpdir(), 'nest-sms-store-')), 'sms.sqlite');
  let store = new SmsStore(filename);
  const other = new SmsStore(filename), now = Date.now();
  try {
    assert.equal(store.reserve('owner', payment, 20_000_000n, 3_000_000, now).created, true);
    assert.equal(other.reserve('owner', { ...payment, id: 'duplicate-command' }, 20_000_000n, 3_000_000, now).created, false);
    assert.equal(other.active('owner', now).id, 'first');
    const prepared = { transaction: 'signed-bytes'.repeat(200), signature: 'signature', blockhash: 'blockhash', lastValidBlockHeight: 100 };
    store.savePrepared('owner', 'first', prepared, now + 1);
    assert.equal(other.active('owner').transaction, prepared.transaction);
    store.close(); store = new SmsStore(filename);
    assert.equal(store.active('owner').signature, 'signature');
    assert.equal(store.spent('owner', payment.day), 8_000_000n);
    store.finish('owner', 'first', 'confirmed');
    assert.equal(store.reserve('owner', payment, 20_000_000n).created, false);
    assert.throws(() => store.reserve('owner', { ...payment, id: 'over-limit', amount: 13_000_000n }, 20_000_000n), /TEXT_DAILY_LIMIT/);
    assert.equal(store.reserve('owner', { ...payment, id: 'second', amount: 10_000_000n }, 20_000_000n).created, true);
    store.finish('owner', 'first', 'failed');
    assert.equal(store.active('owner').id, 'second');
    assert.equal(store.spent('owner', payment.day), 18_000_000n);
    store.finish('owner', 'second', 'failed');
    assert.equal(store.spent('owner', payment.day), 8_000_000n);
    assert.equal(statSync(filename).mode & 0o777, 0o600);
  } finally { store.close(); other.close(); }
});
test('an expired unsigned preparation frees its reservation and can never later save bytes or broadcast', () => {
  const store = new SmsStore(':memory:');
  try {
    store.reserve('owner', payment, 20_000_000n, 0, 1000);
    assert.equal(store.active('owner', 122_000), null);
    assert.equal(store.spent('owner', payment.day), 0n);
    assert.throws(() => store.savePrepared('owner', payment.id, { transaction: 'signed', signature: 'signature', blockhash: 'blockhash', lastValidBlockHeight: 100 }, 122_001), /expired before broadcast/);
    assert.equal(store.reserve('owner', { ...payment, id: 'new-request' }, 20_000_000n, 0, 122_002).created, true);
    assert.equal(store.reserve('another-owner', payment, 20_000_000n, 0, 122_003).created, true);
    store.finish('owner', payment.id, 'confirmed');
    assert.equal(store.active('owner', 122_004).id, 'new-request');
  } finally { store.close(); }
});
