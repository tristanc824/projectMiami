// Turns a parsed Solana transaction into one USDC movement for a wallet, or null if its USDC didn't change.
// Pure, so it can be tested without the network.
export function summarizeUsdcChange(tx, owner, mint, signature) {
  const meta = tx?.meta;
  if (!meta || meta.err) return null;
  const pre = meta.preTokenBalances ?? [];
  const post = meta.postTokenBalances ?? [];
  const units = (list, index) => BigInt(list.find((b) => b.accountIndex === index)?.uiTokenAmount?.amount ?? '0');
  const indexes = new Set([...pre, ...post].filter((b) => b.mint === mint).map((b) => b.accountIndex));
  const changes = [...indexes].map((index) => {
    const entry = post.find((b) => b.accountIndex === index) ?? pre.find((b) => b.accountIndex === index);
    return { owner: entry?.owner ?? null, delta: units(post, index) - units(pre, index) };
  });
  const mine = changes.filter((c) => c.owner === owner).reduce((sum, c) => sum + c.delta, 0n);
  if (mine === 0n) return null;
  // The other side is the account that moved the opposite way.
  const other = changes.find((c) => c.owner !== owner && (mine > 0n ? c.delta < 0n : c.delta > 0n));
  return {
    signature,
    time: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : null,
    direction: mine > 0n ? 'in' : 'out',
    units: (mine > 0n ? mine : -mine).toString(),
    counterparty: other?.owner ?? null,
  };
}
