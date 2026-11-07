import AsyncStorage from '@react-native-async-storage/async-storage';
import { PrivyProvider, useEmbeddedSolanaWallet, useLoginWithSMS, usePrivy } from '@privy-io/expo';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Activity } from '../domain/wallet';
import * as dat from '../services/dat';
import { LiveContext, type LiveContextValue } from './live';
import { privyAppId, privyClientId } from './liveConfig';

/** Only loaded by LiveProvider.native in a configured development/TestFlight build. */
export function PrivyLive({ children }: { children: ReactNode }) {
  return <PrivyProvider appId={privyAppId} clientId={privyClientId}><Session>{children}</Session></PrivyProvider>;
}

const POLL_MS = 4000;
const MAX_ACTIVITY = 50;
const newId = () => `live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function Session({ children }: { children: ReactNode }) {
  const { isReady, user, getAccessToken, logout: privyLogout } = usePrivy();
  const solana = useEmbeddedSolanaWallet();
  const { sendCode: privySendCode, loginWithCode } = useLoginWithSMS();
  const [walletProblem, setWalletProblem] = useState('');
  const creating = useRef(false);

  const wallet = solana.status === 'connected' ? solana.wallets[0] : undefined;
  const address = wallet?.address ?? '';
  const phoneAccount = user?.linked_accounts.find(account => account.type === 'phone') as { phoneNumber?: string; number?: string } | undefined;
  const phone = phoneAccount?.phoneNumber || phoneAccount?.number || '';

  // loginWithCode doesn't auto-create wallets, so make one for new users. Numbers someone already
  // sent money to have a wallet created by the server, and must not get a second one.
  useEffect(() => {
    if (!user || solana.status !== 'not-created' || creating.current) return;
    creating.current = true;
    solana.create().catch(failure => {
      creating.current = false;
      setWalletProblem(failure instanceof Error ? failure.message : 'Your wallet could not be set up.');
    });
  }, [user, solana]);

  const problem = !user ? '' : solana.status === 'needs-recovery' ? 'This wallet needs to be recovered before it can be used on this device.'
    : solana.status === 'error' ? solana.error || 'Your wallet could not be loaded.' : walletProblem;

  // Balance, activity and incoming-payment detection, scoped to the signed-in wallet.
  // Both are tagged with their wallet, so switching accounts never shows the previous user's data.
  const [balance, setBalance] = useState<{ address: string; cents: number } | null>(null);
  const [stored, setStored] = useState<{ address: string; items: Activity[] }>({ address: '', items: [] });
  const balanceCents = balance && balance.address === address ? balance.cents : null;
  const activity = useMemo(() => stored.address === address ? stored.items : [], [stored, address]);
  const last = useRef<{ address: string; cents: number } | null>(null);
  const busy = useRef(0);
  const storeKey = (owner: string) => `guard.live.${owner}.activity`;

  useEffect(() => {
    if (!address) return;
    let active = true;
    AsyncStorage.getItem(storeKey(address)).then(raw => {
      const saved: unknown = raw ? JSON.parse(raw) : [];
      const items = Array.isArray(saved) ? saved.filter(item => item && typeof item.id === 'string' && item.id.startsWith('live-')).slice(0, MAX_ACTIVITY) : [];
      if (active) setStored(current => current.address === address ? current : { address, items });
    }).catch(() => { if (active) setStored({ address, items: [] }); });
    return () => { active = false; };
  }, [address]);

  const addActivity = useCallback((item: Omit<Activity, 'id' | 'createdAt'>) => {
    const id = newId();
    setStored(current => {
      const base = current.address === address ? current.items : [];
      const items = [{ ...item, id, createdAt: new Date().toISOString(), live: true }, ...base].slice(0, MAX_ACTIVITY);
      void AsyncStorage.setItem(storeKey(address), JSON.stringify(items)).catch(() => undefined);
      return { address, items };
    });
    return id;
  }, [address]);

  const refresh = useCallback(async () => {
    if (!address) return;
    let next: number;
    try { next = await dat.fetchBalanceCents(address); } catch { return; }
    const previous = last.current?.address === address ? last.current.cents : null;
    // The user's own actions record themselves; any other increase is money received.
    if (busy.current === 0 && previous !== null && next > previous) {
      addActivity({ kind: 'receive', name: 'Money received', amountCents: next - previous, feeCents: 0, note: 'Arrived in your wallet' });
    }
    last.current = { address, cents: next };
    setBalance({ address, cents: next });
  }, [address, addActivity]);

  useEffect(() => {
    if (!address) return;
    void refresh();
    const timer = setInterval(() => { void refresh(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [address, refresh]);

  const during = useCallback(async <T,>(work: () => Promise<T>): Promise<T> => {
    busy.current += 1;
    try { const result = await work(); await refresh(); return result; }
    finally { busy.current -= 1; }
  }, [refresh]);

  const sign = useCallback<dat.Signer>(async message => {
    if (!wallet) throw new Error('Your wallet is still being set up.');
    const provider = await wallet.getProvider();
    // The prepared message is already base64, which is how Privy expects raw bytes.
    const { signature } = await provider.request({ method: 'signMessage', params: { message } });
    return signature;
  }, [wallet]);

  const value = useMemo<LiveContextValue>(() => ({
    status: !isReady ? 'loading' : !user ? 'signed-out' : !address ? 'setting-up' : 'ready',
    problem, phone, address, balanceCents, activity,
    sendCode: async input => {
      const normalized = dat.normalizePhone(input);
      if (!normalized) throw new Error('Enter a full phone number.');
      await privySendCode({ phone: normalized });
    },
    verifyCode: async (input, code) => {
      const normalized = dat.normalizePhone(input);
      if (!normalized) throw new Error('Enter a full phone number.');
      if (!/^\d{6}$/.test(code.trim())) throw new Error('Enter the 6-digit code.');
      await loginWithCode({ code: code.trim(), phone: normalized });
    },
    logout: async () => { await privyLogout(); creating.current = false; setWalletProblem(''); },
    findRecipient: async input => {
      const normalized = dat.normalizePhone(input);
      if (!normalized) throw new Error('Enter a full phone number.');
      return dat.findRecipient(getAccessToken, normalized);
    },
    send: (recipient, cents, note) => during(async () => {
      const signature = await dat.transfer(getAccessToken, sign, { recipient: recipient.address }, cents);
      return addActivity({ kind: 'send', name: dat.formatPhone(recipient.phone), amountCents: cents, feeCents: 0, note: note.trim().slice(0, 140) || 'Sent with Guard', signature });
    }),
    deposit: dollars => during(async () => {
      const signature = await dat.depositTestCard(getAccessToken, dollars);
      return addActivity({ kind: 'add', name: 'Added with test card', amountCents: dollars * 100, feeCents: 0, note: 'Stripe test card · no real charge', signature });
    }),
    cashOut: cents => during(async () => {
      const signature = await dat.transfer(getAccessToken, sign, { toTreasury: true }, cents);
      return addActivity({ kind: 'withdraw', name: 'Cash out', amountCents: cents, feeCents: 0, note: 'Bank payout simulated · USDC returned on devnet', signature });
    }),
  }), [isReady, user, address, problem, phone, balanceCents, activity, privySendCode, loginWithCode, privyLogout, getAccessToken, during, sign, addActivity]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
