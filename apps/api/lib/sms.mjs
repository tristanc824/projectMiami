import { normalizePhone } from './phone.mjs';
import { toBaseUnits } from './money.mjs';

// Text payments: commands texted to Nest's number from any phone with a cellular signal, no data needed.
export const TEXT_LIMITS = { perPayment: 10_000_000n, perDay: 20_000_000n }; // $10 a payment, $20 a day (USDC base units)
export const MAX_PIN_FAILURES = 5;

// Plain GSM characters only: an emoji or curly quote would make carriers split the text into more pieces.
export const HELP_TEXT = [
  'Nest - money by text, no data needed',
  '',
  'Send money:',
  'SEND 5 3055550142 PIN 1234',
  '',
  'Check your balance:',
  'BAL 1234',
  '',
  'Turn off text payments:',
  'STOP',
  '',
  'Use your own PIN in place of 1234. Test dollars on Solana devnet.',
].join('\n');

/**
 * Parses an incoming text. Returns null for anything that isn't meant for Nest, so ordinary
 * messages are ignored rather than answered. Malformed commands come back as { cmd: 'invalid' }.
 */
export function parseCommand(text) {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  if (!t) return null;
  if (t === 'HELP' || t === 'INFO') return { cmd: 'help' };
  if (t === 'STOP' || t === 'STOPALL') return { cmd: 'stop' };

  const word = t.split(' ')[0];
  if (word === 'BAL' || word === 'BALANCE') {
    const m = /^BAL(?:ANCE)? (?:PIN )?(\d{4})$/.exec(t);
    return m ? { cmd: 'balance', pin: m[1] } : { cmd: 'invalid', hint: 'To check your balance, text BAL and your PIN, like BAL 1234.' };
  }
  if (word === 'SEND' || word === 'PAY') {
    const m = /^(?:SEND|PAY) \$?(\d{1,6}(?:\.\d{1,2})?) (?:TO )?([+(\d][\d ().-]*?) PIN (\d{4})$/.exec(t);
    const amount = m && toBaseUnits(m[1]);
    const phone = m && normalizePhone(m[2]);
    if (!m || !amount || !phone) return { cmd: 'invalid', hint: 'To send, text SEND, the amount, their number and your PIN, like SEND 5 5555550142 PIN 1234.' };
    return { cmd: 'send', amount, phone, pin: m[3] };
  }
  return null;
}

// Daily totals reset at midnight US Eastern, where the demo runs.
export function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(date);
}
