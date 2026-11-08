const MAX_TEXT = 2_000;
// Same rule as personal_number_reason in swarm/prune_gate.py, the Prune API gate behind this proxy:
// seven or more digits (spaces, dashes, dots, brackets between them) or an IBAN shape. A run right
// after "$", an amount with cents ("10000.00") and an ISO date are money or dates, not numbers to block.
const DIGIT_RUN = /(?<!\d)\+?\d(?:[\s.()\-]*\d){6,}(?!\d)/gu;
const IBAN_LIKE = /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/i;

/** True when the words hold a phone or bank account number. Fullwidth digits are folded first. */
export function hasPersonalNumber(text) {
  const folded = String(text ?? '').normalize('NFKC');
  for (const match of folded.matchAll(DIGIT_RUN)) {
    const run = match[0].trim();
    if (match.index > 0 && folded[match.index - 1] === '$') continue;
    if (/^\d{1,6}\.\d{1,2}$/.test(run) || /^\d{4}-\d{2}-\d{2}$/.test(run)) continue;
    return true;
  }
  return IBAN_LIKE.test(folded);
}
const CASE_FIELDS = new Set([
  'amount_usdc', 'requested_usdc', 'other_contributions_usdc',
  'relationship_verified', 'recipient_in_contacts', 'output_locale',
  'standalone_transfer', 'claimed_name_matches_contact', 'recipient_details_changed',
  'contact_added_days', 'recipient_account_age_days', 'prior_transfers_to_recipient',
  'request_channel',
]);

const LOCALE_ALIASES = {
  'es-419': 'es-US',
  'es-AR': 'es-US',
  'es-UY': 'es-US',
  en: 'en-US',
  es: 'es-US',
  pt: 'pt-BR',
  fr: 'fr-FR',
};

/** Strict, small server-to-server payload. User IDs, contact names and phone numbers are not forwarded. */
export function normalizeReviewPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid review request');
  const transcript = typeof input.transcript === 'string' ? input.transcript.trim() : '';
  if (!transcript || transcript.length > MAX_TEXT) throw new Error('Say the payment again in one short message.');
  if (hasPersonalNumber(transcript)) throw new Error('Do not say a phone or account number. Choose a saved contact instead.');
  const incoming = input.incoming_message ?? '';
  if (typeof incoming !== 'string' || incoming.length > MAX_TEXT) throw new Error('Invalid incoming message');
  const source = input.case && typeof input.case === 'object' && !Array.isArray(input.case) ? input.case : {};
  const safeCase = {};
  for (const [key, value] of Object.entries(source)) {
    if (CASE_FIELDS.has(key)) safeCase[key] = value;
  }
  const locale = typeof input.locale === 'string' ? input.locale.trim() : '';
  if (!safeCase.output_locale && locale) safeCase.output_locale = LOCALE_ALIASES[locale] ?? locale;
  if (input.mode === 'voice_send') safeCase.standalone_transfer = true;
  return { transcript, incoming_message: incoming, case: safeCase };
}

export function reviewApiEndpoint(raw) {
  if (!raw) throw new Error('REVIEW_API_URL is not set');
  const url = new URL(raw);
  const loopback = ['127.0.0.1', 'localhost', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new Error('REVIEW_API_URL must use HTTPS, except on loopback');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  if (!url.pathname.endsWith('/api/review')) url.pathname = `${url.pathname}/api/review`.replace(/^\/\//, '/');
  return url.toString();
}

export async function requestReview(payload, { fetcher = fetch, env = process.env } = {}) {
  const endpoint = reviewApiEndpoint(env.REVIEW_API_URL);
  const token = String(env.REVIEW_API_TOKEN ?? '').trim();
  const timeout = Number(env.REVIEW_API_TIMEOUT_MS || 180_000);
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(Number.isFinite(timeout) && timeout > 0 ? timeout : 180_000),
  });
  const text = await response.text();
  if (text.length > 256_000) throw new Error('Review response is too large');
  let body;
  try { body = JSON.parse(text); } catch { throw new Error('Review service returned invalid JSON'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Review service returned an invalid response');
  return { status: response.status, body };
}
