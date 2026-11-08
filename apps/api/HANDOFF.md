# Nest API handoff

The current app starts from the repository root with `npm run website`, then opens **http://localhost:5175**. Follow the [Website setup](../../README.md#website-and-browser-sending), including all three dependency installs. Port 5184 serves the Nest API and a plain landing page; it is not a second consumer app.

Credentials belong in ignored `.env.local` files. Never print, paste, commit or publish their values. `.env.example` lists the required names. Provider RPC URLs with keys also stay server-only.

## Current behavior

- Privy SMS login creates or reuses an embedded Solana devnet wallet. Native and browser accounts use the same Privy app ID.
- A six-digit app PIN protects account access. Native devices can enable fingerprint/face approval with PIN fallback. App sends require a fresh approval; this is not a claim that provider-level wallet MFA is configured.
- Stripe test-card funding transfers test USDC from the treasury after a test payment. The default deposit cap is $1,000, subject to actual available treasury supply. No real card charge is permitted.
- Phone-number sends are fee-sponsored devnet transactions. Unfamiliar recipients use the Swarms/Prune review API when enabled. Saved contacts and successful prior recipients bypass review after confirmation.
- Lock Nest blocks outgoing app and SMS payments. Fresh PIN verification can unlock; biometric unfreeze uses protected device storage.
- Trusted contacts can be saved and called/texted. Contact-only recovery is **not implemented**; it requires provider configuration, prior account linking and native SDK work.
- Bank/Apple Cash payouts, card spending and Apple Pay are not part of the connected demo. Retained withdrawal screens are simulations that return test USDC to the treasury.
- Safe Hold is deployed on devnet; deposit/refund/override proofs are recorded. The physical-phone flow still needs rehearsal. See [the deployment status](../../FAMILY_REVIEW.md).

## Running it

Use Node.js 24.12 and the dependency installs in the root README. Configure Privy, Stripe **test** credentials, the treasury, fee payer and a devnet RPC. `USDC_MINT` defaults to Circle's devnet mint; `MAX_DEPOSIT_USD` defaults to 1000. All broadcasts must remain on devnet.

`npm run dev` here starts the API on port 5184. `npm run website` at the root starts/uses that API and serves the actual app on port 5175. `npm run review` at the root starts the Python review service using the configured local port. Browser wallet login requires localhost or HTTPS, not an HTTP LAN address.

The public website URL is not configured yet. Until it is, demo on the laptop. A native phone needs the correct LAN API address on the same network and a rebuilt development app for biometric/contacts modules.

## Important files

- `lib/server/solana.mjs`: balances, devnet checks, exact signed-byte submission, confirmation and pending receipts.
- `lib/transaction-status.mjs`: verifies pending payments against the correct wallet's actual token deltas.
- `lib/server/stripe.ts`: persistent delivery checkpoints prevent duplicate funding.
- `lib/server/signer.mjs`, `lib/server/textPayments.ts`: limited SMS signing and freeze enforcement; `textStore.mjs` provides the persistent SQLite checkpoint/usage ledger.
- `lib/server/paymentAuth.ts`, `app/api/account/`: PIN grants, freeze controls and saved contacts.
- `lib/server/holds.ts`: review-bound hold actions and deployment availability.
- [API reference](./docs/API.md), [review handoff](../../FAMILY_REVIEW.md), [mobile audit](../mobile/UX_AUDIT.md).

## Rehearsal and verification

Run `npm run demo:check` at the root for read-only readiness. Use `npm test` and `npm run test:holds` here, plus `npm run test:review` and `npm run test:website` at the root. Browser tests mock authentication and chain responses; a real two-phone SMS/signing rehearsal remains a separate check. Never turn a timeout into a claim that no money moved. Pending payments retain their original signature; inspect Activity/Explorer before starting a new payment.

SMS requires Node 24 and persistent writable storage at `SMS_STORE_PATH` (default `.data/nest-sms.sqlite`, ignored and owner-only). Do not deploy the SMS signer on ephemeral serverless storage. Privy account custom metadata is limited to 1 KB total; the signed transactions and daily SMS reservations are stored in SQLite instead. The database never stores wallet private keys.
