import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { applyDemoCommand, createInitialWallet, decodeWallet, type DemoCommand, type WalletState } from '../domain/wallet';

type WalletContext = { wallet: WalletState; ready: boolean; storageWarning: boolean; execute: (command: DemoCommand) => string; reset: () => void };
const Context = createContext<WalletContext | null>(null);
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
  const reset = useCallback(() => commit(createInitialWallet()), [commit]);
  return <Context.Provider value={{ wallet, ready, storageWarning, execute, reset }}>{children}</Context.Provider>;
}

export function useWallet() {
  const context = useContext(Context);
  if (!context) throw new Error('WalletProvider is missing.');
  return context;
}
