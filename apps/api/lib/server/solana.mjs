import {
  Connection,
  Keypair,
  PublicKey,
  SendTransactionError,
  TransactionExpiredBlockheightExceededError,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import bs58 from 'bs58';
import { USDC_DECIMALS } from '../money.mjs';
import { assertSponsorable, buildTransferMessage } from '../tx.mjs';

export const USDC_MINT = new PublicKey(process.env.USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

let conn;
export function connection() {
  conn ??= new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  return conn;
}

function keypair(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return Keypair.fromSecretKey(value.startsWith('[') ? Uint8Array.from(JSON.parse(value)) : bs58.decode(value));
}
export const treasury = () => keypair('TREASURY_SECRET_KEY');
export const feePayer = () => keypair('FEE_PAYER_SECRET_KEY');

// A missing token account is a zero balance. An RPC failure is not: it throws,
// so a flaky node cannot make a funded wallet look empty.
export async function usdcBalance(owner) {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  if (!(await connection().getAccountInfo(ata))) return 0n;
  const { value } = await connection().getTokenAccountBalance(ata);
  return BigInt(value.amount);
}

// The transaction was handed to the network but its outcome is unknown, so the
// money may have moved. Callers must not retry with a new transaction.
export class SubmittedError extends Error {
  constructor(signature, cause) {
    super('SUBMITTED_UNCONFIRMED');
    this.signature = signature;
    this.cause = cause;
  }
}

// Sends a fully signed transaction and waits for confirmation. Throws a plain
// Error only when the money definitely did not move, and SubmittedError when it might have.
async function broadcast(tx, blockhash, lastValidBlockHeight) {
  const signature = bs58.encode(tx.signatures[0]);
  try {
    await connection().sendTransaction(tx);
  } catch (err) {
    if (err instanceof SendTransactionError) throw err; // refused in preflight, never sent
    throw new SubmittedError(signature, err);
  }
  let value;
  try {
    ({ value } = await connection().confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed'));
  } catch (err) {
    if (err instanceof TransactionExpiredBlockheightExceededError) throw new Error('Transaction expired before it landed');
    throw new SubmittedError(signature, err);
  }
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
  return broadcast(tx, blockhash, lastValidBlockHeight);
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
// lastValidBlockHeight comes from the network, not the client: the message's blockhash is no newer than the
// latest one, so the latest expiry is a safe upper bound, and a client value of 0 cannot fake an expiry.
export async function submitTransfer(owner, messageB64, signatureB64) {
  if (typeof messageB64 !== 'string' || typeof signatureB64 !== 'string') throw new Error('Missing transaction');
  const payer = feePayer();
  const { message } = assertSponsorable(Buffer.from(messageB64, 'base64'), {
    feePayer: payer.publicKey,
    owner,
    mint: USDC_MINT,
  });
  const tx = new VersionedTransaction(message);
  tx.addSignature(owner, Buffer.from(signatureB64, 'base64'));
  tx.sign([payer]);
  const { lastValidBlockHeight } = await connection().getLatestBlockhash();
  return broadcast(tx, message.recentBlockhash, lastValidBlockHeight);
}
