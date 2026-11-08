import { createContext, useContext } from 'react';
import type { FamilyReview, ReviewFacts } from '../services/review';
import type { HoldsResult, SafeHold } from '../services/holds';
import type { Activity, WithdrawalDestination } from '../domain/wallet';
import type { Recipient, TextPayments, FundingStatus, TokenSource } from '../services/dat';

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
  activityReady: boolean;
  getAccessToken: TokenSource;
  getFundingStatus: () => Promise<FundingStatus>;
  sendCode: (phone: string) => Promise<void>;
  verifyCode: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  findRecipient: (phone: string) => Promise<Recipient>;
  /** Each returns the new activity id, for the receipt screen. */
  send: (recipient: Recipient, cents: number, note: string, requestId?: string) => Promise<string>;
  reviewPayment: (facts: ReviewFacts, fresh: boolean) => Promise<FamilyReview>;
  createHold: (recipient: Recipient, cents: number, ticket: string, pin: string) => Promise<string>;
  getHolds: () => Promise<HoldsResult>;
  manageHold: (hold: SafeHold, action: 'refund' | 'release' | 'release-early', pin?: string, verified?: boolean) => Promise<void>;
  deposit: (dollars: number, requestId?: string) => Promise<string>;
  cashOut: (cents: number, destination?: WithdrawalDestination, requestId?: string) => Promise<string>;
  /** Text payments settings, or null until they load. */
  textPayments: TextPayments | null;
  /** Grants Nest's limited server signer, then saves the PIN. */
  enableTextPayments: (pin: string) => Promise<void>;
  /** Turns text payments off and removes the server signer. */
  disableTextPayments: () => Promise<void>;
};

const unavailable = async (): Promise<never> => { throw new Error('Live mode is not available in this build.'); };

export const liveOff: LiveContextValue = {
  status: 'off', problem: '', phone: '', address: '', balanceCents: null, activity: [], activityReady: false,
  getAccessToken: unavailable, getFundingStatus: unavailable,
  sendCode: unavailable, verifyCode: unavailable, logout: async () => {}, findRecipient: unavailable,
  reviewPayment: unavailable, createHold: unavailable, getHolds: unavailable, manageHold: unavailable,
  send: unavailable, deposit: unavailable, cashOut: unavailable,
  textPayments: null, enableTextPayments: unavailable, disableTextPayments: unavailable,
};

export const LiveContext = createContext<LiveContextValue>(liveOff);
export const useLive = () => useContext(LiveContext);
/** True once a live user is signed in and their wallet is ready; screens then move real devnet USDC. */
export const useIsLive = () => useLive().status === 'ready';
