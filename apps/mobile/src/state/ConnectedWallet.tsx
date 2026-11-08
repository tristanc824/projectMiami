import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { approvePayment } from '../services/approval';
import { reviewTransfer } from '../services/review';
import { fetchHolds, performHold } from '../services/holds';
import { decodeLiveActivity } from '../domain/liveActivity';
import { mergeIncomingActivity, reconcilePendingActivity } from '../domain/incoming';
import type { Activity } from '../domain/wallet';
import * as dat from '../services/dat';
import { LiveContext, type LiveContextValue } from './live';

const POLL_MS = 4000;
const MAX_ACTIVITY = 50;
const pageHidden = () => typeof document !== 'undefined' && document.hidden;
async function paymentResult(work: () => Promise<string>): Promise<{ signature: string; status?: 'pending'; lastValidBlockHeight?: number }> {
  try { return { signature: await work() }; }
  catch (error) {
    if (error instanceof dat.PendingPayment) return { signature: error.signature, status: 'pending', lastValidBlockHeight: error.lastValidBlockHeight };
    throw error;
  }
}
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
  const [storageOwner, setStorageOwner] = useState('');
  const [incomingOwner, setIncomingOwner] = useState('');
  const [stored, setStored] = useState<{ address: string; items: Activity[] }>({ address: '', items: [] });
  const storedRef = useRef(stored);
  useLayoutEffect(() => { storedRef.current = stored; }, [stored]);
  const balanceCents = balance && balance.address === address ? balance.cents : null;
  const activity = useMemo(() => stored.address === address ? stored.items : [], [stored, address]);
  const [syncIssue, setSyncIssue] = useState<{ owner: string; balance?: string; activity?: string }>({ owner: '' });
  const last = useRef<{ address: string; cents: number } | null>(null);
  const busy = useRef(0);
  const refreshSequence = useRef(0);
  const refreshing = useRef(0);
  const activeAddress = useRef(address);
  useLayoutEffect(() => { activeAddress.current = address; }, [address]);
  const storeKey = (owner: string) => `guard.live.${owner}.activity`;

  useEffect(() => {
    if (!address) return;
    let active = true;
    AsyncStorage.getItem(storeKey(address)).then(raw => {
      const items = decodeLiveActivity(raw);
      if (active) setStored(current => ({ address, items: mergeIncomingActivity(current.address === address ? [...current.items, ...items.filter(item => !current.items.some(existing => existing.id === item.id || item.signature && existing.signature === item.signature))] : items, []) }));
    }).catch(() => { /* A disk failure must not erase an incoming chain sync. */ }).finally(() => { if (active) setStorageOwner(address); });
    return () => { active = false; };
  }, [address]);

  const addActivity = useCallback((item: Omit<Activity, 'id' | 'createdAt'>) => {
    const id = newId();
    setStored(current => {
      const base = current.address === address ? current.items.filter(existing => !item.signature || existing.signature !== item.signature) : [];
      const items = [{ ...item, id, createdAt: new Date().toISOString(), live: true }, ...base].slice(0, MAX_ACTIVITY);
      return { address, items };
    });
    return id;
  }, [address]);

  // Persist merged disk/chain state after loading, so a late disk read cannot drop receipts.
  const pendingWrite = useRef(Promise.resolve());
  useEffect(() => {
    if (!address || storageOwner !== address || stored.address !== address) return;
    const serialized = JSON.stringify(stored.items);
    pendingWrite.current = pendingWrite.current.catch(() => undefined).then(() => AsyncStorage.setItem(storeKey(address), serialized)).catch(() => undefined);
  }, [address, storageOwner, stored]);

  useEffect(() => {
    if (!address || storageOwner !== address) return;
    let active = true;
    let polling = false;
    const sync = async () => {
      if (polling || busy.current > 0) return;
      polling = true;
      try {
        const payments = await dat.fetchIncomingPayments(getAccessToken);
        let resolutions: dat.PaymentResolution[] = [];
        const pending = storedRef.current.address === address ? storedRef.current.items.filter(item => item.status === 'pending' && item.signature && item.lastValidBlockHeight).slice(0, 20) : [];
        if (pending.length) {
          try { resolutions = (await dat.fetchPendingPayments(getAccessToken, pending.map(item => ({ signature: item.signature!, kind: item.kind, amountCents: item.amountCents, lastValidBlockHeight: item.lastValidBlockHeight! })))).transactions; }
          catch { /* Keep pending receipts until the chain can be checked, without discarding confirmed history. */ }
        }
        if (!active || activeAddress.current !== address || busy.current > 0) return;
        setStored(current => ({ address, items: reconcilePendingActivity(mergeIncomingActivity(current.address === address ? current.items : [], payments), resolutions) }));
        setIncomingOwner(address);
        setSyncIssue(current => ({ ...(current.owner === address ? current : {}), owner: address, activity: '' }));
      } catch { if (active) setSyncIssue(current => ({ ...(current.owner === address ? current : {}), owner: address, activity: 'Payment history is temporarily unavailable. Nest will retry automatically.' })); }
      finally { polling = false; }
    };
    void sync();
  // Poll only while the page is visible; each loop already skips a read while its last one is running.
    const poll = () => { if (!pageHidden()) void sync(); };
    const timer = setInterval(poll, POLL_MS);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', poll);
    return () => {
      active = false; clearInterval(timer);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', poll);
    };
  }, [address, storageOwner, getAccessToken]);

  const refresh = useCallback(async (settling = false) => {
    if (!address || (!settling && (busy.current > 0 || refreshing.current !== 0))) return;
    const request = ++refreshSequence.current;
    refreshing.current = request;
    try {
      const next = await dat.fetchBalanceCents(address);
      // Ignore requests made before a transfer or an account switch.
      if (request !== refreshSequence.current || activeAddress.current !== address) return;
      last.current = { address, cents: next };
      setBalance({ address, cents: next });
      setSyncIssue(current => ({ ...(current.owner === address ? current : {}), owner: address, balance: '' }));
    } catch { if (activeAddress.current === address) setSyncIssue(current => ({ ...(current.owner === address ? current : {}), owner: address, balance: 'Your balance could not be refreshed. Nest will retry automatically.' })); }
    finally { if (refreshing.current === request) refreshing.current = 0; }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    refreshing.current = 0;
    void Promise.resolve().then(() => refresh());
  // Poll only while the page is visible; each loop already skips a read while its last one is running.
    const poll = () => { if (!pageHidden()) void refresh(); };
    const timer = setInterval(poll, POLL_MS);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer); refreshSequence.current += 1;
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', poll);
    };
  }, [address, refresh]);

  const during = useCallback(async <T,>(work: () => Promise<T>, deltaCents: number | (() => number)): Promise<T> => {
    if (busy.current > 0) throw new Error('Another payment is still being sent. Please wait a moment.');
    busy.current += 1;
    refreshSequence.current += 1;
    try {
      const result = await work();
      // Apply only a confirmed action. A slow balance endpoint must not leave
      // spendable funds looking unchanged or mislabel our send as a text payment.
      if (activeAddress.current === address && last.current?.address === address) {
        const cents = Math.max(0, last.current.cents + (typeof deltaCents === 'function' ? deltaCents() : deltaCents));
        last.current = { address, cents };
        setBalance({ address, cents });
      }
      return result;
    }
    finally {
      // The transfer has already finished. Show its receipt immediately while
      // refreshing in the background. A new confirmed action invalidates this read.
      busy.current -= 1;
      void refresh(true);
    }
  }, [refresh, address]);

  // Text payments: sending by SMS with no data. Turning them on grants Nest's server a signer that a Privy
  // policy limits to USDC transfers of $10 or less. Tagged by wallet, like the balance.
  const [text, setText] = useState<{ address: string; settings: dat.TextPayments } | null>(null);
  const textPayments = text && text.address === address ? text.settings : null;
  useEffect(() => {
    if (!address || !addSigner) return; // The website has no text payments, so nothing to fetch.
    let active = true;
    dat.fetchTextPayments(getAccessToken).then(settings => { if (active) setText({ address, settings }); }).catch(() => undefined);
    return () => { active = false; };
  }, [address, getAccessToken, addSigner]);

  const enableTextPayments = useCallback(async (pin: string) => {
    if (!/^\d{4}$/.test(pin)) throw new Error('Choose a 4-digit PIN.');
    if (!address) throw new Error('Your wallet is still being set up.');
    if (!addSigner) throw new Error('Turn on text payments in the Nest iPhone app.');
    const settings = textPayments ?? await dat.fetchTextPayments(getAccessToken);
    if (!settings.available) throw new Error('Text payments are not available yet.');
    await approvePayment('Enable text payments from this wallet');
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

  const attempts = useRef(new Map<string, { fingerprint: string; transfer: dat.TransferAttempt; receipt?: string; attempted?: boolean }>());
  const operation = useCallback((requestId: string | undefined, fingerprint: string) => {
    const key = `${address}:${requestId ?? newId()}`;
    let entry = attempts.current.get(key);
    if (entry && entry.fingerprint !== fingerprint) throw new Error('Payment details changed. Start a new payment.');
    if (!entry) {
      if (attempts.current.size >= 100) attempts.current.delete(attempts.current.keys().next().value!);
      entry = { fingerprint, transfer: {} }; attempts.current.set(key, entry);
    }
    return entry;
  }, [address]);
  const getFundingStatus = useCallback(() => dat.fetchFundingStatus(getAccessToken), [getAccessToken]);
  const getHolds = useCallback(() => fetchHolds(getAccessToken), [getAccessToken]);
  const value = useMemo<LiveContextValue>(() => ({
    status, getAccessToken, getFundingStatus,
    problem: problem || (syncIssue.owner === address ? syncIssue.balance || syncIssue.activity || '' : ''), phone, address, balanceCents, activity, activityReady: storageOwner === address && incomingOwner === address,
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
    send: (recipient, cents, note, requestId) => {
      if (activity.some(item => item.status === 'pending' && item.kind !== 'add')) return Promise.reject(new Error('A previous payment is still pending. Check Activity before sending again.'));
      const entry = operation(requestId, JSON.stringify(['send', recipient.address, cents]));
      if (entry.receipt) return Promise.resolve(entry.receipt);
      const replaying = entry.attempted;
      let pending = false;
      return during(async () => {
        await approvePayment(`Send $${(cents / 100).toFixed(2)} to ${dat.formatPhone(recipient.phone)}`);
        entry.attempted = true;
        const result = await paymentResult(() => dat.transfer(getAccessToken, sign, { recipient: recipient.address }, cents, entry.transfer));
        pending = result.status === 'pending';
        entry.receipt = addActivity({ kind: 'send', name: dat.formatPhone(recipient.phone), recipientPhone: recipient.phone, amountCents: cents, feeCents: 0, note: note.trim().slice(0, 140) || 'Sent with Nest', ...result });
        return entry.receipt;
      }, () => pending || replaying ? 0 : -cents);
    },
    reviewPayment: (facts, fresh) => reviewTransfer(facts, fresh, getAccessToken),
    getHolds,
    createHold: (recipient, cents, ticket, pin) => during(async () => {
      if (activity.some(item => item.status === 'pending' && item.kind !== 'add')) throw new Error('A previous payment is still pending. Check Activity before sending again.');
      await approvePayment(`Place $${(cents / 100).toFixed(2)} in Safe Hold`);
      const result = await performHold(getAccessToken, sign, { action: 'deposit', reviewTicket: ticket, pin });
      addActivity({ kind: 'hold', name: dat.formatPhone(recipient.phone), recipientPhone: recipient.phone, amountCents: cents, feeCents: 0, note: 'In Safe Hold · 24-hour cooling-off', signature: result.signature, holdState: result.state });
      return result.state;
    }, -cents),
    manageHold: (hold, action, pin, verified) => during(async () => {
      if (action !== 'refund' && activity.some(item => item.status === 'pending' && item.kind !== 'add')) throw new Error('A previous payment is still pending. Check Activity before releasing more money.');
      await approvePayment(`${action === 'refund' ? 'Undo Safe Hold' : 'Release Safe Hold'} · $${(hold.amountCents / 100).toFixed(2)}`);
      const result = await performHold(getAccessToken, sign, { action, state: hold.state, pin, verified });
      addActivity({ kind: action === 'refund' ? 'receive' : 'send', name: action === 'refund' ? 'Safe Hold cancelled' : 'Safe Hold released', amountCents: hold.amountCents, feeCents: 0, ...(action !== 'refund' ? { recipientPhone: activity.find(item => item.holdState === hold.state)?.recipientPhone } : {}), note: action === 'refund' ? 'Returned to your wallet' : 'Released to recipient', signature: result.signature });
    }, action === 'refund' ? hold.amountCents : 0),
    deposit: (dollars, requestId) => {
      const entry = operation(requestId, JSON.stringify(['add', dollars]));
      if (entry.receipt) return Promise.resolve(entry.receipt);
      const replaying = entry.attempted; entry.attempted = true;
      let pending = false;
      return during(async () => {
        const result = await paymentResult(() => dat.depositTestCard(getAccessToken, dollars, requestId));
        pending = result.status === 'pending';
        entry.receipt = addActivity({ kind: 'add', name: 'Added with test card', amountCents: dollars * 100, feeCents: 0, note: 'Stripe test card · no real charge', ...result });
        return entry.receipt;
      }, () => pending || replaying ? 0 : dollars * 100);
    },
    cashOut: (cents, destination = 'bank', requestId) => {
      if (activity.some(item => item.status === 'pending' && item.kind !== 'add')) return Promise.reject(new Error('A previous payment is still pending. Check Activity before sending again.'));
      const entry = operation(requestId, JSON.stringify(['withdraw', destination, cents]));
      if (entry.receipt) return Promise.resolve(entry.receipt);
      const replaying = entry.attempted;
      let pending = false;
      return during(async () => {
        await approvePayment(`Withdraw $${(cents / 100).toFixed(2)}`);
        entry.attempted = true;
        const result = await paymentResult(() => dat.transfer(getAccessToken, sign, { toTreasury: true }, cents, entry.transfer));
        pending = result.status === 'pending';
        entry.receipt = addActivity({ kind: 'withdraw', withdrawalDestination: destination, name: destination === 'apple-cash' ? 'Apple Cash withdrawal' : 'Bank withdrawal', amountCents: cents, feeCents: 0, note: `${destination === 'apple-cash' ? 'Apple Cash' : 'Bank'} payout simulated · USDC returned on devnet`, ...result });
        return entry.receipt;
      }, () => pending || replaying ? 0 : -cents);
    },
    textPayments, enableTextPayments, disableTextPayments,
  }), [status, address, problem, syncIssue, phone, balanceCents, activity, storageOwner, incomingOwner, sendCode, verifyCode, logout, getAccessToken, during, sign, addActivity, getFundingStatus, getHolds, operation, textPayments, enableTextPayments, disableTextPayments]);

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}
