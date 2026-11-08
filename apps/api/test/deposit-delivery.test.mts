import { createRequire } from 'node:module';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
process.env.STRIPE_SECRET_KEY = 'sk_test_isolated';
const owner = Keypair.generate().publicKey.toBase58();
const transaction = Buffer.alloc(450, 7).toString('base64');
let intent: any, prepares = 0, submits: string[] = [], confirmed = false, loseResponse = false, loseFinalWrite = false;
const clone = () => structuredClone(intent);
const client = { paymentIntents: {
  retrieve: async () => clone(),
  update: async (_id: string, body: any) => {
    if (body.metadata.signature && loseFinalWrite) { loseFinalWrite = false; throw new Error('Stripe response lost'); }
    assert.ok(Object.values(body.metadata).every(value => typeof value === 'string' && value.length <= 500));
    intent.metadata = { ...intent.metadata, ...body.metadata }; return clone();
  },
} };
const require = createRequire(import.meta.url);
const cjs = require('../node_modules/stripe/cjs/resources/PaymentIntents.js');
const esm = await import('../node_modules/stripe/esm/resources/PaymentIntents.js');
for (const Resource of [cjs.PaymentIntentResource, esm.PaymentIntentResource]) {
  mock.method(Resource.prototype, 'retrieve', client.paymentIntents.retrieve);
  mock.method(Resource.prototype, 'update', client.paymentIntents.update);
}
mock.module('../lib/server/solana.mjs', { namedExports: {
  prepareTreasuryTransfer: async () => { prepares++; return { transaction, signature: 'one-chain-signature', blockhash: 'block', lastValidBlockHeight: 100 }; },
  submitTreasuryTransfer: async (prepared: any) => { assert.equal(prepared.transaction, transaction); submits.push(prepared.transaction); confirmed = true; if (loseResponse) { loseResponse = false; throw new Error('Confirmation timed out'); } return prepared.signature; },
} });
const { fulfill } = await import('../lib/server/stripe.ts');
test.beforeEach(() => { intent = { id: 'pi_test', status: 'succeeded', amount: 5000, metadata: { uid: 'user', wallet: owner } }; prepares = 0; submits = []; confirmed = false; loseResponse = false; loseFinalWrite = false; });
test('concurrent completion requests coalesce into one signed delivery and repeat completion returns the receipt', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () => fulfill(clone(), 'user')));
  assert.ok(results.every(value => value === 'one-chain-signature'));
  assert.equal(prepares, 1); assert.equal(submits.length, 1);
  await fulfill(clone(), 'user'); assert.equal(submits.length, 1);
});
test('lost chain confirmations retry the identical checkpoint rather than creating another transfer', async () => {
  loseResponse = true;
  await assert.rejects(fulfill(clone(), 'user'), /timed out/);
  assert.equal(confirmed, true); assert.equal(intent.metadata.delivery_signature, 'one-chain-signature');
  assert.equal(await fulfill(clone(), 'user'), 'one-chain-signature');
  assert.equal(prepares, 1); assert.deepEqual(submits, [transaction, transaction]);
});
test('a failed final Stripe write retains the checkpoint and cannot produce a new chain payment', async () => {
  loseFinalWrite = true;
  await assert.rejects(fulfill(clone(), 'user'), /response lost/);
  assert.equal(await fulfill(clone(), 'user'), 'one-chain-signature');
  assert.equal(prepares, 1); assert.equal(new Set(submits).size, 1);
});
test('wrong users, unpaid intents and ambiguous legacy delivery markers cannot send funds', async () => {
  await assert.rejects(fulfill(clone(), 'someone-else'), /another user/);
  intent.status = 'processing'; await assert.rejects(fulfill(clone(), 'user'), /not succeeded/);
  intent.status = 'succeeded'; intent.metadata.fulfilled = '1'; await assert.rejects(fulfill(clone(), 'user'), /older payment/);
  assert.equal(prepares, 0); assert.equal(submits.length, 0);
});
