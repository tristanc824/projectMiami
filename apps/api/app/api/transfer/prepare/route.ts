import { requirePaymentUser } from '@/lib/server/paymentAuth';
import { PublicKey } from '@solana/web3.js';
import { fail, json, route } from '@/lib/server/http';
import { prepareTransfer, treasury, usdcBalance } from '@/lib/server/solana.mjs';
import { toBaseUnits } from '@/lib/money.mjs';

export const POST = route(async (req: Request) => {
  const me = await requirePaymentUser(req);
  if (me instanceof Response) return me;
  const body = await req.json();
  const amount = toBaseUnits(body.amount);
  if (!amount) return fail('Enter an amount');
  if ((await usdcBalance(me.wallet)) < amount) return fail("You don't have enough for that.");
  // Cash-outs and card payments return USDC to the treasury, standing in for a payout partner.
  let recipient: PublicKey;
  try {
    recipient = body.toTreasury ? treasury().publicKey : new PublicKey(body.recipient);
  } catch {
    return fail('Invalid recipient');
  }
  if (recipient.equals(me.wallet)) return fail("You can't send to yourself.");
  return json(await prepareTransfer(me.wallet, recipient, amount));
});
