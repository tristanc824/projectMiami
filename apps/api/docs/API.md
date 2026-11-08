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

Body `{ "amount": 10 }`, a whole number of dollars from 1 to `MAX_DEPOSIT_USD` (20 by default). It charges Stripe's test card, then `Treasury` sends that much devnet USDC. Returns `{ "signature": "..." }`. This is the backup when Apple Pay isn't available.

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
