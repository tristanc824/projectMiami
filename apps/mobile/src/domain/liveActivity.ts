import type { Activity } from './wallet';
import { normalizePhone } from '../services/dat';
/** Damaged local history must not produce NaN amounts, broken receipt screens, or trusted recipients. */
export function decodeLiveActivity(raw: string | null): Activity[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((item): item is Activity => {
      if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.startsWith('live-') || seen.has(item.id)
        || !['send', 'receive', 'add', 'withdraw', 'hold'].includes(item.kind)
        || !Number.isSafeInteger(item.amountCents) || item.amountCents <= 0 || !Number.isSafeInteger(item.feeCents) || item.feeCents < 0
        || typeof item.name !== 'string' || item.name.length > 100 || typeof item.note !== 'string' || item.note.length > 160
        || typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt))
        || item.signature !== undefined && (typeof item.signature !== 'string' || !item.signature || item.signature.length > 128)
        || item.status !== undefined && !['pending', 'failed', 'expired'].includes(item.status)
        || item.status === 'pending' && (!item.signature || !Number.isSafeInteger(item.lastValidBlockHeight) || item.lastValidBlockHeight < 1)
        || item.recipientPhone !== undefined && (typeof item.recipientPhone !== 'string' || normalizePhone(item.recipientPhone) !== item.recipientPhone)) return false;
      seen.add(item.id); return true;
    }).slice(0, 50);
  } catch { return []; }
}
