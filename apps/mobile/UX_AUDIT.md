# Nest withdrawal, contacts, and typing audit

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

Passed: 20 mobile unit tests, 8 backend unit tests, 16 browser flows, TypeScript, lint, and both iOS/web JavaScript exports. After the final compact withdrawal layout change, the withdrawal, available-balance, and focused-field browser checks passed again. Seven UX screenshots were rendered and visually inspected.

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
