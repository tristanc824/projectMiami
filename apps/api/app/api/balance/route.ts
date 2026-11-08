import { PublicKey } from '@solana/web3.js';
import { fail, json, route } from '@/lib/server/http';
import { usdcBalance } from '@/lib/server/solana.mjs';

export const GET = route(async (req: Request) => {
  const address = new URL(req.url).searchParams.get('address');
  let owner: PublicKey;
  try {
    owner = new PublicKey(address ?? '');
  } catch {
    return fail('Invalid address');
  }
  const units = await usdcBalance(owner);
  return json({ balance: Number(units) / 1e6, balanceCents: Number(units / 10_000n) });
});
