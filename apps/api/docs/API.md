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
