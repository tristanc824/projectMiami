# DAT project brief

Everything decided so far, for anyone joining the build, including an AI coding assistant. Read `HANDOFF.md` for setup and status, and `docs/API.md` for the backend.

## The product

DAT (placeholder name) is a beginner-friendly crypto neobank and a "worldwide Zelle":

- **Deposit:** add local money and hold it as USDC (digital dollars) in a wallet the user controls.
- **Send:** pay anyone by phone number, including people who haven't signed up.
- **Cash out or spend:** turn it back into local money or pay with a card.

The mission is to help people in emerging markets protect their savings from inflation and from institutions failing.

## Hackathon facts

- Live 3-minute demo, due around 2026-11-08.
- Entered in a Solana category. Devnet is allowed.
- Code didn't have to be written during the event.
- Tested in the US. Nigeria and Kenya were only examples, and licensing is out of scope.

## Decisions

| Topic | Decision |
| --- | --- |
| Custody | Self-custody: Privy embedded wallets, no seed phrase |
| Chain | Solana devnet |
| Login and sending | By phone number with SMS codes, not email. External wallets off |
| Network fees | Paid by DAT's `Fee Payer` wallet, so users never need SOL |
| Deposits | Apple Pay through Stripe test mode, with a test-card backup. `Treasury` stands in for the deposit provider |
| Cash-out | The USDC transfer is real. The bank payout is simulated and labeled |
| Card | A simulated DAT-branded card. Don't imitate Apple Pay's screens or branding |
| Token, yield, Zcash | None |
| Privacy | Roadmap only. MagicBlock private payments are a possible stretch goal |
| Relay | Only for future cross-chain deposits, not fiat |

Possible real-money partners later: Coinbase Onramp (US), MoonPay or Transak (global), TransFi (local payment methods), Bridge (cash-out).

## What sets DAT apart

Plain sending and self-custody aren't unique anymore. Avici is a self-custody neobank on Solana, and Samsung said it would add USDC transfers on Solana to Samsung Wallet for US users.

The chosen differences:

1. **Receive without signing up:** a phone number gets a self-custody wallet with money in it before its owner opens DAT. This is built but unverified.
2. **Dollars without internet:** text payments that work on any phone with a cellular signal, including flip phones with no data. Not built yet.
3. **Can't lock you out:** a possible extra, letting users export their wallet so they can leave even if DAT disappears.

Savings circles (tandas, chamas) were considered and dropped, because several Solana projects already do them, including Circles, Koopaa and PeerSave.

## Text payments design

```
Phone with no internet ──SMS──▶ DAT's number ──▶ DAT server ──▶ Solana
        ◀──SMS── "Sent $2.00 to (555) 555-0142"
```

### Commands

| Text | Reply |
| --- | --- |
| `BAL` | "You have $20.00." |
| `SEND 2 5555550142 PIN 4821` | Sends, then texts both people |
| `HELP` | A short list of commands |
| `STOP` | Turns off text payments until they're switched back on in the app |

### How signing works

The user turns on text payments once in the app, with internet. That gives DAT's server a limited, revocable Privy signer.

What Privy's docs say:

- Signers are added with `useSigners().addSigners({ address, signers: [{ signerId, policyIds }] })` from `@privy-io/react-auth`.
- Signers are revoked with `removeSigners({ address })`.
- Servers sign with `POST https://api.privy.io/v1/wallets/{wallet_id}/rpc`. The request needs a `privy-authorization-signature` header: an ECDSA P-256 signature over RFC 8785 canonical JSON of `{version, method, url, body, headers}`.
- Policies can allow only USDC `TransferChecked` and cap the amount of each payment, for example 5 USDC = `5000000`.
- Policies are deny-by-default, every instruction must be allowed, and devnet is supported.
- Pregenerated wallets can get the signer at creation through `additional_signers`.

### Gaps

- **No daily limit on Solana:** Privy's rolling limits only cover Ethereum, so DAT's server must enforce the daily total itself. Privy still caps each payment.
- **Fee payer unconfirmed:** the docs don't say whether Privy will sign a transaction where a separate wallet pays the fee. Test this first. Privy's own gas sponsorship is the fallback.
- **The rest of the transaction:** the policy must also allow the Associated Token program, which creates the recipient's token account.

### Security

- A PIN on every command.
- A low daily limit by text, with larger amounts done only in the app.
- A `STOP` command, and revoking in the app.
- Judges will ask about SIM swaps, so have those answers ready.

### DAT's phone number

US carriers block automated texts from unregistered numbers. Twilio toll-free verification and 10DLC registration are reported to take days to weeks, so that won't be ready in time.

The demo workaround is a spare Android phone with a SIM card, running httpSMS to forward texts to DAT's server. This approach was used by the cellfi hackathon project, but hasn't been tested here.

### Offline facts

| Situation | Works? |
| --- | --- |
| No internet, cellular signal on | Yes |
| Airplane mode | No |
| Receiving | Always works, because money lands on-chain. Notification comes by text with a cellular signal |
| Spending by text | Needs a one-time setup in the app with internet |

Offline QR payments with Solana durable nonces are a roadmap idea only, because of double-spend risk.

## Cards and Apple Wallet

A real DAT card in Apple Wallet isn't possible for this demo. Stripe says Apple Wallet tokens only work in live mode, and adding a card from an app needs Apple's approval plus an approved card program.

Options:

- **A simulated DAT-branded tap screen:** the USDC payment is real on devnet. About an hour of work.
- **Stripe Issuing test mode:** authorizations simulated through test helpers, with DAT approving each one by checking the user's USDC balance. Needs Issuing enabled on the Stripe account, plus a deployed server. About 4–5 hours.

Never present another company's real card as DAT's.

## Pitch

Lead with the "can't lock you out" framing, and show a judge receiving money on their own phone.

On Ueno Bank in Paraguay: the central bank put it into resolution on 2026-11-03, after its solvency ratio fell below half the legal minimum. About 2.9 million customers lost access to their money. Deposit insurance covers up to about $38,000, which is estimated to fully cover about 97% of depositors. Call it a bank failure, not a hack. Check the latest news before presenting, and leave out reports about President Peña, which conflict.

Claims to avoid:

- "Nobody can freeze it": Circle can freeze USDC.
- "Every transaction is private."
- "The only app that…": say "the first we know of".
- Inflation protection without the caveat that dollar inflation still applies.

Competitors:

| Company | What it does | What DAT says |
| --- | --- | --- |
| Félix | WhatsApp remittances from the US to Latin America over USDC, and recipients get local money | We're two-way, recipients can keep dollars, and it's self-custody |
| Littio | A Colombian dollar account with yield | We send to anyone by phone and work without internet |
| Avici | A self-custody Solana neobank with a Visa card | We work without a smartphone or data, and recipients don't need to sign up |
| PayPal and Revolut | Custodial, and they can freeze accounts | They aren't built for unstable-currency markets |
| Machankura | Bitcoin by phone menus in Africa | Bitcoin's price swings, while DAT is stable dollars |

## Demo script (3 minutes)

1. **0:00–0:25:** the problem, using Ueno Bank and savings lost to falling currencies.
2. **0:25–0:55:** a judge signs up by SMS code, with no seed phrase.
3. **0:55–1:20:** an Apple Pay test deposit, or the test card as a backup.
4. **1:20–1:50:** send $5 to the judge's number, their screen updates live, then show Solana Explorer.
5. **1:50–2:25:** phone 2 has Wi-Fi and data off, texts `SEND 2 ...`, and phone 1 receives it.
6. **2:25–2:45:** the simulated card tap. This is the first thing to cut if time is short.
7. **2:45–3:00:** the vision: dollars for anyone with a phone.

Backups: a recorded video, wallets funded in advance, a phone hotspot, and enough devnet USDC. Phone 2 must have text payments set up before going on stage.

## Build order

1. SMS login. It's untested, and everything depends on it.
2. Confirm a pregenerated wallet works when its owner logs in.
3. The text payments signing test. It needs a Privy authorization key in `.env.local`.
4. Build text payments with the Android gateway.
5. Deploy, then Apple Pay.
6. The simulated card tap screen.
7. Optional: wallet export, the speed and fee receipt, and local-currency balances.

## Rules for AI assistants on this project

- Never print, paste or commit secrets from `.env.local` or `.env.team`.
- Don't add auto-burn, token launches or yield features.
- Label everything simulated in the interface.
- Confirm with the owner before big changes. They prefer to understand the plan first.
