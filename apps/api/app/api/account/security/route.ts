import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { requirePinUser } from '@/lib/server/paymentAuth';
import { setTextSettings } from '@/lib/server/signer.mjs';
import { userByPhone } from '@/lib/server/privy';
import { normalizePhone } from '@/lib/phone.mjs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const dynamic = 'force-dynamic';
export const GET = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const metadata = me.profile.custom_metadata ?? {};
  return json({ frozen: metadata.nest_frozen === true, trustedContact: typeof metadata.nest_trusted_phone === 'string' && metadata.nest_trusted_phone ? { phone: metadata.nest_trusted_phone, name: metadata.nest_trusted_name } : null, recoveryAvailable: false });
});
export const POST = route(async (req: Request) => {
  const me = await requirePinUser(req);
  if (me instanceof Response) return me;
  if (!allow(`account-security:${me.id}`, 30)) return fail('Too many security changes. Try again later.', 429);
  const body = await req.json();
  if (body?.action === 'freeze') {
    if (me.profile.custom_metadata?.nest_frozen === true) return json({ frozen: true });
    const unlockToken = randomBytes(32).toString('hex');
    await setTextSettings(me.profile, { nest_frozen: true, nest_unlock_hash: createHash('sha256').update(unlockToken).digest('hex') });
    return json({ frozen: true, unlockToken });
  }
  if (body?.action === 'unfreeze') {
    if (me.profile.custom_metadata?.nest_frozen !== true) return json({ frozen: false });
    const expected = me.profile.custom_metadata?.nest_unlock_hash;
    if (typeof expected !== 'string' || !/^[0-9a-f]{64}$/.test(expected) || typeof body.unlockToken !== 'string' || !/^[0-9a-f]{64}$/.test(body.unlockToken) || !timingSafeEqual(Buffer.from(expected, 'hex'), createHash('sha256').update(body.unlockToken).digest())) return fail('Use your app PIN to unlock Nest on this device.', 403);
    await setTextSettings(me.profile, { nest_frozen: false, nest_unlock_hash: '' });
    return json({ frozen: false });
  }
  if (me.profile.custom_metadata?.nest_frozen === true) return fail('Unlock Nest before changing your trusted contact.', 423);
  if (body?.action === 'trusted-contact') {
    const phone = normalizePhone(body.phone);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!phone || !name || name.length > 60) return fail('Enter a name and full phone number.');
    const contact = await userByPhone(phone);
    if (!contact) return fail('Your trusted contact needs to sign in to Nest first.');
    if (contact.id === me.id) return fail('Choose someone other than yourself.');
    await setTextSettings(me.profile, { nest_trusted_phone: phone, nest_trusted_name: name, nest_trusted_id: contact.id });
    return json({ trustedContact: { phone, name }, recoveryAvailable: false });
  }
  if (body?.action === 'remove-trusted-contact') {
    await setTextSettings(me.profile, { nest_trusted_phone: '', nest_trusted_name: '', nest_trusted_id: '' });
    return json({ trustedContact: null, recoveryAvailable: false });
  }
  return fail('Choose a valid security action.');
});
