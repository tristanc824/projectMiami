import { PublicKey } from '@solana/web3.js';
import { formatPhone } from '@/lib/phone.mjs';
import { formatUsd } from '@/lib/money.mjs';
import { HELP_TEXT, MAX_PIN_FAILURES, TEXT_LIMITS, dayKey, parseCommand } from '@/lib/sms.mjs';
import { allow } from './http';
import { checkPin, embeddedSolanaWallet, sendWithServerSigner, setTextSettings, textPaymentsReady } from './signer.mjs';
import { createUserForPhone, userByPhone } from './privy';
import { usdcBalance } from './solana.mjs';

/** Nest's text-payments number: the demo Android phone running httpSMS. */
export const gatewayNumber = () => process.env.TEXT_PAYMENTS_NUMBER || '';

export type TextSettings = { tp_on?: boolean; tp_pin?: string; tp_fails?: number; tp_day?: string; tp_spent?: number };
export type MetaUser = { id: string; linked_accounts: { type: string }[]; custom_metadata?: TextSettings };

const usd = (units: bigint) => formatUsd(Number(units) / 1e6);
const DEVNET = 'Test USDC on Solana devnet, no real money.';

/** Sends an SMS through the httpSMS Android gateway. */
export async function sendSms(to: string, content: string) {
  // Without an httpSMS key (local testing with scripts/fake-text.mjs), replies go to the server log.
  if (!process.env.HTTPSMS_API_KEY) return void console.log(`[text to ${to}] ${content}`);
  const res = await fetch('https://api.httpsms.com/v1/messages/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.HTTPSMS_API_KEY ?? '' },
    body: JSON.stringify({ from: gatewayNumber(), to, content }),
  });
  if (!res.ok) console.error(`httpSMS send failed (${res.status})`);
}

/** Works out the reply to one incoming text, and moves money for SEND. Returns null to stay silent. */
export async function handleText(from: string, text: string, reply: (to: string, content: string) => Promise<void> = sendSms) {
  const command = parseCommand(text);
  if (!command) return; // Not for Nest. Ordinary texts are ignored and never stored.
  if (!allow(`sms:${from}`, 20)) return;
  if (command.cmd === 'help') return reply(from, HELP_TEXT);
  if (command.cmd === 'invalid') return reply(from, `${command.hint} Text HELP for all commands.`);
  if (!textPaymentsReady()) return reply(from, 'Text payments are not available right now.');

  const user = (await userByPhone(from)) as MetaUser | null;
  const settings = user?.custom_metadata ?? {};
  if (!user || !settings.tp_on || !settings.tp_pin) {
    return reply(from, 'Text payments are off for this number. Turn them on in the Nest app under You > Text payments.');
  }
  if (command.cmd === 'stop') {
    await setTextSettings(user, { tp_on: false });
    return reply(from, 'Text payments are off. Turn them back on in the Nest app.');
  }

  if (!checkPin(command.pin, settings.tp_pin)) {
    const fails = (settings.tp_fails ?? 0) + 1;
    if (fails >= MAX_PIN_FAILURES) {
      await setTextSettings(user, { tp_on: false, tp_fails: 0 });
      return reply(from, 'Too many wrong PINs, so text payments are now off. Turn them back on in the Nest app.');
    }
    await setTextSettings(user, { tp_fails: fails });
    return reply(from, `Wrong PIN. ${MAX_PIN_FAILURES - fails} tries left before text payments turn off.`);
  }
  if (settings.tp_fails) await setTextSettings(user, { tp_fails: 0 });

  const wallet = embeddedSolanaWallet(user);
  if (!wallet?.walletId) return reply(from, 'Your Nest wallet is still being set up. Open the app and try again.');
  const owner = new PublicKey(wallet.address);
  const balance = await usdcBalance(owner);
  if (command.cmd === 'balance') return reply(from, `You have ${usd(balance)} in Nest. ${DEVNET}`);

  if (command.cmd !== 'send' || !command.amount || !command.phone) return;
  const { amount, phone } = command;
  const today = dayKey();
  const spent = BigInt(settings.tp_day === today ? settings.tp_spent ?? 0 : 0);
  if (amount > TEXT_LIMITS.perPayment) return reply(from, `By text you can send up to ${usd(TEXT_LIMITS.perPayment)} at a time. Use the app for more.`);
  if (spent + amount > TEXT_LIMITS.perDay) {
    return reply(from, `That's over today's text limit of ${usd(TEXT_LIMITS.perDay)}. You have ${usd(TEXT_LIMITS.perDay - spent)} left today. Use the app for more.`);
  }
  if (balance < amount) return reply(from, `You only have ${usd(balance)}, so that didn't go through.`);
  if (phone === from) return reply(from, "That's your own number.");

  let recipient = await userByPhone(phone);
  const invited = !recipient;
  if (!recipient) {
    if (!allow(`invite:${user.id}`, 20)) return reply(from, 'Too many new numbers today. Try again later.');
    recipient = await createUserForPhone(phone);
  }
  const to = embeddedSolanaWallet(recipient);
  if (!to?.address) return reply(from, "That person's Nest wallet isn't ready yet. Try again in a minute.");

  // Count it before sending, so two quick texts can't both slip under the daily limit.
  await setTextSettings(user, { tp_day: today, tp_spent: Number(spent + amount) });
  let signature: string;
  try {
    signature = await sendWithServerSigner({ walletId: wallet.walletId, owner, recipient: new PublicKey(to.address), amount });
  } catch (err) {
    console.error(err);
    await setTextSettings(user, { tp_day: today, tp_spent: Number(spent) });
    return reply(from, "That didn't go through. Your money has not moved.");
  }
  await reply(from, `Sent ${usd(amount)} to ${formatPhone(phone)}. You have ${usd(balance - amount)} left. ${DEVNET}`);
  await reply(
    phone,
    `${formatPhone(from)} sent you ${usd(amount)} with Nest. ${invited ? 'Get the Nest app and sign in with this number to use it.' : 'Open Nest to see it.'} ${DEVNET}`,
  );
  console.log(`text payment sent: ${signature}`);
}
