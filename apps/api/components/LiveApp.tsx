'use client';

import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import { PrivyProvider, useLoginWithSms, usePrivy } from '@privy-io/react-auth';
import { useCreateWallet, useWallets } from '@privy-io/react-auth/solana';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizePhone } from '@/lib/phone.mjs';
import Home from './Home';
import Login from './Login';
import type { Activity, Recipient, Session } from './types';

const POLL_MS = 4000;
const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

function readStore<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function Gate() {
  const { ready, authenticated, user, getAccessToken, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { createWallet } = useCreateWallet();
  const { sendCode, loginWithCode } = useLoginWithSms();
  const wallet = wallets.find((w) => w.standardWallet.name === 'Privy');
  const creating = useRef(false);

  // Normally handled by createOnLogin; this catches accounts that predate it.
  useEffect(() => {
    if (!authenticated || !walletsReady || wallet || creating.current) return;
    const hasWallet = user?.linkedAccounts.some(
      (a) => a.type === 'wallet' && 'chainType' in a && a.chainType === 'solana',
    );
    if (hasWallet) return;
    creating.current = true;
    createWallet().catch(console.error);
  }, [authenticated, walletsReady, wallet, user, createWallet]);

  if (!ready) return <div className="splash">DAT</div>;
  if (!authenticated) {
    return (
      <Login
        sendCode={async (phoneNumber) => sendCode({ phoneNumber })}
        verifyCode={async (code) => {
          await loginWithCode({ code });
        }}
      />
    );
  }
  if (!wallet) return <div className="splash">Setting up your wallet…</div>;
  return (
    <Live
      address={wallet.address}
      phone={user?.phone?.number ?? ''}
      signMessage={async (message) => {
        const { signature } = await wallet.signMessage({ message });
        return signature;
      }}
      getAccessToken={getAccessToken}
      logout={logout}
    />
  );
}

type LiveProps = {
  address: string;
  phone: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  getAccessToken: () => Promise<string | null>;
  logout: () => Promise<void>;
};

function Live({ address, phone, signMessage, getAccessToken, logout }: LiveProps) {
  const storeKey = `dat:${address}`;
  const [balance, setBalance] = useState<number | null>(null);
  const [activity, setActivity] = useState<Activity[]>(() => readStore(`${storeKey}:activity`, []));
  const [known, setKnown] = useState<string[]>(() => readStore(`${storeKey}:known`, []));
  const [received, setReceived] = useState<Session['received']>(null);
  const last = useRef<number | null>(null);
  const busy = useRef(0);

  const api = useCallback(
    async (path: string, body: unknown) => {
      const token = await getAccessToken();
      const res = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      return data;
    },
    [getAccessToken],
  );

  const addActivity = useCallback(
    (a: Omit<Activity, 'id' | 'at'>) => {
      setActivity((list) => {
        const next = [{ ...a, id: `${Date.now()}-${list.length}`, at: Date.now() }, ...list].slice(0, 30);
        writeStore(`${storeKey}:activity`, next);
        return next;
      });
    },
    [storeKey],
  );

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/balance?address=${address}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { balance: next } = (await res.json()) as { balance: number };
    // Balance changes during the user's own actions are recorded by those actions.
    if (busy.current === 0 && last.current !== null && next > last.current + 1e-6) {
      const amount = next - last.current;
      setReceived({ amount, at: Date.now() });
      addActivity({ kind: 'received', label: 'Money received', amount });
    }
    last.current = next;
    setBalance(next);
  }, [address, addActivity]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const during = useCallback(
    async <T,>(work: () => Promise<T>): Promise<T> => {
      busy.current += 1;
      try {
        const result = await work();
        await refresh();
        return result;
      } finally {
        busy.current -= 1;
      }
    },
    [refresh],
  );

  // The server builds the transfer, but only this device's wallet can sign it.
  const transfer = useCallback(
    async (body: { recipient?: string; toTreasury?: boolean; amount: string }): Promise<string> => {
      const { message, lastValidBlockHeight } = await api('/api/transfer/prepare', body);
      const signature = await signMessage(fromB64(message));
      const sent = await api('/api/transfer/submit', { message, signature: toB64(signature), lastValidBlockHeight });
      return sent.signature;
    },
    [api, signMessage],
  );

  const session = useMemo<Session>(
    () => ({
      phone,
      address,
      balance,
      activity,
      received,
      knownRecipient: (p) => known.includes(p),
      findRecipient: async (p) => {
        const normalized = normalizePhone(p);
        if (!normalized) throw new Error('Enter a full phone number');
        return (await api('/api/recipient', { phone: normalized })) as Recipient;
      },
      send: (recipient, amount) =>
        during(async () => {
          const signature = await transfer({ recipient: recipient.address, amount: amount.toFixed(2) });
          addActivity({ kind: 'sent', label: recipient.phone, amount: -amount, signature });
          setKnown((list) => {
            const next = [...new Set([...list, recipient.phone])];
            writeStore(`${storeKey}:known`, next);
            return next;
          });
          return signature;
        }),
      toTreasury: (kind, label, amount) =>
        during(async () => {
          const signature = await transfer({ toTreasury: true, amount: amount.toFixed(2) });
          addActivity({ kind, label, amount: -amount, signature });
          return signature;
        }),
      depositTestCard: (amount) =>
        during(async () => {
          const { signature } = await api('/api/deposit/test-card', { amount });
          addActivity({ kind: 'deposit', label: 'Added with test card', amount, signature });
          return signature;
        }),
      depositIntent: (amount) => api('/api/deposit/intent', { amount }),
      depositComplete: (id, amount) =>
        during(async () => {
          const { signature } = await api('/api/deposit/complete', { id });
          addActivity({ kind: 'deposit', label: 'Added with Apple Pay', amount, signature });
          return signature;
        }),
      logout,
    }),
    [phone, address, balance, activity, received, known, api, during, transfer, addActivity, storeKey, logout],
  );

  return <Home session={session} applePay />;
}

export default function LiveApp() {
  const rpcs = useMemo(
    () => ({
      'solana:devnet': {
        rpc: createSolanaRpc('https://api.devnet.solana.com'),
        rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
      },
    }),
    [],
  );
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={{
        loginMethods: ['sms'],
        intl: { defaultCountry: 'US' },
        appearance: { walletChainType: 'solana-only' },
        embeddedWallets: { showWalletUIs: false, solana: { createOnLogin: 'all-users' } },
        solana: { rpcs },
      }}
    >
      <Gate />
    </PrivyProvider>
  );
}
