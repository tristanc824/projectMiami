// Pretends a phone texted Nest's number, by sending the local server the same webhook httpSMS would.
// Start the server first (npm run dev), then from apps/api:
//   node scripts/fake-text.mjs +13055550142 "SEND 2 5555550142 PIN 4821"
// With no HTTPSMS_API_KEY set, the server prints its replies instead of texting them.
import { SignJWT } from 'jose';
import { loadEnv } from './env.mjs';

loadEnv();
const [from, text, server = 'http://localhost:5184'] = process.argv.slice(2);
if (!from || !text) throw new Error('Usage: node scripts/fake-text.mjs <from number> "<text>" [server url]');
const key = process.env.HTTPSMS_WEBHOOK_SIGNING_KEY;
const owner = process.env.TEXT_PAYMENTS_NUMBER;
if (!key || !owner) throw new Error('Set HTTPSMS_WEBHOOK_SIGNING_KEY and TEXT_PAYMENTS_NUMBER in .env.local first.');

const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(key));
const res = await fetch(`${server}/api/sms`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'x-event-type': 'message.phone.received' },
  body: JSON.stringify({
    specversion: '1.0',
    type: 'message.phone.received',
    source: '/v1/messages/receive',
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    data: { message_id: crypto.randomUUID(), contact: from, owner, content: text, sim: 'SIM1', timestamp: new Date().toISOString() },
  }),
});
console.log(res.status, await res.text(), '(the reply prints in the server window)');
