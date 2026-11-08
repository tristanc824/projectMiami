import { requirePaymentUser } from '@/lib/server/paymentAuth';
import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { holdAvailability, listSafeHolds, prepareSafeHold, readSafeHold, submitSafeHold } from '@/lib/server/holds';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const GET = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  try {
    const state = new URL(req.url).searchParams.get('state');
    if (state) {
      const hold = await readSafeHold(state);
      if (![hold.sender, hold.approver, hold.recipient].includes(me.wallet.toBase58())) return fail('This hold belongs to another family.', 403);
      const { pinHash: _pinHash, ...safe } = hold;
      return json({ hold: safe });
    }
    const availability = await holdAvailability();
    if (!availability.available) return json({ ...availability, holds: [] });
    return json({ ...availability, holds: (await listSafeHolds(me.wallet)).map(({ pinHash: _pinHash, ...hold }) => hold) });
  } catch (error) { return fail(error instanceof Error ? error.message : 'Could not load Safe Holds.', 503); }
});
export const POST = route(async (req: Request) => {
  const me = await requirePaymentUser(req);
  if (me instanceof Response) return me;
  if (!allow(`holds:${me.id}`, 60)) return fail('Too many hold actions. Try again later.', 429);
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid hold request.');
    if (body.step !== 'prepare' && body.step !== 'submit') return fail('Choose a valid hold action.');
    return json(body.step === 'prepare' ? await prepareSafeHold(me.wallet, body) : await submitSafeHold(me.wallet, body));
  } catch (error) { return fail(error instanceof Error ? error.message : 'Could not complete this hold action.'); }
});
