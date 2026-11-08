import Stripe from 'stripe';
import { PublicKey } from '@solana/web3.js';
import { depositCap, depositAmount } from '../funding.mjs';
import { prepareTreasuryTransfer, submitTreasuryTransfer } from './solana.mjs';

export const MAX_DEPOSIT_USD = depositCap(process.env.MAX_DEPOSIT_USD);

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY ?? '';
  // This demo must never take real payments.
  if (!key.startsWith('sk_test')) throw new Error('A Stripe test key is required');
  return new Stripe(key);
}

export function parseDeposit(amount: unknown): number | null {
  return depositAmount(amount, MAX_DEPOSIT_USD);
}

// A checkpoint in Stripe binds this intent to one signed Solana transaction, even after a restart.
// Coalesce concurrent requests locally; Stripe's idempotency key arbitrates competing checkpoints.
const deliveries = new Map<string, Promise<string>>();
export async function fulfill(intent: Stripe.PaymentIntent, userId: string): Promise<string> {
  if (intent.metadata.uid !== userId) throw new Error('Payment belongs to another user');
  const existing = deliveries.get(intent.id);
  if (existing) return existing;
  const work = deliver(intent.id, userId);
  deliveries.set(intent.id, work);
  try { return await work; } finally { if (deliveries.get(intent.id) === work) deliveries.delete(intent.id); }
}
async function deliver(id: string, userId: string): Promise<string> {
  const client = stripe();
  let intent = await client.paymentIntents.retrieve(id);
  if (intent.metadata.uid !== userId) throw new Error('Payment belongs to another user');
  if (intent.status !== 'succeeded') throw new Error('Payment has not succeeded');
  if (intent.metadata.signature) return intent.metadata.signature;
  if (!intent.metadata.delivery_signature) {
    if (intent.metadata.fulfilled) throw new Error('This older payment needs the demo team to check delivery.');
    const prepared = await prepareTreasuryTransfer(new PublicKey(intent.metadata.wallet), BigInt(intent.amount) * 10_000n);
    const metadata: Record<string, string> = { delivery_signature: prepared.signature, delivery_blockhash: prepared.blockhash, delivery_height: String(prepared.lastValidBlockHeight) };
    for (let i = 0; i < Math.ceil(prepared.transaction.length / 450); i++) metadata[`delivery_tx_${i}`] = prepared.transaction.slice(i * 450, (i + 1) * 450);
    try { intent = await client.paymentIntents.update(id, { metadata }, { idempotencyKey: `nest-delivery-${id}` }); }
    catch (error) {
      // If another worker wrote a checkpoint first, use that checkpoint rather than new bytes.
      intent = await client.paymentIntents.retrieve(id);
      if (!intent.metadata.delivery_signature) throw error;
    }
  }
  let transaction = '';
  for (let i = 0; intent.metadata[`delivery_tx_${i}`]; i++) transaction += intent.metadata[`delivery_tx_${i}`];
  const height = Number(intent.metadata.delivery_height);
  if (!transaction || !Number.isSafeInteger(height) || height < 1) throw new Error('Funding delivery needs the demo team to check its saved transaction.');
  const signature = await submitTreasuryTransfer({ transaction, signature: intent.metadata.delivery_signature, blockhash: intent.metadata.delivery_blockhash, lastValidBlockHeight: height });
  // If this write fails, the checkpoint remains: the next call checks the same chain signature.
  await client.paymentIntents.update(id, { metadata: { signature, fulfilled: '1' } });
  return signature;
}
