import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { accountPinChange } from '@/lib/account-pin.mjs';
import { setTextSettings } from '@/lib/server/signer.mjs';
import { signTicket, verifyTicket } from '@/lib/review-ticket.mjs';
import { reviewSecret } from '@/lib/server/holds';
export const dynamic = 'force-dynamic';
export const GET = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const configured = typeof me.profile.custom_metadata?.nest_pin_hash === 'string';
  let sessionValid = false;
  try { const grant = verifyTicket(req.headers.get('x-nest-pin'), reviewSecret(), 'app-pin'); sessionValid = configured && grant.owner === me.wallet.toBase58() && grant.version === me.profile.custom_metadata?.nest_pin_version; } catch {}
  return json({ configured, sessionValid, frozen: me.profile.custom_metadata?.nest_frozen === true });
});
// Serialize this user's read/modify/write operations so simultaneous guesses cannot lose failure counts.
const pending = new Map<string, Promise<unknown>>();
export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  // Fresh payment approvals also use this route. Keep the five-failure PIN lockout below,
  // without exhausting a whole hour's allowance through legitimate successful approvals.
  if (!allow(`app-pin:${me.id}`, 60, 60_000)) return fail('Too many PIN requests. Wait a minute and try again.', 429);
  const body = await req.json();
  const work = (pending.get(me.id) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const { userById } = await import('@/lib/server/privy');
    const user = await userById(me.id);
    const result = accountPinChange(user.custom_metadata, body);
    const metadata = await setTextSettings(user, { ...result.changes, ...(result.ok && body.action === 'verify' && body.unlock === true ? { nest_frozen: false, nest_unlock_hash: '' } : {}) });
    if (!result.ok) return fail(result.error ?? 'Could not verify the PIN.', 403);
    const lifetime = 12 * 60 * 60;
    return json({ ticket: signTicket({ purpose: 'app-pin', owner: me.wallet.toBase58(), version: metadata.nest_pin_version }, reviewSecret(), lifetime), expiresAt: Date.now() + lifetime * 1000 });
  });
  pending.set(me.id, work);
  try { return await work; } catch (error) { return fail(error instanceof Error ? error.message : 'Could not save the PIN.'); }
  finally { if (pending.get(me.id) === work) pending.delete(me.id); }
});
