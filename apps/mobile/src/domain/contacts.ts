import type { Activity } from './wallet';
import { formatPhone, normalizePhone } from '../services/dat';

export type SavedContact = { phone: string; name: string };
export type RecentRecipient = SavedContact & { initials: string; paymentCount: number; lastPaidAt?: string; lastAmountCents?: number };
export function contactInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0] ?? '').join('').toLocaleUpperCase();
}
export function decodeContacts(raw: string | null): SavedContact[] {
  try {
    const items: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(items)) return [];
    const result = new Map<string, SavedContact>();
    for (const item of items.slice(0, 200)) {
      if (item && typeof item.phone === 'string' && normalizePhone(item.phone) === item.phone && typeof item.name === 'string' && item.name.trim() && item.name.trim().length <= 40) result.set(item.phone, { phone: item.phone, name: item.name.trim() });
    }
    return [...result.values()];
  } catch { return []; }
}
export function updateContact(items: SavedContact[], input: string, name: string): SavedContact[] {
  const phone = normalizePhone(input), trimmed = name.trim();
  if (!phone) throw new Error('Enter a full phone number.');
  if (trimmed.length > 40) throw new Error('Use a name of 40 characters or fewer.');
  const others = items.filter(item => item.phone !== phone);
  if (!trimmed) return others;
  if (others.length >= 200) throw new Error('You can save up to 200 contact names.');
  return [...others, { phone, name: trimmed }];
}
export function recentRecipients(activity: Activity[], saved: SavedContact[]): RecentRecipient[] {
  const names = new Map(saved.map(item => [item.phone, item.name]));
  const people = new Map<string, RecentRecipient>();
  for (const item of [...activity].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))) {
    if (item.kind !== 'send') continue;
    const phone = normalizePhone(item.recipientPhone ?? '');
    if (!phone) continue;
    const existing = people.get(phone);
    if (existing) { existing.paymentCount++; continue; }
    const name = names.get(phone) ?? formatPhone(phone);
    people.set(phone, { phone, name, initials: names.has(phone) ? contactInitials(name) : '#', paymentCount: 1, lastPaidAt: item.createdAt, lastAmountCents: item.amountCents });
  }
  for (const item of saved) if (!people.has(item.phone)) people.set(item.phone, { ...item, initials: contactInitials(item.name), paymentCount: 0 });
  return [...people.values()];
}
export function matchesRecipient(item: SavedContact, query: string): boolean {
  const cleaned = query.trim().toLocaleLowerCase();
  if (!cleaned) return true;
  if (item.name.toLocaleLowerCase().includes(cleaned) || item.phone.includes(cleaned)) return true;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length > 0 && /^[+\d\s().-]+$/.test(cleaned) && item.phone.includes(digits);
}
