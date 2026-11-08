import test from 'node:test';
import assert from 'node:assert/strict';
import { incomingPayment, createIncomingReader } from '../lib/incoming.mjs';
const args = { owner: 'recipient', mint: 'usdc', tokenAccount: 'recipient-ata', signature: 'same-sender-signature' };
function transaction({ before = '10000000', after = '22500000', mint = 'usdc', owner = 'recipient', err = null } = {}) {
  return { blockTime: 1794100000, transaction: { signatures: [args.signature], message: { accountKeys: [{ pubkey: 'sender-ata' }, { pubkey: 'recipient-ata' }] } }, meta: { err, preTokenBalances: before === null ? [] : [{ accountIndex: 1, mint, owner, uiTokenAmount: { amount: before, decimals: 6 } }], postTokenBalances: [{ accountIndex: 1, mint, owner, uiTokenAmount: { amount: after, decimals: 6 } }] } };
}
test('incoming receipt preserves the exact signature and confirmed time used by the sender', () => {
  assert.deepEqual(incomingPayment(transaction(), args), { signature: args.signature, amountCents: 1250, createdAt: new Date(1794100000000).toISOString() });
});
test('first payment into a newly created token account is included', () => {
  assert.equal(incomingPayment(transaction({ before: null, after: '50000000' }), args).amountCents, 5000);
});
test('failed, outgoing, zero, other-token, other-owner and malformed transfers are excluded', () => {
  for (const changes of [{ err: { InstructionError: [0, 'failure'] } }, { after: '5000000' }, { after: '10000000' }, { mint: 'other-token' }, { owner: 'someone-else' }, { after: 'not-a-number' }]) assert.equal(incomingPayment(transaction(changes), args), null);
  assert.equal(incomingPayment({ ...transaction(), blockTime: null }, args), null);
  assert.equal(incomingPayment(transaction(), { ...args, signature: 'different-signature' }), null);
});
test('reader coalesces polling, caches parsed transactions and retries temporarily unindexed signatures', async () => {
  let signatureReads = 0, parsedReads = 0, indexed = false;
  const connection = { rpcEndpoint: 'test-devnet', getSignaturesForAddress: async () => { signatureReads++; return [{ signature: args.signature, err: null }]; }, getParsedTransactions: async (_signatures, options) => { parsedReads++; assert.equal(options.maxSupportedTransactionVersion, 1); return [indexed ? transaction() : null]; } };
  const read = createIncomingReader({ ttlMs: 0 });
  const first = await Promise.all([read(connection, args), read(connection, args)]);
  assert.deepEqual(first, [[], []]); assert.equal(signatureReads, 1); assert.equal(parsedReads, 1);
  indexed = true;
  assert.equal((await read(connection, args))[0].signature, args.signature);
  await read(connection, args);
  assert.equal(parsedReads, 2, 'A resolved transaction is not repeatedly re-parsed');
});

test('confirmed outgoing payments preserve the chain signature and reject failed or wrong-owner debits', async () => {
  const { outgoingPayment } = await import('../lib/incoming.mjs');
  assert.equal(outgoingPayment(transaction({ after: '5000000' }), args).amountCents, 500);
  assert.equal(outgoingPayment(transaction({ after: '5000000', err: 'failed' }), args), null);
  assert.equal(outgoingPayment(transaction({ after: '5000000', owner: 'another' }), args), null);
  const read = createIncomingReader({ includeOutgoing: true });
  const rows = await read({ rpcEndpoint: 'test', getSignaturesForAddress: async () => [{ signature: args.signature, err: null }], getParsedTransactions: async () => [transaction({ after: '5000000' })] }, args);
  assert.equal(rows[0].kind, 'send'); assert.equal(rows[0].signature, args.signature);
});
