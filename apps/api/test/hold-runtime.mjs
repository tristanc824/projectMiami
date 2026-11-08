// Explicit local-only runtime check; never discovered by the ordinary unit-test command.
import assert from 'node:assert/strict';
import { Connection, Keypair, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, getAccount } from '@solana/spl-token';
import { buildHoldMessage, holdAddresses, decodeHold, HOLD_PROGRAM_ID } from '../lib/hold.mjs';

const rpc = 'http://127.0.0.1:18999';
const connection = new Connection(rpc, 'confirmed');
const payer = Keypair.generate(), sender = Keypair.generate(), recipient = Keypair.generate(), stranger = Keypair.generate();
async function confirm(signature) { const result = await connection.confirmTransaction(signature, 'confirmed'); assert.equal(result.value.err, null); }
async function run(action, mint, pin = '123456', signer = sender) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const message = buildHoldMessage({ action, feePayer: payer.publicKey, sender: sender.publicKey, approver: sender.publicKey, recipient: recipient.publicKey, mint, amount: 5_000_000n, reviewHash: 'ab'.repeat(32), pin, blockhash });
  const tx = new VersionedTransaction(message);
  if (signer === sender) tx.sign([payer, sender]);
  else { tx.sign([payer]); tx.signatures[1] = new Uint8Array(64); }
  const simulation = await connection.simulateTransaction(tx, { sigVerify: signer === sender });
  return { tx, simulation, blockhash, lastValidBlockHeight };
}
async function sendPrepared(prepared) {
  assert.equal(prepared.simulation.value.err, null, JSON.stringify(prepared.simulation.value));
  const signature = await connection.sendTransaction(prepared.tx);
  const result = await connection.confirmTransaction({ signature, blockhash: prepared.blockhash, lastValidBlockHeight: prepared.lastValidBlockHeight }, 'confirmed');
  assert.equal(result.value.err, null);
}
assert((await connection.getAccountInfo(HOLD_PROGRAM_ID))?.executable, 'Local program must be loaded');
await confirm(await connection.requestAirdrop(payer.publicKey, 10_000_000_000));
const mint = await createMint(connection, payer, payer.publicKey, null, 6);
const source = await getOrCreateAssociatedTokenAccount(connection, payer, mint, sender.publicKey);
const destination = await getOrCreateAssociatedTokenAccount(connection, payer, mint, recipient.publicKey);
await mintTo(connection, payer, mint, source.address, payer, 20_000_000n);
const { state, vault } = holdAddresses(sender.publicKey, sender.publicKey, recipient.publicKey, mint);
await sendPrepared(await run('deposit', mint));
assert.equal((await getAccount(connection, source.address)).amount, 15_000_000n);
assert.equal((await getAccount(connection, vault)).amount, 5_000_000n);
const decoded = decodeHold(state, await connection.getAccountInfo(state), mint);
assert.equal(decoded.amountCents, 500);
assert(decoded.releaseAfter > Date.now() / 1000 + 86300);
console.log('PASS: actual program locks exact funds in a self-approved 24-hour vault');
const earlyNormal = await run('release', mint);
assert.deepEqual(earlyNormal.simulation.value.err, { InstructionError: [1, { Custom: 8 }] });
console.log('PASS: normal release is rejected before 24 hours (exact TOO_EARLY error)');
const wrongPin = await run('release-early', mint, '999999');
assert.deepEqual(wrongPin.simulation.value.err, { InstructionError: [1, { Custom: 3 }] });
console.log('PASS: explicit early override still rejects the wrong PIN');
const unsigned = await run('release-early', mint, '123456', stranger);
// Solana 1.18 rejects invalid signatures at the RPC boundary; newer validators
// may return SignatureFailure inside the simulation result instead.
let signatureRejected = false;
try {
  const unsignedResult = await connection.simulateTransaction(unsigned.tx, { sigVerify: true });
  signatureRejected = unsignedResult.value.err === 'SignatureFailure';
} catch (error) {
  signatureRejected = /signature verification failure/i.test(error.message);
}
assert(signatureRejected, 'The validator must reject the missing sender signature');
console.log('PASS: a stranger cannot release without the sender signature');
await sendPrepared(await run('refund', mint));
assert.equal((await getAccount(connection, source.address)).amount, 20_000_000n);
assert.equal(await connection.getAccountInfo(state), null);
console.log('PASS: sender cancels and receives all held funds; state closes');
await sendPrepared(await run('deposit', mint));
await sendPrepared(await run('release-early', mint));
assert.equal((await getAccount(connection, destination.address)).amount, 5_000_000n);
assert.equal(await connection.getAccountInfo(state), null);
console.log('PASS: explicit sender override delivers to the correct recipient and closes the hold');
console.log('Local runtime checks passed. No devnet or user wallet was used.');
