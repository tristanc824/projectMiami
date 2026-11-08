import { call, post, normalizeSignature, type Signer, type TokenSource } from './dat';
export type SafeHold = { state: string; sender: string; approver: string; recipient: string; amountCents: number; releaseAfter: number; reviewHash: string };
export type HoldsResult = { available: boolean; reason?: string; holds: SafeHold[] };
export async function fetchHolds(getToken: TokenSource): Promise<HoldsResult> {
  const token = await getToken();
  if (!token) throw new Error('Sign in to manage Safe Holds.');
  return call('/api/holds', { method: 'GET', headers: { authorization: `Bearer ${token}` } });
}
export async function performHold(getToken: TokenSource, sign: Signer, body: { action: 'deposit'; reviewTicket: string; pin: string } | { action: 'refund' | 'release' | 'release-early'; state: string; pin?: string; verified?: boolean }) {
  const prepared = await post<{ message: string; preparedTicket: string; simulation: string; state: string }>(getToken, '/api/holds', { ...body, step: 'prepare' });
  if (prepared.simulation !== 'passed' || !prepared.message || !prepared.preparedTicket) throw new Error('The hold could not be simulated. Nothing was signed.');
  const signature = normalizeSignature(await sign(prepared.message));
  return post<{ signature: string; state: string; amountCents: number; action: string }>(getToken, '/api/holds', { step: 'submit', preparedTicket: prepared.preparedTicket, signature });
}
