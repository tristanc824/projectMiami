import { PublicKey } from '@solana/web3.js';
import { fail, json, route } from '@/lib/server/http';
import { treasury, usdcHistory } from '@/lib/server/solana.mjs';

type Movement = { signature: string; time: string | null; direction: 'in' | 'out'; units: string; counterparty: string | null };
const cache = new Map<string, { at: number; body: unknown }>();
const CACHE_MS = 3_000;

// Public chain data, like /api/balance. Counterparty wallets are not returned; only whether it was Nest's treasury.
export const GET = route(async (req: Request) => {
  const address = new URL(req.url).searchParams.get('address');
  let owner: PublicKey;
  try {
    owner = new PublicKey(address ?? '');
  } catch {
    return fail('Invalid address');
  }
  const key = owner.toBase58();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return json(hit.body);
  const nest = treasury().publicKey.toBase58();
  const items = ((await usdcHistory(owner)) as Movement[]).map((m) => ({
    signature: m.signature,
    time: m.time,
    direction: m.direction,
    amount: Number(m.units) / 1e6,
    nest: m.counterparty === nest,
  }));
  const body = { items };
  cache.set(key, { at: Date.now(), body });
  return json(body);
});
