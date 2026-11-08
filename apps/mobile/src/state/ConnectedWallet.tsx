import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Activity } from '../domain/wallet';
import * as dat from '../services/dat';
import { LiveContext, type LiveContextValue } from './live';

const POLL_MS = 4000;
const MAX_ACTIVITY = 50;
const newId = () => `live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
type Props = Pick<LiveContextValue, 'status' | 'problem' | 'phone' | 'address' | 'sendCode' | 'verifyCode' | 'logout'> & {
  getAccessToken: dat.TokenSource; sign: dat.Signer; children: ReactNode;
  /** Grants and revokes Nest's limited server signer for text payments. Omitted where the SDK can't (the browser). */
  addSigner?: (settings: dat.TextPayments) => Promise<void>;
  removeSigner?: () => Promise<void>;
};

/** Shared account and transfer behavior for the native and browser wallet adapters. */
export function ConnectedWallet({ children, status, problem, phone, address, sendCode, verifyCode, logout, getAccessToken, sign, addSigner, removeSigner }: Props) {
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
    // Outside the app, money only leaves through text payments.
    if (busy.current === 0 && previous !== null && next < previous) {
      addActivity({ kind: 'send', name: 'Sent by text message', amountCents: previous - next, feeCents: 0, note: 'Sent with no data, by SMS' });
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

  // Text payments: sending by SMS with no data. Turning them on grants Nest's server a signer that a Privy
  // policy limits to USDC transfers of $10 or less. Tagged by wallet, like the balance.
  const [text, setText] = useState<{ address: string; settings: dat.TextPayments } | null>(null);
  const textPayments = text && text.address === address ? text.settings : null;
  useEffect(() => {
    if (!address) return;
    let active = true;
    dat.fetchTextPayments(getAccessToken).then(settings => { if (active) setText({ address, settings }); }).catch(() => undefined);
    return () => { active = false; };
  }, [address, getAccessToken]);

  const enableTextPayments = useCallback(async (pin: string) => {
    if (!/^\d{4}$/.test(pin)) throw new Error('Choose a 4-digit PIN.');
    if (!address) throw new Error('Your wallet is still being set up.');
    if (!addSigner) throw new Error('Turn on text payments in the Nest iPhone app.');
    const settings = textPayments ?? await dat.fetchTextPayments(getAccessToken);
    if (!settings.available) throw new Error('Text payments are not available yet.');
    try {
      await addSigner(settings);
    } catch (failure) {
      // Turning on again after turning off from a text (STOP) finds the signer still there.
      if (!(failure instanceof Error && /already/i.test(failure.message))) throw failure;
    }
    await dat.setTextPayments(getAccessToken, { on: true, pin });
    setText({ address, settings: { ...settings, on: true } });
  }, [address, textPayments, getAccessToken, addSigner]);

  const disableTextPayments = useCallback(async () => {
    if (!address) return;
    await dat.setTextPayments(getAccessToken, { on: false });
    setText(current => current && current.address === address ? { address, settings: { ...current.settings, on: false } } : current);
    if (!removeSigner) return;
    try { await removeSigner(); }
    catch { throw new Error("Text payments are off, but Nest's access to your wallet wasn't removed. Try again."); }
  }, [address, getAccessToken, removeSigner]);

  const value = useMemo<LiveContextValue>(() => ({
    status,
    problem, phone, address, balanceCents, activity,
    sendCode: async input => {
      const normalized = dat.normalizePhone(input);
      if (!normalized) throw new Error('Enter a full phone number.');
      await sendCode(normalized);
    },
    verifyCode: async (input, code) => {
      const normalized = dat.normalizePhone(input);
      if (!normalized) throw new Error('Enter a full phone number.');
      if (!/^\d{6}$/.test(code.trim())) throw new Error('Enter the 6-digit code.');
      await verifyCode(normalized, code.trim());
    },
    logout,
    findRecipient: async input => {
      const normalized = dat.normalizePhone(input);
      if (!normalized) throw new Error('Enter a full phone number.');
      return dat.findRecipient(getAccessToken, normalized);
    },
    send: (recipient, cents, note) => during(async () => {
      const signature = await dat.transfer(getAccessToken, sign, { recipient: recipient.address }, cents);
      return addActivity({ kind: 'send', name: dat.formatPhone(recipient.phone), recipientPhone: recipient.phone, amountCents: cents, feeCents: 0, note: note.trim().slice(0, 140) || 'Sent with Nest', signature });
    }),
    deposit: dollars => during(async () => {
      const signature = await dat.depositTestCard(getAccessToken, dollars);
      return addActivity({ kind: 'add', name: 'Added with test card', amountCents: dollars * 100, feeCents: 0, note: 'Stripe test card · no real charge', signature });
    }),
    cashOut: (cents, destination = 'bank') => during(async () => {
      const signature = await dat.transfer(getAccessToken, sign, { toTreasury: true }, cents);
      return addActivity({ kind: 'withdraw', withdrawalDestination: destination, name: destination === 'apple-cash' ? 'Apple Cash withdrawal' : 'Bank withdrawal', amountCents: cents, feeCents: 0, note: `${destination === 'apple-cash' ? 'Apple Cash' : 'Bank'} payout simulated · USDC returned on devnet`, signature });
    }),
    textPayments, enableTextPayments, disableTextPayments,
  }), [status, address, problem, phone, balanceCents, activity, sendCode, verifyCode, logout, getAccessToken, during, sign, addActivity, textPayments, enableTextPayments, disableTextPayments]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
