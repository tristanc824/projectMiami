# Nest app design

The app now follows the supplied [Nest screen mockups](app-design/nest-app-screens.html), [app handoff](APP_HANDOFF.md), and the existing [Nest website](web-earth/). These replace the earlier Guard, globe, blue, and glass design direction.

## Visual system

| Role | Light appearance |
| --- | --- |
| Page | `#F3F0EA` |
| Card | `#FFFFFF` |
| Ink / primary action | `#17201A` |
| Secondary text | `#646C66` |
| Moss | `#2F5D3A` |
| Sage | `#E4ECDF` |
| Local-currency wash | `#DCEEF8` |
| Divider | `#DDD7CA` |
| Progress track | `#E9E1D1` |

Figtree Regular, Medium, and Semibold are bundled locally with the SIL Open Font License. Amounts use tabular numbers. Cards have 28-point corners; review sheets have 32-point corners; buttons are full pills, at least 56 points tall. Body and label text are at least 13 points. Main actions use dark ink. Success and savings progress use moss. Local-currency examples use sky blue.

The website’s original three-ring Nest mark supplies the app logo, icon, and favicon. Photos are copied from the website; contact portraits reproduce the crops in the mockup sheet. Small static bird silhouettes appear on welcome and receipt screens. The default appearance is warm cream, with a complementary moss-based dark appearance available in You. Surfaces and navigation are flat and opaque. Balances scale to fit narrow phones, and payment review / receipt return actions stay visible in a fixed footer.

## Screen map

- **Welcome:** meadow photo, Nest wordmark, “Protect what matters.”, create/sign-in entry points, demo entry, and recovery information. Existing Auth0 and Privy sign-in behavior remains connected to the same handlers.
- **Home:** dollar balance, explicitly illustrative dollar/peso comparison, example ARS conversion, Send / Add / Receive, activity, and a photo-led savings card.
- **Save:** the historical comparison from the supplied mockup, three savings goals, new-goal sheet, and progress. Demo savings are reserved within the total wallet balance and cannot be spent until released.
- **Goal:** target, set-aside balance, remaining amount, and local demo allocation/release sheets. No interest or automated top-up is promised.
- **Security:** Face ID, scam check, undo, safe word, trusted contact, and support. Unconnected protections are explicitly identified as previews or not set up; tapping a row explains its actual status.
- **You:** account, appearance, activity, legacy family requests, withdrawal, sign-in, preview details, and reset.
- **Send:** recipient search and faces first, amount/keypad, example ARS conversion, note, then a bottom-sheet review with explicit fee and undo status. Connected mode uses real recipient lookup; fictional contacts and reserved sample phone numbers are demo-only.
- **Receive:** a real generated QR code encoding the request URL, recipient phone, amount/note, sharing, and copy. No invented account/routing numbers or handle.
- **Receipt:** contact photo or action icon, birds, amount, actual timestamp, payment details, copy/share, and problem-report information. Demo and devnet results remain distinct.
- **Activity:** search, filters, and receipts, accessible from Home and You as a full screen outside the four primary tabs.
- **Payment link:** Nest-green request card and explicit payment review.
- **Add / withdraw:** bank and Apple Cash destination selection, a fee-aware available-balance shortcut, explicit demo/test review, and destination-specific receipts. Apple Cash is demo-only; the bank test cash-out is preserved.

## Contacts and keyboard behavior

Contact names are saved locally per wallet, with a separate demo book. Names resolve consistently in activity, receipts, payment review, and search. Repeat payment starts with a recipient and a zero amount. Shared keyboard-aware scroll containers and keyboard avoidance keep focused inputs visible; native numeric keyboards have a Done toolbar. See [UX audit](apps/mobile/UX_AUDIT.md) for coverage and physical-device limits.

## Behavior and limits

Existing storage keys, deep-link scheme, bundle identifier, authentication configuration, and API contracts are retained. Display branding is Nest. Old wallets still restore, with new savings initialized only when needed. Reset clears demo savings and activity.

Demo balances start at $0. Add demo dollars to explore payments and savings. Savings cannot reserve more than the available balance, exceed a goal target, or release more than was set aside. Live savings are disabled, so a visual goal never reserves actual devnet funds.

The UI does not fabricate arrival times, active biometrics, escrow, scam detection, SMS relay, or offline delivery. Devnet transfers cannot currently be undone. Local-currency amounts use an explicitly illustrative 970 ARS/USD rate. Dollar/peso charts are illustrations, not account performance. Cash-outs remain simulated. Digital dollars are not bank deposits or FDIC insured and can be frozen by their issuer.

## Verification

Run `npm run typecheck`, `npm run lint`, and `npm test` from the repository root. Browser flows and platform exports run from `apps/mobile` with `npm run test:browser`, `npm run export:web`, and `npm run export:ios`. Browser tests cover payment review, receipt/activity persistence, international phone validation, request links, appearance, savings allocation/release, new goals, and protection previews.
