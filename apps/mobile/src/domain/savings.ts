export type SavingsGoal = { id: string; name: string; targetCents: number; savedCents: number; icon: 'shield-checkmark-outline' | 'school-outline' | 'home-outline' | 'leaf-outline' };
export type SavingsCommand = { kind: 'create'; name: string; targetCents: number; id: string } | { kind: 'add' | 'withdraw'; goalId: string; amountCents: number };
export const initialSavings = (): SavingsGoal[] => [
  { id: 'rainy-day', name: 'Rainy day', targetCents: 100000, savedCents: 0, icon: 'shield-checkmark-outline' },
  { id: 'school-fees', name: 'School fees', targetCents: 100000, savedCents: 0, icon: 'school-outline' },
  { id: 'first-home', name: 'First home', targetCents: 500000, savedCents: 0, icon: 'home-outline' },
];
export const reservedCents = (goals: SavingsGoal[] = []) => goals.reduce((total, goal) => total + goal.savedCents, 0);
export function validSavings(value: unknown): value is SavingsGoal[] {
  return Array.isArray(value) && value.length <= 30 && new Set(value.map(g => g?.id)).size === value.length && value.every(g => g && typeof g.id === 'string' && typeof g.name === 'string' && g.name.trim().length > 0 && g.name.length <= 40 && Number.isSafeInteger(g.targetCents) && g.targetCents > 0 && g.targetCents <= 1_000_000 && Number.isSafeInteger(g.savedCents) && g.savedCents >= 0 && g.savedCents <= g.targetCents && ['shield-checkmark-outline', 'school-outline', 'home-outline', 'leaf-outline'].includes(g.icon));
}
export function applySavings(goals: SavingsGoal[], balanceCents: number, command: SavingsCommand): SavingsGoal[] {
  if (command.kind === 'create') {
    if (goals.length >= 30) throw new Error('You can have up to 30 goals.');
    const next = [...goals, { id: command.id, name: command.name.trim(), targetCents: command.targetCents, savedCents: 0, icon: 'leaf-outline' as const }];
    if (!validSavings(next)) throw new Error('Enter a name and a target between $0.01 and $10,000.');
    return next;
  }
  const goal = goals.find(g => g.id === command.goalId);
  const amount = command.amountCents;
  if (!goal || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Enter a valid amount.');
  if (command.kind === 'add' && (amount > balanceCents - reservedCents(goals) || goal.savedCents + amount > goal.targetCents)) throw new Error('Choose an amount within your available balance and goal target.');
  if (command.kind === 'withdraw' && amount > goal.savedCents) throw new Error('This is more than you have set aside.');
  return goals.map(g => g.id === goal.id ? { ...g, savedCents: g.savedCents + (command.kind === 'add' ? amount : -amount) } : g);
}
