import { createRemoteJWKSet, jwtVerify } from 'jose';

const appId = () => process.env.NEXT_PUBLIC_PRIVY_APP_ID as string;
const API = 'https://api.privy.io/v1';

type LinkedAccount = { type: string; chain_type?: string; connector_type?: string; address?: string };
type PrivyUser = { id: string; linked_accounts: LinkedAccount[] };

async function privy(path: string, init?: RequestInit) {
  const auth = Buffer.from(`${appId()}:${process.env.PRIVY_APP_SECRET}`).toString('base64');
  return fetch(`${API}${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'content-type': 'application/json', 'privy-app-id': appId(), authorization: `Basic ${auth}` },
  });
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function verifyAccessToken(req: Request): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!token) return null;
  jwks ??= createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId()}/jwks.json`));
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: 'privy.io', audience: appId() });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function solanaWallet(user: PrivyUser): string | null {
  const wallet = user.linked_accounts.find(
    (a) => a.type === 'wallet' && a.chain_type === 'solana' && a.connector_type === 'embedded',
  );
  return wallet?.address ?? null;
}

export async function userById(id: string): Promise<PrivyUser> {
  const res = await privy(`/users/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`Privy user lookup failed (${res.status})`);
  return res.json();
}

export async function userByPhone(number: string): Promise<PrivyUser | null> {
  const res = await privy('/users/phone/number', { method: 'POST', body: JSON.stringify({ number }) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Privy phone lookup failed (${res.status})`);
  return res.json();
}

// Gives a phone number a self-custody wallet before its owner signs up. It is theirs when they log in by SMS.
export async function createUserForPhone(number: string): Promise<PrivyUser> {
  const res = await privy('/users', {
    method: 'POST',
    body: JSON.stringify({ linked_accounts: [{ type: 'phone', number }], wallets: [{ chain_type: 'solana' }] }),
  });
  if (!res.ok) throw new Error(`Privy user creation failed (${res.status})`);
  return res.json();
}
