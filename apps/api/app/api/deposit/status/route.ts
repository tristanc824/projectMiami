import { json, requireUser, route } from '@/lib/server/http';
import { treasury, usdcBalance } from '@/lib/server/solana.mjs';
import { MAX_DEPOSIT_USD } from '@/lib/server/stripe';
export const dynamic = 'force-dynamic';
export const GET = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const wallet = treasury().publicKey;
  const units = await usdcBalance(wallet);
  return json({ maxDepositDollars: MAX_DEPOSIT_USD, availableDollars: Number(units / 1_000_000n), fundingWallet: wallet.toBase58() });
});
