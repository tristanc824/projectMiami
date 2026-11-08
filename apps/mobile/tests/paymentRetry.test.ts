import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
process.env.EXPO_PUBLIC_DAT_API_URL = 'https://nest.test';
const module = import('../src/services/dat');
const getToken = async () => 'session';
test('a lost submit response retries identical signed bytes without preparing or signing a second transfer', async () => {
  const dat = await module;
  const attempt: import('../src/services/dat').TransferAttempt = {};
  let prepares = 0, signs = 0, submits = 0;
  const submitted: string[] = [];
  const fetchMock = mock.method(globalThis, 'fetch', async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (String(url).endsWith('/prepare')) { prepares++; return Response.json({ message: 'AQID', lastValidBlockHeight: 100 }); }
    submits++; submitted.push(init!.body as string);
    if (submits === 1) throw new TypeError('Network response lost after broadcast');
    return Response.json({ signature: 'confirmed-signature' });
  });
  const sign = async () => { signs++; return Buffer.alloc(64, 7).toString('base64'); };
  try {
    await assert.rejects(dat.transfer(getToken, sign, { recipient: 'wallet' }, 500, attempt), /reach/);
    assert.equal(await dat.transfer(getToken, sign, { recipient: 'wallet' }, 500, attempt), 'confirmed-signature');
    assert.equal(prepares, 1); assert.equal(signs, 1); assert.deepEqual(submitted, [submitted[0], submitted[0]]);
  } finally { fetchMock.mock.restore(); }
});
test('malformed successful responses cannot create a false success receipt', async () => {
  const dat = await module;
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({}));
  try { await assert.rejects(dat.depositTestCard(getToken, 50, 'operation-1'), /confirmation was incomplete/); }
  finally { fetchMock.mock.restore(); }
});
test('server PIN expiry notifies the PIN gate rather than leaving the user stuck on payment review', async () => {
  const dat = await module;
  let locks = 0;
  const unsubscribe = dat.onPinRequired(() => { locks++; });
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json({ error: 'Unlock Nest', code: 'PIN_REQUIRED' }, { status: 401 }));
  try { await assert.rejects(dat.post(getToken, '/api/transfer/prepare', {}), /Unlock/); assert.equal(locks, 1); }
  finally { unsubscribe(); fetchMock.mock.restore(); }
});

test('an unresponsive account request times out and can be retried instead of spinning forever', async context => {
  const dat = await module;
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const fetchMock = mock.method(globalThis, 'fetch', async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }));
  try {
    const failure = assert.rejects(dat.call('/api/account/pin', { method: 'GET' }), /took too long/);
    context.mock.timers.tick(15_001);
    await failure;
  } finally { fetchMock.mock.restore(); context.mock.timers.reset(); }
});

test('pending responses and lost submit responses retain the prospective transaction signature instead of reporting success', async () => {
  const dat = await module;
  let pendingReply = true;
  const fetchMock = mock.method(globalThis, 'fetch', async (_url: Parameters<typeof fetch>[0], init?: RequestInit) => {
    if (pendingReply) return Response.json({ status: 'pending', signature: 'chain-signature', lastValidBlockHeight: 100 }, { status: 202 });
    throw new TypeError('Network response lost');
  });
  try {
    await assert.rejects(dat.transfer(getToken, async () => Buffer.alloc(64, 7).toString('base64'), { recipient: 'wallet' }, 500, { prepared: { message: 'AQID', lastValidBlockHeight: 100 } }), (error: unknown) => error instanceof dat.PendingPayment && error.signature === 'chain-signature');
    pendingReply = false;
    // A real 64-byte base58 signature from a prepared fee-payer message.
    const { getBase58Decoder } = await import('@solana/kit');
    const transactionSignature = getBase58Decoder().decode(new Uint8Array(64).fill(7));
    await assert.rejects(dat.transfer(getToken, async () => Buffer.alloc(64, 7).toString('base64'), { recipient: 'wallet' }, 500, { prepared: { message: 'AQID', lastValidBlockHeight: 100, transactionSignature } }), (error: unknown) => error instanceof dat.PendingPayment && error.signature === transactionSignature);
  } finally { fetchMock.mock.restore(); }
});

test('malformed pending-status replies never invent a confirmation or crash reconciliation', async () => {
  const dat = await module;
  let body: unknown = { transactions: null };
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(body));
  try {
    await assert.rejects(dat.fetchPendingPayments(getToken, []), /temporarily unavailable/);
    body = { transactions: [null, { signature: 'one', status: 'confirmed' }, { signature: 'two', status: 'paid' }, { signature: 'three', status: 'pending' }] };
    assert.deepEqual((await dat.fetchPendingPayments(getToken, [])).transactions, [{ signature: 'three', status: 'pending' }]);
  } finally { fetchMock.mock.restore(); }
});
