import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import { VersionedTransaction } from '@solana/web3.js';
import { assertSponsorable, buildTransferMessage } from '../tx.mjs';
import { connection, feePayer, USDC_MINT } from './solana.mjs';

// Text payments: the user grants Nest's server a limited Privy signer in the app (USDC transfers only,
// capped per payment by a Privy policy). The server can then sign for them when they text a command.
const API = 'https://api.privy.io/v1';
const appId = () => process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export const signerConfig = () => ({
  signerId: process.env.PRIVY_SIGNER_ID || '',
  policyId: process.env.PRIVY_POLICY_ID || '',
});
export const textPaymentsReady = () =>
  !!(process.env.PRIVY_AUTHORIZATION_KEY && process.env.PRIVY_SIGNER_ID && process.env.PRIVY_POLICY_ID);

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
 */
export async function sendWithServerSigner({ walletId, owner, recipient, amount }) {
  const payer = feePayer();
  const { blockhash, lastValidBlockHeight } = await connection().getLatestBlockhash();
  const message = buildTransferMessage({ feePayer: payer.publicKey, owner, recipient, mint: USDC_MINT, amount, blockhash });
  const unsigned = Buffer.from(new VersionedTransaction(message).serialize()).toString('base64');

  const { data } = await privyApi(`/wallets/${encodeURIComponent(walletId)}/rpc`, {
    method: 'POST',
    sign: true,
    body: { method: 'signTransaction', params: { transaction: unsigned, encoding: 'base64' } },
  });
  const tx = VersionedTransaction.deserialize(Buffer.from(data.signed_transaction, 'base64'));
  const bytes = tx.message.serialize();
  if (!Buffer.from(bytes).equals(Buffer.from(message.serialize()))) throw new Error('Privy returned a different transaction');
  assertSponsorable(bytes, { feePayer: payer.publicKey, owner, mint: USDC_MINT });
  if (!nacl.sign.detached.verify(bytes, tx.signatures[1], owner.toBytes())) throw new Error('Missing the owner signature');

  tx.sign([payer]);
  const signature = await connection().sendTransaction(tx);
  const { value } = await connection().confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (value.err) throw new Error('Transaction failed on the network');
  return signature;
}

/** Text payment settings live in the user's Privy custom metadata, so no database is needed. */
export async function setTextSettings(user, changes) {
  const custom_metadata = { ...(user.custom_metadata ?? {}), ...changes };
  await privyApi(`/users/${encodeURIComponent(user.id)}/custom_metadata`, { method: 'POST', body: { custom_metadata } });
  user.custom_metadata = custom_metadata;
  return custom_metadata;
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
