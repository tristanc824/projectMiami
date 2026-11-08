import { requirePaymentUser } from '@/lib/server/paymentAuth';
import { fail, json, route } from '@/lib/server/http';
import { fulfill, stripe } from '@/lib/server/stripe';

export const POST = route(async (req: Request) => {
  const me = await requirePaymentUser(req);
  if (me instanceof Response) return me;
  const { id } = await req.json();
  if (typeof id !== 'string') return fail('Missing payment');
  return json({ signature: await fulfill(await stripe().paymentIntents.retrieve(id), me.id) });
});
