import { initialSavings, reservedCents, validSavings, type SavingsGoal } from './savings';
import { formatPhone, normalizePhone } from '../services/dat';

export type WithdrawalDestination = 'bank' | 'apple-cash';

/** Demo-only ledger. No wallet keys, RPC requests, bank calls, or real transfers. */
export type Contact = { id: string; name: string; shortName: string; fullName: string; initials: string; location: string; color: string };
export type Activity = {
  id: string; kind: 'send' | 'add' | 'withdraw' | 'receive'; name: string;
  amountCents: number; feeCents: number; note: string; createdAt: string; contactId?: string; recipientPhone?: string;
  /** Live mode only: a real devnet transaction. Demo activity never has these. */
  live?: boolean; signature?: string; withdrawalDestination?: WithdrawalDestination;
};
export type FamilyGoal = { id: string; name: string; description: string; targetCents: number; fundedCents: number; contactId: string };
export type WalletState = { version: 2; balanceCents: number; activity: Activity[]; goals: FamilyGoal[]; savings?: SavingsGoal[] };
export type DemoCommand = { id: string; kind: 'send' | 'add' | 'withdraw'; amountCents: number; note?: string; contactId?: string; recipientPhone?: string; goalId?: string; withdrawalDestination?: WithdrawalDestination; createdAt: string };

export const contacts: Contact[] = [
  { id: 'mama', name: 'Mamá', shortName: 'Mamá', fullName: 'Rosa Martínez', initials: 'RM', location: 'Buenos Aires, AR', color: '#E4ECDF' },
  { id: 'diego', name: 'Tío Luis', shortName: 'Tío Luis', fullName: 'Luis Martínez', initials: 'LM', location: 'Córdoba, AR', color: '#E9E1D1' },
  { id: 'camila', name: 'Daniela', shortName: 'Daniela', fullName: 'Daniela Torres', initials: 'DT', location: 'London, UK', color: '#DCEEF8' },
];
export const MAX_DEMO_CENTS = 1_000_000;
export const DEMO_ARS_RATE = 970; // Example only; not a live exchange quote.
export const DEMO_MXN_RATE = 18.5; // Illustrative, never a provider-backed or current FX quote.

export function createInitialWallet(): WalletState {
  return {
    version: 2, balanceCents: 0,
    activity: [], savings: initialSavings(),
    goals: [
      { id: 'school', name: 'A new semester', description: 'Books and supplies for Sofía', targetCents: 20000, fundedCents: 14000, contactId: 'mama' },
      { id: 'home', name: 'A little closer to home', description: 'Our next family visit', targetCents: 60000, fundedCents: 22500, contactId: 'diego' },
    ],
  };
}

export function parseAmount(value: string): number | null {
  if (!/^\d{1,5}(?:\.\d{0,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_DEMO_CENTS ? cents : null;
}

export function money(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

export function applyDemoCommand(state: WalletState, command: DemoCommand): WalletState {
  if (!command.id.startsWith('demo-')) throw new Error('A demo reference is required.');
  if (state.activity.some(item => item.id === command.id)) return state;
  if (!Number.isSafeInteger(command.amountCents) || command.amountCents <= 0 || command.amountCents > MAX_DEMO_CENTS) {
    throw new Error('Enter an amount between $0.01 and $10,000.');
  }
  if (!Number.isFinite(Date.parse(command.createdAt))) throw new Error('Invalid transfer date.');
  const recipientPhone = command.kind === 'send' ? normalizePhone(command.recipientPhone ?? '') : null;
  if (command.kind === 'send' && !recipientPhone) throw new Error('Enter a full recipient phone number.');
  const goal = command.goalId ? state.goals.find(item => item.id === command.goalId) : undefined;
  if (command.goalId && (!goal || command.kind !== 'send' || goal.contactId !== command.contactId)) throw new Error('This family request is unavailable.');
  if (goal && command.amountCents > goal.targetCents - goal.fundedCents) throw new Error('This is more than the request still needs.');
  if (command.withdrawalDestination !== undefined && (command.kind !== 'withdraw' || !['bank', 'apple-cash'].includes(command.withdrawalDestination))) throw new Error('Choose a valid withdrawal destination.');
  const feeCents = command.kind === 'withdraw' ? 50 : 0;
  const debit = command.kind === 'add' ? -command.amountCents : command.amountCents + feeCents;
  if (debit > state.balanceCents - reservedCents(state.savings)) throw new Error('Your demo balance is too low for this amount and fee.');
  const balanceCents = state.balanceCents - debit;
  if (!Number.isSafeInteger(balanceCents) || balanceCents < 0 || balanceCents > 100_000_000) throw new Error('Demo balance limit reached.');
  const activity: Activity = {
    id: command.id, kind: command.kind, name: command.kind === 'send' ? formatPhone(recipientPhone!) : command.kind === 'add' ? 'Added demo funds' : command.withdrawalDestination === 'apple-cash' ? 'Apple Cash withdrawal' : 'Bank withdrawal',
    amountCents: command.amountCents, feeCents, note: command.note?.trim().slice(0, 140) || (command.kind === 'send' ? 'With love, from Nest' : 'Simulated money movement'),
    ...(recipientPhone ? { recipientPhone } : {}), ...(command.kind === 'withdraw' ? { withdrawalDestination: command.withdrawalDestination ?? 'bank' } : {}), ...(contacts.some(c => c.id === command.contactId) ? { contactId: command.contactId } : {}), createdAt: command.createdAt,
  };
  return { ...state, balanceCents, activity: [activity, ...state.activity].slice(0, 150), goals: state.goals.map(item => item.id === goal?.id ? { ...item, fundedCents: item.fundedCents + command.amountCents } : item) };
}

export function decodeWallet(raw: string | null): WalletState {
  if (!raw) return createInitialWallet();
  try {
    const state: unknown = JSON.parse(raw);
    if (!state || typeof state !== 'object') return createInitialWallet();
    const value = state as WalletState;
    const valid = value.version === 2 && Number.isSafeInteger(value.balanceCents) && value.balanceCents >= 0 && value.balanceCents <= 100_000_000
      && Array.isArray(value.activity) && value.activity.length <= 150 && value.activity.every(item => item && typeof item.id === 'string' && item.id.startsWith('demo-')
        && ['send', 'receive', 'add', 'withdraw'].includes(item.kind) && Number.isSafeInteger(item.amountCents) && item.amountCents > 0 && item.amountCents <= MAX_DEMO_CENTS
        && Number.isSafeInteger(item.feeCents) && item.feeCents >= 0 && typeof item.name === 'string' && item.name.length <= 100 && typeof item.note === 'string' && item.note.length <= 140 && Number.isFinite(Date.parse(item.createdAt))
        && (item.withdrawalDestination === undefined || item.kind === 'withdraw' && ['bank', 'apple-cash'].includes(item.withdrawalDestination))
        && (item.recipientPhone === undefined || typeof item.recipientPhone === 'string' && normalizePhone(item.recipientPhone) === item.recipientPhone))
      && (value.savings === undefined || validSavings(value.savings) && reservedCents(value.savings) <= value.balanceCents)
      && Array.isArray(value.goals) && value.goals.length === 2 && value.goals.every((item, index) => {
        const original = createInitialWallet().goals[index];
        return item && item.id === original.id && item.contactId === original.contactId && item.name === original.name && item.description === original.description
          && item.targetCents === original.targetCents && Number.isSafeInteger(item.fundedCents) && item.fundedCents >= 0 && item.fundedCents <= item.targetCents;
      });
    return valid ? value : createInitialWallet();
  } catch { return createInitialWallet(); }
}
