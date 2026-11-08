import { allow, fail, json, readJson, requireUser, route } from '@/lib/server/http';
import { createUserForPhone, solanaWallet, userByPhone } from '@/lib/server/privy';
import { normalizePhone } from '@/lib/phone.mjs';

export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const phone = normalizePhone((await readJson(req))?.phone);
  if (!phone) return fail('Enter a full phone number');
  let user = await userByPhone(phone);
  const invited = !user;
  if (!user) {
    if (!allow(`invite:${me.id}`, 20)) return fail('Too many new numbers. Try again later.', 429);
    user = await createUserForPhone(phone);
  }
  const address = solanaWallet(user);
  if (!address) return fail('That person has not finished setting up yet.', 409);
  if (address === me.wallet.toBase58()) return fail("That's your own number.");
  return json({ phone, address, invited });
});
