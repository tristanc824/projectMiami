# Devpost submission draft: Nest (SharkByte 2026)

Deadline: **Sun Nov 8, 2026, 11:00 AM EST**. Do not press Submit until Caleb approves.

---

## Project name
Nest

## Tagline (200 characters max)
A US-dollar account for families across borders. Send money home in seconds, check every payment for scams, undo a risky one, and keep sending even without internet.

## Inspiration
Ana lives in Miami. Her mom lives in Buenos Aires. Every month Ana sends home what she can.

In Argentina, prices roughly tripled in a single year (INDEC, 2023). Money held in local currency lost about two-thirds of what it could buy. Bank wires took days, charged fees and paid out in local currency, so part of every transfer was gone before it arrived.

Families like Ana's also face a second problem: scams that target people sending money home. Once a wire goes out, it's gone.

We wanted a place where a family's money keeps its value, moves in seconds, and has someone watching out for it.

## What it does
Nest is a US-dollar account for families who live in different countries.

- **Holds dollars.** Balances are kept in digital US dollars (USDC on Solana), so they don't shrink when the local currency falls.
- **Sends in about a second.** You send to a phone number. The money arrives in about a second, with no transfer fee, any time of day.
- **No app needed to receive.** Mamá gets a link, opens it in her phone's browser, signs in with her phone number and keeps the money in dollars.
- **Works without Wi-Fi.** With no Wi-Fi or data, you can still send money and check your balance by text message, so your money is never stuck.
- **Checks for scams before you pay.** A team of AI agents reviews a transfer to someone new and explains in plain language why it might be a scam.
- **Lets you undo.** A flagged payment waits in an on-chain Safe Hold for 24 hours and needs a second confirmation, so you can still take it back.
- **Only you approve payments.** Payments need your fingerprint, face or PIN. You can lock your account and add a trusted family contact.

## How we built it
- **Mobile and web app:** React Native, Expo SDK 58 and Expo Router, in TypeScript. The same screens run on iPhone and in the browser, and the marketing site serves the web app at `/app`.
- **Accounts and wallets:** Privy. Signing in with a phone number and an SMS code creates a self-custody Solana wallet. Someone who receives money before signing up gets a wallet waiting for them.
- **Money:** USDC on Solana devnet. Our backend pays the network fees, so users never need SOL.
- **Backend:** Next.js API routes (`apps/api`) for balances, sends, recipients, add money (a Stripe test card) and withdrawals.
- **Text payments:** an Android phone with an eSIM runs httpSMS as our gateway. It forwards texts to `/api/sms`, which checks a PIN and sends through a limited Privy signer.
- **Scam review:** Swarms API agents (a Watchdog and a Judge) review transfers, with a red-team suite of scam calls and messages. The transfer form can also be filled in by speech in 16 languages.
- **Safe Hold:** a Solana program that holds a flagged transfer for 24 hours and needs a double confirmation.
- **Website:** React, Vite and Tailwind.
- **Demo film:** motion graphics built in code with Remotion, with an ElevenLabs voice.

## Challenges we ran into
- **Building the Safe Hold program.** Solana's toolchain pins Rust 1.75, so we pinned crate after crate before it built in CI.
- **Sending without data.** We had to get a real SMS gateway working, keep PINs salted and hashed, and limit what the server is allowed to sign.
- **Keeping the claims honest.** "Undo" only works before the money is released, so we built a real on-chain hold instead of promising to reverse a finished transfer.
- **Design for someone who has never used crypto.** No seed phrases, no gas, no wallet addresses: just a phone number and dollars.

## Accomplishments that we're proud of
- Real USDC moves between real wallets on Solana devnet, from phone number to phone number.
- You can send money by text message with Wi-Fi and data turned off.
- A scam check that explains itself in plain language, plus a 24-hour hold that actually lives on-chain.
- A receiver never has to download anything.

## What we learned
- For families sending money home, what matters is keeping its value and stopping scams.
- Self-custody can feel as simple as a bank login when the wallet is created behind a phone number.
- Offline access isn't a nice-to-have where data is expensive or unreliable.

## What's next for Nest
- Mainnet launch with audited programs.
- Cash-out to local currency through a licensed partner.
- More countries and languages, starting with Latin America.
- Bring the scam review into every send, not just new contacts.

## Built with
react-native, expo, typescript, react, vite, tailwindcss, next.js, node.js, solana, usdc, privy, swarms, stripe, httpsms, rust, anchor, remotion, elevenlabs

## Try it out links
- GitHub: https://github.com/tristanc824/projectMiami (private: make it public or add judges before submitting)
- Website: (URL needed)
- Video: (YouTube or Vimeo link needed; Devpost only embeds those)

## Prize categories to opt into (check each before submitting)
| Prize | Fit | Note |
|---|---|---|
| 1st/2nd/3rd Overall | Yes | Automatic |
| [MLH] Best Use of Solana | Strong | USDC on devnet, Privy Solana wallets, Safe Hold program |
| Best use of Swarms API | Strong if Chad's branch is merged/demoable | The Watchdog and Judge scam review |
| [MLH] Best Use of Auth0 | Weak | Auth0 code exists, but live sign-in uses Privy. Only opt in if Auth0 sign-in is set up and demoable |
| [MLH] Cursor + Grok Bot (SpaceXSI) | Only if true | Requires using Cursor and a Grok Bot automation, described in the write-up |
| First Time Hacker | Only if a teammate qualifies | |

## Team (add on Devpost by their Devpost usernames)
Chad Carmichael, Tristan Colombel, Caleb Cruz Torres, Bruno DiBartolo

## Gallery images (ready)
- `pitch/one-pager-v4.png`
- `pitch/assets/` screen crops
- `app-design/pages/` app screens
- A still of the film's end card
