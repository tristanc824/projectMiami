import { PublicKey } from '@solana/web3.js';
import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { submitTransfer } from '@/lib/server/solana.mjs';

export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  if (!allow(`transfer:${me.id}`, 30)) return fail('Too many transfers. Try again later.', 429);
  const { message, signature, lastValidBlockHeight } = await req.json();
  try {
    const owner: PublicKey = me.wallet;
    return json({ signature: await submitTransfer(owner, message, signature, lastValidBlockHeight) });
  } catch (err) {
    console.error(err);
    return fail('The transfer did not go through. Your money has not moved.');
  }
});
