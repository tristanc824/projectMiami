import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PendingTransaction } from '../pending.mjs';
import { USDC_DECIMALS } from '../money.mjs';
import { assertSponsorable, buildTransferMessage } from '../tx.mjs';
import { summarizeUsdcChange } from '../history.mjs';

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

export async function usdcBalance(owner) {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  try {
    const { value } = await connection().getTokenAccountBalance(ata);
    return BigInt(value.amount);
  } catch (error) {
    // A missing token account is a zero balance; an RPC failure is not.
    if (await connection().getAccountInfo(ata) === null) return 0n;
    throw error;
  }
}

// Recent USDC movements for a wallet, read from the chain, newest first.
// This includes money that arrived before the owner signed up (a wallet waiting for a phone number).
export async function usdcHistory(owner, limit = 25) {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, owner);
  const signatures = (await connection().getSignaturesForAddress(ata, { limit })).filter((s) => !s.err);
  if (!signatures.length) return [];
  const txs = await connection().getParsedTransactions(signatures.map((s) => s.signature), { maxSupportedTransactionVersion: 0, commitment: 'confirmed' });
  return signatures
    .map((s, i) => summarizeUsdcChange(txs[i], owner.toBase58(), USDC_MINT.toBase58(), s.signature))
    .filter(Boolean);
}

async function confirm(signature, blockhash, lastValidBlockHeight) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const { value } = await connection().confirmTransaction({ signature, blockhash, lastValidBlockHeight, abortSignal: controller.signal }, 'confirmed');
    if (value.err) throw new Error('Transaction failed on the network');
    return signature;
  } finally { clearTimeout(timer); }
}
let devnetCheck;
export async function requireDevnet() {
  devnetCheck ??= connection().getGenesisHash().then(hash => {
    if (hash !== 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG') throw new Error('Nest payments are available on Solana devnet only.');
  }).catch(error => { devnetCheck = undefined; throw error; });
  return devnetCheck;
}

// Treasury pays its own fees: this stands in for a deposit provider delivering USDC.
export async function prepareTreasuryTransfer(recipient, amount) {
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
  return { transaction: Buffer.from(tx.serialize()).toString('base64'), signature: bs58.encode(tx.signatures[0]), blockhash, lastValidBlockHeight };
}

// The chain signature is deterministic for these signed bytes. Check it before every replay.
export async function sendConfirmed(tx, blockhash, lastValidBlockHeight) {
  await requireDevnet();
  const signature = bs58.encode(tx.signatures[0]);
  const status = async () => (await connection().getSignatureStatuses([signature], { searchTransactionHistory: true })).value[0];
  const successful = value => value && !value.err && ['confirmed', 'finalized'].includes(value.confirmationStatus);
  let previous;
  try { previous = await status(); } catch { throw new PendingTransaction(signature, lastValidBlockHeight); }
  if (previous?.err) throw Object.assign(new Error('This transaction failed on Solana. Start a new payment.'), { code: 'TRANSACTION_FAILED', signature });
  if (successful(previous)) return signature;
  try {
    await connection().sendTransaction(tx, { skipPreflight: false, maxRetries: 2 });
    return await confirm(signature, blockhash, lastValidBlockHeight);
  } catch {
    let observed;
    try { observed = await status(); } catch { throw new PendingTransaction(signature, lastValidBlockHeight); }
    if (successful(observed)) return signature;
    if (observed?.err) throw Object.assign(new Error('This transaction failed on Solana. Check Activity before starting a new payment.'), { code: 'TRANSACTION_FAILED', signature });
    throw new PendingTransaction(signature, lastValidBlockHeight);
  }
}

export async function submitTreasuryTransfer(prepared) {
  const tx = VersionedTransaction.deserialize(Buffer.from(prepared.transaction, 'base64'));
  if (bs58.encode(tx.signatures[0]) !== prepared.signature) throw new Error('Funding transaction reference mismatch.');
  return sendConfirmed(tx, prepared.blockhash, prepared.lastValidBlockHeight);
}

export async function sendFromTreasury(recipient, amount) {
  return submitTreasuryTransfer(await prepareTreasuryTransfer(recipient, amount));
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
  return { message: Buffer.from(message.serialize()).toString('base64'), lastValidBlockHeight, transactionSignature: bs58.encode(nacl.sign.detached(message.serialize(), feePayer().secretKey)) };
}

// The user's signature is required: without it the network rejects the transaction, so this cannot move their funds.
export async function submitTransfer(owner, messageB64, signatureB64, lastValidBlockHeight) {
  const payer = feePayer();
  const { message } = assertSponsorable(Buffer.from(messageB64, 'base64'), {
    feePayer: payer.publicKey,
    owner,
    mint: USDC_MINT,
  });
  const tx = new VersionedTransaction(message);
  const ownerSignature = Buffer.from(signatureB64, 'base64');
  if (ownerSignature.length !== 64 || !nacl.sign.detached.verify(message.serialize(), ownerSignature, owner.toBytes())) throw new Error('Invalid wallet signature');
  tx.addSignature(owner, ownerSignature);
  tx.sign([payer]);
  return sendConfirmed(tx, message.recentBlockhash, lastValidBlockHeight);
}
