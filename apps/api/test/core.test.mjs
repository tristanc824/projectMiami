import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, SystemProgram, TransactionMessage } from '@solana/web3.js';
import { createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { formatPhone, normalizePhone } from '../lib/phone.mjs';
import { toBaseUnits } from '../lib/money.mjs';
import { assertSponsorable, buildTransferMessage } from '../lib/tx.mjs';
import { assertSoftwareKeysAllowed, decodeTransferSubmission, validateLastValidBlockHeight } from '../lib/server/transactionSecurity.mjs';
import { normalizeReviewPayload, reviewApiEndpoint } from '../lib/review.mjs';

const feePayer = Keypair.generate().publicKey;
const owner = Keypair.generate().publicKey;
const recipient = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;
const blockhash = Keypair.generate().publicKey.toBase58();
const ctx = { feePayer, owner, mint };
const compile = (instructions, payerKey = feePayer) =>
  new TransactionMessage({ payerKey, recentBlockhash: blockhash, instructions }).compileToV0Message().serialize();

test('normalizes phone numbers', () => {
  assert.equal(normalizePhone('(555) 555-0142'), '+15555550142');
  assert.equal(normalizePhone('1 555 555 0142'), '+15555550142');
  assert.equal(normalizePhone('+54 9 11 5555 0142'), '+5491155550142');
  assert.equal(normalizePhone('555-0142'), null);
  assert.equal(formatPhone('+15555550142'), '(555) 555-0142');
});

test('parses amounts', () => {
  assert.equal(toBaseUnits('20'), 20_000_000n);
  assert.equal(toBaseUnits('4.50'), 4_500_000n);
  for (const bad of ['0', '-1', 'abc', '1.1234567', '', null]) assert.equal(toBaseUnits(bad), null);
});

test('accepts the transfer the server builds', () => {
  const bytes = buildTransferMessage({ feePayer, owner, recipient, mint, amount: 5n, blockhash }).serialize();
  const { amount, destination } = assertSponsorable(bytes, ctx);
  assert.equal(amount, 5n);
  assert.ok(destination.equals(getAssociatedTokenAddressSync(mint, recipient)));
});

test('rejects a transfer signed by someone else', () => {
  const bytes = buildTransferMessage({ feePayer, owner: recipient, recipient: owner, mint, amount: 5n, blockhash }).serialize();
  assert.throws(() => assertSponsorable(bytes, ctx));
});

test('rejects draining the fee payer', () => {
  const bytes = compile([
    SystemProgram.transfer({ fromPubkey: feePayer, toPubkey: owner, lamports: 1 }),
    createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, owner), mint, getAssociatedTokenAddressSync(mint, recipient), owner, 1n, 6),
  ]);
  assert.throws(() => assertSponsorable(bytes, ctx));
});

test('rejects closing token accounts', () => {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  assert.throws(() => assertSponsorable(compile([createCloseAccountInstruction(ata, owner, owner)]), ctx));
});

test('rejects a different token', () => {
  const other = Keypair.generate().publicKey;
  const bytes = buildTransferMessage({ feePayer, owner, recipient, mint: other, amount: 5n, blockhash }).serialize();
  assert.throws(() => assertSponsorable(bytes, ctx));
});

test('rejects a different fee payer', () => {
  const bytes = buildTransferMessage({ feePayer: recipient, owner, recipient: feePayer, mint, amount: 5n, blockhash }).serialize();
  assert.throws(() => assertSponsorable(bytes, ctx));
});

test('rejects malformed and oversized transaction submissions before RPC broadcast', () => {
  const message = Buffer.from('valid message').toString('base64');
  const signature = Buffer.alloc(64, 7).toString('base64');
  assert.deepEqual(decodeTransferSubmission(message, signature), {
    message: Buffer.from('valid message'),
    signature: Buffer.alloc(64, 7),
  });
  for (const badMessage of ['', 'not base64!', Buffer.alloc(2049).toString('base64')]) {
    assert.throws(() => decodeTransferSubmission(badMessage, signature));
  }
  for (const badSignature of ['', 'not base64!', Buffer.alloc(63).toString('base64'), Buffer.alloc(65).toString('base64')]) {
    assert.throws(() => decodeTransferSubmission(message, badSignature));
  }
});

test('rejects stale or attacker-extended block expiry values', () => {
  assert.equal(validateLastValidBlockHeight(1_100, 1_000), 1_100);
  for (const bad of [999, 1_301, 1.5, '1100', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => validateLastValidBlockHeight(bad, 1_000));
  }
});

test('raw environment signing keys are devnet/localnet only', () => {
  assert.doesNotThrow(() => assertSoftwareKeysAllowed('https://api.devnet.solana.com'));
  assert.doesNotThrow(() => assertSoftwareKeysAllowed('http://127.0.0.1:8899'));
  assert.doesNotThrow(() => assertSoftwareKeysAllowed('https://custom-rpc.example', 'devnet'));
  assert.throws(() => assertSoftwareKeysAllowed('https://api.mainnet-beta.solana.com'));
  assert.throws(() => assertSoftwareKeysAllowed('https://custom-rpc.example'));
  assert.throws(() => assertSoftwareKeysAllowed('https://custom-rpc.example', 'mainnet-beta'));
});

test('review proxy forwards only allowlisted non-identity facts', () => {
  const payload = normalizeReviewPayload({
    transcript: 'Send 35 dollars to Mamá', locale: 'es-AR', mode: 'voice_send', user_id: 'do-not-forward',
    case: { recipient_in_contacts: true, phone: '+15555550142', contact_name: 'Mamá', signals: ['forged'] },
  });
  assert.deepEqual(payload, {
    transcript: 'Send 35 dollars to Mamá', incoming_message: '',
    case: { recipient_in_contacts: true, output_locale: 'es-US', standalone_transfer: true },
  });
  assert.equal(JSON.stringify(payload).includes('+15555550142'), false);
});

test('review proxy requires HTTPS except on loopback', () => {
  assert.equal(reviewApiEndpoint('http://127.0.0.1:8000'), 'http://127.0.0.1:8000/api/review');
  assert.equal(reviewApiEndpoint('https://review.example/api/review'), 'https://review.example/api/review');
  assert.throws(() => reviewApiEndpoint('http://review.example'));
  assert.throws(() => reviewApiEndpoint('not a URL'));
});

test('review proxy rejects phone and account numbers before forwarding', () => {
  assert.throws(() => normalizeReviewPayload({ transcript: 'Send 20 dollars to +1 (555) 555-0142' }));
  assert.throws(() => normalizeReviewPayload({ transcript: 'Use account GB82WEST12345698765432' }));
  assert.throws(() => normalizeReviewPayload({ transcript: 'Send 20 dollars to ３０５５５５０１４２' }), /phone or account/);
  assert.throws(() => normalizeReviewPayload({ transcript: 'Envía 80 a la cuenta 012 180 0012 3456 7890' }));
});

test('review proxy keeps money and dates that look like long numbers', () => {
  for (const transcript of ['Send $10000.00 now', 'Send 100000.50 dollars', 'Send 80 dollars on 2026-11-08', 'Send 1,000 dollars to recipient']) {
    assert.equal(normalizeReviewPayload({ transcript }).transcript, transcript);
  }
});
