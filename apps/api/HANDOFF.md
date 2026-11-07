# DAT handoff

Context for continuing this project in a new chat. Secrets live in `.env.local`: never print them, paste them into chat, or commit them.

**Team setup:** run `npm install`, copy `.env.example` to `.env.local`, and get the values privately from the project owner. A Git-ignored `.env.team` holds a copy on the owner's machine: don't read it aloud to an AI chat, commit it, or upload it. Then run `npm run dev`.

**Newer decisions** on text payments, offline use, cards, the pitch and competitors are in `docs/BRIEF.md`, which supersedes anything here that conflicts. The backend API for the mobile app is in `docs/API.md`.

## The idea

DAT (placeholder name) is a beginner-friendly crypto neobank, pitched as a worldwide Zelle: people deposit fiat, hold USDC in their own wallet, send it to any phone number, and convert back to fiat or spend it.

- **Pitch:** help people in emerging markets protect savings from inflation and from institutions failing. Call Ueno Bank in Paraguay (November 2026) a bank failure, not a hack.
- **Claims to avoid:** "nobody can freeze it" (Circle can freeze USDC) and "every transaction is private".
- **Hackathon:** live 3-minute demo due around 2026-11-08, entered in a Solana category. Devnet is allowed, and code doesn't have to be written during the event.
- **Tests run in the US.** Nigeria and Kenya were only examples. Licensing is out of scope for this test.

## Decisions

- Self-custody with Privy embedded wallets, on Solana devnet.
- Send and log in by phone number (SMS), not email. External wallets stay off in Privy.
- No token, and no yield in v1.
- No Zcash. Private send is a roadmap item or a stretch goal, for example MagicBlock if it works on devnet.
- Relay is only for later cross-chain deposits, not fiat conversion.
- Real-money options for later: Coinbase Onramp (US), MoonPay or Transak (global), TransFi (local payment methods).

## What's real in the demo

| Step | Status |
| --- | --- |
| Wallets and USDC transfers | Real on devnet |
| Deposit | Stripe test mode, then `Treasury` sends real devnet USDC |
| Bank payout on cash-out | Simulated, though its USDC transfer is real |
| Card payment | Simulated, though its USDC transfer is real |

The app labels the simulated parts, and judges should be told too.

## How it's built

Next.js 15 app. Run `npm run dev` for port 5184. `/preview` shows the screens with fake data in development.

- `lib/tx.mjs`: builds transfers and validates what the fee payer will co-sign.
- `lib/server/solana.mjs`: balances, treasury sends, prepare and submit transfers.
- `lib/server/privy.ts`: token checks, phone lookup, and wallets pre-created for numbers not yet signed up. Uses Privy's REST API because `@privy-io/node` fails to load on the local Node 20.15.
- `lib/server/stripe.ts`: refuses non-test keys and prevents double delivery of a deposit.
- `app/api/*`: balance, recipient, transfer prepare and submit, deposit intent, complete and test-card.
- `components/LiveApp.tsx`: Privy setup and session logic. `components/Home.tsx`: the main screens.

**Wallets:** `Treasury` is `67JSUvCsmtPz5phtFSobtGnmiN8zcwJUDCrJEZxRJRsu` and stands in for the deposit and payout provider. `Fee Payer` is `77m7HCt9N6VBCRiJi3WUUeL2QFbMtKmt9mdv6KbyYCCb` and pays network fees. Devnet USDC mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.

**Package notes:** `.npmrc` sets `legacy-peer-deps`, and `package.json` overrides `uuid` for `rpc-websockets`. Both are needed.

## Verified so far

- `npm test`: 8 of 8 pass.
- `node scripts/e2e-devnet.mjs`: deposit, sponsored send and return to treasury work on devnet from wallets holding zero SOL.
- Privy phone lookup and wallet pre-creation work through the API. This left a fake user, `+1 555 555 0142`.
- A Stripe test payment succeeds through the API, outside the app.
- Login and send screens render correctly in `/preview`, using fake data.

## Not verified yet

- SMS login. The user still needs to turn on SMS in the Privy dashboard, and SMS versus WhatsApp can't be changed later.
- Signing a transfer with a real Privy wallet in the browser.
- Whether someone who gets a pre-created wallet can use it after logging in by SMS. This matters for the demo.
- Deposit, cash-out and card screens against a real account.
- Apple Pay, which needs a deployed HTTPS site, its domain registered with Stripe, and an iPhone with a card in Wallet.
- Passkey support for Solana wallets. Privy's docs don't confirm it.

## Next steps

1. Turn on SMS in Privy and log in at http://localhost:5184.
2. Test the full flow on two phones, including sending to a number that hasn't signed up.
3. Deploy to Vercel with the root directory set to this app, copy the `.env.local` values into Vercel's settings, and add the deployed domain to Privy's allowed domains if login requires it.
4. Register the domain with Stripe and test Apple Pay on an iPhone.
5. Top up devnet USDC at https://faucet.circle.com. `Treasury` had about $20 at last check, and deposits are capped at $20 by `MAX_DEPOSIT_USD`.
6. Rehearse, record a backup video, and bring a phone hotspot.

## Demo script

1. The problem: savings melting in a falling currency.
2. A judge signs up on their own phone with no seed phrase.
3. Add money with Apple Pay, or the test card as a backup.
4. Send to the judge's phone number. Their screen updates live, and this is the moment that has to work.
5. Open Solana Explorer: confirmed in seconds, with no SOL held and no fee paid by the user.
6. Cash out and make a card payment, labeled as simulated.
7. The vision: new countries plug in through local partners.
