import { fail, json, readJson, requireUser, route } from '@/lib/server/http';
import { fulfill, stripe } from '@/lib/server/stripe';

export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const id = (await readJson(req))?.id;
  if (typeof id !== 'string' || !id.startsWith('pi_')) return fail('Missing payment');
  return json({ signature: await fulfill(await stripe().paymentIntents.retrieve(id), me.id) });
});
