import bs58 from 'bs58';
import { incomingPayment, outgoingPayment } from './incoming.mjs';
export function validPendingTransactions(value) {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error('Choose up to 20 pending payments.');
  return value.map(item => {
    let validSignature = false;
    try { validSignature = typeof item?.signature === 'string' && item.signature.length <= 88 && bs58.decode(item.signature).length === 64; } catch {}
    if (!validSignature || !['send', 'withdraw', 'add'].includes(item.kind) || !Number.isSafeInteger(item.amountCents) || item.amountCents <= 0 || !Number.isSafeInteger(item.lastValidBlockHeight) || item.lastValidBlockHeight < 1) throw new Error('Invalid pending payment.');
    return { signature: item.signature, kind: item.kind, amountCents: item.amountCents, lastValidBlockHeight: item.lastValidBlockHeight };
  });
}
export async function readTransactionStatuses(connection, transactions, { owner, mint, tokenAccount }) {
  const statuses = (await connection.getSignatureStatuses(transactions.map(item => item.signature), { searchTransactionHistory: true })).value;
  const height = statuses.some((value, index) => !value && transactions[index].lastValidBlockHeight) ? await connection.getBlockHeight('finalized') : 0;
  const confirmed = transactions.filter((_item, index) => statuses[index] && !statuses[index].err && ['confirmed', 'finalized'].includes(statuses[index].confirmationStatus));
  const parsed = confirmed.length ? await connection.getParsedTransactions(confirmed.map(item => item.signature), { commitment: 'confirmed', maxSupportedTransactionVersion: 1 }) : [];
  const details = new Map(confirmed.map((item, index) => [item.signature, parsed[index]]));
  return transactions.map((item, index) => {
    const status = statuses[index];
    if (status?.err) return { signature: item.signature, status: 'failed' };
    if (!status && height > item.lastValidBlockHeight) return { signature: item.signature, status: 'expired' };
    const options = { signature: item.signature, owner: String(owner), mint: String(mint), tokenAccount: String(tokenAccount) };
    const payment = (item.kind === 'add' ? incomingPayment : outgoingPayment)(details.get(item.signature), options);
    if (payment?.amountCents === item.amountCents) return { ...payment, status: 'confirmed' };
    return { signature: item.signature, status: 'pending' };
  });
}
