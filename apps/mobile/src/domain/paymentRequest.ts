import { normalizePhone } from '../services/dat';
import { parseAmount } from './wallet';

export type RequestParams = { [key: string]: string | string[] | undefined };
export type PaymentRequest = { mode: 'demo' | 'devnet'; amount: string; note: string; recipient: string };

/** Links contain review details only; opening one never authorizes a transfer. */
export function parsePaymentRequest(params: RequestParams): PaymentRequest | null {
  const { mode, amount, note = '', recipient } = params;
  if ((mode !== 'demo' && mode !== 'devnet') || typeof amount !== 'string'
    || !parseAmount(amount) || typeof note !== 'string' || note.length > 140 || typeof recipient !== 'string') return null;
  if (normalizePhone(recipient) !== recipient) return null;
  return { mode, amount, note, recipient };
}

/** A native share link must use the deployed website, never an Expo/LAN development URL. */
export function paymentRequestUrl(request: PaymentRequest, base: string, allowLocal = false): string | null {
  try {
    if (!parsePaymentRequest(request)) return null;
    const url = new URL(base);
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname);
    if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:'))) return null;
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/pay`;
    url.search = new URLSearchParams(request).toString();
    return url.toString();
  } catch { return null; }
}
