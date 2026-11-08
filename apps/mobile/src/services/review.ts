export type TokenSource = () => Promise<string | null>;
export type ReviewSignal = { code: string; level: 'low' | 'medium' | 'high'; text: string };
export type ReviewResponse = {
  error?: string;
  assistant?: {
    status: string;
    explanation: string;
    in_your_language: string;
    language: string;
    filled: Record<string, string>;
    needs: string[];
    next_step: string;
  };
  case?: { amount_usdc?: string; purpose?: string; signals?: string[] };
  signals?: ReviewSignal[];
  verdict?: { decision?: 'confirm' | 'hold' | 'stop' };
  hold_policy?: { required?: boolean; hold_hours?: number; reasons?: string[] };
};

export type VoiceRecipient = {
  phone: string;
  displayName: string;
  /** Exact name span matched in the transcript, e.g. "mami" for the saved contact "Mamá". */
  spokenName?: string;
  inContacts: boolean;
  isNew?: boolean;
};

export type VoiceDraft = {
  state: 'ready' | 'clarify' | 'hold' | 'stop';
  amountCents: number | null;
  recipient: VoiceRecipient | null;
  explanation: string;
  readback: string;
  needs: string[];
  sendParams: { phone: string; amount: string; note: string } | null;
  review: ReviewResponse;
};

const configuredUrl = process.env.EXPO_PUBLIC_DAT_API_URL?.trim() || '';
const baseUrl = configuredUrl === 'same-origin' ? '' : configuredUrl.replace(/\/+$/, '');

function localeForReview(locale: string) {
  if (['es-419', 'es-AR', 'es-UY', 'es'].includes(locale)) return 'es-US';
  if (locale === 'en') return 'en-US';
  return locale;
}

/** The neutral word that stands in for the matched contact's name in what leaves the phone. */
export const RECIPIENT_PLACEHOLDER = 'recipient';

const COMBINING_MARKS = /[̀-ͯ]/;
const withoutAccents = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]+/g, '');

// A letter, digit or accent mark next to a match means it is part of a longer word ("Ana" in "bananas").
// Plain checks rather than \p{L} or lookbehind, so the same code runs on Hermes in the app.
function isWordChar(ch: string | undefined) {
  if (!ch) return false;
  if (/[0-9_]/.test(ch) || COMBINING_MARKS.test(ch)) return true;
  return ch.toLowerCase() !== ch.toUpperCase();
}

/**
 * Replaces the locally matched contact's name with RECIPIENT_PLACEHOLDER before the words leave the phone
 * (Prune API privacy: the review service never needs to know who the person is). Whole words only, any
 * letter case, with or without accents ("mama" matches the saved "Mamá"), longest name first so
 * "Tía Rosa" is replaced before "Rosa".
 */
export function redactRecipientName(transcript: string, recipient: VoiceRecipient | null) {
  if (!recipient) return transcript;
  const names = [...new Set([recipient.spokenName, recipient.displayName]
    .map(value => withoutAccents(value?.trim() ?? ''))
    .filter(value => value.length > 1))]
    .sort((a, b) => b.length - a.length);
  // Decomposed, so an accent is a separate mark the pattern can allow after each letter.
  let text = transcript.normalize('NFD');
  for (const name of names) {
    const pattern = [...name].map(ch => (/\s/.test(ch) ? '\\s+' : `${ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\u0300-\\u036f]*`)).join('');
    text = text.replace(new RegExp(pattern, 'gi'), (match: string, offset: number, whole: string) =>
      isWordChar(whole[offset - 1]) || isWordChar(whole[offset + match.length]) ? match : RECIPIENT_PLACEHOLDER);
  }
  return text.normalize('NFC');
}

export function buildVoiceReviewRequest(transcript: string, locale: string, recipient: VoiceRecipient | null) {
  let text = String(transcript ?? '').trim();
  if (!text || text.length > 2_000) throw new Error('Say the payment again in one short message.');
  // Contact resolution belongs on the phone. Remove the local match before the transcript
  // leaves it; the review engine only needs the amount and context.
  text = redactRecipientName(text, recipient);
  return {
    transcript: text,
    locale: localeForReview(locale),
    mode: 'voice_send',
    case: {
      standalone_transfer: true,
      ...(recipient ? { recipient_in_contacts: recipient.inContacts } : {}),
    },
  };
}

function amountToCents(value: unknown): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value ?? ''));
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Adapts the safety response to Caleb's voice UI. It never signs or sends a payment. */
export function voiceDraftFromReview(review: ReviewResponse, recipient: VoiceRecipient | null): VoiceDraft {
  const amountCents = amountToCents(review.case?.amount_usdc);
  const codes = new Set(review.signals?.map(signal => signal.code) ?? review.case?.signals ?? []);
  const blockingNeeds: string[] = [];
  if (!recipient) blockingNeeds.push('Who do you want to send money to?');
  if (!amountCents || codes.has('amount_not_stated') || codes.has('amount_guessed') || codes.has('conflicting_amounts')) {
    blockingNeeds.unshift('How much do you want to send?');
  }
  const stopped = review.verdict?.decision === 'stop' || !!review.error;
  const held = review.hold_policy?.required === true;
  const state: VoiceDraft['state'] = stopped ? 'stop' : held ? 'hold' : blockingNeeds.length ? 'clarify' : 'ready';
  const amount = amountCents === null ? '' : (amountCents / 100).toFixed(2);
  const readback = amountCents && recipient ? `Send $${amount} to ${recipient.displayName}?` : review.assistant?.in_your_language || review.assistant?.explanation || 'Check the payment details.';
  return {
    state,
    amountCents,
    recipient,
    explanation: review.assistant?.explanation || 'Nothing was sent.',
    readback,
    needs: [...new Set([...blockingNeeds, ...(review.assistant?.needs ?? [])])],
    sendParams: state === 'ready' && recipient && amountCents
      ? { phone: recipient.phone, amount, note: review.case?.purpose || '' }
      : null,
    review,
  };
}

export async function reviewVoiceTranscript(getToken: TokenSource, transcript: string, locale: string, recipient: VoiceRecipient | null) {
  if (!(configuredUrl === 'same-origin' || /^https?:\/\/\S+$/.test(baseUrl))) throw new Error('The Nest server address is not set.');
  const token = await getToken();
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(`${baseUrl}/api/review`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': '1' },
    body: JSON.stringify(buildVoiceReviewRequest(transcript, locale, recipient)),
  });
  const data: ReviewResponse = await response.json().catch(() => ({}));
  if (!response.ok && !data.assistant) throw new Error(data.error || 'The safety review is unavailable. Nothing was sent.');
  return voiceDraftFromReview(data, recipient);
}
