# Guard mobile design baseline

Research and implementation: November 7, 2026. User-selected stack: React Native / Expo, shared with web.

## Reference scope and evidence

Sources inspected:

- [Cash App sending](https://cash.app/send): mobile landing-page screenshot, branding extraction, and the official activity-screen image linked from that page.
- [PayPal consumer app](https://www.paypal.com/us/digital-wallet): mobile landing-page screenshot and branding extraction.
- [PayPal's official iPhone listing](https://apps.apple.com/us/app/paypal-pay-send-save/id283646709): official product screenshots, including the card-and-list layout saved locally.

Local reference captures: [Cash App mobile page](design/reference/cash-app-mobile.png), [Cash App activity](design/reference/cash-app-activity.webp), [PayPal mobile page](design/reference/paypal-mobile.png), and [PayPal iPhone card/list screenshot](design/reference/paypal-iphone-send.webp). These are research references, not assets shipped inside the app.

The landing pages are marketing websites. Their extracted fonts/colors are evidence about those pages, not measurements of every native app screen. The PayPal mobile landing capture used a dark marketing presentation and contained a cookie notice; it was not treated as a complete authenticated-app walkthrough. No private accounts were accessed.

## Observations we adapted

### Cash App

- Amount entry is the visual center of the sending experience, with very large numeric type and a clear keypad.
- Recipient identity, payment note, and amount are immediately readable in activity rows.
- The inspected activity asset puts avatar/name/note on the left and amount or action on the right.
- The send page explicitly describes scam/new-recipient alerts and group payment pools. Neither a warning nor a shared-request feature alone should be claimed as unique to our product.
- Extracted website tokens: primary green `#00E013`, white backgrounds, dark text, pill-shaped primary buttons. Website font: Cash Sans. These are reference values; Guard does not bundle that font or reproduce Cash App branding.

### PayPal

- The inspected app screenshot uses a prominent amount/card, rounded grouped content, and repeated rows with the important value aligned to the trailing edge.
- Sending/requesting and reviewing financial activity are established product functions, also described on PayPal's consumer page.
- Marketing-page extracted colors include `#60CDFF`, `#0066F5`, and `#0070E0`; the page's reported base background is `#F1EFEA`. These do not establish exact native-app colors.
- PayPal's branded font is not copied. The app uses the platform system font.

## Guard's own design decisions

Current direction follows the user's two visual references: a monochrome dotted globe and a rounded crypto wallet interface. White is the primary surface, black anchors the type and globe, and blue is the only brand accent. These are Guard implementation tokens, not extracted Cash App or PayPal values.

| Role | Value |
| --- | --- |
| Background | `#FFFFFF` |
| Surface | `#FFFFFF` |
| Primary ink | `#101114` |
| Secondary text | `#7D828C` |
| Brand blue | `#246BFD` |
| Pressed blue | `#1550CD` |
| Blue wash | `#E8F0FF` |
| Subtle surface | `#F5F6F8` |
| Globe backdrop | `#08090C` |
| Divider | `#EAECF0` |
| Error | `#B53737` on `#FFF1F1` |
| Contact accents | cool gray and pale blue |

- System font; headings approximately 28–30 points, section headings 19, body 15, captions 11–13.
- Main balance approximately 62 points in a bold weight; amount-entry numerals up to 94 points, scaled to fit the amount.
- Horizontal page padding 24; section spacing roughly 24–30; cards 20–24 padding.
- Rounded, flat cards around 28 points; full pill buttons with minimum height 58 and bold 17-point labels; circular icon controls with 44-point targets.
- Four floating bottom tabs: Home, Family, Activity, You. Native Liquid Glass on compatible iOS 26 builds, Expo BlurView elsewhere, and an opaque surface when iOS Reduce Transparency is enabled. Sending and money actions open dedicated screens. Content has extra scroll padding so the floating bar does not cover the last controls.
- Width-constrained, responsive content works on web, iPhone, and tablet without maintaining a second UI implementation.
- An original blue shield/check mark and `Guard` wordmark. Guard is the user-selected name, with the tagline **Protect what matters.**

## Cash App screenshot styling update

The user supplied a Cash App payment-screen screenshot and explicitly requested its text and box styling while retaining the current palette. Adapted the large, bold amount display, bold numeric keypad, circular utility controls, flat tinted panels, and full-width pill actions. The payment screen now puts amount and keypad first, with compact recipient pills beneath it. The existing globe and glass navigation stay in place. Typography uses the system font; Cash Sans and Cash App branding are not bundled.

## Implemented screen structure

1. **Home:** minimal brand/profile header, large black balance on white, four quick actions, a black globe feature, family contacts, a family-request preview, recent activity.
2. **Send:** saved recipient, amount keypad, optional note, explicit review, demo confirmation.
3. **Receipt:** amount, recipient, date/note, local-ledger result, and separate not-sent/not-connected on-chain/provider states.
4. **Family:** contacts and sample shared goals; contributions update the local demo progress.
5. **Activity:** search, sent/received filters, and receipt access.
6. **You:** demo profile, Auth0 sign-in integration, preview explanation, reset.
7. **Add/withdraw:** amount, review, illustrative fees/rate, and a labeled local simulation.
8. **Request:** share/copy a clearly labeled sample request; it is not a payable link.
9. **Sign-in:** full black background, Guard wordmark and white tagline, entire spinning monochrome globe centered without cropping, and two bottom pill buttons: outlined Demo and blue Sign in. The white entry panel has been removed. First launch shows this screen; the account tab can reopen it. Sign-in calls the existing Auth0 integration and honestly reports missing configuration. Demo entry remembers only that the welcome screen was seen, not an authenticated session.

## Globe asset

The globe is an original dot rendering of public-domain Natural Earth land geometry, generated by `apps/mobile/scripts/generate-globe.mjs`. The PNG, sphere shading, point buffer, and source geometry are all local. The login globe uses Expo GL to rotate the actual 3D point cloud once every 45 seconds; the home globe remains static. It pauses off screen and in the background, and uses a static globe when Reduce Motion is enabled. A static fallback is also available if graphics initialization fails. No external image service or Three.js runtime is used. The grayscale globe stays grayscale; blue is used for the surrounding location markers and actions.

## Product and implementation boundaries

- No competitor artwork, logos, screenshots, or proprietary fonts are used as app UI assets.
- Every money operation is a local, visibly labeled demo. No wallet connection, on-chain transfer, or fiat-provider call is implemented in the current app.
- The sample MXN exchange rate is explicitly illustrative, not current or provider-backed.
- Auth0 authenticates an account. It does not create a Solana wallet or authorize transactions in this scaffold.
- Names, transactions, and family goals are fictional sample data.
- The files are an implementation-ready design baseline, not a claim of pixel-perfect reconstruction of either reference app.
