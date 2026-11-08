import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { normalizeReviewPayload, requestReview } from '@/lib/review.mjs';

// A live Swarms review may take longer than an ordinary API call.
export const maxDuration = 180;

/** Authenticated proxy: the mobile app never receives REVIEW_API_TOKEN. It returns a draft only. */
export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  if (!allow(`review:${me.id}`, 12, 60_000)) return fail('Too many voice attempts. Try again in a minute.', 429);
  let payload;
  try { payload = normalizeReviewPayload(await req.json()); }
  catch (error) { return fail(error instanceof Error ? error.message : 'Invalid review request'); }
  try {
    const result = await requestReview(payload);
    return json(result.body, result.status);
  } catch (error) {
    console.error('Review service unavailable', error instanceof Error ? error.message : error);
    return fail('The safety review is unavailable. Nothing was sent.', 503);
  }
});
