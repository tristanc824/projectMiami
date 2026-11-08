# Nest

SharkByte hackathon project. **Nest**: a dollar account for anyone with a phone, on Solana. *Protect what matters.* The mobile app now follows the Nest mockups and website. See APP_HANDOFF.md.

## Family transfer review and hold

The review API with the Watchdog's typo checks (`python app.py`, JSON only), the Swarms review and
Prune gate (`swarm/`), and the devnet family hold (`node hold/hold.mjs`): see [FAMILY_REVIEW.md](./FAMILY_REVIEW.md).

## Run the iPhone / web preview

The app is in [`apps/mobile`](./apps/mobile/README.md), built with React Native / Expo. It uses clearly labeled local demo funds. Expo Go provides the local demo. Connected wallets and biometric approval require a development/store build.

```sh
cd apps/mobile
npm install
npm start
```

Use `npm run web` in the same directory for the shared web app.

The backend is in [`apps/api`](./apps/api/HANDOFF.md): a Next.js API with Privy SMS login, self-custody Solana wallets, sponsored devnet USDC transfers, and Stripe test-mode deposits. A development build can use it for real devnet money; see "Live mode" in the mobile README. Secrets go in `apps/api/.env.local` and are never committed. See the mobile README for Privy SMS login, signing, EAS, and TestFlight instructions.

- [DESIGN.md](./DESIGN.md) — Current Nest app design system, screen map, and implementation limits.

**Start here if you're building the app:** [APP_HANDOFF.md](./APP_HANDOFF.md). It has the brand, features, copy rules and the 16 app screens ([`app-design/nest-app-screens.html`](./app-design/nest-app-screens.html), open in a browser).

- [PITCH_PLAYBOOK.md](./PITCH_PLAYBOOK.md) — the angle, selling points, 3-minute table script, 30-second opener, Q&A prep and 90-second demo video. Fill in section 0 before the first judge.
- [`web-earth/`](./web-earth) — the website. `npm install && npm run dev` → http://localhost:5175
- [TEAM_PROMPTS.md](./TEAM_PROMPTS.md) — what to build, which questions are still open, and the prompts to paste into Cursor or Claude.
- [HACKATHON_CONTEXT.md](./HACKATHON_CONTEXT.md) — research, sources, and the planning record. Read this before changing product direction.
- [PITCH_RESEARCH.md](./PITCH_RESEARCH.md) — real problems with sources, the judging angle, winning projects, and the live demo and video plan.
- [ECONOMIC_PROBLEMS.md](./ECONOMIC_PROBLEMS.md) — the 12 global money problems Nest solves, with sources, and which three to lead the pitch with.
- [INSTITUTIONS_RESEARCH.md](./INSTITUTIONS_RESEARCH.md) — problems for banks, governments, aid agencies and businesses, the "Nest for Institutions" product map, and market size.
- [BLOCKCHAIN_STACK.md](./BLOCKCHAIN_STACK.md) — the Solana stack to build with (verified Nov 7), the architecture, devnet pitfalls, and the integrations that impress judges.
- [UI_INSPIRATION.md](./UI_INSPIRATION.md) — lessons from Zander Whitehurst's 30 most-viewed UI reels.
- [NEST_FEATURES.md](./NEST_FEATURES.md) — which features to build, the prize stack, the "massive potential" vision, and the app UI direction.

## Website and browser sending

Use Node.js 24.12, the version verified with this project. From a fresh checkout, install all three applications first:

```sh
npm --prefix apps/api install
npm --prefix apps/mobile install
npm --prefix web-earth install
```

Copy `apps/api/.env.example` to `apps/api/.env.local` and configure the server credentials locally. Set `SOLANA_RPC_URL` to a dedicated **devnet** RPC if available; the public fallback can be rate-limited. The examples include the Circle devnet `USDC_MINT` and `MAX_DEPOSIT_USD=1000`. Never publish RPC URLs containing provider keys.

Run `npm run website` from the repository root. This starts the API on port 5184 if needed, exports the connected web app, and opens the website server on port 5175. Visit **http://localhost:5175**, then choose **Log in** or **Open an account**. Nest opens at `/app/sign-in` and uses the same Privy phone account and Solana devnet wallet as the native app. Transfers require a review and wallet signature.

The website proxies `/api` to the local API, so browser transfers do not depend on a hardcoded LAN address or cross-origin permissions. Browser wallets require localhost or HTTPS; an HTTP LAN IP on an iPhone is not a secure browser-wallet origin.

The build reads the public Privy app ID from `apps/api/.env.local` (falling back to the mobile public ID) and checks it matches mobile. Backend secrets remain in the API. After changing app screens, run `npm run build:web-app` and reload the website. Marketing changes still hot reload. `npm run build:website` builds both parts; `npm run website:preview` previews that build with the local API proxy.

`npm run test:website` runs isolated browser login, signing, payment, failure, and request-link tests with mock authentication and mocked API responses. Its export is separate from the real website, and its fake token is never accepted by the real API. Real SMS verification and a user-approved devnet transfer still need a manual account check. Balances are shared through the wallet; activity and contact names remain local to each browser/device. Apple Cash and bank delivery remain simulated.

Payment sharing uses HTTPS links into `/pay`. Set `EXPO_PUBLIC_PAYMENT_URL` to the deployed website app URL (for example, `https://your-domain/app`) before building the native app. Browser builds use their current origin and app base path when this setting is empty. Native sharing stays disabled without a public address; Expo Go/LAN links are not shared as production links. Contact pages offer Create payment link, and Receive offers Share, Copy, and Send link to a contact. Links carry review details only; login, app PIN, and an explicit payment confirmation are still required.

Phone contacts are optional in iOS/Android builds: choose a person with the system picker, then confirm the number to save locally. The contact list is never uploaded. Web users can enter numbers and use their Nest contacts. The new `expo-contacts` module requires rebuilding/reinstalling the native app; an OTA JavaScript update alone cannot add it.

Before rehearsing on phones, run `npm run demo:check`. This read-only check verifies matching Privy IDs, the configured native API address, devnet balances, the fee payer, and Safe Hold deployment, without printing credentials or moving funds. Public payment sharing requires a deployed `EXPO_PUBLIC_PAYMENT_URL`; a LAN API address must match the laptop’s current Wi-Fi address and phones must be on the same network. The audit fixed a stale local address; changing networks later requires updating that public setting again.

iOS builds use `expo-build-properties` to compile React Native and Expo modules from source because the current precompiled Core/library combination failed to link in Debug. This increases native build time while keeping generated builds consistent with the installed headers.

The SDK 58 Hermes Debug compatibility plugin disables only the unavailable native CDP adapter; native JavaScript debugger attachment is limited until the upstream Hermes binary is corrected. The app runtime and production build keep their existing behavior. The native audit build and native welcome screen pass; physical SMS, signing, and contact permission still require a properly provisioned device rehearsal.


## Current judging status

The connected app has SMS sign-in, an app PIN, test-card funding, phone-number transfers, transaction references, scam-review integration, Lock Nest, and native fingerprint/face approval with PIN fallback. Safe Hold is deployed on devnet; real 24-hour deposit, full Undo refund and sender override are verified. See [transaction proofs](./audit/hold-devnet-proof.json). Do not describe an instant payment as reversible. Trusted contacts can be saved and called/texted; contact-only wallet recovery is not connected. See [FAMILY_REVIEW.md](./FAMILY_REVIEW.md) and [the interaction audit](./apps/mobile/UX_AUDIT.md).

A public HTTPS deployment has not been configured. Rehearse on the laptop at `http://localhost:5175`; do not share a localhost link with judges as a public app. Native payment links require `EXPO_PUBLIC_PAYMENT_URL`. Never replace this with an invented domain.

The SMS signer needs persistent local storage. `SMS_STORE_PATH` defaults to ignored `apps/api/.data/nest-sms.sqlite` when the API runs from its folder. Signed transaction checkpoints and daily reservations stay there, outside Privy’s 1 KB account-metadata limit. This local store is intended for the laptop/persistent-server demo, and SMS store creation is refused on ephemeral Vercel functions. No additional API key is needed for the local ledger.
