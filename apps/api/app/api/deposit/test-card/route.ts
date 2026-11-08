import { createHash, randomUUID } from 'node:crypto';
import { requirePaymentUser } from '@/lib/server/paymentAuth';
import { allow, fail, json, route } from '@/lib/server/http';
import { treasury, usdcBalance } from '@/lib/server/solana.mjs';
import { fulfill, parseDeposit, stripe } from '@/lib/server/stripe';

// Backup for devices without Apple Pay: charges Stripe's built-in test card.
export const POST = route(async (req: Request) => {
  const me = await requirePaymentUser(req);
  if (me instanceof Response) return me;
  const body = await req.json();
  const usd = parseDeposit(body.amount);
  const requestId = body.requestId ?? randomUUID();
  if (typeof requestId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) return fail('Invalid deposit reference.');
  const key = createHash('sha256').update(`${me.id}:${requestId}`).digest('hex');
  if (!usd) return fail('Choose a valid amount');
  if (!allow(`deposit:${me.id}`, 20)) return fail('Too many deposits. Try again later.', 429);
  const client = stripe();
  // Creating an unconfirmed intent is safe to repeat and never charges a card.
  let intent = await client.paymentIntents.create({
    amount: usd * 100,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    metadata: { uid: me.id, wallet: me.wallet.toBase58() },
  }, { idempotencyKey: `nest-deposit-${key}` });
  // Stripe replays the original create response; retrieve the current status before checking funding.
  intent = await client.paymentIntents.retrieve(intent.id);
  if (intent.status !== 'succeeded') {
    if (await usdcBalance(treasury().publicKey) < BigInt(usd) * 1_000_000n) return fail('Test funding is temporarily low. No card payment was started. Ask the demo team to replenish the funding wallet.', 503);
    intent = await client.paymentIntents.confirm(intent.id, {}, { idempotencyKey: `nest-charge-${key}` });
  }
  return json({ signature: await fulfill(intent, me.id) });
});
