import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Connection } from '@solana/web3.js';
let hash = 'mainnet-is-not-allowed';
mock.method(Connection.prototype, 'getGenesisHash', async () => hash);
const { requireDevnet } = await import('../lib/server/solana.mjs');
test('the shared broadcast gate refuses non-devnet genesis and allows a later valid devnet check', async () => {
  await assert.rejects(requireDevnet(), /devnet only/);
  hash = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
  await requireDevnet();
});
