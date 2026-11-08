import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { VersionedTransaction } from '@solana/web3.js';
import { assertSponsorable, buildTransferMessage } from '../tx.mjs';
import { connection, feePayer, USDC_MINT, sendConfirmed } from './solana.mjs';
import { smsStore } from './textStore.mjs';

// Text payments: the user grants Nest's server a limited Privy signer in the app (USDC transfers only,
// capped per payment by a Privy policy). The server can then sign for them when they text a command.
const API = 'https://api.privy.io/v1';
const appId = () => process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export const signerConfig = () => ({
  signerId: process.env.PRIVY_SIGNER_ID || '',
  policyId: process.env.PRIVY_POLICY_ID || '',
});
export function textPaymentsReady() {
  if (!process.env.PRIVY_AUTHORIZATION_KEY || !process.env.PRIVY_SIGNER_ID || !process.env.PRIVY_POLICY_ID || process.env.VERCEL) return false;
  try { return !!smsStore(); } catch { return false; }
}

/** RFC 8785 canonical JSON, enough for the plain objects Privy requests contain. */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

/** The privy-authorization-signature header: ECDSA P-256 over the canonical request, base64 DER. */
export function authorizationSignature({ method, url, body, appId: id }, key = process.env.PRIVY_AUTHORIZATION_KEY) {
  if (!key) throw new Error('PRIVY_AUTHORIZATION_KEY is not set');
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(key.replace(/^wallet-auth:/, ''), 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  const payload = canonicalJson({ version: 1, method, url, body, headers: { 'privy-app-id': id } });
  return crypto.sign('sha256', Buffer.from(payload), privateKey).toString('base64');
}

/** Calls Privy's REST API with the app secret, adding an authorization signature when asked. */
export async function privyApi(path, { method = 'GET', body, sign = false } = {}) {
  const url = `${API}${path}`;
  const headers = {
    'content-type': 'application/json',
    'privy-app-id': appId(),
    authorization: `Basic ${Buffer.from(`${appId()}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
  };
  if (sign) headers['privy-authorization-signature'] = authorizationSignature({ method, url, body, appId: appId() });
  const res = await fetch(url, { method, headers, cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(`Privy ${method} ${path} failed (${res.status}): ${data?.error ?? data?.message ?? 'no details'}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** The user's embedded Solana wallet: its address and the Privy wallet id the server signs with. */
export function embeddedSolanaWallet(user) {
  const w = user?.linked_accounts?.find((a) => a.type === 'wallet' && a.chain_type === 'solana' && a.connector_type === 'embedded');
  return w ? { address: w.address, walletId: w.id ?? null } : null;
}

/**
 * Sends USDC from a user's wallet, signed by Nest's server signer, with Nest's fee payer covering fees.
 * The same check as app sends runs on what Privy returns, so only the exact USDC transfer can go out.
 * @param {{ userId: string, walletId: string, owner: import('@solana/web3.js').PublicKey, recipient: import('@solana/web3.js').PublicKey, amount: bigint, checkpoint?: { transaction: string, signature: string, blockhash: string, lastValidBlockHeight: number }, onPrepared?: (value: { transaction: string, signature: string, blockhash: string, lastValidBlockHeight: number }) => Promise<void> }} options
 */
export async function sendWithServerSigner({ userId, walletId, owner, recipient, amount, checkpoint = undefined, onPrepared = undefined }) {
  if (!userId) throw new Error('A Nest account is required for text payments');
  const payer = feePayer();
  let tx, blockhash, lastValidBlockHeight;
  if (checkpoint) {
    ({ blockhash, lastValidBlockHeight } = checkpoint);
    tx = VersionedTransaction.deserialize(Buffer.from(checkpoint.transaction, 'base64'));
  } else {
    ({ blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash());
    const message = buildTransferMessage({ feePayer: payer.publicKey, owner, recipient, mint: USDC_MINT, amount, blockhash });
    const unsigned = Buffer.from(new VersionedTransaction(message).serialize()).toString('base64');
    const { data } = await privyApi(`/wallets/${encodeURIComponent(walletId)}/rpc`, {
      method: 'POST', sign: true,
      body: { method: 'signTransaction', params: { transaction: unsigned, encoding: 'base64' } },
    });
    tx = VersionedTransaction.deserialize(Buffer.from(data.signed_transaction, 'base64'));
  }
  const expected = buildTransferMessage({ feePayer: payer.publicKey, owner, recipient, mint: USDC_MINT, amount, blockhash });
  const bytes = tx.message.serialize();
  if (!Buffer.from(bytes).equals(Buffer.from(expected.serialize()))) throw new Error('Saved text payment details do not match');
  assertSponsorable(bytes, { feePayer: payer.publicKey, owner, mint: USDC_MINT });
  if (!nacl.sign.detached.verify(bytes, tx.signatures[1], owner.toBytes())) throw new Error('Missing the owner signature');
  tx.sign([payer]);
  const signature = bs58.encode(tx.signatures[0]);
  if (checkpoint && checkpoint.signature !== signature) throw new Error('Saved text payment signature does not match');
  // Save the signed bytes durably before the first broadcast. Retries use exactly these bytes.
  if (!checkpoint && onPrepared) await onPrepared({ transaction: Buffer.from(tx.serialize()).toString('base64'), signature, blockhash, lastValidBlockHeight });
  const user = await privyApi(`/users/${encodeURIComponent(userId)}`);
  if (user.custom_metadata?.nest_frozen === true) throw new Error('Nest is locked');
  return sendConfirmed(tx, blockhash, lastValidBlockHeight);
}

/** Text payment settings live in the user's Privy custom metadata, so no database is needed. */
const metadataWrites = new Map();
export async function setTextSettings(user, changes) {
  const work = (metadataWrites.get(user.id) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    // Merge against fresh server state: a text-payment/PIN update must not erase a wallet freeze.
    const fresh = await privyApi(`/users/${encodeURIComponent(user.id)}`);
    const patch = typeof changes === 'function' ? changes(fresh.custom_metadata ?? {}) : changes;
    if (!patch || !Object.keys(patch).length) { user.custom_metadata = fresh.custom_metadata ?? {}; return user.custom_metadata; }
    const custom_metadata = { ...(fresh.custom_metadata ?? {}), ...patch };
    await privyApi(`/users/${encodeURIComponent(user.id)}/custom_metadata`, { method: 'POST', body: { custom_metadata } });
    user.custom_metadata = custom_metadata;
    return custom_metadata;
  });
  metadataWrites.set(user.id, work);
  try { return await work; }
  finally { if (metadataWrites.get(user.id) === work) metadataWrites.delete(user.id); }
}

export function hashPin(pin) {
  const salt = crypto.randomBytes(16);
  return `${salt.toString('base64')}:${crypto.scryptSync(String(pin), salt, 32).toString('base64')}`;
}

export function checkPin(pin, stored) {
  const [salt, hash] = String(stored ?? '').split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = crypto.scryptSync(String(pin), Buffer.from(salt, 'base64'), 32);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}
