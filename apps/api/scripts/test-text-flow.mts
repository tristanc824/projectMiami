// Runs the whole text-payments flow on devnet without a phone or the app, then cleans up.
// Run from apps/api: npx tsx scripts/test-text-flow.mts
// A throwaway sender gets Nest's signer and a PIN, then "texts" commands straight to the handler.
// Replies print here instead of being sent. Uses fictional 555-01xx numbers.
import { PublicKey } from '@solana/web3.js';
import { loadEnv } from './env.mjs';

loadEnv();
delete process.env.HTTPSMS_API_KEY; // never text real phones from this test
process.env.TEXT_PAYMENTS_NUMBER ||= '+13055550199';
const { privyApi, embeddedSolanaWallet, hashPin, setTextSettings, signerConfig } = await import('../lib/server/signer.mjs');
const { sendFromTreasury, usdcBalance } = await import('../lib/server/solana.mjs');
const { handleText } = await import('../lib/server/textPayments');
const { userByPhone } = await import('../lib/server/privy');

const fictional = () => `+1305555${String(100 + Math.floor(Math.random() * 100)).padStart(4, '0')}`;
const sender = fictional();
let recipient = fictional();
while (recipient === sender) recipient = fictional();
const { signerId, policyId } = signerConfig();

const created: string[] = [];
const replies: string[] = [];
const text = async (body: string) => {
  replies.length = 0;
  await handleText(sender, body, async (to, content) => { replies.push(`${to === sender ? 'sender' : 'recipient'}: ${content}`); });
  console.log(`\n> ${body}\n${replies.join('\n') || '(no reply)'}`);
  return replies.join('\n');
};
const expect = (label: string, ok: boolean) => { console.log(ok ? `PASS ${label}` : `FAIL ${label}`); if (!ok) process.exitCode = 1; };

try {
  const user = await privyApi('/users', {
    method: 'POST',
    body: {
      linked_accounts: [{ type: 'phone', number: sender }],
      wallets: [{ chain_type: 'solana', additional_signers: [{ signer_id: signerId, override_policy_ids: [policyId] }] }],
    },
  });
  created.push(user.id);
  const owner = new PublicKey(embeddedSolanaWallet(user)!.address);
  await sendFromTreasury(owner, 100_000n); // 10 cents

  expect('texts before turning on are refused', (await text('BAL 4821')).includes('off for this number'));
  await setTextSettings(user, { tp_on: true, tp_pin: hashPin('4821'), tp_fails: 0 });
  const saved = (await userByPhone(sender)) as { custom_metadata?: Record<string, unknown> } | null;
  expect('settings saved in Privy metadata', saved?.custom_metadata?.tp_on === true);

  expect('ordinary texts are ignored', (await text('hey, are you coming tonight?')) === '');
  expect('balance', (await text('BAL 4821')).includes('$0.10'));
  expect('wrong PIN', (await text('BAL 0000')).includes('Wrong PIN'));
  expect('over the per-payment limit', (await text(`SEND 11 ${recipient} PIN 4821`)).includes('up to $10.00'));
  expect('more than the balance', (await text(`SEND 5 ${recipient} PIN 4821`)).includes('only have'));
  const sent = await text(`SEND 0.05 ${recipient} PIN 4821`);
  expect('send to a new number', sent.includes('Sent $0.05') && sent.includes('recipient:'));
  const to = await userByPhone(recipient);
  if (to) created.push(to.id);
  const toWallet = to && embeddedSolanaWallet(to);
  expect('recipient got the money', !!toWallet && (await usdcBalance(new PublicKey(toWallet.address))) === 50_000n);
  expect('STOP', (await text('STOP')).includes('Text payments are off'));
  expect('refused after STOP', (await text('BAL 4821')).includes('off for this number'));
} finally {
  for (const id of created) await privyApi(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => console.log('could not delete', id));
  console.log(`\ndeleted ${created.length} throwaway users`);
}
process.exit();
