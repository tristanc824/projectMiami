import test from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, TransactionMessage } from '@solana/web3.js';
import { buildHoldMessage, holdAddresses, decodeHold, HOLD_PROGRAM_ID } from '../lib/hold.mjs';
import { signTicket, verifyTicket } from '../lib/review-ticket.mjs';

const key = () => Keypair.generate().publicKey;
const sender = key(), recipient = key(), payer = key(), mint = key();
const args = { feePayer: payer, sender, approver: sender, recipient, mint, amount: 50000000n, pin: '123456', reviewHash: 'ab'.repeat(32), blockhash: key().toBase58() };
test('self-approved deposits lock exact funds for 24 hours with one user signer', () => {
  const message = buildHoldMessage({ ...args, action: 'deposit' });
  assert.equal(message.header.numRequiredSignatures, 2);
  const { instructions: [ix] } = TransactionMessage.decompile(message);
  assert(ix.programId.equals(HOLD_PROGRAM_ID));
  assert.equal(ix.data.length, 81);
  assert.equal(ix.data[0], 0);
  assert.equal(ix.data.readBigUInt64LE(1), 50000000n);
  assert.equal(ix.data.readBigUInt64LE(41), 86400n);
  assert.equal(ix.data.subarray(49).toString('hex'), 'ab'.repeat(32));
  assert(ix.keys[1].pubkey.equals(sender)); assert(ix.keys[2].pubkey.equals(sender));
});
test('ordinary release, deliberate early override and cancellation use different instructions', () => {
  for (const [action, tag] of [['refund', 1], ['release', 2], ['release-early', 3]]) {
    const message = buildHoldMessage({ ...args, action });
    assert.equal(message.header.numRequiredSignatures, 2);
    const { instructions } = TransactionMessage.decompile(message);
    const ix = instructions.at(-1);
    assert.equal(ix.data[0], tag);
    assert.equal(ix.data.length, action === 'refund' ? 1 : 7);
    assert(ix.keys[1].pubkey.equals(sender));
  }
  assert.throws(() => buildHoldMessage({ ...args, action: 'release-early', approver: key() }), /self-approved/);
});
test('bad PINs, amounts, review hashes and self-payments never produce a deposit', () => {
  for (const change of [{ pin: '' }, { pin: 'abcdef' }, { amount: 0n }, { amount: -1n }, { amount: 100000000001n }, { reviewHash: '00'.repeat(32) }, { reviewHash: 'invalid' }, { recipient: sender }]) {
    assert.throws(() => buildHoldMessage({ ...args, action: 'deposit', ...change }));
  }
});
test('hold decoding checks owner, layout, token, PDAs, amount and timer', () => {
  const { state, vault } = holdAddresses(sender, sender, recipient, mint);
  const data = Buffer.alloc(243); data[0] = 1;
  for (const [offset, value] of [[1, sender], [33, sender], [65, recipient], [97, mint], [129, vault]]) value.toBuffer().copy(data, offset);
  data.writeBigUInt64LE(50000000n, 161); data.writeBigInt64LE(1900000000n, 202); data[242] = 1;
  assert.equal(decodeHold(state, { owner: HOLD_PROGRAM_ID, data }, mint).amountCents, 5000);
  assert.throws(() => decodeHold(state, { owner: key(), data }, mint));
  assert.throws(() => decodeHold(key(), { owner: HOLD_PROGRAM_ID, data }, mint));
  assert.throws(() => decodeHold(state, { owner: HOLD_PROGRAM_ID, data: data.subarray(0, 242) }, mint));
  assert.throws(() => decodeHold(state, { owner: HOLD_PROGRAM_ID, data }, key()));
});
test('review receipts cannot be forged, edited, reused for another purpose or expired', () => {
  const secret = 'a'.repeat(32);
  const ticket = signTicket({ purpose: 'review', owner: sender.toBase58(), amountCents: 5000 }, secret);
  assert.equal(verifyTicket(ticket, secret, 'review').amountCents, 5000);
  assert.throws(() => verifyTicket(ticket, 'b'.repeat(32), 'review'));
  assert.throws(() => verifyTicket(ticket, secret, 'hold-action'));
  assert.throws(() => verifyTicket(signTicket({ purpose: 'review' }, secret, -1), secret, 'review'));
  const [payload, signature] = ticket.split('.');
  const edited = JSON.parse(Buffer.from(payload, 'base64url').toString()); edited.amountCents = 1;
  assert.throws(() => verifyTicket(`${Buffer.from(JSON.stringify(edited)).toString('base64url')}.${signature}`, secret, 'review'));
});
