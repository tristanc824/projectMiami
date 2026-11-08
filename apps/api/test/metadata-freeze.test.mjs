import test from 'node:test';
import assert from 'node:assert/strict';
import { setTextSettings } from '../lib/server/signer.mjs';
test('stale concurrent metadata writers preserve a server freeze and PIN version', async () => {
  const original = globalThis.fetch;
  let metadata = { nest_pin_version: 'v2', nest_frozen: false };
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'POST') metadata = JSON.parse(init.body).custom_metadata;
    return Response.json({ id: 'test-owner', custom_metadata: { ...metadata } });
  };
  try {
    const stale = { id: 'test-owner', custom_metadata: { nest_pin_version: 'v1' } };
    await Promise.all([setTextSettings(stale, { nest_frozen: true }), setTextSettings(stale, { tp_on: false }), setTextSettings(stale, { nest_pin_fails: 0 })]);
    assert.equal(metadata.nest_frozen, true); assert.equal(metadata.nest_pin_version, 'v2');
    assert.equal(metadata.tp_on, false); assert.equal(metadata.nest_pin_fails, 0);
  } finally { globalThis.fetch = original; }
});

test('a stale SMS reconciliation cannot erase a newer payment checkpoint', async () => {
  const original = globalThis.fetch;
  let metadata = { tp_pending_id: 'old' };
  globalThis.fetch = async (_url, init) => {
    if (init.method === 'POST') metadata = JSON.parse(init.body).custom_metadata;
    return Response.json({ id: 'checkpoint-owner', custom_metadata: { ...metadata } });
  };
  try {
    const user = { id: 'checkpoint-owner' };
    await Promise.all([setTextSettings(user, { tp_pending_id: 'new' }), setTextSettings(user, current => current.tp_pending_id === 'old' ? { tp_pending_id: '' } : {})]);
    assert.equal(metadata.tp_pending_id, 'new');
  } finally { globalThis.fetch = original; }
});
