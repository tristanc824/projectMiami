# Nest — submission draft

Prepared November 8, 2026. This is a draft for review, not a submitted entry.

## Project name
Nest

## Tagline
A phone-number account for sending test dollars on Solana, with scam checks and a simpler way to approve payments.

## Inspiration
Families sending money home need a clear amount, a familiar phone number, and a chance to spot a suspicious request before approving it. Nest explores that experience without making someone learn wallet addresses or acquire SOL for fees.

## What we built
- Mobile and browser sign-in through Privy SMS, with an app PIN.
- Fee-sponsored phone-number transfers using test USDC on Solana devnet.
- Test-card funding, confirmed transaction receipts and Solana Explorer links.
- Swarms/Prune review of unfamiliar recipients, explaining suspicious amounts or requests before sending.
- Fingerprint, face or PIN approval in the native app, plus Lock Nest for outgoing Nest payments.
- Optional saved contacts and payment-request links. No address-book upload is required.
- SMS payment integration through a limited signer and a team Android gateway; live delivery requires the configured gateway and a venue rehearsal.

## Safe Holds and recovery: status matters
The Safe Hold program is deployed on Solana devnet. A real 24-hour deposit, full Undo refund and explicit sender override were verified on November 8, 2026. See [transaction proofs](../audit/hold-devnet-proof.json). Instant payments already completed on Solana cannot be reversed.

Trusted contacts can be saved and called/texted. Contact-only wallet recovery is **not active**. It requires provider configuration, prior account linking and native SDK changes. Biometric approval also requires an updated native build and a physical-device check; browser tests use app PIN approval.

## How we built it
React Native / Expo SDK 58 and Expo Router share the app screens. Privy handles phone-number authentication and embedded Solana wallets. Next.js serves the API and pays devnet network fees. Stripe runs in test mode and treasury funding delivers test USDC. Swarms supplies the review agents, with Prune in the review pipeline. The website uses React, Vite and Tailwind; video assets use Remotion.

Ambiguous confirmations remain pending with their original signature. Browser and SMS retries retain signed transaction bytes rather than silently making a second payment. RPC failures preserve an unavailable state instead of displaying a false zero balance.

## What judges can see
Demonstrate SMS sign-in, a known-recipient transfer, a scam warning for an unfamiliar recipient, the receipt/Explorer link, and Lock Nest. Demonstrate biometric approval only on the updated, rehearsed native build. Show an actual Safe Hold, Undo and its Explorer receipt; keep design animations clearly distinguished from transaction evidence.

## Links and access
- Source: https://github.com/tristanc824/projectMiami — currently private; judges need reviewer access. Do not change repository visibility without the owner's approval.
- Live demonstration: team laptop at the Nest table. There is no public HTTPS deployment configured.
- Local rehearsal: http://localhost:5175 — this is a laptop address, not a public judge link.

## What is next
Rehearse the deployed Safe Hold on a physical phone, plus two-phone login/receiving and the SMS gateway, configure a public HTTPS app URL, and implement contact-only recovery through the wallet provider's supported authentication integration.

Bank payouts, card spending, guaranteed transfer times, guaranteed scam prevention and real-money availability are not claimed by this prototype. All demonstrated funds are test USDC with no real-world value.
