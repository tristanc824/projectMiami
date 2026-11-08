import { after } from 'next/server';
import { jwtVerify } from 'jose';
import { fail, json } from '@/lib/server/http';
import { gatewayNumber, handleText } from '@/lib/server/textPayments';

// httpSMS webhook: the demo Android phone forwards every text it receives here.
export const maxDuration = 60;

const seen = new Set<string>();

export async function POST(req: Request) {
  const key = process.env.HTTPSMS_WEBHOOK_SIGNING_KEY;
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!key || !token) return fail('Unauthorized', 401);
  try {
    await jwtVerify(token, new TextEncoder().encode(key), { algorithms: ['HS256'] });
  } catch {
    return fail('Unauthorized', 401);
  }

  const event = await req.json().catch(() => null);
  if (event?.type !== 'message.phone.received') return json({ ok: true });
  const { contact, owner, content, message_id: id } = event.data ?? {};
  if (typeof contact !== 'string' || typeof content !== 'string' || owner !== gatewayNumber()) return json({ ok: true });
  // httpSMS retries slow deliveries, so handle each message once per server instance.
  if (id && seen.has(id)) return json({ ok: true });
  if (id) seen.add(id);

  // Reply right away: httpSMS waits only 5 seconds, and a payment takes longer than that to confirm.
  after(() => handleText(contact, content).catch((err) => console.error('text payment failed', err)));
  return json({ ok: true });
}
