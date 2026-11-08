import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { applyDemoCommand, createInitialWallet, decodeWallet, type DemoCommand, type WalletState } from '../domain/wallet';
import { applySavings, initialSavings, type SavingsCommand } from '../domain/savings';
import { useLive } from './live';

type WalletContext = { wallet: WalletState; ready: boolean; storageWarning: boolean; execute: (command: DemoCommand) => string; reset: () => void; save: (command: SavingsCommand) => void };
const Context = createContext<WalletContext | null>(null);
const DemoContext = createContext<WalletContext | null>(null);
const STORAGE_KEY = 'lazo.demo-wallet.v1';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState(createInitialWallet);
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const current = useRef(wallet);
  const loaded = useRef(false);
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (active) { const restored = decodeWallet(raw); current.current = restored; setWallet(restored); }
    }).catch(() => { if (active) setStorageWarning(true); }).finally(() => {
      if (active) { loaded.current = true; setReady(true); }
    });
    return () => { active = false; loaded.current = false; };
  }, []);
  const commit = useCallback((next: WalletState) => {
    current.current = next;
    setWallet(next);
    pendingWrite.current = pendingWrite.current.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))).catch(() => { setStorageWarning(true); });
  }, []);
  const execute = useCallback((command: DemoCommand) => {
    if (!loaded.current) throw new Error('Your demo wallet is still loading.');
    commit(applyDemoCommand(current.current, command));
    return command.id;
  }, [commit]);
  const save = useCallback((command: SavingsCommand) => {
    if (!loaded.current) throw new Error('Your wallet is still loading.');
    const state = current.current;
    commit({ ...state, savings: applySavings(state.savings ?? initialSavings(), state.balanceCents, command) });
  }, [commit]);
  const reset = useCallback(() => commit(createInitialWallet()), [commit]);
  // When a live user is signed in, every screen reads the real devnet balance and activity.
  // Family goals stay sample data, and live money moves through useLive(), never execute().
  const live = useLive();
  const value = useMemo<WalletContext>(() => live.status !== 'ready' ? { wallet, ready, storageWarning, execute, reset, save } : {
    wallet: { ...wallet, balanceCents: live.balanceCents ?? 0, activity: live.activity, savings: initialSavings() },
    ready: live.balanceCents !== null, storageWarning: false, reset,
    save: () => { throw new Error('Savings goals are available in demo mode only.'); },
    execute: () => { throw new Error('Signed in: use the live wallet.'); },
  }, [live.status, live.balanceCents, live.activity, wallet, ready, storageWarning, execute, reset, save]);
  const demoValue = useMemo(() => ({ wallet, ready, storageWarning, execute, reset, save }), [wallet, ready, storageWarning, execute, reset, save]);
  return <DemoContext.Provider value={demoValue}><Context.Provider value={value}>{children}</Context.Provider></DemoContext.Provider>;
}

export function useWallet() {
  const context = useContext(Context);
  if (!context) throw new Error('WalletProvider is missing.');
  return context;
}

/** Local simulation only, including when a connected wallet is signed in. */
export function useDemoWallet() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("WalletProvider is missing.");
  return context;
}
