/**
 * Client for the DAT backend in apps/api (see apps/api/docs/API.md).
 * Money here is real devnet USDC on Solana; deposits use Stripe test mode only.
 */

import type { IncomingPayment } from '../domain/incoming';

const configuredUrl = process.env.EXPO_PUBLIC_DAT_API_URL?.trim() || '';
const baseUrl = configuredUrl === 'same-origin' ? '' : configuredUrl.replace(/\/+$/, '');
export const datConfigured = configuredUrl === 'same-origin' || /^https?:\/\/\S+$/.test(baseUrl);
export const explorerUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
/** The server caps test-card deposits (MAX_DEPOSIT_USD, 1000 by default). */
export const MAX_DEPOSIT_DOLLARS = 1000;

export type Recipient = { phone: string; address: string; invited: boolean };
export type TokenSource = () => Promise<string | null>;
export type Signer = (messageBase64: string) => Promise<string>;
class UncertainResponse extends Error {}
export class PendingPayment extends Error {
  constructor(public signature: string, public lastValidBlockHeight: number) { super('Payment pending. Check Activity before sending again.'); }
}
export type PaymentResolution = { signature: string; status: 'pending' | 'confirmed' | 'failed' | 'expired'; createdAt?: string; amountCents?: number };
export async function fetchPendingPayments(getToken: TokenSource, transactions: { signature: string; kind: string; amountCents: number; lastValidBlockHeight: number }[]) {
  const result = await post<{ transactions: PaymentResolution[] }>(getToken, '/api/transactions/status', { transactions });
  if (!Array.isArray(result?.transactions)) throw new Error('Pending payment status is temporarily unavailable.');
  return { transactions: result.transactions.filter(value => value && typeof value.signature === 'string' && ['pending', 'confirmed', 'failed', 'expired'].includes(value.status) && (value.status !== 'confirmed' || Number.isSafeInteger(value.amountCents) && value.amountCents! > 0 && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt)))) };
}

const pinListeners = new Set<() => void>();
export function onPinRequired(listener: () => void) { pinListeners.add(listener); return () => { pinListeners.delete(listener); }; }
let pinTicket = '';
export function setAppPinTicket(value: string) { pinTicket = value; }

export async function call<T>(path: string, init: RequestInit): Promise<T> {
  if (!datConfigured) throw new Error('The Nest server address is not set (EXPO_PUBLIC_DAT_API_URL).');
  const controller = new AbortController();
  const abort = () => controller.abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  if (init.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, init.method === 'POST' ? 60_000 : 15_000);
  try {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal, headers: { ...(init.headers as Record<string, string>), 'ngrok-skip-browser-warning': '1' } });
    } catch {
      throw new UncertainResponse(controller.signal.aborted ? 'The server took too long to respond. Please try again.' : 'Could not reach the Nest server. Check your connection and try again.');
    }
    let data;
    try { data = await res.json(); }
    catch { throw new UncertainResponse(controller.signal.aborted ? 'The server took too long to respond. Please try again.' : 'Nest returned an incomplete response. Please try again.'); }
    if (!res.ok) {
      if (data?.code === 'PIN_REQUIRED' || data?.code === 'NEST_LOCKED') pinListeners.forEach(listener => listener());
      throw new Error(typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.');
    }
    return data as T;
  } finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
}

export async function post<T>(getToken: TokenSource, path: string, body: unknown): Promise<T> {
  const token = await getToken();
  if (!token) throw new Error('Please sign in again.');
  return call<T>(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(pinTicket ? { 'x-nest-pin': pinTicket } : {}) }, body: JSON.stringify(body) });
}

/** Devnet USDC balance in integer cents. */
export async function fetchBalanceCents(address: string): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const { balance, balanceCents } = await call<{ balance: number; balanceCents?: number }>(`/api/balance?address=${encodeURIComponent(address)}`, { method: 'GET', signal: controller.signal, headers: { 'cache-control': 'no-store' } });
    if (!Number.isFinite(balance) || balance < 0) throw new Error('Your balance is temporarily unavailable.');
    if (Number.isSafeInteger(balanceCents) && balanceCents! >= 0) return balanceCents!;
    return spendableCents(balance);
  } finally { clearTimeout(timer); }
}

/** USDC has six decimal places; never round sub-cent dust into money the user cannot send. */
export function spendableCents(balance: number): number {
  if (!Number.isFinite(balance) || balance < 0) throw new Error('Your balance is temporarily unavailable.');
  const [whole, fraction = ''] = balance.toFixed(6).split('.');
  const cents = Number(whole) * 100 + Number(fraction.slice(0, 2).padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) throw new Error('Your balance is temporarily unavailable.');
  return cents;
}

/** Confirmed credits to this signed-in wallet, including the real Solana signature. */
export async function fetchIncomingPayments(getToken: TokenSource): Promise<IncomingPayment[]> {
  const token = await getToken();
  if (!token) throw new Error('Please sign in again.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const data = await call<{ payments: IncomingPayment[]; outgoing?: IncomingPayment[]; pendingPayments?: IncomingPayment[] }>('/api/activity', { method: 'GET', signal: controller.signal, headers: { authorization: `Bearer ${token}`, 'cache-control': 'no-store' } });
    if (!Array.isArray(data.payments)) throw new Error('Payment history is temporarily unavailable.');
    const payments = [...data.payments.map(item => ({ ...item, kind: 'receive' as const })), ...(Array.isArray(data.outgoing) ? data.outgoing.map(item => ({ ...item, kind: 'send' as const })) : []), ...(Array.isArray(data.pendingPayments) ? data.pendingPayments.filter(item => item.status === 'pending' && Number.isSafeInteger(item.lastValidBlockHeight) && item.lastValidBlockHeight! > 0).map(item => ({ ...item, kind: 'send' as const })) : [])];
    return payments.filter(item => item && typeof item.signature === 'string' && item.signature.length > 0 && Number.isSafeInteger(item.amountCents) && item.amountCents > 0 && typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)));
  } finally { clearTimeout(timer); }
}

export type FundingStatus = { maxDepositDollars: number; availableDollars: number; fundingWallet: string };
export async function fetchFundingStatus(getToken: TokenSource): Promise<FundingStatus> {
  const token = await getToken();
  if (!token) throw new Error('Please sign in again.');
  const result = await call<FundingStatus>('/api/deposit/status', { method: 'GET', headers: { authorization: `Bearer ${token}`, 'cache-control': 'no-store' } });
  if (!Number.isSafeInteger(result.maxDepositDollars) || result.maxDepositDollars < 1 || !Number.isSafeInteger(result.availableDollars) || result.availableDollars < 0 || typeof result.fundingWallet !== 'string') throw new Error('Funding status is unavailable. Please try again.');
  return result;
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
export function textPaymentLink(number: string, body: string, platform = 'ios') {
  return `sms:${number}${platform === 'ios' ? '&' : '?'}body=${encodeURIComponent(body)}`;
}

/** Whole-dollar Stripe test-card deposit; the treasury then sends devnet USDC. Returns the Solana signature. */
export async function depositTestCard(getToken: TokenSource, dollars: number, requestId?: string): Promise<string> {
  return confirmedSignature(await post<{ signature: string }>(getToken, '/api/deposit/test-card', { amount: dollars, ...(requestId ? { requestId } : {}) }));
}
function confirmedSignature(result: { signature: string; status?: string; lastValidBlockHeight?: number }): string {
  if (typeof result?.signature !== 'string' || !result.signature || result.signature.length > 128) throw new Error('Payment confirmation was incomplete. Check Activity before trying again.');
  if (result.status === 'pending') {
    if (!Number.isSafeInteger(result.lastValidBlockHeight) || result.lastValidBlockHeight! < 1) throw new Error('Payment confirmation was incomplete. Check Activity before trying again.');
    throw new PendingPayment(result.signature, result.lastValidBlockHeight!);
  }
  if (result.status && result.status !== 'confirmed') throw new Error('Payment confirmation was incomplete. Check Activity before trying again.');
  return result.signature;
}
export type TransferAttempt = { prepared?: { message: string; lastValidBlockHeight: number; transactionSignature?: string }; signature?: string };

/**
 * The server builds a fee-sponsored USDC transfer; only this device's wallet can sign it.
 * Pass a recipient wallet, or toTreasury for cash-outs (the treasury stands in for a payout partner).
 */
export async function transfer(getToken: TokenSource, sign: Signer, target: { recipient: string } | { toTreasury: true }, cents: number, attempt: TransferAttempt = {}): Promise<string> {
  if (!attempt.prepared) {
    const prepared = await post<{ message: string; lastValidBlockHeight: number; transactionSignature?: string }>(getToken, '/api/transfer/prepare', { ...target, amount: centsToAmount(cents) });
    if (typeof prepared?.message !== 'string' || !prepared.message || !Number.isSafeInteger(prepared.lastValidBlockHeight) || prepared.lastValidBlockHeight < 1) throw new Error('The payment could not be prepared. Nothing was signed.');
    attempt.prepared = prepared;
  }
  const prepared = attempt.prepared;
  attempt.signature ??= normalizeSignature(await sign(prepared.message));
  try { return confirmedSignature(await post<{ signature: string }>(getToken, '/api/transfer/submit', { message: prepared.message, signature: attempt.signature, lastValidBlockHeight: prepared.lastValidBlockHeight })); }
  catch (error) {
    if (error instanceof UncertainResponse && prepared.transactionSignature && base58ToBytes(prepared.transactionSignature)?.length === 64) throw new PendingPayment(prepared.transactionSignature, prepared.lastValidBlockHeight);
    throw error;
  }
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
