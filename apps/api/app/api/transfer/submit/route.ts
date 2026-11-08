import { requirePaymentUser } from '@/lib/server/paymentAuth';
import { PublicKey } from '@solana/web3.js';
import { allow, fail, json, route } from '@/lib/server/http';
import { submitTransfer } from '@/lib/server/solana.mjs';
import { pendingResponse } from '@/lib/pending.mjs';
export const maxDuration = 60;

export const POST = route(async (req: Request) => {
  const me = await requirePaymentUser(req);
  if (me instanceof Response) return me;
  if (!allow(`transfer:${me.id}`, 30)) return fail('Too many transfers. Try again later.', 429);
  const { message, signature, lastValidBlockHeight } = await req.json();
  try {
    const owner: PublicKey = me.wallet;
    return json({ signature: await submitTransfer(owner, message, signature, lastValidBlockHeight) });
  } catch (err) {
    const pending = pendingResponse(err);
    if (pending) return json(pending, 202);
    console.error(err);
    return fail('The transfer could not be completed. Check Activity before starting a new payment.');
  }
});
