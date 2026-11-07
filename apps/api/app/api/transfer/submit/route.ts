import { PublicKey } from '@solana/web3.js';
import { allow, fail, json, pending, readJson, requireUser, route } from '@/lib/server/http';
import { SubmittedError, submitTransfer } from '@/lib/server/solana.mjs';

export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  if (!allow(`transfer:${me.id}`, 30)) return fail('Too many transfers. Try again later.', 429);
  const body = await readJson(req);
  if (!body) return fail('Invalid request');
  try {
    const owner: PublicKey = me.wallet;
    return json({ signature: await submitTransfer(owner, body.message, body.signature) });
  } catch (err) {
    console.error(err);
    // Only promise "has not moved" when the transaction definitely did not go out.
    if (err instanceof SubmittedError) return pending(err.signature);
    return fail('The transfer did not go through. Your money has not moved.');
  }
});
