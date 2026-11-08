import type { Activity } from './wallet';
export type IncomingPayment = { signature: string; amountCents: number; createdAt: string; kind?: 'send' | 'receive'; status?: 'pending'; lastValidBlockHeight?: number; recipientPhone?: string };
const legacyIncoming = (item: Activity) => item.kind === 'receive' && !item.signature && item.name === 'Money received' && item.note === 'Arrived in your wallet';

/** Repeated polling never duplicates a receipt or overwrites a locally recorded card/refund receipt. */
export function mergeIncomingActivity(existing: Activity[], payments: IncomingPayment[], limit = 50): Activity[] {
  const items = [...existing];
  const signatures = new Set(items.map(item => item.signature).filter(Boolean));
  for (const payment of payments) {
    if (signatures.has(payment.signature)) {
      const index = items.findIndex(item => item.signature === payment.signature && item.status === 'pending');
      if (index >= 0 && !payment.status && items[index].amountCents === payment.amountCents) items[index] = { ...items[index], status: undefined, createdAt: payment.createdAt };
      continue;
    }
    if (payment.kind === 'send') {
      items.push({ id: `live-chain-${payment.signature}`, kind: 'send', name: payment.status ? 'Text payment' : 'Another wallet', amountCents: payment.amountCents, feeCents: 0, createdAt: payment.createdAt, signature: payment.signature, live: true, ...(payment.recipientPhone ? { recipientPhone: payment.recipientPhone } : {}), ...(payment.status ? { status: 'pending', lastValidBlockHeight: payment.lastValidBlockHeight } : {}), note: payment.status ? 'Text payment awaiting confirmation' : 'Confirmed on Solana' });
      signatures.add(payment.signature); continue;
    }
    // Repair an old inferred receipt only when there is exactly one unambiguous match.
    const candidates = items.filter(item => legacyIncoming(item) && item.amountCents === payment.amountCents && Math.abs(Date.parse(item.createdAt) - Date.parse(payment.createdAt)) < 5 * 60_000);
    const legacy = candidates.length === 1 && payments.filter(other => other.kind !== 'send' && other.amountCents === candidates[0].amountCents && Math.abs(Date.parse(other.createdAt) - Date.parse(candidates[0].createdAt)) < 5 * 60_000).length === 1 ? candidates[0] : undefined;
    const item: Activity = { id: legacy?.id ?? `live-chain-${payment.signature}`, kind: 'receive', name: 'Money received', amountCents: payment.amountCents, feeCents: 0, createdAt: payment.createdAt, signature: payment.signature, live: true, note: 'Confirmed on Solana' };
    if (legacy) items[items.indexOf(legacy)] = item;
    else items.push(item);
    signatures.add(payment.signature);
  }
  // Aggregate legacy estimates inside the scanned time range are replaced by individual chain receipts.
  const incoming = payments.filter(item => item.kind !== 'send');
  const oldest = incoming.length ? Math.min(...incoming.map(item => Date.parse(item.createdAt))) : Infinity;
  return items.filter(item => !legacyIncoming(item) || Date.parse(item.createdAt) < oldest - 5 * 60_000)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, limit);
}
export function reconcilePendingActivity(items: Activity[], resolutions: { signature: string; status: 'pending' | 'confirmed' | 'failed' | 'expired'; createdAt?: string; amountCents?: number }[]): Activity[] {
  return items.map(item => {
    if (item.status !== 'pending') return item;
    const result = resolutions.find(value => value.signature === item.signature);
    if (!result || result.status === 'pending') return item;
    if (result.status === 'confirmed') return result.amountCents === item.amountCents ? { ...item, status: undefined, createdAt: result.createdAt || item.createdAt } : item;
    return { ...item, status: result.status };
  });
}
