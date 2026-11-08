/**
 * Client for the DAT backend in apps/api (see apps/api/docs/API.md).
 * Money here is real devnet USDC on Solana; deposits use Stripe test mode only.
 */

const baseUrl = (process.env.EXPO_PUBLIC_DAT_API_URL?.trim() || '').replace(/\/+$/, '');
export const datConfigured = /^https?:\/\/\S+$/.test(baseUrl);
export const explorerUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
/** The server caps test-card deposits (MAX_DEPOSIT_USD, 20 by default). */
export const MAX_DEPOSIT_DOLLARS = 20;

export type Recipient = { phone: string; address: string; invited: boolean };
export type TokenSource = () => Promise<string | null>;
export type Signer = (messageBase64: string) => Promise<string>;

async function call<T>(path: string, init: RequestInit): Promise<T> {
  if (!datConfigured) throw new Error('The Nest server address is not set (EXPO_PUBLIC_DAT_API_URL).');
  let res: Response;
  try {
    // The header skips ngrok's browser warning page when the server runs on a laptop behind ngrok.
    res = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...(init.headers as Record<string, string>), 'ngrok-skip-browser-warning': '1' } });
  } catch {
    throw new Error('Could not reach the Nest server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.');
  return data as T;
}

async function post<T>(getToken: TokenSource, path: string, body: unknown): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Please sign in again.');
  return call<T>(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
}

/** Devnet USDC balance in integer cents. */
export async function fetchBalanceCents(address: string): Promise<number> {
  const { balance } = await call<{ balance: number }>(`/api/balance?address=${encodeURIComponent(address)}`, { method: 'GET', headers: { 'cache-control': 'no-store' } });
  return Math.round(balance * 100);
}

export const findRecipient = (getToken: TokenSource, phone: string) => post<Recipient>(getToken, '/api/recipient', { phone });

/** Text payments: send and check the balance by texting Nest's number, with no data needed. */
export type TextPayments = { available: boolean; on: boolean; number: string; signerId: string; policyId: string; perPaymentCents: number; perDayCents: number };

export async function fetchTextPayments(getToken: TokenSource): Promise<TextPayments> {
  const token = await getToken();
  if (!token) throw new Error('Please sign in again.');
  return call<TextPayments>('/api/text-payments', { method: 'GET', headers: { authorization: `Bearer ${token}`, 'cache-control': 'no-store' } });
}

export const setTextPayments = (getToken: TokenSource, body: { on: true; pin: string } | { on: false }) =>
  post<{ on: boolean }>(getToken, '/api/text-payments', body);

/** A Messages link with the text ready to send. The person adds their PIN before sending. */
export function textPaymentLink(number: string, body: string) {
  return `sms:${number}&body=${encodeURIComponent(body)}`;
}

/** Whole-dollar Stripe test-card deposit; the treasury then sends devnet USDC. Returns the Solana signature. */
export async function depositTestCard(getToken: TokenSource, dollars: number): Promise<string> {
  return (await post<{ signature: string }>(getToken, '/api/deposit/test-card', { amount: dollars })).signature;
}

/**
 * The server builds a fee-sponsored USDC transfer; only this device's wallet can sign it.
 * Pass a recipient wallet, or toTreasury for cash-outs (the treasury stands in for a payout partner).
 */
export async function transfer(getToken: TokenSource, sign: Signer, target: { recipient: string } | { toTreasury: true }, cents: number): Promise<string> {
  const prepared = await post<{ message: string; lastValidBlockHeight: number }>(getToken, '/api/transfer/prepare', { ...target, amount: centsToAmount(cents) });
  const signature = normalizeSignature(await sign(prepared.message));
  return (await post<{ signature: string }>(getToken, '/api/transfer/submit', { message: prepared.message, signature, lastValidBlockHeight: prepared.lastValidBlockHeight })).signature;
}

export function centsToAmount(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error('Enter an amount.');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** Same rules as apps/api/lib/phone.mjs: E.164, with bare 10-digit numbers treated as US. */
export function normalizePhone(input: string): string | null {
  const raw = String(input ?? '').trim();
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164 ?? '');
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164 ?? '';
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(value: string): Uint8Array | null {
  const clean = value.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean) || clean.length % 4 === 1) return null;
  const out: number[] = [];
  let buffer = 0, bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | B64.indexOf(ch); bits += 6;
    if (bits >= 8) { bits -= 8; out.push((buffer >> bits) & 0xff); }
  }
  return Uint8Array.from(out);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

function base58ToBytes(value: string): Uint8Array | null {
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(value)) return null;
  const bytes: number[] = [0];
  for (const ch of value) {
    let carry = B58.indexOf(ch);
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xff; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xff); carry >>= 8; }
  }
  for (const ch of value) { if (ch !== '1') break; bytes.push(0); }
  return Uint8Array.from(bytes.reverse());
}

/**
 * Privy's Expo docs don't say how signMessage encodes its signature. A Solana signature is 64 bytes,
 * so accept base64 or base58 and always hand the server base64.
 */
export function normalizeSignature(signature: string | Uint8Array): string {
  if (signature instanceof Uint8Array) {
    if (signature.length !== 64) throw new Error('The wallet returned an unexpected signature.');
    return bytesToBase64(signature);
  }
  const value = String(signature).trim().replace(/^0x/, '');
  const b64 = base64ToBytes(value);
  if (b64?.length === 64) return bytesToBase64(b64);
  const b58 = base58ToBytes(value);
  if (b58?.length === 64) return bytesToBase64(b58);
  throw new Error('The wallet returned an unexpected signature.');
}
