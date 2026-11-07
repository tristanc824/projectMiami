export const USDC_DECIMALS = 6;

// Parses a dollar string into USDC base units. Returns null for anything that is not a positive amount.
export function toBaseUnits(input) {
  const m = /^(\d{1,9})(?:\.(\d{1,6}))?$/.exec(String(input ?? '').trim());
  if (!m) return null;
  const units = BigInt(m[1]) * 1_000_000n + BigInt((m[2] ?? '').padEnd(6, '0'));
  return units > 0n ? units : null;
}

export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}
