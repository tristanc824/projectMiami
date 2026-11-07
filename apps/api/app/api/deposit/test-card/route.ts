import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { fulfill, parseDeposit, stripe } from '@/lib/server/stripe';

// Backup for devices without Apple Pay: charges Stripe's built-in test card.
export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const usd = parseDeposit((await req.json()).amount);
  if (!usd) return fail('Choose a valid amount');
  if (!allow(`deposit:${me.id}`, 20)) return fail('Too many deposits. Try again later.', 429);
  const intent = await stripe().paymentIntents.create({
    amount: usd * 100,
    currency: 'usd',
    payment_method: 'pm_card_visa',
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    confirm: true,
    metadata: { uid: me.id, wallet: me.wallet.toBase58() },
  });
  return json({ signature: await fulfill(intent, me.id) });
});
