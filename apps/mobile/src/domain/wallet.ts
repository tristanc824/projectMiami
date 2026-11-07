/** Demo-only ledger. No wallet keys, RPC requests, bank calls, or real transfers. */
export type Contact = { id: string; name: string; shortName: string; fullName: string; initials: string; location: string; color: string };
export type Activity = {
  id: string; kind: 'send' | 'add' | 'withdraw' | 'receive'; name: string;
  amountCents: number; feeCents: number; note: string; createdAt: string; contactId?: string;
  /** Live mode only: a real devnet transaction. Demo activity never has these. */
  live?: boolean; signature?: string;
};
export type FamilyGoal = { id: string; name: string; description: string; targetCents: number; fundedCents: number; contactId: string };
export type WalletState = { version: 1; balanceCents: number; activity: Activity[]; goals: FamilyGoal[] };
export type DemoCommand = { id: string; kind: 'send' | 'add' | 'withdraw'; amountCents: number; note?: string; contactId?: string; goalId?: string; createdAt: string };

export const contacts: Contact[] = [
  { id: 'mama', name: 'Ernesto', shortName: 'Ernesto R.', fullName: 'Ernesto Rivera', initials: 'ER', location: 'Mexico City, MX', color: '#F4D7C4' },
  { id: 'diego', name: 'Daniela', shortName: 'Daniela R.', fullName: 'Daniela Rivera', initials: 'DR', location: 'Guadalajara, MX', color: '#DFE9F8' },
  { id: 'camila', name: 'Carlos', shortName: 'Carlos T.', fullName: 'Carlos Torres', initials: 'CT', location: 'Miami, US', color: '#E5DDF6' },
];
export const MAX_DEMO_CENTS = 1_000_000;
export const DEMO_MXN_RATE = 18.5; // Illustrative, never a provider-backed or current FX quote.

export function createInitialWallet(): WalletState {
  return {
    version: 1, balanceCents: 124050,
    activity: [
      { id: 'demo-seed-1', kind: 'receive', name: 'Carlos Torres', contactId: 'camila', amountCents: 7500, feeCents: 0, note: 'For the weekend', createdAt: '2026-11-07T00:30:00-05:00' },
      { id: 'demo-seed-2', kind: 'send', name: 'Ernesto', contactId: 'mama', amountCents: 15000, feeCents: 0, note: 'A little something for home', createdAt: '2026-11-06T19:15:00-05:00' },
      { id: 'demo-seed-3', kind: 'add', name: 'Added demo funds', amountCents: 50000, feeCents: 0, note: 'Sample funding', createdAt: '2026-11-06T12:00:00-05:00' },
    ],
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
  const contact = contacts.find(item => item.id === command.contactId);
  if (command.kind === 'send' && !contact) throw new Error('Choose a saved recipient.');
  const goal = command.goalId ? state.goals.find(item => item.id === command.goalId) : undefined;
  if (command.goalId && (!goal || command.kind !== 'send' || goal.contactId !== contact?.id)) throw new Error('This family request is unavailable.');
  if (goal && command.amountCents > goal.targetCents - goal.fundedCents) throw new Error('This is more than the request still needs.');
  const feeCents = command.kind === 'withdraw' ? 50 : 0;
  const debit = command.kind === 'add' ? -command.amountCents : command.amountCents + feeCents;
  if (debit > state.balanceCents) throw new Error('Your demo balance is too low for this amount and fee.');
  const balanceCents = state.balanceCents - debit;
  if (!Number.isSafeInteger(balanceCents) || balanceCents < 0 || balanceCents > 100_000_000) throw new Error('Demo balance limit reached.');
  const activity: Activity = {
    id: command.id, kind: command.kind, name: command.kind === 'send' ? contact!.name : command.kind === 'add' ? 'Added demo funds' : 'Demo withdrawal',
    amountCents: command.amountCents, feeCents, note: command.note?.trim().slice(0, 140) || (command.kind === 'send' ? 'With love, from Guard' : 'Simulated money movement'),
    contactId: command.contactId, createdAt: command.createdAt,
  };
  return { ...state, balanceCents, activity: [activity, ...state.activity].slice(0, 150), goals: state.goals.map(item => item.id === goal?.id ? { ...item, fundedCents: item.fundedCents + command.amountCents } : item) };
}

export function decodeWallet(raw: string | null): WalletState {
  if (!raw) return createInitialWallet();
  try {
    const state: unknown = JSON.parse(raw);
    if (!state || typeof state !== 'object') return createInitialWallet();
    const value = state as WalletState;
    const valid = value.version === 1 && Number.isSafeInteger(value.balanceCents) && value.balanceCents >= 0 && value.balanceCents <= 100_000_000
      && Array.isArray(value.activity) && value.activity.length <= 150 && value.activity.every(item => item && typeof item.id === 'string' && item.id.startsWith('demo-')
        && ['send', 'receive', 'add', 'withdraw'].includes(item.kind) && Number.isSafeInteger(item.amountCents) && item.amountCents > 0 && item.amountCents <= MAX_DEMO_CENTS
        && Number.isSafeInteger(item.feeCents) && item.feeCents >= 0 && typeof item.name === 'string' && item.name.length <= 100 && typeof item.note === 'string' && item.note.length <= 140 && Number.isFinite(Date.parse(item.createdAt)))
      && Array.isArray(value.goals) && value.goals.length === 2 && value.goals.every((item, index) => {
        const original = createInitialWallet().goals[index];
        return item && item.id === original.id && item.contactId === original.contactId && item.name === original.name && item.description === original.description
          && item.targetCents === original.targetCents && Number.isSafeInteger(item.fundedCents) && item.fundedCents >= 0 && item.fundedCents <= item.targetCents;
      });
    return valid ? value : createInitialWallet();
  } catch { return createInitialWallet(); }
}
