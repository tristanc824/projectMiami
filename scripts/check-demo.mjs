// Read-only rehearsal checks. Never signs, transfers, creates users, or prints credentials.
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createRequire } from 'node:module';
const root = new URL('../', import.meta.url);
const env = file => { const url = new URL(file, root); return existsSync(url) ? parseEnv(readFileSync(url, 'utf8')) : {}; };
const api = env('apps/api/.env.local'), mobile = env('apps/mobile/.env'), review = env('.env.review.local');
const require = createRequire(new URL('apps/api/package.json', root));
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddressSync } = require('@solana/spl-token');
const bs58 = require('bs58').default ?? require('bs58');
let blocked = false;
const report = (ok, name, detail = '') => { console.log(`[${ok ? 'PASS' : 'NEEDS SETUP'}] ${name}${detail ? `: ${detail}` : ''}`); if (!ok) blocked = true; };
const publicKey = value => Keypair.fromSecretKey(value.startsWith('[') ? Uint8Array.from(JSON.parse(value)) : bs58.decode(value)).publicKey;
report(!!mobile.EXPO_PUBLIC_PRIVY_APP_ID && mobile.EXPO_PUBLIC_PRIVY_APP_ID === api.NEXT_PUBLIC_PRIVY_APP_ID, 'Mobile and backend Privy app IDs match');
report(!!api.PRIVY_APP_SECRET && !!api.STRIPE_SECRET_KEY?.startsWith('sk_test'), 'Backend authentication and Stripe test credentials configured');
report(!!review.SWARMS_API_KEY && !!review.PRUNE_API_KEY, 'Review provider keys configured (presence only)');
const paymentBase = mobile.EXPO_PUBLIC_PAYMENT_URL?.trim() || '';
report(/^https:\/\//.test(paymentBase), 'Public native payment-link URL', paymentBase ? 'configured; public reachability still needs rehearsal' : 'EXPO_PUBLIC_PAYMENT_URL is empty');
try {
  const base = mobile.EXPO_PUBLIC_DAT_API_URL?.replace(/\/+$/, '');
  if (!base || base === 'same-origin') throw new Error('Native app needs an explicit API URL');
  const response = await fetch(`${base}/api/health`, { headers: { 'ngrok-skip-browser-warning': '1' }, signal: AbortSignal.timeout(8000) });
  const result = await response.json();
  report(response.ok && result.status === 'ok', 'Mobile API address reachable');
} catch { report(false, 'Mobile API address reachable', 'could not obtain a valid health response'); }
try {
  const conn = new Connection(api.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
  report(await conn.getGenesisHash() === 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG', 'Solana devnet cluster');
  const treasury = publicKey(api.TREASURY_SECRET_KEY), payer = publicKey(api.FEE_PAYER_SECRET_KEY);
  const mint = new PublicKey(api.USDC_MINT || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
  const [funding, treasurySol, payerSol, program] = await Promise.all([
    conn.getTokenAccountBalance(getAssociatedTokenAddressSync(mint, treasury)), conn.getBalance(treasury), conn.getBalance(payer),
    conn.getAccountInfo(new PublicKey('5ZucuntpueZMRDBEs31gL3HrUpZ13NZRahu7T9rLWzv6')),
  ]);
  report(BigInt(funding.value.amount) >= 10_000_000n, 'Treasury test USDC for at least one $10 top-up', funding.value.uiAmountString);
  report(treasurySol >= 5_000_000, 'Treasury SOL for fees/account creation', `${treasurySol / 1e9} SOL`);
  report(payerSol >= 10_000_000, 'Sponsored transaction fee payer', `${payerSol / 1e9} SOL`);
  report(!!program?.executable, 'Safe Hold program deployed', program?.executable ? 'executable' : 'configured program address is not deployed');
} catch { report(false, 'Chain readiness', 'could not complete public balance/program checks'); }
process.exitCode = blocked ? 1 : 0;
