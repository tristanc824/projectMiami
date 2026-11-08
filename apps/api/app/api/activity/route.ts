import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { json, requireUser, route } from '@/lib/server/http';
import { connection, USDC_MINT } from '@/lib/server/solana.mjs';
import { createIncomingReader } from '@/lib/incoming.mjs';
import { activeTextPayment, smsStore } from '@/lib/server/textStore.mjs';
import { readTransactionStatuses } from '@/lib/transaction-status.mjs';

export const dynamic = 'force-dynamic';
const readIncoming = createIncomingReader({ includeOutgoing: true });
export const GET = route(async (req: Request) => {
  const me = await requireUser(req);
  if (me instanceof Response) return me;
  const payments: { signature: string; amountCents: number; createdAt: string; kind?: 'send' }[] = [...await readIncoming(connection(), { owner: me.wallet, mint: USDC_MINT, tokenAccount: getAssociatedTokenAddressSync(USDC_MINT, me.wallet) })];
  const pendingPayments = [];
  const checkpoint = activeTextPayment(me.id);
  if (checkpoint?.status === 'pending') {
    const amountCents = Number(checkpoint.amount / 10000n);
    const [resolution] = await readTransactionStatuses(connection(), [{ signature: checkpoint.signature, kind: 'send', amountCents, lastValidBlockHeight: checkpoint.lastValidBlockHeight }], { owner: me.wallet, mint: USDC_MINT, tokenAccount: getAssociatedTokenAddressSync(USDC_MINT, me.wallet) });
    if (resolution.status === 'pending') pendingPayments.push({ signature: checkpoint.signature, kind: 'send', status: 'pending', amountCents, lastValidBlockHeight: checkpoint.lastValidBlockHeight, recipientPhone: checkpoint.phone, createdAt: new Date(Number(checkpoint.created) || Date.now()).toISOString() });
    else {
      if (resolution.status === 'confirmed' && typeof resolution.createdAt === 'string' && !payments.some(item => item.signature === checkpoint.signature)) payments.push({ signature: checkpoint.signature, kind: 'send', amountCents, createdAt: resolution.createdAt });
      smsStore()!.finish(me.id, checkpoint.id, resolution.status);
    }
  }
  return json({ payments: payments.filter(item => item.kind !== 'send'), outgoing: payments.filter(item => item.kind === 'send'), pendingPayments });
});
