import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeUsdcChange } from '../lib/history.mjs';

const mint = 'USDC';
const bal = (accountIndex, owner, amount, m = mint) => ({ accountIndex, owner, mint: m, uiTokenAmount: { amount: String(amount) } });

test('money that arrived before sign-up reads as received', () => {
  const tx = { blockTime: 1762488041, meta: { err: null, preTokenBalances: [bal(1, 'sender', 11_000_000)], postTokenBalances: [bal(1, 'sender', 6_000_000), bal(2, 'me', 5_000_000)] } };
  assert.deepEqual(summarizeUsdcChange(tx, 'me', mint, 'sig1'), { signature: 'sig1', time: new Date(1762488041000).toISOString(), direction: 'in', units: '5000000', counterparty: 'sender' });
});

test('a send reads as out with the recipient as counterparty', () => {
  const tx = { blockTime: null, meta: { err: null, preTokenBalances: [bal(1, 'me', 5_000_000), bal(2, 'them', 0)], postTokenBalances: [bal(1, 'me', 3_000_000), bal(2, 'them', 2_000_000)] } };
  const result = summarizeUsdcChange(tx, 'me', mint, 'sig2');
  assert.equal(result.direction, 'out');
  assert.equal(result.units, '2000000');
  assert.equal(result.counterparty, 'them');
  assert.equal(result.time, null);
});

test('failed transactions, other mints and unchanged balances are skipped', () => {
  assert.equal(summarizeUsdcChange({ meta: { err: { x: 1 }, preTokenBalances: [], postTokenBalances: [bal(1, 'me', 1)] } }, 'me', mint, 's'), null);
  assert.equal(summarizeUsdcChange({ meta: { err: null, preTokenBalances: [], postTokenBalances: [bal(1, 'me', 9, 'OTHER')] } }, 'me', mint, 's'), null);
  assert.equal(summarizeUsdcChange({ meta: { err: null, preTokenBalances: [bal(1, 'me', 9)], postTokenBalances: [bal(1, 'me', 9)] } }, 'me', mint, 's'), null);
  assert.equal(summarizeUsdcChange(null, 'me', mint, 's'), null);
});
