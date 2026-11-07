import Stripe from 'stripe';
import { PublicKey } from '@solana/web3.js';
import { sendFromTreasury } from './solana.mjs';

export const MAX_DEPOSIT_USD = Number(process.env.MAX_DEPOSIT_USD || 20);

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  // This demo must never take real payments.
  if (!key.startsWith('sk_test')) throw new Error('A Stripe test key is required');
  return new Stripe(key);
}

export function parseDeposit(amount: unknown): number | null {
  const n = Number(amount);
  return Number.isInteger(n) && n >= 1 && n <= MAX_DEPOSIT_USD ? n : null;
}

// Marks the payment as fulfilled before sending, so a repeat call can't deliver twice.
export async function fulfill(intent: Stripe.PaymentIntent, userId: string): Promise<string> {
  if (intent.status !== 'succeeded') throw new Error('Payment has not succeeded');
  if (intent.metadata.uid !== userId) throw new Error('Payment belongs to another user');
  if (intent.metadata.signature) return intent.metadata.signature;
  if (intent.metadata.fulfilled) throw new Error('Payment was already processed');
  await stripe().paymentIntents.update(intent.id, { metadata: { fulfilled: '1' } });
  const units = BigInt(intent.amount) * 10_000n;
  try {
    const signature: string = await sendFromTreasury(new PublicKey(intent.metadata.wallet), units);
    await stripe().paymentIntents.update(intent.id, { metadata: { signature } });
    return signature;
  } catch (err) {
    await stripe().paymentIntents.update(intent.id, { metadata: { fulfilled: '' } });
    throw err;
  }
}
