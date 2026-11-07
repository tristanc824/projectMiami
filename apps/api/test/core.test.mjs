import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, SystemProgram, TransactionMessage } from '@solana/web3.js';
import { createCloseAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { formatPhone, normalizePhone } from '../lib/phone.mjs';
import { toBaseUnits } from '../lib/money.mjs';
import { assertSponsorable, buildTransferMessage } from '../lib/tx.mjs';

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
