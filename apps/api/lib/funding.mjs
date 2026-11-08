export const DEFAULT_DEPOSIT_CAP = 1000;
export function depositCap(value) {
  const cap = Number(value);
  return Number.isSafeInteger(cap) && cap >= 1 && cap <= 100000 ? cap : DEFAULT_DEPOSIT_CAP;
}
export function depositAmount(value, cap) {
  if (typeof value !== 'number' && typeof value !== 'string' || String(value).trim() === '') return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 1 && amount <= cap ? amount : null;
}
