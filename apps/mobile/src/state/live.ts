import { createContext, useContext } from 'react';
import type { Activity, WithdrawalDestination } from '../domain/wallet';
import type { Recipient } from '../services/dat';

/**
 * Live mode: Privy SMS login, a self-custody Solana wallet, and real devnet USDC through the DAT backend.
 * It is only available in a Nest development/TestFlight build with Privy and the API configured.
 * The integrated website uses Privy's browser SDK for the same accounts.
 * Standalone web previews, Expo Go, and unconfigured builds keep status 'off' and stay in demo mode.
 */
export type LiveStatus = 'off' | 'loading' | 'signed-out' | 'setting-up' | 'ready';

export type LiveContextValue = {
  status: LiveStatus;
  /** Wallet setup problem to show the user, e.g. a wallet that needs recovery. */
  problem: string;
  phone: string;
  address: string;
  /** Devnet USDC in cents, or null until the first balance arrives. */
  balanceCents: number | null;
  activity: Activity[];
  sendCode: (phone: string) => Promise<void>;
  verifyCode: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  findRecipient: (phone: string) => Promise<Recipient>;
  /** Each returns the new activity id, for the receipt screen. */
  send: (recipient: Recipient, cents: number, note: string) => Promise<string>;
  deposit: (dollars: number) => Promise<string>;
  cashOut: (cents: number, destination?: WithdrawalDestination) => Promise<string>;
};

const unavailable = async (): Promise<never> => { throw new Error('Live mode is not available in this build.'); };

export const liveOff: LiveContextValue = {
  status: 'off', problem: '', phone: '', address: '', balanceCents: null, activity: [],
  sendCode: unavailable, verifyCode: unavailable, logout: async () => {}, findRecipient: unavailable,
  send: unavailable, deposit: unavailable, cashOut: unavailable,
};

export const LiveContext = createContext<LiveContextValue>(liveOff);
export const useLive = () => useContext(LiveContext);
/** True once a live user is signed in and their wallet is ready; screens then move real devnet USDC. */
export const useIsLive = () => useLive().status === 'ready';
