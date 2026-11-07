import { fail, json, readJson, requireUser, route } from '@/lib/server/http';
import { parseDeposit, stripe } from '@/lib/server/stripe';

export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const usd = parseDeposit((await readJson(req))?.amount);
  if (!usd) return fail('Choose a valid amount');
  const intent = await stripe().paymentIntents.create({
    amount: usd * 100,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { uid: me.id, wallet: me.wallet.toBase58() },
  });
  return json({ id: intent.id, clientSecret: intent.client_secret });
});
