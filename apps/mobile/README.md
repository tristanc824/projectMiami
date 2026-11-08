# Nest mobile and browser app

React Native, Expo SDK 58, TypeScript and Expo Router. The connected native app and website use the same Privy SMS accounts and Solana devnet wallets. All money in this demo is test USDC, with no real-world value.

## Start here

For the full website and connected browser app, follow [Website setup](../../README.md#website-and-browser-sending). Install dependencies in `apps/api`, `apps/mobile` and `web-earth`, configure the ignored API `.env.local`, then run `npm run website` at the repository root. Open **http://localhost:5175**; the app is under `/app`. Port 5184 is the API, not the consumer app.

For the local demo only:

```sh
cd apps/mobile
npm install
npm start
```

Scan the QR code in Expo Go for SDK 58, on the same Wi-Fi as the laptop. `npm run web` here also opens the standalone local demo. It does not enable browser wallet sign-in. A phone hotspot can help when venue Wi-Fi isolates devices.

## Connected native build

Copy `.env.example` to `.env` and configure `EXPO_PUBLIC_PRIVY_APP_ID`, `EXPO_PUBLIC_PRIVY_CLIENT_ID`, and `EXPO_PUBLIC_DAT_API_URL` to match the API. The API address must be reachable from the phone. Privy's app client must allow the bundle identifier `com.projectmiami.lazo` and URL scheme `lazo`.

Connected wallets, biometric approval and the system contacts picker require a rebuilt development/TestFlight app; Expo Go and an OTA JavaScript update cannot add native modules. `app.config.ts` is authoritative; native directories are generated and Git-ignored. The display name/icon are Nest while signing identifiers and the callback scheme are retained.

```sh
npm run build:development
# Or, with a provisioned local iPhone development environment:
npm run ios
```

The SDK 58 build compiles React Native and Expo modules from source to avoid a precompiled-header/linker mismatch. The Hermes compatibility plugin disables the unavailable native CDP debugger adapter in Debug only. Native iOS compilation and the real welcome screen are verified; physical SMS login, biometric enrollment/approval and system contacts still need a device rehearsal.

## Current connected behavior

| Feature | Status |
| --- | --- |
| Phone-number sign-in | Privy SMS, then a six-digit app PIN |
| Native payment approval | Fingerprint, face or app PIN; requires enrollment on supported hardware |
| Balance and receipts | Devnet USDC, four-second polling; confirmed history from actual token-account deltas |
| Send | Resolve a phone number to a wallet; explicit review and owner signature; network fees sponsored |
| Confirmation | Confirmed or pending, with the same transaction ID and Explorer link; pending is not proof of payment |
| Add money | Stripe test card, whole dollars up to the configured cap (default $1,000), limited by treasury supply |
| Scam check | Authenticated Swarms/Prune review of unfamiliar recipients; errors stop payment |
| Lock Nest | Server-enforced freeze for outgoing app/SMS payments; app PIN or protected biometric unlock |
| Trusted contact | Save another Nest user and call/text them; **contact-only recovery is not available** |
| Safe Holds | Deployed on devnet; real 24-hour deposit, full Undo refund and sender override verified |
| Bank payouts and card spending | Not connected; retained withdrawal screens are clearly labeled simulations |

Only confirmed successful prior sends make a number a previous recipient. Pending or failed attempts never bypass scam review. A payment already released on Solana cannot be undone. Safe Hold is deployed and its refund is verified; rehearse the physical-phone flow before judging; see [FAMILY_REVIEW.md](../../FAMILY_REVIEW.md).

The local demo retains savings/family sample screens and withdrawal simulations. They do not authorize live wallet operations. The connected build must not show sample contacts as real users. Currency examples in demo screens are illustrative, not live exchange quotes.

## Contacts and payment links

Saved names and photos stay on the device and are scoped to each wallet. Default avatars are blank; tap to choose/remove a picture. The native system contact picker requests permission and saves only the number the user confirms; it never uploads the address book. Contacts already function in this demo.

Receive and contact pages create payment-request links. Copy/share/text opens the relevant system UI without automatically sending a message. Links contain amount, recipient and note, never a signature or authorization. Opening one still requires sign-in, PIN and explicit payment approval.

Native sharing requires a public HTTPS `EXPO_PUBLIC_PAYMENT_URL`, such as the deployed app's `/app` URL. No public domain is configured yet, so native sharing remains disabled instead of generating a broken localhost/LAN link. The connected browser build uses its current origin when that setting is empty. Browser wallet login requires localhost or HTTPS.

## SMS payments

Users with the limited Nest server signer enabled can send/check balances by text with cellular service and no data. The app and replies show the configured per-payment/daily limits. SMS uses the API’s persistent local SQLite ledger for message IDs, signed transaction checkpoints and daily reservations. It needs Node 24 and persistent storage; ephemeral serverless SMS is not supported. SMS has a separate four-digit PIN; five wrong attempts turn it off. Lock Nest blocks SMS sends. A gateway message ID and a durable signed transaction checkpoint prevent webhook retries from creating a new payment. An unresolved payment retains its original signature; check Activity/Explorer before starting another.

A real gateway requires the httpSMS key, signing key and team Android phone, plus Privy signer/policy configuration in the API. Browser approval tests mock these integrations and do not establish that physical SMS delivery works at the venue.

## Checks

```sh
npm run typecheck
npm run lint
npm test
```

At the repository root, `npm run demo:check` reports read-only readiness; `npm run test:website` checks connected wallet flows with mocked authentication/payments; `NEST_TEST_REVIEW=true npm run test:website` checks review/hold flows with mocked chain responses. `npm run test:browser` here checks local-demo interactions/layouts. See [UX_AUDIT.md](./UX_AUDIT.md) for exact scope and remaining blockers.

The optional legacy Auth0 implementation is retained for compatibility; it is not the connected Nest wallet login and should not be used in the judging script. No private keys belong in public Expo variables, browser bundles, output or Git.

### Voice payments (submission build)

Open **Talk to Nest** from Home, or **Use voice** while preparing a send. Tap **Start speaking** and allow microphone/speech permissions. Try “Send one dollar to Alex” using a unique saved contact name, or say “Send one dollar” and enter the recipient’s number. Nest shows the transcript, reads the draft back, and opens the existing payment review. The normal PIN/biometric approval still applies. Unknown recipients still use Swarms/Prune review and the existing Safe Hold availability rules.

Voice payments support **English and Spanish**. Select English or Español before speaking. Recognition and readback use `en-US` or `es-MX`. Both support whole-dollar number words (including “fifty” and “cincuenta”); Spanish also accepts decimal commas such as `50,25`. Mixed spoken cents and ambiguous corrections require editing the transcript. Cancellation never sends a payment. A different spoken contact and entered phone cannot silently proceed. Recognition stops on exit/background or after 30 seconds. Typed input remains available when permission, network recognition or device support is unavailable.

No extra provider API key is needed. Audio is handled by the device/browser speech service; its provider may process audio. Nest forwards the transcript to the existing safety review. Contacts are matched locally; the address book is not uploaded. The website microphone needs a supported browser on HTTPS or localhost. For spoken replies on an iPhone, turn silent mode off.

`expo-speech-recognition` and `expo-speech` require a refreshed native development/TestFlight binary. An existing installed binary cannot gain these native modules through a JavaScript reload alone. Browser microphone event tests use a simulated speech recognizer; a person must still rehearse actual speech on the submission phone.

### Session approval behavior

Returning to a signed-in Nest session does not require Face ID or the app PIN. PIN creation remains part of first-time setup. Each send, Safe Hold action, freeze, biometric-setting change, trusted-contact change and own-profile edit still asks for approval. Explicit Lock Nest remains frozen until authenticated unfreezing; ordinary backgrounding does not freeze or lock the session. Expired approval grants are refreshed at the next protected action.

Spanish demo: choose Español, tap Empezar a hablar, say “Envía un dólar” or “Envía cincuenta dólares a [saved name]”, then review the visible amount/recipient. Six browser tests and 45 unit tests passed. Actual acoustic recognition still needs the quick phone rehearsal.

Public payment links are now configured with `EXPO_PUBLIC_PAYMENT_URL=https://nestbank.us/app`. The deployed request page and sign-in handoff were verified without sending money; see [public-link checks](../../audit/PUBLIC_LINKS.md).
