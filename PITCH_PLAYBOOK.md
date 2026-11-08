# Nest judging playbook — November 8, 2026

This is the current demo script. It supersedes earlier design/roadmap scripts. Keep the demonstration on Solana devnet with test USDC.

## Before the judge arrives

1. Follow [Website setup](./README.md#website-and-browser-sending) and run `npm run demo:check`.
2. Keep the API, review server and website running. Open `http://localhost:5175` on the demo laptop. A public HTTPS app URL is not configured yet; localhost is not a link judges can use on their phones.
3. Check actual treasury supply and recipient accounts. Use a small funded amount. Do not change funding limits or invent a successful receipt to rescue a demo.
4. Rehearse a known recipient and an unfamiliar recipient. Native biometric approval requires the updated, physically tested build; use the app PIN as the fallback.
5. Keep the real Explorer receipt ready. A pending payment is pending; do not send another payment to make the animation finish.

## Three-minute demonstration

| Moment | Show | Say |
| --- | --- | --- |
| Opening | Nest Home | “Families should be able to send to a phone number and understand what they are approving.” |
| Account | Privy SMS and app PIN, or an already signed-in demo account | “Nest creates the wallet behind a familiar sign-in.” |
| Funding | A small Stripe test-card top-up | “These are test dollars on Solana devnet. No real card is charged.” |
| Known recipient | Review amount and number; approve with fingerprint, face or PIN | “This person is already in my contacts. I still review and approve.” |
| Confirmation | Actual receipt and Explorer link | “Here is this payment's transaction reference.” If pending: “The chain hasn't confirmed it yet. We keep its reference and prevent a duplicate.” |
| Unfamiliar recipient | Swarms/Prune review and scam warning | “A new recipient gets a safety review. An error stops the payment.” |
| Lock Nest | Lock, then unlock with app PIN or enrolled biometrics | “This stops outgoing Nest payments, including text payments.” |
| Close | Current status and roadmap | “The Safe Hold is deployed on devnet, with a verified deposit and full Undo refund.” |

## Features you must label accurately

- **Safe Hold / Undo:** deployed to devnet, with real deposit/refund proofs. Show the actual hold and Undo receipts. Do not say an ordinary completed send can be undone.
- **Trusted contact:** saved contact with call/text shortcuts. Contact-only recovery is not connected.
- **Biometrics:** say “fingerprint, face or PIN.” Native approval needs the updated build and enrollment; browser approval uses the app PIN. Do not describe this as passkey login or provider-level MFA.
- **SMS without data:** only demonstrate with the configured limited signer, Android gateway and actual cellular service. Failed or pending confirmations are not proof that no funds moved.
- **Bank payouts, card spending, Apple Pay:** not connected. Do not include them in the pitch as operational capabilities.
- **Speed and scam protection:** show the measured result. Do not guarantee a one-second arrival or claim the review prevents every scam.
- **Custody:** describe the actual embedded wallet and the explicitly enabled limited SMS signer. Do not say Nest has no signing authority if the user enabled that signer.

## Questions

“How does Undo work?” — The program holds funds before release; cancelling a hold returns them. It does not reverse a finalized ordinary payment. Deployment and a real deposit/refund are verified; see audit/hold-devnet-proof.json.

“What if I lose my phone number?” — Contact-only recovery is not yet implemented. It needs provider authentication support and prior account linking. Saving a contact does not enable recovery.

“Where can I try it?” — At the team laptop until a public HTTPS deployment is configured. The repository is private; reviewer access must be arranged separately.

“What integrations run?” — Privy for accounts/wallets, Solana devnet for transfers and sponsored fees, Stripe test mode for funding, Swarms/Prune for the review pipeline. Claim other sponsors only when their code and live setup are verified.

## Reset between demonstrations

Wait for any pending transaction to resolve before starting another outgoing payment. Refresh Activity and inspect the same signature. Do not retry by creating a new transfer. Only undo an active Safe Hold; a completed instant send cannot be reversed.
