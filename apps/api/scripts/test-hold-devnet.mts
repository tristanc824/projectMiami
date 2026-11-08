// Explicit devnet-only integration check. Uses disposable wallets and 0.01 test USDC.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import nacl from 'tweetnacl';
if (!process.argv.includes('--run')) throw new Error('Use --run to explicitly authorize this devnet-only integration check.');
process.loadEnvFile(fileURLToPath(new URL('../.env.local', import.meta.url)));
const chain = await import('../lib/server/solana.mjs');
const service = await import('../lib/server/holds.ts');
const { buildHoldMessage, holdAddresses } = await import('../lib/hold.mjs');
const { signTicket } = await import('../lib/review-ticket.mjs');
await chain.requireDevnet();
assert.equal((await service.holdAvailability()).available, true, 'Deploy the program before running the test');
const sender = Keypair.generate(), recipient = Keypair.generate();
const keyDir = fileURLToPath(new URL('../../../hold/keys/', import.meta.url));
mkdirSync(keyDir, { recursive: true, mode: 0o700 });
const run = randomUUID();
for (const [name, key] of [['sender', sender], ['recipient', recipient]] as const) writeFileSync(`${keyDir}test-${run}-${name}.json`, JSON.stringify(Array.from(key.secretKey)), { mode: 0o600, flag: 'wx' });
const c = chain.connection(), payer = chain.feePayer(), mint = chain.USDC_MINT;
const { state, vault } = holdAddresses(sender.publicKey, sender.publicKey, recipient.publicKey, mint);
const proof: Record<string, any> = { run, cluster: 'devnet', date: new Date().toISOString(), sender: sender.publicKey.toBase58(), recipient: recipient.publicKey.toBase58(), state: state.toBase58(), amountUSDC: '0.01', review: 'Server-signed integration fixture; live model review is verified separately.' };
const proofPath = fileURLToPath(new URL('../../../audit/hold-devnet-proof.json', import.meta.url));
function save() { writeFileSync(proofPath, JSON.stringify(proof, null, 2) + '\n'); }
function receipt(action: string, signature: string) { proof[action] = { signature, explorer: `https://explorer.solana.com/tx/${signature}?cluster=devnet` }; save(); console.log(action, proof[action].explorer); }
const before = await chain.usdcBalance(chain.treasury().publicKey);
receipt('fundDemoWallet', await chain.sendFromTreasury(sender.publicKey, 10000n));
async function action(kind: string) {
  const reviewTicket = signTicket({ purpose: 'review', owner: sender.publicKey.toBase58(), recipient: recipient.publicKey.toBase58(), amountCents: 1, held: true, reviewHash: createHash('sha256').update(randomUUID()).digest('hex') }, service.reviewSecret());
  const prepared = await service.prepareSafeHold(sender.publicKey, kind === 'deposit' ? { action: kind, reviewTicket, pin: '123456' } : { action: kind, state: state.toBase58(), pin: '123456', verified: true });
  const signature = Buffer.from(nacl.sign.detached(Buffer.from(prepared.message, 'base64'), sender.secretKey)).toString('base64');
  return service.submitSafeHold(sender.publicKey, { preparedTicket: prepared.preparedTicket, signature });
}
receipt('deposit', (await action('deposit')).signature);
assert.equal(await chain.usdcBalance(sender.publicKey), 0n);
const hold = await service.readSafeHold(state.toBase58());
assert(hold.releaseAfter > Date.now() / 1000 + 86300);
assert.equal(hold.amountCents, 1);
async function rejection(kind: string, pin: string, code: number) {
  const { blockhash } = await c.getLatestBlockhash('confirmed');
  const message = buildHoldMessage({ action: kind, feePayer: payer.publicKey, sender: sender.publicKey, approver: sender.publicKey, recipient: recipient.publicKey, mint, pin, blockhash });
  const tx = new VersionedTransaction(message); tx.sign([payer, sender]);
  const simulation = await c.simulateTransaction(tx, { sigVerify: true, commitment: 'confirmed' });
  assert.deepEqual(simulation.value.err, { InstructionError: [1, { Custom: code }] });
}
await rejection('release', '123456', 8); proof.earlyNormalReleaseRejected = 8; save();
await rejection('release-early', '999999', 3); proof.wrongPinRejected = 3; save();
receipt('refund', (await action('refund')).signature);
assert.equal(await chain.usdcBalance(sender.publicKey), 10000n);
assert.equal(await c.getAccountInfo(state), null);
assert.equal(await c.getAccountInfo(vault), null);
proof.fullRefundVerified = true; save();
receipt('overrideDeposit', (await action('deposit')).signature);
receipt('earlyOverride', (await action('release-early')).signature);
assert.equal(await chain.usdcBalance(recipient.publicKey), 10000n);
assert.equal(await c.getAccountInfo(state), null);
proof.correctRecipientVerified = true; save();
const cleanup = await chain.prepareTransfer(recipient.publicKey, chain.treasury().publicKey, 10000n);
const cleanupSignature = Buffer.from(nacl.sign.detached(Buffer.from(cleanup.message, 'base64'), recipient.secretKey)).toString('base64');
receipt('returnTestUSDC', await chain.submitTransfer(recipient.publicKey, cleanup.message, cleanupSignature, cleanup.lastValidBlockHeight));
assert.equal(await chain.usdcBalance(chain.treasury().publicKey), before);
proof.treasuryTestUSDCUnchanged = true; save();
console.log('PASS: real devnet deposit, 24h policy, early rejection, wrong PIN, full Undo refund and explicit sender override.');
