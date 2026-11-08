# Guard — iPhone and web preview

React Native + Expo SDK 58 + TypeScript + Expo Router. Upgraded from SDK 57 to match the Expo Go version installed on the team's iPhone. React Native, React, Router, and Expo modules are aligned with SDK 58.

**Protect what matters.** The latest styling uses bold amounts, a prominent keypad, and rounded pill controls inspired by the user-supplied Cash App screenshot.

The current UI follows the user's globe/wallet references: white surfaces, black text and globe artwork, blue accents, and a floating glass tab bar. The first launch opens the new sign-in screen; choose **Demo** to enter the sample wallet. Reopen the welcome screen from **You → Open sign-in screen**. Native Liquid Glass is used when the iPhone/build supports it; other platforms use a frosted fallback. Auth0 still needs tenant configuration and a native development/TestFlight build for actual iPhone sign-in.

The sign-in screen is now fully black, with the complete globe centered beneath the Guard tagline and **Demo** / **Sign in** pill buttons at the bottom. Its layout fits a 320 × 568 phone without cropping the globe.

The login globe now spins in 3D on a 45-second loop using Expo GL, which is included in Expo Go SDK 58. It pauses when the app is backgrounded or login loses focus. Reduce Motion shows the original static globe. The home globe stays static.

Animation verification: six browser flow checks passed, including rendered-frame motion, removal of the animation surface after navigation, and live Reduced Motion preference changes. TypeScript, lint, and the iOS JavaScript export passed. Physical-device animation performance has not been measured.

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

A **development or TestFlight build** can run Guard against the DAT backend in [`apps/api`](../api/HANDOFF.md). Expo Go and web always stay in demo mode, because Privy's Expo SDK needs native modules and doesn't support the web.

| Step | In live mode |
| --- | --- |
| Sign in | SMS code through Privy, which creates a self-custody Solana wallet |
| Balance | Real devnet USDC, refreshed every 4 seconds; incoming payments appear as "Money received" |
| Send | To any phone number. A number not on Guard yet gets a wallet waiting for its owner |
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

## What is still simulated

**In demo mode, all money movement is simulated.** Balances, transfers, family goals, and MXN rates are local sample data. No real wallet, on-chain transfer, bank account, card charge, or fiat partner is connected. Demo wallets start at $0; use Add to fund tests or Reset demo to start over. Request links open a payment review with the recipient phone number, amount, and note filled in; demo payments stay on the sender’s device. Web links use the current site address (localhost links require access to that server); Expo Go links require the running Expo server, and development/TestFlight links require Guard installed. Live requests use the signed-in phone number and require a live Guard build to send devnet USDC. Existing version-1 demo data resets once to the empty wallet; subsequent test funds persist. Live mode is described above.

Wallet custody and the actual corridor/provider remain team decisions. This first version intentionally does not decide those through hidden implementation assumptions.

## Auth0 category and setup

The sponsor category is **Best Use of Auth0**. OAuth is an authorization protocol; Auth0 is the provider named in the category. Actual Auth0 API/SDK usage is relevant to the category. A generic OAuth button or merely installing the package does not demonstrate an integration.

The native Auth0 SDK needs a **development or TestFlight build**, not Expo Go. Expo Go remains usable for all demo screens. Without configuration, the account screen explains that sign-in is not connected rather than fabricating a successful login.

1. Create a Native application in your Auth0 tenant for iOS. Use a separate Single Page Application for the web deployment if appropriate for your tenant configuration.
2. Copy `.env.example` to `.env` and enter the public domain/client ID for the target build. Never add a client secret, seed phrase, private key, or backend secret to an `EXPO_PUBLIC_` variable.
3. Keep the bundle identifier consistent with your App Store Connect record. Default: `com.projectmiami.lazo`. The custom URL scheme is `lazo`. These internal identifiers are retained from the original scaffold to preserve callbacks and existing signing setup; the display name, Expo slug, icon, and UI now use Guard.
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

Verification completed for this initial version: TypeScript and lint passed; seven domain tests and two phone-sized browser flow tests passed. Web and iOS JavaScript exports and iOS native prebuild succeeded. The iOS export is not a compiled/signed IPA, and no physical-device install or TestFlight upload has been verified. Phone/desktop screenshots are in `../../design/previews/`.

SDK 58 upgrade verification: Expo Doctor passed all 20 checks; TypeScript, lint, seven domain tests, three browser/manifest tests, the iOS JavaScript export, and regenerated iOS prebuild passed. The iPhone manifest explicitly advertises `sdkVersion: 58.0.0` and `runtimeVersion: exposdk:58.0.0`.

Globe/glass redesign verification: TypeScript, lint, all 20 Expo Doctor checks, four browser/manifest flow tests, and the updated iOS JavaScript export passed. Screenshots cover the globe sign-in screen, home, sending/review, family, a 320-point phone, and desktop web. Native glass appearance still needs a physical-device check; the browser screenshots show the frosted fallback.

## Files for teammates

- `src/app/`: Expo Router screens and navigation.
- `src/components/`: shared UI and amount keypad.
- `src/theme.ts`: Guard design tokens.
- `src/domain/wallet.ts`: pure demo arithmetic and validation.
- `src/state/WalletProvider.tsx`: local demo state/persistence.
- `src/services/auth.ts`: Auth0 native/web integration.
- `app.config.ts`: name, scheme, bundle identifier, conditional Auth0 plugin.
- `eas.json`: development, simulator, and store-distribution profiles.
- `../../DESIGN.md`: inspected reference sources and design decisions.

Keep new real-money integrations behind an explicit, separately tested gateway. Do not turn this demo ledger into a backend source of truth or a spend authorization mechanism.

### Dependency advisory status

The initial SDK 57 dependency tree reported 14 advisories, including three high-severity entries. After upgrading to SDK 58, npm reports 12 moderate advisories and no high or critical advisories. Review and resolve the remaining advisories before any production or real-money release; passing the functional checks is not security certification.
