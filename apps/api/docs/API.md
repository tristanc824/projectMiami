# DAT backend API

The Next.js app in this folder is also the backend a mobile app can call. Deploy it first, for example to Vercel, and use its HTTPS address as the base URL. Native apps don't need CORS, so the routes work as they are.

## Authentication

Every `POST` route needs the user's Privy access token:

```
Authorization: Bearer <Privy access token>
Content-Type: application/json
```

On the web, the token comes from `getAccessToken()` in `usePrivy`. Privy's Expo SDK, `@privy-io/expo`, should offer the same, but this hasn't been checked. The server verifies the token against Privy's public keys, then looks up the user's Solana embedded wallet.

Errors always come back as `{ "error": "Readable message" }`, with a 4xx or 5xx status. Show `error` to the user.

## Routes

### `GET /api/balance?address=<solana address>`

No login needed. Returns `{ "balance": 19.98 }` in dollars of devnet USDC. The app polls this every 4 seconds and shows "You received" when the balance rises outside the user's own actions.

### `POST /api/recipient`

Body `{ "phone": "+15555550142" }`. US numbers can be sent as 10 digits.

Returns `{ "phone": "+15555550142", "address": "<wallet>", "invited": true }`. `invited: true` means the number wasn't on DAT yet, and a wallet was just created for it. The owner gets that wallet when they log in by SMS with that number. This is unverified.

Limits: 20 new numbers per user per hour. A user can't send to their own number.

### `POST /api/transfer/prepare`

Body `{ "recipient": "<wallet address>", "amount": "5.00" }` to send to a person, or `{ "toTreasury": true, "amount": "5.00" }` for cash-out and card payments.

Returns `{ "message": "<base64>", "lastValidBlockHeight": 123 }`. The message is a Solana transaction message: `Fee Payer` pays the fee, and the user's wallet must sign it.

### `POST /api/transfer/submit`

1. Decode `message` from base64.
2. Sign the raw bytes with the user's wallet using `signMessage`. On the web this is `wallet.signMessage({ message })`, which returns `{ signature }`.
3. Send `{ "message": "<same base64>", "signature": "<base64 signature>", "lastValidBlockHeight": 123 }`.

Returns `{ "signature": "<Solana transaction signature>" }`. The explorer link is `https://explorer.solana.com/tx/<signature>?cluster=devnet`.

The server only co-signs an exact USDC transfer from the logged-in user's wallet. Anything else is rejected, and there are tests for this in `test/core.test.mjs`. Limit: 30 transfers per user per hour.

### `POST /api/deposit/test-card`

Body `{ "amount": 10 }`, a whole number of dollars from 1 to `MAX_DEPOSIT_USD` (1000 by default). It charges Stripe's test card, then `Treasury` sends that much devnet USDC. Returns `{ "signature": "..." }`. This is the backup when Apple Pay isn't available.

### `POST /api/deposit/intent` and `POST /api/deposit/complete`

These are for Apple Pay through Stripe.

1. Call `intent` with `{ "amount": 10 }` to get `{ "id", "clientSecret" }`.
2. Confirm the payment with Stripe on the device. On the web this is the Express Checkout Element. In React Native, it would be Stripe's own Apple Pay support, which hasn't been tried.
3. Call `complete` with `{ "id" }`. The server checks the payment succeeded, belongs to this user, and wasn't already delivered, then sends the USDC.

Stripe refuses anything except test keys, so this can never charge a real card.

## Devnet values

| Item | Value |
| --- | --- |
| USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| `Treasury` | `67JSUvCsmtPz5phtFSobtGnmiN8zcwJUDCrJEZxRJRsu` |
| `Fee Payer` | `77m7HCt9N6VBCRiJi3WUUeL2QFbMtKmt9mdv6KbyYCCb` |
| RPC | `https://api.devnet.solana.com`, overridable with `SOLANA_RPC_URL` |

## Not built yet

- Text payments by SMS: the plan is in `docs/BRIEF.md`.
- A better simulated card tap screen.
- Transaction history from the blockchain. The web app keeps activity on the device.

## Text payments

People can send and check their balance by texting Nest's number from any phone with a cellular signal. No data is needed. The design is in `docs/BRIEF.md` under "Text payments design".

**How signing works.** In the app, the user adds Nest's server signer to their wallet with `useSigners().addSigners`. Privy's policy limits that signer to USDC transfers of $10 or less. The server then signs for them through Privy's wallet RPC, and Nest's fee payer covers the fee. The server enforces a $20 daily total. The PIN, on/off switch and daily total are stored in the user's Privy custom metadata, with the PIN salted and hashed.

### `GET /api/text-payments`

Returns `{ available, on, number, signerId, policyId, perPaymentCents, perDayCents }`. Pass `signerId` and `[policyId]` to `addSigners`, and show `number` as the number to text.

### `POST /api/text-payments`

Body `{ "on": true, "pin": "4821" }` after adding the signer, or `{ "on": false }`. Turning off in the app should also call `removeSigners`.

### `POST /api/sms`

The httpSMS webhook for the event `message.phone.received`. It checks the HS256 token signed with `HTTPSMS_WEBHOOK_SIGNING_KEY`, answers right away, and handles the text after responding. Texts that aren't commands are ignored and never stored.

| Text | What happens |
| --- | --- |
| `BAL 4821` | Replies with the balance |
| `SEND 2 5555550142 PIN 4821` | Sends $2 and texts both people. A number not on Nest gets a wallet, like `/api/recipient` |
| `HELP` | Lists the commands |
| `STOP` | Turns text payments off until they're turned on again in the app |

Five wrong PINs in a row turn text payments off.

### Setup

1. `node scripts/setup-text-payments.mjs` creates the signer and policy and saves them to `.env.local`.
2. `node scripts/test-text-signing.mjs` checks, with a throwaway wallet, that the server can send and that the policy refuses an $11 payment. Then `npx tsx scripts/test-text-flow.mts` runs every command against a throwaway sender, prints the replies, and cleans up.
3. Put the Android's number in `TEXT_PAYMENTS_NUMBER`. In httpSMS, add a webhook to `https://<server>/api/sms` for `message.phone.received` with a signing key, and save that key as `HTTPSMS_WEBHOOK_SIGNING_KEY` and the API key as `HTTPSMS_API_KEY`.
4. To test without a phone, leave `HTTPSMS_API_KEY` empty, run `npm run dev`, then `node scripts/fake-text.mjs +13055550142 "BAL 4821"`. Replies print in the server window.


## App PIN and funding availability

After phone verification and wallet creation, `GET /api/account/pin` reports `{configured, sessionValid}`. `POST /api/account/pin` accepts `{action: "create"|"verify"|"change", pin, currentPin?}`. PINs must be six digits. Change requires the old PIN; create refuses to replace an existing PIN. The server stores salted scrypt hashes in Privy custom metadata, tracks wrong attempts, and locks PIN attempts for five minutes after five failures. Success returns a signed, wallet-bound, versioned 12-hour `{ticket, expiresAt}` grant. Transfer prepare/submit, deposit intent/test-card/complete, and hold mutations require this grant in `x-nest-pin` alongside the Privy bearer token. Changing the PIN invalidates older grants. The PIN itself never goes into device storage. Native grants use SecureStore; browser grants use sessionStorage. Lock/sign-out deletes the local grant. Existing text-payment and on-chain hold release PINs remain separate.

`GET /api/deposit/status` requires bearer authentication and returns `{maxDepositDollars, availableDollars, fundingWallet}`. The UI blocks deposits above the available whole-dollar treasury funding. The test-card route creates an unconfirmed intent with a stable idempotency key, checks funding before confirming it, and resumes already-paid intents without another card charge; the client-secret route preflights funding before creation. supply can still change concurrently, so fulfillment also checks funding. Raising `MAX_DEPOSIT_USD` does not create test USDC. The demo uses Circle's devnet USDC mint; replenish the public treasury wallet using Circle's faucet or an existing devnet token source. RPC errors are surfaced as errors rather than zero balances.


Payment retries reuse one operation reference per draft. The browser/native transfer adapter retains the prepared message and user signature across a failed submit, and the server checks the deterministic Solana transaction signature before rebroadcasting. Card deposits use Stripe idempotency keys for intent creation/confirmation. Fulfillment coalesces concurrent requests and checkpoints one signed funding transaction into intent metadata (450-character chunks) before sending. A lost chain response or failed final metadata write retries the same bytes, including after a backend restart. Confirmed transactions return their existing signature. An expired unresolved transaction needs manual investigation; the service does not replace it with another debit.

The balance endpoint includes integer `balanceCents`, truncated from token base units so “use available balance” never rounds sub-cent dust into an unspendable cent. `/api/activity` retains incoming `payments` and adds `outgoing` as a separate field for compatibility. Both are based on confirmed token-account deltas and preserve the real chain signature; a balance drop alone is never labeled as an SMS payment.


### Account security

`GET /api/account/security` (bearer authentication) returns `frozen`, the user's saved `trustedContact` (`name`, `phone`, or null), and `recoveryAvailable: false`.

`POST /api/account/security` requires bearer authentication and the current `x-nest-pin` grant. Actions:

- `freeze`: persists `nest_frozen`; returns a random one-time `unlockToken` only on the transition into the frozen state. Its SHA-256 hash is stored server-side. The mobile app retains the token only in biometric-protected SecureStore when biometrics are enabled.
- `unfreeze`: while frozen, additionally requires the matching `unlockToken`. It clears the token hash. The alternative is fresh app-PIN verification with `unlock: true` at `/api/account/pin`, which also clears the freeze and token hash.
- `trusted-contact`: `name` (1–60 characters) and normalized `phone`; the contact must already have a different Nest account. Saves their stable Privy user ID alongside the display fields. Rejected while frozen.
- `remove-trusted-contact`: clears the contact. Rejected while frozen.

Payment authorization returns HTTP 423 with `code: NEST_LOCKED` for a frozen account, regardless of an existing valid PIN session. Both native/browser gates react to this code. SMS SEND also checks the freeze, including immediately before broadcast. Account recovery is not enabled by saving a contact.


### Pending confirmation and status

Transfer preparation includes `transactionSignature`, the prospective fee-payer signature for the exact prepared message. Submission verifies the owner's signature. Ambiguous confirmation returns HTTP 202 with `{ status: 'pending', signature, lastValidBlockHeight, message }`, preserving that same transaction reference. Never interpret this as a confirmed payment or create new signed bytes to retry. The shared broadcaster refuses a non-devnet genesis hash.

`POST /api/transactions/status` requires bearer authentication, but no new payment approval. Its body is `{ transactions: [{ signature, kind, amountCents, lastValidBlockHeight }] }`, with at most 20 items and kind `send`, `withdraw` or `add`. It returns pending/confirmed/failed/expired states. Confirmed state requires the correct wallet's associated token account, mint and exact token delta. Missing parsed data remains pending. Expiry is checked against finalized block height and a history-enabled signature lookup. Requests coalesce in flight and cache for three seconds.

`GET /api/activity` also returns `pendingPayments` for an unresolved SMS checkpoint. Settled SMS checkpoints are reconciled conditionally so an older read cannot erase a newer payment. Outgoing app authorization rejects an unresolved SMS payment with `PAYMENT_PENDING`.

SMS gateway requests require a stable `message_id`. The laptop demo serializes work per sender and stores signed bytes before broadcast in a local persistent SQLite ledger, retaining processed message IDs. Atomic reservations enforce the daily allowance and one active payment per account. Unknown confirmation keeps reserved daily spending and the original signature. A retry uses the same signed bytes. A fresh command cannot start another SMS payment while the previous one is unresolved.


### Persistent SMS ledger

Node 24 is required by the API. `SMS_STORE_PATH` defaults to ignored `.data/nest-sms.sqlite`. SQLite uses owner-only file permissions, WAL journaling and synchronous durable commits. A stable owner/message ID is unique, and a partial unique index permits one preparing/pending payment per owner. Daily usage includes reserved and confirmed payments. Existing Privy daily usage is seeded once for compatibility. Failed or expired unsigned work frees its reservation; a stale preparation lease cannot save a checkpoint or reach broadcast.

Do not run SMS payments on an ephemeral serverless filesystem. This implementation refuses SMS store creation under Vercel. Normal app transfers remain available without an SMS database. Moving SMS hosting requires a persistent disk/shared durable store design. Privy custom metadata has a [1 KB total limit](https://docs.privy.io/user-management/users/custom-metadata); it stores small account settings, not signed transaction payloads.
