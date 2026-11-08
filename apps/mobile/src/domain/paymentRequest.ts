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
