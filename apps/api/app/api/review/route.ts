import { createHash } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';
import { allow, json, requireUser } from '@/lib/server/http';
import { toBaseUnits } from '@/lib/money.mjs';
import { signTicket } from '@/lib/review-ticket.mjs';
import { reviewSecret } from '@/lib/server/holds';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';
const failed = (error: string, status: number) => json({ error, hold_policy: { required: true, reasons: [`review_failed:${error}`] } }, status);
export async function POST(req: Request) {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  if (!allow(`review:${me.id}`, 40)) return failed('review-rate-limit', 429);
  const body = await req.json().catch(() => null);
  if (typeof body?.transcript !== 'string' || !body.transcript.trim() || body.transcript.length > 2000) return failed('bad-transcript', 400);
  if (body.incoming_message !== undefined && (typeof body.incoming_message !== 'string' || body.incoming_message.length > 2000)) return failed('bad-incoming-message', 400);
  if (typeof body.session !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(body.session)) return failed('bad-session', 400);
  let recipient: string;
  try { recipient = new PublicKey(body.recipient).toBase58(); } catch { return failed('bad-recipient', 400); }
  const cents = body.amountCents;
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 10_000_000) return failed('bad-amount', 400);
  const reviewCase = body.case && typeof body.case === 'object' && !Array.isArray(body.case) ? body.case : {};
  const reviewUrl = (process.env.REVIEW_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
  // Isolate both callers and payment drafts; never globally reset another user's history.
  const session = createHash('sha256').update(`${me.id}:${body.session}`).digest('hex');
  try {
    const res = await fetch(`${reviewUrl}/api/review`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Review-Session': session, ...(process.env.REVIEW_API_TOKEN ? { authorization: `Bearer ${process.env.REVIEW_API_TOKEN}` } : {}) },
      body: JSON.stringify({ transcript: body.transcript, case: { ...reviewCase, amount_usdc: (cents / 100).toFixed(2), recipient_in_contacts: false }, ...(body.incoming_message ? { incoming_message: body.incoming_message } : {}) }),
      signal: AbortSignal.timeout(105_000),
    });
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return failed('review-bad-response', 502);
    if (!res.ok || data.error) return json({ ...data, hold_policy: { required: true, reasons: [`review_failed:${data.error || 'upstream'}`] } }, res.ok ? 502 : res.status);
    if (data.offline !== false || !data.verdict || !['confirm', 'hold', 'stop'].includes(data.verdict.decision) || !/^[a-f0-9]{64}$/i.test(data.hold_policy?.review_hash || '')) return failed('review-bad-response', 502);
    if (data.verdict.decision === 'confirm' && !data.prune?.receipt) return failed('no-receipt', 502);
    if (toBaseUnits(data.case?.amount_usdc) !== BigInt(cents) * 10000n) return failed('review-amount-mismatch', 502);
    // Unknown recipients always use the full hold, regardless of a model's answer.
    const reviewTicket = signTicket({ purpose: 'review', owner: me.wallet.toBase58(), recipient, amountCents: cents, held: true, reviewHash: data.hold_policy.review_hash }, reviewSecret());
    return json({ ...data, reviewTicket, hold_policy: { ...data.hold_policy, required: true, hold_seconds: 86400 } });
  } catch { return failed('review-unreachable', 503); }
}
