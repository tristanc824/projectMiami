/** Read the actual confirmed USDC credit, rather than guessing from a wallet balance change. */
export function incomingPayment(transaction, { owner, mint, tokenAccount, signature }) {
  if (!transaction?.meta || transaction.meta.err || !Number.isSafeInteger(transaction.blockTime) || transaction.blockTime <= 0) return null;
  if (transaction.transaction?.signatures?.[0] !== signature) return null;
  const keys = transaction.transaction.message.accountKeys;
  if (!Array.isArray(keys)) return null;
  const index = keys.findIndex(key => String(key.pubkey ?? key) === tokenAccount);
  if (index < 0) return null;
  const before = transaction.meta.preTokenBalances?.find(balance => balance.accountIndex === index && balance.mint === mint);
  const after = transaction.meta.postTokenBalances?.find(balance => balance.accountIndex === index && balance.mint === mint);
  if (!after || after.owner !== owner || before?.owner && before.owner !== owner) return null;
  const units = balance => {
    if (!balance) return 0n; // The recipient's token account may have been created in this transaction.
    if (balance.uiTokenAmount?.decimals !== 6 || !/^\d+$/.test(balance.uiTokenAmount?.amount ?? '')) throw new Error('Invalid USDC balance');
    return BigInt(balance.uiTokenAmount.amount);
  };
  try {
    const credit = units(after) - units(before);
    // The app displays cents. Read integer base units to avoid floating-point rounding.
    const cents = (credit + 5000n) / 10000n;
    if (credit <= 0n || cents <= 0n || cents > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return { signature, amountCents: Number(cents), createdAt: new Date(transaction.blockTime * 1000).toISOString() };
  } catch { return null; }
}

/** A debit is read from the same confirmed token-account delta, never a balance-poll guess. */
export function outgoingPayment(transaction, options) {
  if (!transaction?.meta) return null;
  return incomingPayment({ ...transaction, meta: { ...transaction.meta, preTokenBalances: transaction.meta.postTokenBalances, postTokenBalances: transaction.meta.preTokenBalances } }, options);
}

/** Per-wallet polling cache: re-read signatures, parse only new transactions, coalesce concurrent callers. */
export function createIncomingReader({ limit = 20, ttlMs = 3000, maxWallets = 300, includeOutgoing = false } = {}) {
  const wallets = new Map();
  return async (connection, { owner, mint, tokenAccount }) => {
    const key = `${connection.rpcEndpoint}:${owner}:${mint}:${tokenAccount}`;
    let entry = wallets.get(key);
    if (!entry) {
      if (wallets.size >= maxWallets) wallets.delete(wallets.keys().next().value);
      entry = { updated: 0, payments: [], parsed: new Map(), pending: null };
      wallets.set(key, entry);
    }
    if (entry.pending) return entry.pending;
    if (entry.updated && Date.now() - entry.updated < ttlMs) return entry.payments;
    const work = (async () => {
      const signatures = await connection.getSignaturesForAddress(tokenAccount, { limit }, 'confirmed');
      const successful = signatures.filter(item => item.err === null);
      const missing = successful.filter(item => !entry.parsed.has(item.signature));
      if (missing.length) {
        const transactions = await connection.getParsedTransactions(missing.map(item => item.signature), { commitment: 'confirmed', maxSupportedTransactionVersion: 1 });
        for (let i = 0; i < missing.length; i++) {
          // A temporarily unindexed transaction is retried on the next poll.
          if (transactions[i] && transactions[i].blockTime !== null) {
            const options = { owner: String(owner), mint: String(mint), tokenAccount: String(tokenAccount), signature: missing[i].signature };
            const incoming = incomingPayment(transactions[i], options);
            const outgoing = !incoming && includeOutgoing ? outgoingPayment(transactions[i], options) : null;
            entry.parsed.set(missing[i].signature, incoming ?? (outgoing ? { ...outgoing, kind: 'send' } : null));
          }
        }
      }
      const current = new Set(successful.map(item => item.signature));
      for (const signature of entry.parsed.keys()) if (!current.has(signature)) entry.parsed.delete(signature);
      entry.payments = successful.map(item => entry.parsed.get(item.signature)).filter(Boolean);
      entry.updated = Date.now();
      return entry.payments;
    })();
    entry.pending = work;
    try { return await work; } finally { entry.pending = null; }
  };
}
