import Stripe from 'stripe';
import { PublicKey } from '@solana/web3.js';
import { SubmittedError, sendFromTreasury } from './solana.mjs';

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

// Payments being fulfilled by this server process. Stripe metadata has no compare-and-set, so two
// concurrent calls could both see "not fulfilled" and both pay out. This closes that race within one
// instance; across several instances, a shared store or a Stripe webhook with a unique key is needed.
const inFlight = new Set<string>();

// Marks the payment as fulfilled before sending, so a repeat call can't deliver twice.
// The mark is cleared only when the treasury transfer definitely did not go out.
export async function fulfill(intent: Stripe.PaymentIntent, userId: string): Promise<string> {
  if (intent.status !== 'succeeded') throw new Error('Payment has not succeeded');
  if (intent.metadata.uid !== userId) throw new Error('Payment belongs to another user');
  if (intent.metadata.signature) return intent.metadata.signature;
  if (inFlight.has(intent.id)) throw new Error('Payment is already being processed');
  inFlight.add(intent.id);
  try {
    // Re-read inside the lock: the copy passed in may be older than another call's mark.
    const fresh = await stripe().paymentIntents.retrieve(intent.id);
    if (fresh.metadata.signature) return fresh.metadata.signature;
    if (fresh.metadata.fulfilled) throw new Error('Payment was already processed');
    await stripe().paymentIntents.update(intent.id, { metadata: { fulfilled: '1' } });
    const units = BigInt(intent.amount) * 10_000n;
    let signature: string;
    try {
      signature = await sendFromTreasury(new PublicKey(fresh.metadata.wallet), units);
    } catch (err) {
      if (err instanceof SubmittedError) {
        // It may have landed. Keep the mark so no retry sends it twice, and record what to reconcile.
        await stripe().paymentIntents.update(intent.id, { metadata: { pending_signature: err.signature } });
      } else {
        await stripe().paymentIntents.update(intent.id, { metadata: { fulfilled: '' } });
      }
      throw err;
    }
    // If this update fails the mark stays set, so a retry reports "already processed" instead of paying again.
    await stripe().paymentIntents.update(intent.id, { metadata: { signature } });
    return signature;
  } finally {
    inFlight.delete(intent.id);
  }
}
