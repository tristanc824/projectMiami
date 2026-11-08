import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { allow, fail, json, requireUser, route } from '@/lib/server/http';
import { connection, requireDevnet, USDC_MINT } from '@/lib/server/solana.mjs';
import { readTransactionStatuses, validPendingTransactions } from '@/lib/transaction-status.mjs';
export const dynamic = 'force-dynamic';
const pending = new Map<string, { until: number; work: Promise<unknown> }>();
export const POST = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  if (!allow(`transaction-status:${me.id}`, 120, 60_000)) return fail('Wait a moment before refreshing payments.', 429);
  let transactions;
  try { transactions = validPendingTransactions((await req.json())?.transactions); } catch { return fail('Choose valid pending payments.'); }
  await requireDevnet();
  const key = `${me.id}:${JSON.stringify(transactions)}`;
  let entry = pending.get(key);
  if (!entry || entry.until < Date.now()) {
    if (pending.size >= 300) pending.delete(pending.keys().next().value!);
    const work = readTransactionStatuses(connection(), transactions, { owner: me.wallet, mint: USDC_MINT, tokenAccount: getAssociatedTokenAddressSync(USDC_MINT, me.wallet) });
    entry = { until: Infinity, work }; pending.set(key, entry);
    void work.then(() => { const current = pending.get(key); if (current?.work === work) current.until = Date.now() + 3000; }, () => { if (pending.get(key)?.work === work) pending.delete(key); });
  }
  return json({ transactions: await entry.work });
});
