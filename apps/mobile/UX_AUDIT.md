# Nest interaction audit


## Settings, personalization, and transfer polish

- Settings now groups Appearance, Money, People, and Account. About Nest and Demo tools are collapsed, duplicate sign-in actions are removed, and demo reset keeps its confirmation. Connected wallets do not show the demo reset action.
- All avatars start with a blank person icon instead of stock portraits. Tap the camera on your profile or a contact’s detail page to choose or remove a photo. Your display name and photos persist on this device and are scoped separately to demo mode and each connected wallet. Contact photos follow the phone number across recipient selection, sends, and receipts.
- Amount entry reserves space for the actual font and native input padding, uses tabular digits, normalizes leading zeroes, and keeps rapid keypad taps in order. Stress checks cover `50`, double taps, decimal limits, deletion, and `99999.99` in Add, Withdraw, and Send at 320px, 390px, and desktop widths. Browser glyph measurements confirm that the full amount fits.
- Completed sends and top-ups get an expanding pulse and spring check, with success haptics on supported devices. Reduced-motion settings skip movement. Historical receipts do not replay the celebration after reload.
- New connected-wallet balance increases show a dismissible “Money just landed” banner that opens the receipt. Detection now uses authenticated confirmed-transaction history on a separate four-second poll, not an inferred net balance change. Each incoming receipt includes its actual Solana signature. Previously stored receipts do not trigger a new alert on login or reload.
- Confirmed transfers show their receipt and update the displayed balance without waiting for a second balance request. Reads run in the background, overlapping polls are suppressed, stale reads cannot overwrite a newer transfer or another wallet, and balance reads have a ten-second timeout. Money movement is never automatically retried. A new payment can proceed while a previous balance read is settling.

Photo selection uses the SDK-compatible `expo-image-picker` module. Existing custom native builds need rebuilding to include it; the module loads on demand so older builds can still open Settings. Web photo upload, persistence, and removal are automated; the system iPhone photo picker and haptic feel still require a device check.

## Delivered behavior

- Withdraw offers Bank account and Apple Cash destinations. Both destinations use the same Nest account balance. Local demo withdrawals update the local ledger; connected withdrawals return test USDC to the demo treasury. Apple Cash and bank payouts remain simulated.
- Both demo withdrawal destinations include their destination on stored activity and receipts. Receipts show no payout was initiated. The example withdrawal fee is included before confirmation.
- Use available balance excludes money reserved in savings and accounts for the example fee.
- Save, edit, or remove a private contact name from Send, a payment receipt, or Saved contacts in You. Names persist on this device and are stored separately for demo mode and each connected wallet.
- Send again appears on payment receipts. Recipient selection includes previous recipients, payment counts, saved names, and name/phone search. Repeat payment starts at zero and still requires amount entry and confirmation.
- Saved names appear in activity, activity search, receipt headings, and payment review. Renaming never changes the recipient's phone number or sends the saved name to the backend.

## Issues found and addressed

| Issue | Change |
| --- | --- |
| Keyboard could cover fields or a bottom sheet | Shared keyboard avoidance on screens, sheets, and sign-in; scroll focused fields into the available area. |
| Numeric keyboards had no reliable dismissal control | Native Done typing toolbar and interactive dismissal on iOS. |
| Amount keypad took up space while typing a phone or note | Hide it during text entry; restore it after leaving the field. |
| Automatic browser scrolling dismissed the focused field | Web scrolling keeps keyboard dismissal disabled; native scrolling keeps platform-specific dismissal. |
| Fixed tab bar could overlap a native keyboard | Hide tabs while the native keyboard is open. |
| Recent-recipient search was case-sensitive | Match names regardless of capitalization and phone numbers with or without formatting. |
| Recipient deduplication could be affected by non-send activity | Build recipient history from sends only, deduplicated by normalized number. |
| A repeated payment could reuse an amount too easily | Send again prefills only the recipient; amount starts at zero. |
| Withdrawals could be confused with successful bank delivery | Explicit destination, demo/test confirmation, fee, and not-initiated payout status. |
| Switching accounts could show another contact book | Scope contact storage and loaded state to the wallet address; keep demo storage separate. |
| Editing a contact in another sheet could create nested native modals | Dedicated contact detail screen with a single name-edit sheet. |
| Long detail labels could crowd values | Allow both columns to wrap and constrain the value column. |

## Verification scope

Automated browser flows cover funding, both withdrawal destinations, receipts, balance persistence, savings reservations, fee-aware maximum withdrawal, contact naming/editing, repeat payments, activity search, international phones, request links, reset, appearance, goal sheets, and narrow/desktop layouts. Focused-field checks use a short viewport to represent the space available above a keyboard; these are not physical iPhone keyboard tests.

TypeScript, lint, local wallet/contact unit tests, backend unit tests, and iOS/web JavaScript exports are checked separately. Live SMS login, a physical iPhone keyboard, device biometrics, a signed native build, actual Apple Cash/bank payouts, and real-money transfers are outside the automated browser verification. No real payout or live transfer is performed by the audit.

## Results

Latest pass: 20 mobile unit tests, 24 mobile-browser flows, 6 isolated connected-wallet browser flows, TypeScript, lint, and iOS/web JavaScript exports. The wallet flows include two consecutive sends with balance reads deliberately stalled, rejected transfers, sign-in restoration, and incoming-payment alerts. Profile upload/removal was rechecked after switching the picker to load on demand. Settings and success-receipt screenshots were visually inspected. The connected-wallet tests mock authentication and payment responses; they do not measure actual devnet transaction latency. The local connected website export was rebuilt with the final changes.

Physical iPhone keyboard behavior still requires a device check; browser viewport tests and native exports do not establish that.

## Apple Cash integration boundary

Apple Cash remains a demo until an eligible payout processor is configured. The existing API only transfers test dollars on Solana devnet. Selecting Apple Cash uses the same account balance as bank withdrawal. In connected mode, confirmation explicitly returns test USDC to the demo treasury and records the Apple Cash destination; the payout and animation are simulations, not Apple Pay authorization or Apple Cash delivery. Apple documents processor-backed disbursements in [Transfer Funds with Apple Pay](https://developer.apple.com/videos/play/wwdc2023/10114/).

## Run

From `apps/mobile`, start a web preview and run:

```sh
npm run typecheck
npm run lint
npm test
NEST_TEST_PORT=8088 npm run test:browser
npm run export:web
npm run export:ios
```

The test port is configurable so checks do not interrupt the native development server. UX screenshots can be refreshed with `NEST_PREVIEW_URL=http://127.0.0.1:8088 node scripts/capture-ux.mjs` while that preview is running.

## Recipient transaction references

The original sender path saved the signature returned by submission, while the recipient path only inferred a credit from a balance increase. Incoming activity now comes from `GET /api/activity`, scoped to the authenticated wallet’s USDC associated token account. The server reads confirmed signatures and token-balance changes; failed transactions, other tokens, and other owners are excluded. Parsed transactions are cached, concurrent reads are coalesced, and temporarily unindexed transactions are retried.

The current lookup backfills the latest 20 transactions involving that token account; the app keeps up to 50 local activity records. Older inferred receipts are repaired when the amount and time match one unambiguous chain credit. New receipts use signature-based IDs, survive reloads, and do not duplicate card deposits or refunds recorded locally. Both sender and recipient receipts offer Copy transaction ID and View on Solana Explorer. Initial history sync does not replay old incoming-payment celebrations.

Verified with backend parsing/cache tests, local merge/backfill tests, and authenticated browser flows covering incoming notification, exact signature copying, Explorer availability, persistence, duplicate prevention, and existing sends. Browser authentication and payment responses are mocked; no money is sent by this check.

## PIN, links, contacts, and top-up follow-up — November 8

Connected accounts now create a six-digit app PIN immediately after phone verification, before the app unlocks. The PIN gate keeps the root navigator mounted so request-link returns remain valid. PIN changes verify the old PIN, invalidate old grant versions, and expose a manual lock action. Money-changing API routes require the signed wallet-bound PIN grant. PIN hashes are salted; failed guesses are counted with a five-minute lock after five failures. The app stores only expiring grants, using SecureStore natively and sessionStorage in browsers.

Add Money uses a full-screen native presentation and resets scroll position between amount entry and review to prevent the clipped header in the supplied screenshot. The default configured cap is now $1,000. The UI reads authenticated funding availability; both deposit creation routes check supply before starting Stripe. A read-only devnet check found 1.79 USDC in the treasury, so larger actual deposits still require replenishment. RPC failures are no longer converted to zero balances.

Contact detail pages can create payment links addressed to that person's number. Receive/payment links support copying, sharing, and opening a prefilled Messages composer for a chosen contact. Native shares require EXPO_PUBLIC_PAYMENT_URL, the deployed HTTPS app base URL. Browser links preserve their current app base path. The user is still preparing the public deployment address, so cross-device public reachability remains unverified. Links never authorize payments themselves.

Native iOS/Android users can optionally allow contacts and select a person through the system picker, then explicitly confirm which number to save as a known contact. The address book is never uploaded. Web retains manual entry and saved Nest contacts. The SDK-compatible contacts module, config plugin, native permission string, and local CocoaPods integration are in place. iOS JavaScript export passes; native permission, picker, and Messages behavior require a rebuilt app and physical-device verification.

Verification: mobile/API TypeScript checks and mobile lint pass; 29 mobile domain tests, 27 regular API tests, 9 API service/auth/preflight tests, and 52 Python review tests pass. Browser coverage passes for 24 demo scenarios, 9 connected-wallet scenarios, and 8 Safe Hold scenarios, including targeted reruns after isolating conflicting browser artifact directories. Browser authentication, payments, and chain responses are mocked. Two actual provider runs also passed: a clean review returned confirmation plus a Prune receipt; an unfamiliar-recipient emergency scam returned a hold policy. These checks moved no devnet funds. The actual website export was rebuilt.

The 24-hour Safe Hold keeps the explicit sender override, with verification advice and a fresh release signature. Known saved contacts and previously paid recipients bypass review as requested. The updated contract was previously executed against a local validator. A fresh read-only devnet lookup still finds no executable program at the configured Safe Hold address; devnet escrow cannot work until deployment. No program/deployer keypair is present in hold/keys in this checkout.

## Full demo stress audit — November 8

The audit traced sign-in/PIN, top-ups, transfers, incoming and outgoing chain sync, receipts, payment links, contacts, settings, sample family goals, savings, withdrawals, and Safe Hold controls. New fault-injection checks cover lost network responses, stale PIN grants, malformed successful responses, unresponsive requests, corrupt stored receipts, and 20 concurrent deposit completions.

Fixed in this pass:

- Safe Hold availability compared the actual devnet genesis hash against a truncated string. It now checks the complete identifier, with the full network identifier in the regression fixture.
- Failed transfer submissions could prepare a different payment on retry. One draft now retains its operation reference, prepared message, and signature; server retries inspect the original chain signature before rebroadcasting. Failed/replayed attempts reconcile balances without applying the optimistic debit twice.
- Card top-ups lacked stable retry references, and fulfillment could clear its marker after an uncertain send or failed final metadata write. Stripe intent creation/confirmation now use idempotency keys; delivery checkpoints one signed token transaction into metadata before sending. Concurrent completions share one delivery. A fresh intent retrieval prevents Stripe's cached creation response from triggering a second funding check on an already-paid request. No replacement funding transaction is generated for an ambiguous/expired checkpoint.
- Unrelated balance reductions were labeled as SMS payments. Activity now backfills real confirmed outgoing token deltas with transaction references; locally recorded sends, card deposits, and holds retain their receipt details.
- Requests could spin indefinitely; ordinary GET/POST calls now have deadlines, clean up abort listeners, and reject incomplete responses. Missing transaction signatures cannot create a success receipt. A server PIN-expiry response relocks the account and lets the user unlock/resume.
- Weak local-history validation could restore malformed receipts or invalid trusted recipients. Damaged history is filtered. Contact writes reject account switches while a save is pending.
- Security text still described connected Swarms/Prune checks as disconnected previews. Connected builds now describe the actual behavior. Sample family requests are blocked from spending a live wallet.
- Sub-cent USDC dust could round the available balance upward, causing “use available balance” to request more than the wallet held. Spendable cents are now truncated from token base units, with a decimal-safe fallback for older API responses.
- SMS composer URLs now use the appropriate iOS/Android separator. The native API address pointed at a previous Wi-Fi network; it was changed to this laptop's current LAN address, and the missing review service was started on the configured port.

Verification completed: 46 browser scenarios (24 mobile-layout/demo, 14 connected-wallet, 8 review/hold), 36 mobile unit tests, 28 API unit tests, 15 API service tests, and 52 Python review tests. TypeScript and mobile lint pass. The actual compiled contract passes six isolated local-validator checks: exact deposit, premature release rejection, incorrect PIN rejection, missing sender signature rejection, full refund/state closure, and explicit sender override to the correct recipient. The local validator was stopped afterwards. Live Swarms/Prune review passed with four agents and a sealed receipt. A real Stripe test intent verified unconfirmed creation, idempotent retry, and 450-character metadata checkpoints; it was canceled without charging a card or moving USDC. Browser payments/authentication are mocked, and no audit test moves devnet treasury funds.

Native verification found mismatches between the precompiled React Core, installed headers, and Hermes Debug adapter. The app now uses the supported source-build configuration. A narrow config plugin removes the unavailable Hermes CDP adapter only in Debug; production configurations already omit this adapter. This increases build time and limits native Hermes debugger attachment. The final native launch result is recorded below after compilation.

Remaining external demo requirements: deploy the configured Safe Hold program (its address is still absent on devnet), configure the public native payment-link URL, and rehearse on the actual phones with contacts permission and genuine SMS verification. The treasury held 30.914035 test USDC at the read-only readiness check; the $1,000 cap is a limit rather than available funding. Keep the API/review services running and phones on the same Wi-Fi; changing Wi-Fi requires updating the LAN address again. `npm run demo:check` reports these requirements without exposing credentials or moving funds. Existing bank/Apple Cash payouts, biometrics, recovery contacts, and savings remain explicitly labeled previews/simulations.


Native result: the iOS Debug simulator build succeeds after the Core/Hermes compatibility fixes, and the real native wallet bundle renders the Nest welcome screen with assets/fonts and safe-area layout intact. The local generated display name was corrected from Guard to Nest. Simulator Keychain access required an entitlement in the simulator executable's test-only Mach-O section; this was supplied only to the temporary audit build and is not a production entitlement change. No new Keychain errors appeared after that signed test launch. Genuine SMS verification, wallet signing, PIN persistence, and contacts permission still need a final rehearsal on properly provisioned physical phones. The API production build passes using the separate .next-audit directory. A later read-only check showed 20.914035 USDC remaining in the treasury; readiness checks should be rerun immediately before the demo because funding changes as top-ups are used.


## Security controls — November 8, 2026

- Removed the family safe-word preview, as requested.
- Added actual Face ID/fingerprint enrollment on supported native devices using Expo SDK 58 LocalAuthentication and a biometric-protected SecureStore unlock grant. Enable under Security. Biometric grants are scoped to the wallet, expire with the server PIN session, and are removed on sign-out/account change. Unlock can fall back to the six-digit app PIN. Enabling biometrics requires an updated native build; Expo Go and browser previews cannot demonstrate iPhone Face ID.
- Every outgoing app send, withdrawal, Safe Hold deposit, refund, and release requires a new approval. The approval shows the action and amount; either a protected biometric read or app-PIN verification approves it. Cancelling or a wrong PIN never asks the wallet to sign. Expired server grants relock Nest. Review sheets dismiss while the security gate is visible, avoiding overlapping native modal controllers and covered browser prompts.
- Lock Nest persists a server freeze. App payment endpoints reject frozen accounts, including otherwise-valid PIN sessions; SMS SEND is rejected before balance RPC or signing, with another freeze check before sponsored broadcast. Fresh app-PIN verification unfreezes. Biometric unfreeze also needs the one-time freeze token held in biometric-protected storage on the locking device, so an old PIN-session grant alone cannot unfreeze. Other devices can use the app PIN. Expired biometric grants require the app PIN. Incoming funds and already-broadcast transactions cannot be stopped; externally signed transfers using an exported key are outside this Nest freeze.
- Privy metadata writes now serialize per account and merge fresh server metadata so a stale PIN/text-settings write cannot erase a freeze. This remains a single API-instance demo, not distributed compare-and-swap storage.
- A trusted contact can be saved only if they have their own Nest account and are not the current user. The saved contact has call/text shortcuts; text links open a composer, without sending automatically. Saving/removing requires payment-style approval.
- **Contact-only recovery is blocked, not implemented.** The current phone-only Privy flow cannot restore an existing wallet from contact approval alone. Privy's documented custom JWT integration requires Custom Authentication enabled in the dashboard (listed under Scale), prior account linking, and native SDK support/migration. The current SDK lacks the JWT linking hook. The app explicitly says saving a contact does not enable recovery; no fake recovery approval or replacement wallet is created. Backup email was declined by the user.
- Safe Hold deployment is paused at the failed Solana 1.18.26 toolchain download, per the user's stop-on-failure instruction. The new program address is prepared, but the old binary must be rebuilt before any deployment. No deployment signature or devnet refund proof exists yet.

Verification for this follow-up: 37 mobile unit tests, 29 API unit tests, 19 API service tests, and 52 Python review tests passed. All 48 browser scenarios passed across the full suites and focused reruns (24 demo/layout, 16 connected-wallet/security, 8 review/hold). Stale preview expectations were updated for the new Security UI. TypeScript and Expo lint passed. The final API production build passed in an isolated output directory. The rebuilt native iOS Simulator binary compiled successfully, was installed, connected to Metro, and rendered the real welcome screen without a runtime error. No SMS login, physical Face ID enrollment/approval, phone dialer/Message delivery, real devnet hold, or contact-only recovery was demonstrated by those browser mocks or the native welcome-screen check.


## Supplied handoff audit — November 8, 2026

Implemented the remaining startup, confirmation, documentation and claim corrections; see [the finding-by-finding resolution](../../audit/IMPLEMENTATION.md). Pending app/SMS payments now retain their original signature and signed-byte checkpoint, survive reload, block another outgoing payment while unresolved, and reconcile only from chain evidence. Confirmed, failed and expired states do not reuse a pending receipt as a new transfer. A pending or failed send never counts as a previously paid recipient. The current website and pitch explicitly label Safe Hold deployment and contact-only recovery as unavailable.

### November 8 deployment and approval update

Safe Hold is now deployed at `5ZucuntpueZMRDBEs31gL3HrUpZ13NZRahu7T9rLWzv6` on devnet. Real deposit, full Undo refund, error 8 early-release rejection, error 3 wrong-PIN rejection and correct recipient override passed; see [proofs](../../audit/hold-devnet-proof.json). This supersedes earlier deployment-blocked notes. Returning to an authenticated session no longer asks for Face ID/PIN. Sends, hold actions, freezes and account/security changes retain approval. Four focused browser tests, mobile lint/typecheck and production builds passed.
