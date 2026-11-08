# Nest — mobile and web app

React Native + Expo SDK 58 + TypeScript + Expo Router.

The app is redesigned around the supplied [Nest mockups](../../app-design/nest-app-screens.html) and [website](../../web-earth/): warm cream, moss green, bundled Figtree fonts, the Nest ring mark, meadow photography, and flat pill controls. [DESIGN.md](../../DESIGN.md) describes the implementation and its limits.

The primary tabs are **Home, Save, Security, You**. Send starts with recipient selection and ends with a review sheet. Receive generates a real scannable QR request link. Activity and the retained family requests are full screens accessible from You.

**Demo** opens a local wallet starting at $0; use Add to try payments. Savings goals reserve part of the demo balance, persist on the device, and release funds back to the available balance. Live savings are disabled. Security protections shown in the mockups are labeled as previews until connected; existing Auth0 / Privy sign-in is preserved. Completed devnet transfers cannot be undone.

The app display name and icons are Nest. Existing signing identifiers, callback scheme (`lazo`), API contracts, and storage keys are preserved for compatibility. A native build must be regenerated/rebuilt to pick up its installed display name and icon.

## Withdraw, contacts, and keyboard improvements

Withdraw offers Bank account and Apple Cash, both using the same Nest account balance. Local demo withdrawals deduct the amount and example fee, excluding reserved savings. Connected withdrawals return test USDC to the demo treasury through the existing devnet cash-out flow. Apple Cash and bank delivery remain simulated. Receipts identify the destination, devnet transaction when applicable, and payout status.

Save private names for recipients from Send, receipts, or You → Saved contacts. Previous recipients appear in Send again; saved names work in payment review, receipts, and activity search. Contact books are local and separate for demo mode and each connected wallet.

Forms, sign-in, and bottom sheets adjust for the native keyboard and scroll the focused field into view. A Done toolbar dismisses numeric keyboards. The custom amount keypad yields while typing phone numbers or notes. [UX_AUDIT.md](./UX_AUDIT.md) records the fixes and verification limits.

## Get it on your iPhone tonight

From the repository root:

```sh
cd apps/mobile
npm install
npm start
```

Install Expo Go on the iPhone, put the phone and Mac on the same network, and scan the terminal QR code with the iPhone camera. This runs the full demo without an Apple upload or signing step. `npm start` explicitly selects Expo Go despite the included development-client package.

After an SDK upgrade, restart Metro with `npm start -- --clear`, close and reopen Expo Go, and scan the current QR again. The project now requires Expo Go for SDK 58.

If the venue network isolates devices, try your own hotspot. A tunnel requires network access and an additional tunnel dependency; it is not assumed to be installed.

For web:

```sh
npm run web
```

The shared screens run in the browser as well. This is the app experience, not a separate marketing website.

The authoritative Expo configuration is `app.config.ts`; generated native folders are intentionally ignored by Git. Original icon assets can be regenerated with `npm run assets`.

## What works

- Home balance, family-request cards, four-tab navigation.
- Amount keypad, recipient phone entry, notes, review, and confirmation.
- Add-funds and withdrawal simulations.
- Exact integer-cent balance arithmetic, insufficient-balance validation, and duplicate-reference protection.
- Family contributions with overfunding checks.
- Receipts with honest local/on-chain/provider/payout status separation.
- Activity search and filters.
- Local demo persistence and explicit reset.
- Share/copy sample requests and receipts.
- Auth0 native and web sign-in code, activated with your configuration.

## Live mode: real devnet wallets

A **development or TestFlight build** can run Nest against the DAT backend in [`apps/api`](../api/HANDOFF.md). Expo Go and web always stay in demo mode, because Privy's Expo SDK needs native modules and doesn't support the web.

| Step | In live mode |
| --- | --- |
| Sign in | SMS code through Privy, which creates a self-custody Solana wallet |
| Balance | Real devnet USDC, refreshed every 4 seconds; incoming payments appear as "Money received" |
| Send | To any phone number. A number not on Nest yet gets a wallet waiting for its owner |
| Add | Stripe **test** card (whole dollars, up to $20), then real devnet USDC from the treasury |
| Withdraw | Real USDC back to the treasury; the bank payout is **simulated** |
| Receipt | Transaction signature and a Solana Explorer link |

Family goals stay sample data. Network fees are paid by the backend's fee payer, so users hold no SOL.

Setup:

1. Deploy `apps/api` (for example to Vercel with the root directory set to `apps/api`) with the values from its `.env.example`. Get them privately from the project owner.
2. In the Privy dashboard (the same app as `apps/api`), add an app client under **Configuration > App settings > Clients**. Add the bundle identifier `com.projectmiami.lazo` as an allowed app identifier and `lazo` as an allowed URL scheme.
3. Fill in `EXPO_PUBLIC_PRIVY_APP_ID`, `EXPO_PUBLIC_PRIVY_CLIENT_ID` and `EXPO_PUBLIC_DAT_API_URL` in `.env` (see `.env.example`), then make a development build as below. Live mode turns on only when all three are set.

For Xcode testing, add the three public `EXPO_PUBLIC_*` live settings above to `apps/mobile/.env` and restart Metro. Both people must use the same Privy app and backend and sign in using their respective phone numbers. A send resolves the recipient’s verified phone number to their wallet; their balance refreshes every four seconds while the app is open and on login. Without these settings, an Xcode build runs the local demo, which cannot credit another device.

In live builds, **Sign in** uses Privy's SMS login instead of Auth0. **Demo** still opens the sample wallet.

Not yet verified on a device: the format of Privy's Expo signature (the app accepts base64 or base58), and whether a person who was sent money before signing up can use that wallet after SMS login.

### Send without data (text payments)

People can send money and check their balance by texting Nest's number from any phone with a cellular signal, with Wi-Fi and data off. The server side is built and tested on devnet. See "Text payments" in [`apps/api/docs/API.md`](../api/docs/API.md).

| Text to Nest's number | What happens |
| --- | --- |
| `SEND 5 5555550142 PIN 4821` | Sends $5 and texts both people |
| `BAL 4821` | Replies with the balance |
| `HELP` | Lists the commands |
| `STOP` | Turns text payments off until they're turned on again in the app |

Limits: $10 per payment (enforced by a Privy policy) and $20 a day (enforced by the server). Five wrong PINs turn it off.

**Already done:** the server code, the Privy signer and policy, and the demo Android gateway. The gateway is a phone with an eSIM running httpSMS, which forwards texts to the server.

**For the app team:**

1. Do the live mode setup above: the Privy app client, the three `EXPO_PUBLIC_` values in `.env` (get `EXPO_PUBLIC_DAT_API_URL` and the Privy app ID from the project owner), and a development build.
2. Install the build on each demo phone and sign in with its phone number.
3. Go to **You → Send without data**, choose a 4-digit PIN, and tap **Turn on text payments**. This gives Nest's server a limited signer for that wallet. The screen then shows the number to text.
4. Test it: turn off Wi-Fi and cellular data, then text `BAL` and the PIN to that number. A reply should come back within about 10 seconds.

Payments sent by text appear in the app's Activity as "Sent by text message" the next time the app is online. The app's part is only the one-time setup. Texting works from any phone after that, even without the app.

Not yet verified on a device: turning it on from the app (`useSigners().addSigners` for a Solana wallet).

## What is still simulated

**In demo mode, all money movement is simulated.** Balances, transfers, family goals, and MXN rates are local sample data. No real wallet, on-chain transfer, bank account, card charge, or fiat partner is connected. Demo wallets start at $0; use Add to fund tests or Reset demo to start over. Request links open a payment review with the recipient phone number, amount, and note filled in; demo payments stay on the sender’s device. Web links use the current site address (localhost links require access to that server); Expo Go links require the running Expo server, and development/TestFlight links require Nest installed. Live requests use the signed-in phone number and require a live Nest build to send devnet USDC. Existing version-1 demo data resets once to the empty wallet; subsequent test funds persist. Live mode is described above.

Wallet custody and the actual corridor/provider remain team decisions. This first version intentionally does not decide those through hidden implementation assumptions.

## Auth0 category and setup

The sponsor category is **Best Use of Auth0**. OAuth is an authorization protocol; Auth0 is the provider named in the category. Actual Auth0 API/SDK usage is relevant to the category. A generic OAuth button or merely installing the package does not demonstrate an integration.

The native Auth0 SDK needs a **development or TestFlight build**, not Expo Go. Expo Go remains usable for all demo screens. Without configuration, the account screen explains that sign-in is not connected rather than fabricating a successful login.

1. Create a Native application in your Auth0 tenant for iOS. Use a separate Single Page Application for the web deployment if appropriate for your tenant configuration.
2. Copy `.env.example` to `.env` and enter the public domain/client ID for the target build. Never add a client secret, seed phrase, private key, or backend secret to an `EXPO_PUBLIC_` variable.
3. Keep the bundle identifier consistent with your App Store Connect record. Default: `com.projectmiami.lazo`. The custom URL scheme is `lazo`. These internal identifiers are retained from the original scaffold to preserve callbacks and existing signing setup; the display name, Expo slug, icon, and UI now use Nest.
4. For that default identifier, add this exact callback URL **and logout URL** to the Native application, substituting your real domain:

```text
lazo://YOUR_DOMAIN/ios/com.projectmiami.lazo/callback
```

5. For web, allow your actual web origin as the callback/logout URL and allowed web origin (for local development, normally `http://localhost:8081`; include `http://127.0.0.1:8081` if you use it). Use the SPA client ID for the web build's environment.
6. Rebuild the native app after configuring the domain or changing its scheme/bundle ID. The Auth0 config plugin is only activated when a domain is configured.

Native credentials are handled by Auth0's Credentials Manager; web credentials use the Auth0 SPA SDK's memory cache. The demo ledger in AsyncStorage contains no credentials. Live sign-in cannot be verified without your tenant configuration.

Official references: [Auth0 Expo quickstart](https://auth0.com/docs/quickstart/native/react-native-expo), [Auth0 React Native SDK](https://github.com/auth0/react-native-auth0).

## Signed development build

```sh
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:development
```

EAS `development` distribution is an ad hoc development build, not internal TestFlight. Register your phone when prompted. Then start Metro with:

```sh
npm run dev-client
```

The `simulator` profile is for an iOS Simulator, not a physical phone.

## TestFlight

Confirm the final bundle identifier, account, and App Store Connect record before starting a signed upload. Link the app to your own EAS project; do not invent a project ID.

```sh
npm run build:ios
npm run submit:ios
```

These use the `testflight` profile with **store distribution**. They require your Apple/Expo credentials and account configuration; no signed upload has been performed by this scaffold.

After Apple processes the build and any required compliance answers, add it to an internal TestFlight group. External testing/public links require Apple's beta review. Do not confuse EAS `distribution: internal` with internal TestFlight.

Export compliance is not automatically declared exempt here. Answer it accurately for the final binary; re-evaluate when wallet/cryptography libraries are added.

Official references: [Expo TestFlight guide](https://docs.expo.dev/submit/testflight), [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/).

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run export:web
npm run export:ios
npm run test:browser
```

Browser tests use installed Google Chrome and a localhost Expo server. The Node/browser processes need local IPC/socket access. They check the end-to-end demo flow; they do not test a Solana transaction, bank payout, or unconfigured Auth0 tenant.

## Files for teammates

- `src/app/`: Expo Router screens and navigation.
- `src/components/`: shared UI and amount keypad.
- `src/theme.ts`: Nest design tokens.
- `src/domain/wallet.ts`: pure demo arithmetic and validation.
- `src/state/WalletProvider.tsx`: local demo state/persistence.
- `src/services/auth.ts`: Auth0 native/web integration.
- `app.config.ts`: name, scheme, bundle identifier, conditional Auth0 plugin.
- `eas.json`: development, simulator, and store-distribution profiles.
- `../../DESIGN.md`: inspected reference sources and design decisions.

Keep new real-money integrations behind an explicit, separately tested gateway. Do not turn this demo ledger into a backend source of truth or a spend authorization mechanism.

### Dependency advisory status

The initial SDK 57 dependency tree reported 14 advisories, including three high-severity entries. After upgrading to SDK 58, npm reports 12 moderate advisories and no high or critical advisories. Review and resolve the remaining advisories before any production or real-money release; passing the functional checks is not security certification.
