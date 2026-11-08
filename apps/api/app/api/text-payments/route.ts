import { fail, json, requireUser, route } from '@/lib/server/http';
import { userById } from '@/lib/server/privy';
import { hashPin, setTextSettings, signerConfig, textPaymentsReady } from '@/lib/server/signer.mjs';
import { TEXT_LIMITS } from '@/lib/sms.mjs';
import { gatewayNumber, type MetaUser } from '@/lib/server/textPayments';

const cents = (units: bigint) => Number(units / 10_000n);

// What the app needs to show and turn on text payments. The signer and policy ids are not secret.
export const GET = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const user = (await userById(me.id)) as MetaUser;
  const available = textPaymentsReady() && !!gatewayNumber();
  return json({
    available,
    on: available && !!user.custom_metadata?.tp_on,
    number: gatewayNumber(),
    ...signerConfig(),
    perPaymentCents: cents(TEXT_LIMITS.perPayment),
    perDayCents: cents(TEXT_LIMITS.perDay),
  });
});

// Turn on with { on: true, pin } after the app adds Nest's signer, or off with { on: false }.
export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const body = await req.json().catch(() => ({}));
  const user = (await userById(me.id)) as MetaUser;
  if (body.on === false) {
    await setTextSettings(user, { tp_on: false });
    return json({ on: false });
  }
  if (!textPaymentsReady() || !gatewayNumber()) return fail('Text payments are not available yet.', 503);
  const pin = String(body.pin ?? '');
  if (!/^\d{4}$/.test(pin)) return fail('Choose a 4-digit PIN.');
  await setTextSettings(user, { tp_on: true, tp_pin: hashPin(pin), tp_fails: 0 });
  return json({ on: true });
});
