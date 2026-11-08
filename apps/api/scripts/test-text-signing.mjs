// Proves the server can send for a user with the text-payments signer, before any app work depends on it.
// Run from apps/api: node scripts/test-text-signing.mjs
// It makes a throwaway Privy user whose Solana wallet already has Nest's signer, funds it with 5 cents of
// test USDC, sends 2 cents with Nest's fee payer, checks that the $10 policy blocks a larger payment,
// then deletes the throwaway user.
import { PublicKey } from '@solana/web3.js';
import { loadEnv } from './env.mjs';

loadEnv();
const { privyApi, sendWithServerSigner, embeddedSolanaWallet, signerConfig } = await import('../lib/server/signer.mjs');
const { sendFromTreasury, treasury, usdcBalance } = await import('../lib/server/solana.mjs');

const explorer = (s) => `https://explorer.solana.com/tx/${s}?cluster=devnet`;
const { signerId, policyId } = signerConfig();
if (!signerId || !policyId) throw new Error('Run node scripts/setup-text-payments.mjs first.');

// A fictional 555-01xx number, so no real person's number gets a test account.
const phone = `+1305555${String(100 + Math.floor(Math.random() * 100)).padStart(4, '0')}`;
const user = await privyApi('/users', {
  method: 'POST',
  body: {
    linked_accounts: [{ type: 'phone', number: phone }],
    wallets: [{ chain_type: 'solana', additional_signers: [{ signer_id: signerId, override_policy_ids: [policyId] }] }],
  },
});
let ok = false;
try {
  const wallet = embeddedSolanaWallet(user);
  if (!wallet?.walletId) throw new Error(`No wallet id on the new user: ${JSON.stringify(user.linked_accounts)}`);
  const owner = new PublicKey(wallet.address);
  console.log('throwaway user', user.id, 'wallet', wallet.address);

  console.log('fund   ', explorer(await sendFromTreasury(owner, 50_000n)));
  const sig = await sendWithServerSigner({ walletId: wallet.walletId, owner, recipient: treasury().publicKey, amount: 20_000n });
  console.log('send   ', explorer(sig));
  console.log('PASS: server signer + Nest fee payer works. Wallet now has', Number(await usdcBalance(owner)) / 1e6, 'USDC');

  try {
    await sendWithServerSigner({ walletId: wallet.walletId, owner, recipient: treasury().publicKey, amount: 11_000_000n });
    console.log('FAIL: an $11 payment was signed. The policy cap is not working.');
  } catch (err) {
    // Only a refusal from Privy counts. The wallet can't afford $11, so the network would refuse it anyway.
    ok = err.message.startsWith('Privy');
    console.log(ok ? 'PASS: Privy refused an $11 payment:' : 'FAIL: refused, but not by the Privy policy:', err.message.slice(0, 200));
  }
} finally {
  await privyApi(`/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' }).then(
    () => console.log('deleted throwaway user'),
    (err) => console.log('could not delete throwaway user', user.id, err.message),
  );
}
process.exit(ok ? 0 : 1);
