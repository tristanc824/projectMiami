import { json, requireUser } from './http';
import { verifyTicket } from '../review-ticket.mjs';
import { reviewSecret } from './holds';
import { activeTextPayment } from './textStore.mjs';
import { connection } from './solana.mjs';
export async function requirePinUser(req: Request) {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  try {
    const grant = verifyTicket(req.headers.get('x-nest-pin'), reviewSecret(), 'app-pin');
    if (!me.profile.custom_metadata?.nest_pin_hash || grant.owner !== me.wallet.toBase58() || grant.version !== me.profile.custom_metadata.nest_pin_version) throw new Error('PIN verification required');
    return me;
  } catch { return json({ error: 'Unlock Nest with your app PIN before moving money.', code: 'PIN_REQUIRED' }, 401); }
}
export async function requirePaymentUser(req: Request) {
  const me = await requirePinUser(req);
  if (me instanceof Response) return me;
  if (me.profile.custom_metadata?.nest_frozen === true) return json({ error: 'Nest is locked. Unlock with your app PIN or biometrics before sending money.', code: 'NEST_LOCKED' }, 423);
  const pendingText = activeTextPayment(me.id);
  if (pendingText) {
    if (pendingText.status === 'preparing') return json({ error: 'A text payment is being prepared. Check Activity before starting another payment.', code: 'PAYMENT_PENDING' }, 409);
    const status = (await connection().getSignatureStatuses([pendingText.signature], { searchTransactionHistory: true })).value[0];
    const resolved = status?.err || status && ['confirmed', 'finalized'].includes(status.confirmationStatus) || !status && await connection().getBlockHeight('finalized') > pendingText.lastValidBlockHeight;
    if (!resolved) return json({ error: 'A text payment is still pending. Check Activity before starting another payment.', code: 'PAYMENT_PENDING' }, 409);
  }
  return me;
}
