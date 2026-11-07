import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { solanaWallet, userById, verifyAccessToken } from './privy';
import { SubmittedError } from './solana.mjs';

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (message: string, status = 400) => json({ error: message }, status);

const hits = new Map<string, number[]>();
// Per-instance limit: it slows abuse of the fee payer, which is enough for a demo.
export function allow(key: string, max: number, windowMs = 3_600_000) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

// Returns the JSON object body, or null for invalid JSON, null, arrays, or other non-objects.
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// 202: the transaction was sent but not yet confirmed. The client must not send it again.
export const pending = (signature: string) =>
  json({ signature, status: 'pending', message: 'Sent. Waiting for the network to confirm. Do not send it again.' }, 202);

export type AuthedUser = { id: string; wallet: PublicKey };

export async function requireUser(req: Request): Promise<AuthedUser | NextResponse> {
  const id = await verifyAccessToken(req);
  if (!id) return fail('Please log in again', 401);
  const wallet = solanaWallet(await userById(id));
  if (!wallet) return fail('Your wallet is still being set up', 409);
  return { id, wallet: new PublicKey(wallet) };
}

export function route<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(err);
      if (err instanceof SubmittedError) return pending(err.signature);
      const message = err instanceof Error ? err.message : '';
      if (message === 'TREASURY_LOW') return fail('The demo supply of test USDC is low. Try a smaller amount.', 503);
      return fail('Something went wrong. Please try again.', 500);
    }
  };
}
