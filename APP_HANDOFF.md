# Nest: app handoff for the build

For Tristan, building the app in Cursor. This is the current source of truth for brand, features, copy and screens (Nov 7, 2026). Where an older doc disagrees (anything that says "Guard", or treats the product as family-only), this file wins.

## What to open first
| What | Where | How |
|---|---|---|
| **App screens** (16 mockups, audited) | [`app-design/nest-app-screens.html`](./app-design/nest-app-screens.html) | Open in any browser. No build step. |
| **Website** | [`web-earth/`](./web-earth) | `cd web-earth && npm install && npm run dev` → http://localhost:5175 |
| Pitch, angle and demo script | [PITCH_PLAYBOOK.md](./PITCH_PLAYBOOK.md) | |
| Solana stack and architecture | [BLOCKCHAIN_STACK.md](./BLOCKCHAIN_STACK.md) | |

The app should look and sound like `web-earth`. Copy the tokens below rather than eyeballing them.

## Product in one line
Nest is a dollar account for anyone with a phone. **Protect what matters.**

## Features (surface level; this is what we sell right now)
| Feature | What the user feels | How it works (for the build) | Screens |
|---|---|---|---|
| **Inflation-proof** | Saved stays saved. | Balance held as USDC; local-currency value shown next to it. | 4, 6 |
| **24/7** | Always open. | Solana settles in about a second, any day, any hour. | 9, 11 |
| **No transaction fees** | Send it all. Keep it all. | Nest sponsors the network fee (Kora fee relayer); user pays $0. | 5, 9, 10, 11 |
| **Government-independent** | Your money answers to you. | Not held in one local bank or national banking system. Honest caveat: Circle (USDC issuer) can freeze tokens. | (website) |
| **Undo** | Scammed? Undo it. | First payment to a new recipient goes into an on-chain escrow (Anchor program) for 24h; sender can cancel. | 8, 13 |
| **Security** | Only you can move your money. | Passkey with the phone's own unlock: Face ID if the phone has it, else fingerprint, else PIN (no passwords), scam check before risky sends, family safe word, trusted contact. | 2, 10, 12, 14 |
| **Send without Wi-Fi** | Send money with no Wi-Fi. | The phone signs the payment offline using a Solana durable nonce (see BLOCKCHAIN_STACK.md, offline send queue). With cell signal but no data, it goes by text message to a Nest relay that submits it. With no signal at all, it is saved on the phone and sent in order on reconnect. Honest limit: it can't arrive while the phone has no connection of any kind. | 15, 16 |
| Claim link | No app needed. | Payment link that opens an account on claim. | 3 |

More features will come; don't build beyond this list for the demo.

## The story in the mockups
Ana lives in Miami. Her mom, Rosa ("Mamá"), lives in Buenos Aires; Tío Luis in Córdoba; Daniel in London. Argentina is the story country because it is the strongest inflation case. Peso amounts use an example rate (about 970 ARS per dollar); **Pyth has no ARS feed**, so a live value needs another source or stays "Example". The savings comparison is sourced: Argentina's 2023 inflation was 211.4% ([ECONOMIC_PROBLEMS.md](./ECONOMIC_PROBLEMS.md)), so $1,000 held in pesos for that year bought about **$321** of what it did in January. Avatars are crops of the Unsplash photos in `web-earth/public/photos/`.

## The 16 screens (in `app-design/nest-app-screens.html`)
**Start**
1. **Welcome**: meadow photo with birds, "Protect what matters.", "Dollars. 24/7. No fees.", Create account / I already have one.
2. **Sign in**: passkey setup with the strongest unlock the phone has. **Face ID** if available (shown in the mockup), otherwise **fingerprint**, otherwise the phone's **PIN**. The screen's title, icon and button follow it: "Sign in with Face ID." / "Sign in with your fingerprint." / "Sign in with your PIN." Every later "Face ID" in these screens means "the phone's unlock" and changes the same way. Many of our users have older Android phones without face unlock, so PIN must work everywhere.
3. **Claim**: what Rosa sees without Nest: "Ana sent you $250." → "Claim with your phone number".

**Everyday** (tab bar: Home, Security, You)
4. **Home**: balance in dollars, a single line of the balance over the past month (no peso line), the "≈ ARS 4.15M" chip, Send (the only dark action) / Add / Receive, activity with "Arrived in 0.9s · $0 fee" and "Undone · money returned".
5. **Receive**: QR code with the Nest mark, @handle, "Share my link".
6. ~~Save~~: removed (Nov 7). No savings goals in the app; the balance itself is the savings.
7. ~~Goal~~: removed with Save.

**Send to Mamá**
8. **Send to**: search, faces first, recents; a new number flagged "New · undo on for 24h".
9. **Amount**: $250, ≈ ARS, chips "$0 fee" and "Arrives in ~1s", keypad, Review.
10. **Confirm**: bottom sheet with fee, arrival and what she gets; confirmed with the phone's unlock (Face ID, fingerprint or PIN).
11. **Arrived**: Rosa's photo with a check, "Arrived in 0.9s.", "Mamá has it.", receipt timestamped Sunday 9:41 PM.

**When it's a scam**
12. **Scam check**: "Wait. This looks like a scam." Three reasons; "Don't send" is the dark button.
13. **Undo**: "Sent. Undo anytime in 24h." Countdown ring, "Held safely", Undo payment.
14. **Security**: "Only you can move your money." Face ID, scam check, undo window, family safe word (sends over $500), trusted contact.

**No Wi-Fi**
15. **Sent by text**: "Your $250 is on its way to Mamá." / "We sent it by text message." Signed on this phone with Face ID, $0 fee; note for no signal at all.
16. **Waiting to send**: offline banner, "$80.00 to Tío Luis · Ready to send", payments go out in order on reconnect.

**Main demo flow:** 4 → 8 → 9 → 10 → 11 (normal send), then 8 (new number) → 9 → 12 → hold to send anyway → **10 (Face ID, Undo row says "On")** → 13 → Undo → back to 4 with "Undone · Money back" at the top of Activity. Open with 1 if there's time; 3 is the bonus for "what if she doesn't have the app?"

## Audit and bank basics (Nov 7)
- [APP_AUDIT.md](./APP_AUDIT.md): 82 issues found across the 16 screens. Every Critical and High issue is fixed in the screens; Medium and Low items are listed there for the build.
- [FINTECH_FLAWS_CASE_STUDY.md](./FINTECH_FLAWS_CASE_STUDY.md): where Cash App, Revolut, Wise, Chime, Nubank and Monzo failed users, and the bank basics Nest needs.
- Added from that study, kept small: "Lost your phone? Get back in" and the not-FDIC disclosure on Welcome; "Lock Nest" and "Talk to a person" on Security; "Something wrong?" on Arrived; "Get paid by direct deposit" on Receive (**needs a partner** for account and routing numbers); "· example rate" on every peso value.
- Still to design (one screen each, from the study): lost-phone recovery, "Account on hold" (reason, what to do, answer-by date, a person to talk to), report a problem with a status line, statements and search in Activity, limits shown only near a limit, calm one-line notifications.
- Open question: whether US dispute rules (Reg E) apply to a USDC wallet. Build as if they do.

## Brand tokens
**Colors** (flat only: no gradients, glows or glass inside the app)
| Token | Hex | Use |
|---|---|---|
| page | `#F3F0EA` | App background (warm off-white) |
| white | `#FFFFFF` | Cards |
| ink | `#17201A` | Text, primary (dark) buttons |
| ink-600 | `#4A544D` | Secondary text |
| ink-400 | `#646C66` | Labels, hints (passes WCAG AA on the page color) |
| line | `#DDD7CA` | Dividers |
| moss | `#2F5D3A` | Brand green: logo, success, progress |
| moss-900 | `#16301D` | Pressed / deep green |
| sage-100 | `#E4ECDF` | Success chip background |
| sage | `#A9C4A1` | Soft accents |
| sky | `#8CC8EA` / sky-100 `#DCEEF8` | Secondary accent, local-currency chip |
| sand | `#E9E1D1` | Progress track |
| amber / amber-100 | `#8A5A10` / `#F6EBD3` | Check this: new numbers, scam check, money on hold |

**Type**: [Figtree](https://fonts.google.com/specimen/Figtree), one family only. Display 600 weight, tight tracking (−0.035 to −0.05em). Body 400–500. Amounts use tabular numbers. Nothing under 13px.

**Shape**: cards 28px radius, phone-level sheets 32px, buttons fully rounded, height 56. One dark button per screen.

**Logo**: three identical rings at 120° (`web-earth/public/nest-mark.svg`). In the app: moss on light, white on moss.
```svg
<svg viewBox="0 0 64 64"><g fill="none" stroke="#2F5D3A" stroke-width="5.5">
  <ellipse cx="23" cy="32" rx="18" ry="14" transform="rotate(90 23 32)"/>
  <ellipse cx="36.5" cy="24.206" rx="18" ry="14" transform="rotate(210 36.5 24.206)"/>
  <ellipse cx="36.5" cy="39.794" rx="18" ry="14" transform="rotate(330 36.5 39.794)"/>
</g></svg>
```

**Birds**: the brand motif on the website (distant bird silhouettes, `web-earth/src/components/Birds.tsx`). In the app, use sparingly if at all (e.g. a small flock on the splash or the Arrived screen).

## Copy rules (this is the brand)
- **Say more with less.** One short line per idea. Never explain the mechanics on screen.
- Sentence case. No exclamation marks. "Digital dollars" or "dollars", never "crypto" or "tokens" in the UI.
- Approved lines: see [COPY_DECK.md](./COPY_DECK.md). That file and `app-design/nest-app-screens.html` are the source of truth for every string.
- Status words: "Arrived", "Undone · money returned", "Held in US dollars", "$0 fee".

## Honest limits (keep these true in the app and on stage)
- Balances are USDC: not bank deposits, not FDIC insured, issuer can freeze. Don't advertise interest (GENIUS Act bans issuer yield).
- The demo runs on Solana devnet with test USDC; cash-out to local currency is simulated.
- Undo covers the first payment to a new recipient only.

## Website notes
- `web-earth/` is a Vite + React + Tailwind site. Sections: floating pill nav (hides on scroll down, returns on scroll up) → meadow hero with birds → "Everyday money, held in dollars." swipe cards → "A better place to keep your money." feature moments → "Only you can move your money." → dollar savings photo → money guides → closing → footer.
- Photos are from Unsplash (free license), stored in `web-earth/public/photos/`.
