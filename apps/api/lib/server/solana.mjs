import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { USDC_DECIMALS } from '../money.mjs';
import { assertSponsorable, buildTransferMessage } from '../tx.mjs';
import { assertSoftwareKeysAllowed, decodeTransferSubmission, validateLastValidBlockHeight } from './transactionSecurity.mjs';

export const USDC_MINT = new PublicKey(process.env.USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
const DEFAULT_RPC = 'https://api.devnet.solana.com';

let conn;
export function connection() {
  conn ??= new Connection(process.env.SOLANA_RPC_URL || DEFAULT_RPC, 'confirmed');
  return conn;
}

function keypair(name) {
  assertSoftwareKeysAllowed();
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return Keypair.fromSecretKey(value.startsWith('[') ? Uint8Array.from(JSON.parse(value)) : bs58.decode(value));
}
export const treasury = () => keypair('TREASURY_SECRET_KEY');
export const feePayer = () => keypair('FEE_PAYER_SECRET_KEY');

export async function usdcBalance(owner) {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  try {
    const { value } = await connection().getTokenAccountBalance(ata);
    return BigInt(value.amount);
  } catch {
    return 0n;
  }
}

async function confirm(signature, blockhash, lastValidBlockHeight) {
  const { value } = await connection().confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (value.err) throw new Error('Transaction failed on the network');
  return signature;
}

// Treasury pays its own fees: this stands in for a deposit provider delivering USDC.
export async function sendFromTreasury(recipient, amount) {
  const from = treasury();
  if ((await usdcBalance(from.publicKey)) < amount) throw new Error('TREASURY_LOW');
  const source = getAssociatedTokenAddressSync(USDC_MINT, from.publicKey);
  const destination = getAssociatedTokenAddressSync(USDC_MINT, recipient);
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: from.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        createAssociatedTokenAccountIdempotentInstruction(from.publicKey, destination, recipient, USDC_MINT),
        createTransferCheckedInstruction(source, USDC_MINT, destination, from.publicKey, amount, USDC_DECIMALS),
      ],
    }).compileToV0Message(),
  );
  tx.sign([from]);
  return confirm(await connection().sendTransaction(tx), blockhash, lastValidBlockHeight);
}

export async function prepareTransfer(owner, recipient, amount) {
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash();
  const message = buildTransferMessage({
    feePayer: feePayer().publicKey,
    owner,
    recipient,
    mint: USDC_MINT,
    amount,
    blockhash,
  });
  return { message: Buffer.from(message.serialize()).toString('base64'), lastValidBlockHeight };
}

// The user's signature is required: without it the network rejects the transaction, so this cannot move their funds.
export async function submitTransfer(owner, messageB64, signatureB64, lastValidBlockHeight) {
  const payer = feePayer();
  const submission = decodeTransferSubmission(messageB64, signatureB64);
  const currentBlockHeight = await connection().getBlockHeight('confirmed');
  validateLastValidBlockHeight(lastValidBlockHeight, currentBlockHeight);
  const { message } = assertSponsorable(submission.message, {
    feePayer: payer.publicKey,
    owner,
    mint: USDC_MINT,
  });
  const tx = new VersionedTransaction(message);
  tx.addSignature(owner, submission.signature);
  tx.sign([payer]);
  return confirm(await connection().sendTransaction(tx), message.recentBlockhash, lastValidBlockHeight);
}
