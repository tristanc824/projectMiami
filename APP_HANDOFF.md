# Nest: app handoff for the build

For Tristan, building the app in Cursor. This is the current source of truth for brand, features, copy and screens (Nov 7, 2026). Where an older doc disagrees (anything that says "Guard", or treats the product as family-only), this file wins.

## What to open first
| What | Where | How |
|---|---|---|
| **App screens** (9 mockups) | [`app-design/nest-app-screens.html`](./app-design/nest-app-screens.html) | Open in any browser. No build step. |
| **Website, current** (earth edition) | [`web-earth/`](./web-earth) | `cd web-earth && npm install && npm run dev` → http://localhost:5175 |
| Website, earlier blue edition | [`web/`](./web) | `cd web && npm install && npm run dev` → http://localhost:5174 |
| Pitch, angle and demo script | `PITCH_PLAYBOOK.md` (being written) | |
| Solana stack and architecture | [BLOCKCHAIN_STACK.md](./BLOCKCHAIN_STACK.md) | |

The app should look and sound like `web-earth`. Copy the tokens below rather than eyeballing them.

## Product in one line
Nest is a dollar account for anyone with a phone. **Protect what matters.**

## Features (surface level; this is what we sell right now)
| Feature | What the user feels | How it works (for the build) | Screen |
|---|---|---|---|
| **Inflation-proof** | Saved stays saved. | Balance held as USDC; local-currency value shown next to it. | 1, 8 |
| **24/7** | Always open. | Solana settles in about a second, any day, any hour. | 3, 7 |
| **No transaction fees** | Send it all. Keep it all. | Nest sponsors the network fee (Kora fee relayer); user pays $0. | 3, 5, 7 |
| **Government-independent** | Your money answers to you. | Not held in one local bank or national banking system. Honest caveat: Circle (USDC issuer) can freeze tokens. | (website) |
| **Undo** | Scammed? Undo it. | First payment to a new recipient goes into an on-chain escrow (Anchor program) for 24h; sender can cancel. | 2, 6 |
| **Security** | Only you can move your money. | Passkey / Face ID sign-in and confirm (no passwords), scam check before risky sends, optional family safe word. | 4, 5 |
| Claim link | (for people without Nest) | Payment link that opens an account on claim. | 9 |

More features will come; don't build beyond this list for the demo.

## The 9 screens (in `app-design/nest-app-screens.html`)
1. **Home**: balance in dollars + local value chip, three actions (Send is the only dark one), one vault, activity with "Arrived in 0.9s · $0 fee" and "Undone · money returned".
2. **Send to**: search by name, @handle or phone; recents; new recipients flagged "First payment · undo on for 24h".
3. **Amount**: big amount, local equivalent, two chips "$0 fee" and "Arrives in ~1s", keypad, "Review".
4. **Scam check**: "Wait. This looks like a scam." Three plain reasons. Dark button = safe choice ("Don't send"); "Send anyway" is a text button.
5. **Confirm**: bottom sheet, fee and arrival, Face ID.
6. **Undo**: "Sent. Undo anytime in 24h." Countdown ring, "Undo payment".
7. **Arrived**: check, "Arrived in 0.9s.", receipt with $0.00 fee and a Sunday-night time (shows 24/7 without saying it).
8. **Save**: vaults, plus one comparison: "$1,000 in Nest vs $694 in pesos" a year later.
9. **Claim**: green screen for someone without Nest: "Ana sent you $250." → "Claim with your phone number".

Main demo flow: 1 → 2 → 3 → 5 → 7 (normal send), then 2 (new number) → 3 → 4 → send anyway → 6 → Undo → back to 1 showing "Undone · money returned".

## Brand tokens
**Colors** (flat only: no gradients, glows or glass inside the app)
| Token | Hex | Use |
|---|---|---|
| page | `#F3F0EA` | App background (warm off-white) |
| white | `#FFFFFF` | Cards |
| ink | `#17201A` | Text, primary (dark) buttons |
| ink-600 | `#4A544D` | Secondary text |
| ink-400 | `#7C857E` | Labels, hints |
| line | `#DDD7CA` | Dividers |
| moss | `#2F5D3A` | Brand green: logo, success, progress |
| moss-900 | `#16301D` | Pressed / deep green |
| sage-100 | `#E4ECDF` | Success chip background |
| sage | `#A9C4A1` | Soft accents |
| sky | `#8CC8EA` / sky-100 `#DCEEF8` | Secondary accent, local-currency chip |
| sand | `#E9E1D1` | Progress track |
| amber / amber-100 | `#9A6412` / `#F6EBD3` | Warnings (scam check) |

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
- Approved lines: "Protect what matters." · "Always open." · "Send it all. Keep it all." · "Your money answers to you." · "Scammed? Undo it." · "Saved stays saved." · "Arrived in 0.9s." · "Only you can move your money."
- Status words: "Arrived", "Undone · money returned", "Held in US dollars", "$0 fee".

## Honest limits (keep these true in the app and on stage)
- Balances are USDC: not bank deposits, not FDIC insured, issuer can freeze. Don't advertise interest (GENIUS Act bans issuer yield).
- The demo runs on Solana devnet with test USDC; cash-out to local currency is simulated.
- Undo covers the first payment to a new recipient only.

## Website notes
- `web-earth/` is a Vite + React + Tailwind site. Sections: floating pill nav (hides on scroll down, returns on scroll up) → meadow hero with birds → "Life, in dollars." swipe cards → "Everything money should be." feature moments → trust line → inflation photo → stories → closing → footer.
- Photos are from Unsplash (free license), stored in `web-earth/public/photos/`.
