import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { PendingTransaction } from '../lib/pending.mjs';
import { dayKey } from '../lib/sms.mjs';
import { SmsStore } from '../lib/server/textStore.mjs';
const store = new SmsStore(':memory:');
mock.module('../lib/server/textStore.mjs', { namedExports: { smsStore: () => store, activeTextPayment: (owner: string) => store.active(owner), textMessageKey: (id: string) => id } });
const sender = Keypair.generate().publicKey.toBase58(), recipient = Keypair.generate().publicKey.toBase58();
const user: any = { id: 'owner', custom_metadata: { tp_on: true, tp_pin: 'hash' } };
let preparedCount = 0, confirmed = false;
const replayed: string[] = [];
const prepared = { transaction: 'signed-original-bytes', signature: 'original-signature', blockhash: 'blockhash', lastValidBlockHeight: 100 };
mock.module('../lib/server/http.ts', { namedExports: { allow: () => true } });
mock.module('../lib/server/privy.ts', { namedExports: { userByPhone: async (phone: string) => phone === '+13055550123' ? user : { id: 'recipient' }, createUserForPhone: async () => { throw new Error('Not needed'); } } });
mock.module('../lib/server/solana.mjs', { namedExports: {
  usdcBalance: async () => 10_000_000n,
  connection: () => ({ getSignatureStatuses: async () => ({ value: [confirmed ? { err: null, confirmationStatus: 'confirmed' } : null] }), getBlockHeight: async () => 90 }),
} });
mock.module('../lib/server/signer.mjs', { namedExports: {
  checkPin: () => true, textPaymentsReady: () => true,
  embeddedSolanaWallet: (who: any) => ({ walletId: who.id, address: who.id === 'owner' ? sender : recipient }),
  setTextSettings: async (_who: any, changes: any) => { user.custom_metadata = { ...user.custom_metadata, ...changes }; return user.custom_metadata; },
  sendWithServerSigner: async (options: any) => {
    if (!options.checkpoint) { preparedCount++; await options.onPrepared(prepared); }
    replayed.push(options.checkpoint?.transaction || prepared.transaction);
    throw new PendingTransaction(prepared.signature, 100);
  },
} });
const { handleText } = await import('../lib/server/textPayments.ts');
test('concurrent webhook retries reuse one durable SMS checkpoint, never refund uncertain spending, and later acknowledge the same receipt', async () => {
  const replies: string[] = [], reply = async (_to: string, text: string) => { replies.push(text); };
  const send = (id: string) => handleText('+13055550123', 'SEND 2 +13055550100 PIN 4821', reply, id);
  await Promise.all([send('gateway-1'), send('gateway-1')]);
  assert.equal(preparedCount, 1); assert.deepEqual(replayed, [prepared.transaction, prepared.transaction]);
  assert.equal(store.spent('owner', dayKey()), 2_000_000n);
  assert.ok(replies.every(text => /pending/i.test(text) && text.includes('original-signature')));
  await send('gateway-2');
  assert.equal(preparedCount, 1); assert.match(replies.at(-1)!, /previous payment is pending/);
  confirmed = true;
  await send('gateway-1');
  assert.match(replies.at(-1)!, /previous payment is confirmed/);
  await send('gateway-1');
  assert.match(replies.at(-1)!, /already processed/);
  assert.equal(preparedCount, 1); assert.equal(store.spent('owner', dayKey()), 2_000_000n);
});
