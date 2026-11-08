import { PublicKey } from '@solana/web3.js';
import { activeTextPayment, smsStore, textMessageKey } from './textStore.mjs';
import { pendingResponse } from '@/lib/pending.mjs';
import { formatPhone } from '@/lib/phone.mjs';
import { formatUsd } from '@/lib/money.mjs';
import { HELP_TEXT, MAX_PIN_FAILURES, TEXT_LIMITS, dayKey, parseCommand } from '@/lib/sms.mjs';
import { allow } from './http';
import { checkPin, embeddedSolanaWallet, sendWithServerSigner, setTextSettings, textPaymentsReady } from './signer.mjs';
import { createUserForPhone, userByPhone } from './privy';
import { usdcBalance, connection } from './solana.mjs';

/** Nest's text-payments number: the demo Android phone running httpSMS. */
export const gatewayNumber = () => process.env.TEXT_PAYMENTS_NUMBER || '';

export type TextSettings = { tp_on?: boolean; tp_pin?: string; tp_fails?: number; tp_day?: string; tp_spent?: number; nest_frozen?: boolean; [key: string]: unknown };
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
const queues = new Map<string, Promise<unknown>>();
export async function handleText(from: string, text: string, reply: (to: string, content: string) => Promise<void> = sendSms, messageId = '') {
  const work = (queues.get(from) ?? Promise.resolve()).catch(() => undefined).then(() => processText(from, text, reply, messageId));
  queues.set(from, work);
  try { return await work; } finally { if (queues.get(from) === work) queues.delete(from); }
}
async function processText(from: string, text: string, reply: (to: string, content: string) => Promise<void>, messageId: string) {
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
  if (command.cmd === 'send' && settings.nest_frozen === true) return reply(from, 'Nest is locked. Open Nest and unlock with your app PIN or biometrics before sending money.');
  const id = messageId ? textMessageKey(messageId) : '';
  if (command.cmd === 'send') {
    if (!id) return reply(from, 'This message has no payment reference. Send a new text through the Nest gateway.');
    const store = smsStore()!;
    const recorded = store.get(user.id, id);
    if (recorded && ['confirmed', 'failed', 'expired'].includes(recorded.status)) return reply(from, `This text payment was already processed (${recorded.status}). Check Activity before sending another payment.${recorded.signature ? ` https://explorer.solana.com/tx/${recorded.signature}?cluster=devnet` : ''}`);
    const checkpoint = activeTextPayment(user.id);
    if (checkpoint) {
      if (checkpoint.status === 'preparing') return reply(from, 'Your previous text payment is being prepared. Wait for its receipt before sending again.');
      const status = (await connection().getSignatureStatuses([checkpoint.signature], { searchTransactionHistory: true })).value[0];
      const confirmed = status && !status.err && ['confirmed', 'finalized'].includes(status.confirmationStatus);
      const expired = !status && await connection().getBlockHeight('finalized') > checkpoint.lastValidBlockHeight;
      if (confirmed || status?.err || expired) {
        store.finish(user.id, checkpoint.id, confirmed ? 'confirmed' : expired ? 'expired' : 'failed');
        return reply(from, `${confirmed ? 'Your previous payment is confirmed.' : 'Your previous payment failed or expired.'} Check Activity before starting a new payment. https://explorer.solana.com/tx/${checkpoint.signature}?cluster=devnet`);
      }
      if (checkpoint.id !== id) return reply(from, `Your previous payment is pending. Do not resend it. Check Activity or https://explorer.solana.com/tx/${checkpoint.signature}?cluster=devnet`);
      const wallet = embeddedSolanaWallet(user);
      if (!wallet?.walletId) return reply(from, 'Open Nest to check your pending payment.');
      try {
        await sendWithServerSigner({ userId: user.id, walletId: wallet.walletId, owner: new PublicKey(wallet.address), recipient: new PublicKey(checkpoint.recipient), amount: checkpoint.amount, checkpoint });
        store.finish(user.id, id, 'confirmed');
        return reply(from, `Your payment is confirmed. https://explorer.solana.com/tx/${checkpoint.signature}?cluster=devnet`);
      } catch { return reply(from, `Your payment is pending. Do not resend it. Check Activity or https://explorer.solana.com/tx/${checkpoint.signature}?cluster=devnet`); }
    }
  }

  const wallet = embeddedSolanaWallet(user);
  if (!wallet?.walletId) return reply(from, 'Your Nest wallet is still being set up. Open the app and try again.');
  const owner = new PublicKey(wallet.address);
  const balance = await usdcBalance(owner);
  if (command.cmd === 'balance') return reply(from, `You have ${usd(balance)} in Nest. ${DEVNET}`);

  if (command.cmd !== 'send' || !command.amount || !command.phone) return;
  const { amount, phone } = command;
  const today = dayKey();
  const store = smsStore()!;
  const legacySpent = settings.tp_day === today ? settings.tp_spent ?? 0 : 0;
  const spent = store.spent(user.id, today, legacySpent);
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

  // A unique active row and daily reservation commit atomically before remote signing.
  let reservation;
  try { reservation = store.reserve(user.id, { id, phone, recipient: to.address, amount, day: today }, TEXT_LIMITS.perDay, legacySpent); }
  catch { return reply(from, 'This payment cannot start. Check your daily text allowance and Activity.'); }
  if (!reservation.created) return reply(from, 'A text payment is already being processed. Check Activity before sending again.');
  let signature: string;
  let prepared: { transaction: string; signature: string; blockhash: string; lastValidBlockHeight: number } | undefined;
  try {
    signature = await sendWithServerSigner({ userId: user.id, walletId: wallet.walletId, owner, recipient: new PublicKey(to.address), amount, onPrepared: async (value: NonNullable<typeof prepared>) => {
      store.savePrepared(user.id, id, value);
      prepared = value;
    } });
  } catch (err) {
    const pending = pendingResponse(err);
    if (pending || prepared) return reply(from, `Payment pending. Do not resend it. Check Activity or https://explorer.solana.com/tx/${pending?.signature || prepared!.signature}?cluster=devnet`);
    console.error(err);
    store.finish(user.id, id, 'failed');
    return reply(from, 'The payment could not be prepared. Check Activity before sending another payment.');
  }
  store.finish(user.id, id, 'confirmed');
  await reply(from, `Sent ${usd(amount)} to ${formatPhone(phone)}. You have ${usd(balance - amount)} left. ${DEVNET}`);
  await reply(
    phone,
    `${formatPhone(from)} sent you ${usd(amount)} with Nest. ${invited ? 'Get the Nest app and sign in with this number to use it.' : 'Open Nest to see it.'} ${DEVNET}`,
  );
  console.log(`text payment sent: ${signature}`);
}
