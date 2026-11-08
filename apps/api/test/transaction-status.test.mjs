import test from 'node:test';
import assert from 'node:assert/strict';
import bs58 from 'bs58';
import { validPendingTransactions, readTransactionStatuses } from '../lib/transaction-status.mjs';
const signature = bs58.encode(Buffer.alloc(64, 7));
const item = { signature, kind: 'send', amountCents: 500, lastValidBlockHeight: 100 };
const options = { owner: 'owner', mint: 'mint', tokenAccount: 'ata' };
const balance = (amount, owner = 'owner') => ({ accountIndex: 0, mint: 'mint', owner, uiTokenAmount: { amount, decimals: 6 } });
const tx = { blockTime: 1794120000, transaction: { signatures: [signature], message: { accountKeys: [{ pubkey: 'ata' }] } }, meta: { err: null, preTokenBalances: [balance('10000000')], postTokenBalances: [balance('5000000')] } };
test('pending status only becomes confirmed after matching the wallet, mint and exact token delta', async () => {
  const connection = { getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: 'confirmed' }] }), getParsedTransactions: async () => [tx] };
  assert.equal((await readTransactionStatuses(connection, [item], options))[0].status, 'confirmed');
  for (const overrides of [{ owner: 'other' }, { mint: 'other' }, { tokenAccount: 'other' }]) assert.equal((await readTransactionStatuses(connection, [item], { ...options, ...overrides }))[0].status, 'pending');
  assert.equal((await readTransactionStatuses(connection, [{ ...item, amountCents: 600 }], options))[0].status, 'pending');
  connection.getParsedTransactions = async () => [null];
  assert.equal((await readTransactionStatuses(connection, [item], options))[0].status, 'pending');
});
test('processed transactions stay pending; chain failure and finalized expiry resolve without invented success', async () => {
  let value = null, height = 90;
  const connection = { getSignatureStatuses: async () => ({ value: [value] }), getBlockHeight: async () => height };
  assert.equal((await readTransactionStatuses(connection, [item], options))[0].status, 'pending');
  height = 101;
  assert.equal((await readTransactionStatuses(connection, [item], options))[0].status, 'expired');
  value = { err: null, confirmationStatus: 'processed' };
  assert.equal((await readTransactionStatuses(connection, [item], options))[0].status, 'pending');
  value = { err: { InstructionError: [0, 1] }, confirmationStatus: 'confirmed' };
  assert.equal((await readTransactionStatuses(connection, [item], options))[0].status, 'failed');
});
test('status requests reject malformed signatures, unlimited batches, wrong kinds and invalid expiry heights', () => {
  assert.deepEqual(validPendingTransactions([item]), [item]);
  for (const value of [[], new Array(21).fill(item), [{ ...item, signature: 'bad' }], [{ ...item, kind: 'receive' }], [{ ...item, lastValidBlockHeight: 0 }], [{ ...item, amountCents: -1 }]]) assert.throws(() => validPendingTransactions(value));
});
