/**
 * Family transfer review (Swarms agents + Prune), reached through the Nest server's /api/review.
 * Contract: FAMILY_REVIEW.md at the repo root. Voice requests retain their spoken
 * context for Prune to clean before Swarms. Contact matching stays local; the
 * address book is never uploaded.
 */
import { datConfigured, type TokenSource } from './dat';

const configuredUrl = process.env.EXPO_PUBLIC_DAT_API_URL?.trim() || '';
const baseUrl = configuredUrl === 'same-origin' ? '' : configuredUrl.replace(/\/+$/, '');

/** Opt in with EXPO_PUBLIC_FAMILY_REVIEW=on once the review server (python app.py) is running. */
export const reviewEnabled = datConfigured && /^(1|on|true)$/i.test(process.env.EXPO_PUBLIC_FAMILY_REVIEW?.trim() ?? '');

export type ReviewSignal = { code: string; level: 'high' | 'medium' | 'low'; text: string };
export type ReviewFacts = {
  amountCents: number;
  requestedCents: number;
  contributedCents: number;
  recipientInContacts: boolean;
  priorTransfers: number;
  note: string;
  recipientAddress: string;
  session: string;
  transcript?: string;
};
export type FamilyReview = {
  decision: 'confirm' | 'hold' | 'stop';
  held: boolean;
  sentence: string;
  signals: ReviewSignal[];
  needs: string[];
  reasons: string[];
  reviewTicket: string;
};

const dollars = (cents: number) => cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
const LEVELS = { high: 0, medium: 1, low: 2 } as const;

const ERRORS: Record<string, string> = {
  'blocked-in': 'The private request check did not finish. Try removing personal details from the note, then check again.',
  'missing-key': 'The safety check is not set up on the server yet.',
  'missing-prune-key': 'The safety check is not set up on the server yet.',
  'review-unreachable': 'Could not reach the safety check. Make sure the review server is running.',
  budget: 'The safety check is out of credits.',
  'no-receipt': 'The safety check could not seal its answer. Please try again.',
};

/** Runs the review. Throws with a person-readable message; a failed review is never an approval. */
export async function reviewTransfer(facts: ReviewFacts, fresh: boolean, getToken?: TokenSource): Promise<FamilyReview> {
  const transcript = facts.transcript?.trim() || `Send ${dollars(facts.amountCents)} dollars.${facts.note.trim() ? ` It is for ${facts.note.trim()}.` : ''}`;
  const token = await getToken?.();
  if (!token) throw new Error('Sign in with your phone number to create an on-chain Safe Hold.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 115_000);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/review`, {
      method: 'POST',
      signal: controller.signal,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: JSON.stringify({
        fresh,
        session: facts.session,
        recipient: facts.recipientAddress,
        amountCents: facts.amountCents,
        transcript,
        case: {
          amount_usdc: dollars(facts.amountCents),
          requested_usdc: dollars(facts.requestedCents),
          other_contributions_usdc: dollars(facts.contributedCents),
          recipient_in_contacts: facts.recipientInContacts,
          prior_transfers_to_recipient: facts.priorTransfers,
        },
      }),
    });
  } catch {
    throw new Error('The safety check timed out or could not connect. Nothing was sent. Please try again.');
  } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => null);
  const verdict = data?.verdict;
  if (!res.ok || data?.error || data?.offline !== false || !verdict || !['confirm', 'hold', 'stop'].includes(verdict.decision) || typeof data.reviewTicket !== 'string' || !data.reviewTicket) {
    const code = typeof data?.error === 'string' ? data.error : '';
    throw new Error(ERRORS[code] ?? 'The safety check did not finish. Nothing was sent. Please try again.');
  }
  const signals: ReviewSignal[] = Array.isArray(data.signals)
    ? data.signals.filter((s: ReviewSignal) => s && typeof s.code === 'string' && typeof s.text === 'string' && Object.hasOwn(LEVELS, s.level)).sort((a: ReviewSignal, b: ReviewSignal) => LEVELS[a.level] - LEVELS[b.level])
    : [];
  const decision = verdict.decision === 'confirm' || verdict.decision === 'stop' ? verdict.decision : 'hold';
  return {
    decision,
    // Anything but an explicit confirm with no hold required is held.
    held: decision !== 'confirm' || data.hold_policy?.required !== false,
    sentence: typeof verdict.sentence === 'string' ? verdict.sentence : '',
    signals,
    needs: Array.isArray(data.assistant?.needs) ? data.assistant.needs.filter((n: unknown) => typeof n === 'string') : [],
    reasons: Array.isArray(data.hold_policy?.reasons) ? data.hold_policy.reasons.filter((r: unknown) => typeof r === 'string') : [],
    reviewTicket: data.reviewTicket,
  };
}
