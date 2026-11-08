import { requirePaymentUser } from '@/lib/server/paymentAuth';
import { fail, json, route } from '@/lib/server/http';
import { treasury, usdcBalance } from '@/lib/server/solana.mjs';
import { parseDeposit, stripe } from '@/lib/server/stripe';

export const POST = route(async (req: Request) => {
  const me = await requirePaymentUser(req);
  if (me instanceof Response) return me;
  const usd = parseDeposit((await req.json()).amount);
  if (!usd) return fail('Choose a valid amount');
  if (await usdcBalance(treasury().publicKey) < BigInt(usd) * 1_000_000n) return fail('Test funding is temporarily low. No card payment was started. Ask the demo team to replenish the funding wallet.', 503);
  const intent = await stripe().paymentIntents.create({
    amount: usd * 100,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { uid: me.id, wallet: me.wallet.toBase58() },
  });
  return json({ id: intent.id, clientSecret: intent.client_secret });
});
