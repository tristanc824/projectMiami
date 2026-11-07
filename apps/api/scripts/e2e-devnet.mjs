// Runs the real money path on devnet with throwaway wallets: deposit, sponsored send, and return to treasury.
import fs from 'node:fs';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';

for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i > 0) process.env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const { connection, feePayer, prepareTransfer, sendFromTreasury, submitTransfer, treasury, usdcBalance } = await import('../lib/server/solana.mjs');

const explorer = (s) => `https://explorer.solana.com/tx/${s}?cluster=devnet`;
const usd = (u) => Number(u) / 1e6;
const send = async (from, to, amount) => {
  const { message, lastValidBlockHeight } = await prepareTransfer(from.publicKey, to, amount);
  const signature = nacl.sign.detached(Buffer.from(message, 'base64'), from.secretKey);
  return submitTransfer(from.publicKey, message, Buffer.from(signature).toString('base64'), lastValidBlockHeight);
};

const a = Keypair.generate();
const b = Keypair.generate();
const payerBefore = await connection().getBalance(feePayer().publicKey);
console.log('deposit', explorer(await sendFromTreasury(a.publicKey, 50_000n)));
console.log('send   ', explorer(await send(a, b.publicKey, 20_000n)));
console.log('return ', explorer(await send(a, treasury().publicKey, 30_000n)));
console.log('A', usd(await usdcBalance(a.publicKey)), 'B', usd(await usdcBalance(b.publicKey)));
console.log('A SOL', await connection().getBalance(a.publicKey), 'B SOL', await connection().getBalance(b.publicKey));
console.log('fee payer spent SOL', (payerBefore - (await connection().getBalance(feePayer().publicKey))) / 1e9);
console.log('treasury USDC', usd(await usdcBalance(treasury().publicKey)));
process.exit(0);
