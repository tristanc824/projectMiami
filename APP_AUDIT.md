# Nest app screens: QA and design audit

For Tristan, before building. Reviewed Nov 7, 2026. Sources: the 16 rendered screens (2x PNG), `app-design/nest-app-screens.html`, `APP_HANDOFF.md`, `COPY_DECK.md`, `ROBINHOOD_CASE_STUDY.md`, plus `NEST_FEATURES.md` where a rule is defined there.

Line numbers refer to `nest-app-screens.html` as it stands today. Where a fix gives replacement text, it can be pasted as written.

## Summary

| Severity | Meaning | Count |
|---|---|---|
| Critical | Wrong money/number, or a misleading claim | 4 |
| High | A clear bug or broken consistency | 21 |
| Medium | | 35 |
| Low | | 22 |
| **Total (unique)** | | **82** |

These are counts of unique issues. Per-screen rows that repeat a cross-screen issue aren't counted twice: 1.1, 1.2, 2.3, 4.1, 4.7, 4.8, 4.9, 5.1, 6.1, 8.2, 8.5, 9.1, 9.3, 10.3, 12.1, 12.7 and 16.5 are counted under C-1 to C-4 and X-4 to X-9.

**The issues to fix first**
1. Goals add up to the whole balance (C-1). As drawn, Ana has $0.12 to send.
2. The app never says what the money is. It calls itself "A US dollar account" and "Held in US dollars", but nothing in the app says it isn't a bank deposit or FDIC insured, or that Circle can freeze it (C-2).
3. The risky payment skips Face ID. Main demo flow 12 → 13 goes from "Hold to send anyway" straight to "sent" (C-3).
4. The "No fees" promise on Welcome is absolute (C-4).
5. The handoff doc and the HTML disagree on almost every string and on two color tokens (X-1, X-2). Tristan can't tell which one to build from.

---

## Per screen

### 01 · Welcome

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 1.1 | Critical | See C-4. "A US dollar account with no fees." is absolute, but Add money (on-ramp) and cash-out to pesos go through partners who may charge. The product only backs "no fee to send or receive". | Line 161: `A US dollar account with no fees to send or receive.` |
| 1.2 | Critical | See C-2. The first screen promises "A US dollar account", and no screen in the app discloses that it isn't a bank or FDIC insured. | Add after line 164, inside `.stack`: `<div class="note" style="color:rgba(255,255,255,.7);text-align:center;font-size:13px">Nest is not a bank. Your balance is held as USDC, a digital dollar from Circle, and is not FDIC insured.</div>` |
| 1.3 | Low | The bird SVGs (lines 154-156) use `#1C2A22`, which isn't a brand token. | `color:var(--ink)` on all three. |
| 1.4 | Low | The wordmark is 19px and the mark 26px. On this one screen, at the 46px h1, the logo looks undersized next to the headline. | Optional: `.brand` on Welcome `font-size:22px`, `.mark` 30px. |

### 02 · Face ID

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 2.1 | Medium | The headline "Sign in with Face ID." sits on a setup screen whose button says "Set up Face ID". The user is creating an account here, not signing in. | Line 180: `Use Face ID to open Nest.` |
| 2.2 | Medium | Missing recovery path. The first fear with passkeys is losing the phone (Case study, screen 2, Med). | Under the note on line 184, add a text link: `<div class="label" style="text-align:center;color:var(--ink6);min-height:44px;display:grid;place-items:center">Lost your phone?</div>`. It opens a sheet: "Your trusted contact can help you get back in." |
| 2.3 | Medium | `.note` is 12px (line 103), below the 13px minimum. ink-400 on page is 3.35:1 (see X-5). | `.note{font-size:13px}` (global). |
| 2.4 | Low | A large empty gap (about 300pt) sits between the subline and the button, so the screen feels unfinished. | `margin-top:110px` → `margin-top:150px` on line 177 to center the group optically. |

### 03 · Claim

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 3.1 | High | This contradicts the undo rule. A claim link to someone who isn't on Nest is a first payment to a new recipient, so it sits in the 24h undo escrow. "Ana sent you $250." with "Claim" suggests Rosa can use it now. | Under the subline (line 200), add: `<div style="color:rgba(255,255,255,.75);font-size:15px">You can use it from Monday, 9:41 PM.</div>`. Or exempt claim links from undo in the spec, and say so in APP_HANDOFF.md under "Honest limits". |
| 3.2 | Medium | The sender is shown only as "Ana", and that's a phishing vector. Rosa can't tell this from a fake link. Case study (screen 3, High) asks for the full name and handle. | Under the h1, add: `<div style="color:rgba(255,255,255,.75);font-size:15px">Ana Martínez · @ana</div>` |
| 3.3 | Medium | No peso value appears. Rosa's first question is "what is this to me?" | Add `≈ ARS 242,500` as a `.chip.sky` under the h1 (same example rate, see X-4). |
| 3.4 | Medium | The note "Opens a Nest account in seconds." is 12px, white at 60% on moss: 3.9:1, which fails AA. | Line 203: `color:rgba(255,255,255,.8);font-size:13px`. |

### 04 · Home

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 4.1 | Critical | See C-1. The Balance of $4,280.12 equals the three goals ($1,240 + $860 + $2,180 = $4,280) plus 12 cents. Either the spendable balance is $0.12, or goals are separate and the total is wrong. | Goals are separate from the balance. Leave $4,280.12. On Save (6.1), add a goals total, and on Amount (9.2), show "Available". |
| 4.2 | High | The activity order contradicts the demo flow. The flow is: send to Mamá → send to new number → undo → back to Home. Newest-first, the "New number · Undone" row must sit above "Mamá". | Swap rows on lines 248 and 249. |
| 4.3 | High | "Daniel" (a man's name, in London per the handoff) uses `phone.jpg`, which shows a woman. That breaks the faces-first trust idea, because the face doesn't match the name. Same on screens 8 and 16. | Pick a photo of a man for `.dani`, or rename the person to a woman's name (for example `Daniela`) in every place: lines 250, 375, 609 and APP_HANDOFF.md line 33. |
| 4.4 | Medium | The row name is "New number" here, while screens 8 and 13 show the same payee as "+54 9 11 5555 0142". | Line 249 `.t1`: `+54 9 11 5555 0142`. |
| 4.5 | Medium | The chart claims "Past year" and shows pesos falling hard. The only sourced data is 2023 (211.4%). Argentina's last 12 months were nowhere near that, so the curve overstates. | Label line 234 right side `2023` instead of `Past year`, and set the aria-label to `In 2023, your dollars held their value while the same money in pesos fell`. Or plot real trailing-year data from a named source. |
| 4.6 | Medium | Cents `.12` are `#A3AAA4` on white: 2.4:1, which fails even the large-text 3:1. | Line 54: `.big .c{color:var(--ink6)}`. |
| 4.7 | Medium | Chart legend and "Past year" are 12px (line 234). Chips are 12.5px (line 62). Tab labels are 11px (line 95). All are under the 13px rule. | Line 234 `font-size:13px`. Line 62 `.chip{font-size:13px}`. Line 95 `.tab{font-size:13px}` (or get a documented exception for the tab bar, which iOS sets at 10-11pt). |
| 4.8 | Medium | "See all" is a 13px gray label with no padding, so the touch target is about 40×17pt. | Line 246: wrap it in `<span style="padding:12px 0 12px 16px;margin:-12px 0;color:var(--ink6)">See all</span>`. |
| 4.9 | Medium | The status capital after the dot is inconsistent: "Undone · Money back" vs "Arrived in 0.9s · No fee" vs "Paid 12 times · last Sunday" (screen 8). See X-7. | `Arrived in 0.9s · no fee`, `Undone · money back`. |
| 4.10 | Low | The `−` minus sign (U+2212) on line 248 renders as a short hyphen in Figtree in the PNG. | Keep U+2212 but set `font-feature-settings:"tnum"`. Or check Figtree's minus glyph. If it's missing, use `–$250.00` (en dash). |
| 4.11 | Low | Ana's avatar crop (line 73, `background-position:42% 22%`) cuts off the top of her head at 40px. | `background-position:42% 30%`. |

### 05 · Receive

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 5.1 | Medium | The back chevron is a bare 24×24 SVG (line 270), under the 44pt touch target. Same on 7, 9 and 10. | Wrap each back icon: `<span style="width:44px;height:44px;display:grid;place-items:center;margin-left:-10px"><svg width="24" height="24"><use href="#back"/></svg></span>`, and make the right spacer `width:44px`. |
| 5.2 | Medium | The QR code is decorative. Its finder pattern is fine, but the data modules are random, so a scanner can't read it. That's fine for a mockup, but flag it so it isn't shipped as a static image. | In the build, generate it from the `@ana` pay link with error correction level H (the center logo covers about 4% of modules). |
| 5.3 | Low | Both chips are green. "Arrives in a second" isn't a "safe/arrived" fact for receiving. It's fine under the color rule, but it's one chip more than this screen needs (see Simplify). | Remove the second chip: delete `<span class="chip green">Arrives in a second</span>` on line 284. |

### 06 · Save

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 6.1 | Critical | See C-1 and 4.1. The goals total $4,280, exactly the Home balance, and nothing says whether goal money is inside or outside the balance. | After the h1 on line 299, add: `<div class="label" style="margin-top:-10px">$4,280 set aside in goals, separate from your balance</div>`. |
| 6.2 | High | This breaks the color rule. "School fees" uses sky (which means local currency) and "First home" uses amber (which means check this) for their tiles and bars. | Lines 310-311: tiles `background:var(--sage1);color:var(--moss)`. Bars `<i style="width:43%">` and `<i style="width:22%">` (default moss). Remove the `#D9A441` and `var(--sky)` fills. |
| 6.3 | High | Vault/goal naming is split. The screen says "New goal", but APP_HANDOFF.md says "vaults, New vault" and "7. Vault", and the figcaption on line 357 says "7 · Vault". COPY_DECK flag 10 allowed the rename only if it changes everywhere. | Keep "goal". Update APP_HANDOFF.md lines 44-45 ("goals, New goal"; "7. **Goal**"), the HTML comment on line 326 `<!-- Goal detail -->` and figcaption line 357 `<b>7 · Goal.</b>`. |
| 6.4 | Medium | The card title "What $1,000 was worth a year later" mixes two measures. $1,000 is nominal dollars. $321 is what the pesos could buy against Argentine prices. The note doesn't say that. | Line 306: `Saved in January 2023. Prices in Argentina rose 211% that year (INDEC), so the pesos bought what $321 had bought in January.` |
| 6.5 | Medium | The goals have no targets. "Rainy day" shows its target on screen 7 ($2,000), but the list doesn't, so the bars can't be read (First home at 22% implies an odd $9,909 target). | Add `<div class="t2">of $2,000</div>` under each name with round targets: Rainy day `of $2,000`, School fees `of $2,000`, First home `of $10,000` (bar `22%` → `21.8%`). |
| 6.6 | Medium | The Rainy day icon is the shield, the same glyph as the Security tab and the scam check. A shield should mean protection only. | Line 309 and line 333: use `#leaf` or a new `#umbrella` symbol. |
| 6.7 | Low | The "New goal" button floats about 380pt below the list with nothing in between. | `margin-top:8px` instead of `margin-top:auto` on line 313, so it sits under the list. |

### 07 · Goal (Vault)

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 7.1 | High | "Round-ups · Save the change from every purchase" promises something the product can't do. Nest has no card or spending rail, so there are no purchases to round up, and round-ups aren't in the APP_HANDOFF feature list ("don't build beyond this list"). | Remove the round-ups card (line 339-341) and the two "Round-up" rows. Replace them with a real rule the product can run: toggle title `Auto-save`, sub `Move $10 here every Friday`. Rows: `Auto-save · Friday +$10.00`, `Added · Wednesday +$50.00`. |
| 7.2 | Medium | The header title "Goal" is a 13px gray `.label`. On Receive (screen 5) the header title is `.t1` 16px ink, so the two don't match. | Line 331: `<span class="t1">Rainy day</span>`, and remove the duplicate `.h2` "Rainy day" on line 334. Or keep the h2 and drop the header word. |
| 7.3 | Low | "This week" lists "Friday". With "today" being Sunday (from screen 11), Friday is this week only if weeks start on Monday. | Use `Last 7 days`. |
| 7.4 | Low | "Withdraw" is ambiguous (to where?). | `Move to balance`. |

### 08 · Send to

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 8.1 | High | Tío Luis's avatar (`shop.jpg`, line 71) shows shop shelves, not a face. It's the same on 16. "Faces first" fails for him. | Change the crop: `.luis{background-size:180%;background-position:…}` on a frame with his face. If shop.jpg has no usable face, use a different photo or initials `TL` on `var(--sage1)`. |
| 8.2 | High | See 4.3. "Daniel" shows a woman. | As in 4.3. |
| 8.3 | Medium | A never-paid number appears under "Recent". It can't be recent if Ana has never paid it. | Move it out of the list into a search-result state: put `+54 9 11 5555 0142` in the search field (line 371) and show the row under a label `Not in your contacts`. |
| 8.4 | Medium | There's no way back or out. The screen has no close/back control and no tab bar. | Before the h1, add a close button (44×44) at the top left, or present the screen as a sheet with a grabber. |
| 8.5 | Low | The "New" tile label is ink-400 on page (3.35:1). | Covered by X-5. |

### 09 · Amount

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 9.1 | High | The peso value shows as fact with no source. The rate is an example (Pyth has no ARS feed), but "≈ ARS 242,500" looks live. Same on 4, 10 and 3. | See X-4. Line 400: `≈ ARS 242,500 · example rate`. |
| 9.2 | Medium | Missing available balance. Ana can't see what she can send, and there's no state for over-balance. | Under the ARS line, add `<div class="label" style="margin-top:4px">$4,280.12 available</div>`. If the amount is over the balance, replace it with amber `More than you have` and disable Review. |
| 9.3 | Medium | The back button touch target is 24pt. | As in 5.1. |
| 9.4 | Low | The keypad `.` key and `⌫` use different visual weights. `⌫` at 22px is a system glyph, not Figtree. | Use an SVG delete icon at 26px, stroke 2. |

### 10 · Confirm

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 10.1 | High | "Undo · Not needed. You've paid her before." frames a missing protection as unnecessary, and the value is two sentences squeezed into a key-value row. | Line 429: `<span>Undo</span><span>Off. You've paid her before.</span>`. |
| 10.2 | Medium | "Slide to send" has no tappable fallback for VoiceOver/Switch Control (Case study screen 10 requires one). | Under line 435, add `<button class="btn ghost" style="height:44px">Send with Face ID</button>`, or set `accessibilityActions` on the slider. Note it in the handoff. |
| 10.3 | Medium | "Face ID confirms when you let go" is ink-400 13px (3.8:1 on white). | Covered by X-5. |
| 10.4 | Low | The "Arrives / About a second" row wording differs from the chips' "Arrives in a second". | `In about a second` in the chips (5, 9) and here, or `About a second` everywhere. |

### 11 · Arrived

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 11.1 | Medium | The receipt is too thin for a bank-like product: there's no recipient, no reference number and no full date. "Sunday, 9:41 PM" will be ambiguous in a week. | Rows: `To · Mamá (Rosa Martínez)`, `Amount · $250.00`, `Fee · $0.00`, `When · Sun, Nov 8, 9:41 PM`, `Reference · NST-7F3K2`. Nov 8, 2026 is a Sunday. |
| 11.2 | Medium | "It got there in 0.9 seconds." must come from the measured time (COPY_DECK flag 7). Home says "0.9s" and this says "0.9 seconds". | Bind both to the same measured value. Home: `Arrived in 0.9 s`. Or keep "0.9s" on Home and use "0.9 seconds" here, but from one variable. |
| 11.3 | Low | The status bar reads "9:41" and the receipt reads "9:41 PM". That's consistent only if the status bar is PM, and the demo will be seen next to a real phone clock. | Use the real time in the build. In mockups this is fine. |
| 11.4 | Low | The birds at 40-50% moss opacity are close to the page color (decorative). That's fine, but they're placed asymmetrically (left 60px, right 300px) and they look like stray marks at 1x. | Group them as a flock top-left (left 60/96/124px) or remove them. |

### 12 · Scam check

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 12.1 | Critical | See C-3. After "Hold to send anyway", the demo flow goes straight to Undo (13). The riskiest payment in the app skips the Face ID confirm sheet that a trusted payment to Mamá gets. | "Hold to send anyway" opens the Confirm sheet (10) with the row `Undo · On for 24 hours` and Face ID. Update the APP_HANDOFF.md demo flow: `8 (new number) → 9 → 12 → send anyway → 10 → 13 → Undo → 4`. |
| 12.2 | High | The quoted message "Ana, it's Mamá. New number." and "They want it sent right now" only exist if Ana pasted the message (NEST_FEATURES #3). No screen shows that paste step, so as drawn the app appears to read her texts. | Above the reasons card, add `<div class="label">From the message you pasted</div>`, and design the paste step on screen 8 (a row: `Got a message asking for money? Check it first`). Without a pasted message, show only reason 1. |
| 12.3 | High | Wrong icon. A shield with a check mark (the "safe" glyph, used on Security) heads a "might be a scam" screen. | Line 480: replace `#shield` with a new `#alert` symbol: `<symbol id="alert" viewBox="0 0 24 24"><path d="M12 3 2.5 20h19Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M12 10v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></symbol>` |
| 12.4 | Medium | The screen never says who or how much. Ana decides without seeing "$500 to +54 9 11 5555 0142". | Under the h1, add `<div class="muted" style="font-size:17px">$500.00 to +54 9 11 5555 0142</div>`. |
| 12.5 | Medium | The quote doesn't match the story docs. COPY_DECK A12.3 and VIDEO_SCRIPT say "Mamá, it's me. New phone." and the screen says "Ana, it's Mamá. New number." VIDEO_SCRIPT says they must match word for word. The deck's version is in the wrong voice: Ana is the one sending, so the scammer pretends to be Mamá writing to Ana. | Keep the screen's line 485 (`“Ana, it's Mamá. New number.”`). Update COPY_DECK A12.3 and the VIDEO_SCRIPT hook to the same words. |
| 12.6 | Low | Straight quotes `"…"` are used. | Use curly quotes `“…”`. |
| 12.7 | Low | The note "If you send it, you can still undo it for 24 hours." is ink-400 13px (3.35:1). | Covered by X-5. |

### 13 · Undo

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 13.1 | High | The ring contradicts the timer. `stroke-dashoffset="18"` of 565.5 shows about 3% elapsed (about 46 min), but the timer says 23:59:12 (48 s elapsed, 0.06%). | Line 507: `stroke-dashoffset="0.31"` (565.5 × 48 / 86,400). In the build, compute `565.5 * elapsed / 86400`. |
| 13.2 | High | Layout bug. The key-value row "If you do nothing / It goes to them Monday, 9:41 PM" wraps to two lines on both sides and inherits `text-align:center` from `.body`, so the label is centered and "PM" sits orphaned. | Line 87: `.kv{…;text-align:left;gap:16px}` and `.kv span:last-child{…;text-align:right}`. Line 516: `<span>Goes to them</span><span>Mon 9:41 PM</span>`. |
| 13.3 | High | This breaks the color rule. Money on hold to a suspected scammer is drawn as a moss (safe) ring, while the status beside it says amber "On hold". | Line 507: track `stroke="#F6EBD3"`, progress `stroke="#8A5A10"`. |
| 13.4 | Medium | There's no state for after the window closes or after a successful undo. The handoff relies on Home's row, but the screen itself has no "Undone · $500 is back in your balance" result. | Add an Undone state: the moss check over the "?" avatar, `$500 is back in your balance.` and a dark `Done`. |
| 13.5 | Low | The headline "You have 24 hours to undo this." will be wrong at 23:59:12 and later. | `You can undo this until Mon 9:41 PM.` Then remove the "If you do nothing" row (see Simplify). |

### 14 · Security

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 14.1 | High | The safe word rule contradicts the spec. The screen says "For sends over $500". NEST_FEATURES #2 says the safe word gates **early release from the undo window**. COPY_DECK flag 5 already raised this. | Line 543: `<div class="t2">To release a held payment early</div>`. Update APP_HANDOFF.md line 56 to match. |
| 14.2 | Medium | Face ID has an on/off toggle. Face ID/passkey is the only way into the account, so "off" has no defined meaning and would read as "no lock". | Replace the toggle with a chevron (line 540), with the row value `On`. |
| 14.3 | Medium | Wrong icon. The Face ID row uses the `#user` glyph, which is also the "You" tab. | Use `#faceid` scaled to 22px: `<svg class="icon" viewBox="0 0 72 72"><use href="#faceid"/></svg>`. |
| 14.4 | Low | The Trusted contact row uses a 40px avatar where the other rows use 44px tiles, so its text starts about 4pt left of the others (visible in the PNG). | Line 544: `<span class="avatar rosa" style="width:44px;height:44px">`. |
| 14.5 | Low | "Only you can move your money." is an approved line, but it isn't fully true while the trusted contact can co-approve and Circle can freeze. That's acceptable as a headline. Make sure the disclosure (C-2) is one tap away. | Make the card tappable → disclosure sheet (same text as 1.2). |

### 15 · Sent by text (No Wi-Fi)

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 15.1 | High | The status bar contradicts the story. "SOS" means no carrier service (emergency calls only), so a text message **can't** be sent. The screen says "We sent it by text message." | Line 566: show full-opacity signal bars with no Wi-Fi icon and no SOS: `<svg width="18" height="12"><use href="#signal"/></svg><svg width="27" height="13"><use href="#battery"/></svg>`. |
| 15.2 | Medium | The outcome is ambiguous. "On its way" is never resolved: no screen or row says when it arrived. Screen 16 still lists it as "Sent by text". | Define the follow-up: the row becomes `Arrived · sent by text` once the relay confirms, plus a notification `Mamá has your $250.`. |
| 15.3 | Medium | The row "Signed · On this phone, with Face ID" explains the mechanics, which breaks the "never explain the mechanics on screen" rule. | Delete line 576. |
| 15.4 | Medium | The note "No signal at all? It waits on your phone…" uses the question-then-snap pattern Martha cut ("Sent anyway? …"), and it describes a different scenario (screen 16's job). | Delete line 580. Screen 16 already covers it. |
| 15.5 | Low | The headline wraps to an orphan "Mamá." | Shorten: `Your $250 is on its way.` (the avatar already shows Mamá). Or `font-size:30px`. |

### 16 · Waiting to send (offline)

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| 16.1 | High | "You can keep sending." But the screen has no Send action and no tab bar, so there's no way to do what the note says. It's a Home variant that drops Home's structure. | Build this as the Home screen (4) in its offline state: the same balance card, actions (Send stays dark) and tab bar, with the amber `Offline` chip in the header and the queued card above Activity. |
| 16.2 | High | Missing balance. Offline, Ana can't see what she has, or that $80 is already committed. | Show the last known balance with `Updated 9:12 PM`, and a line `$80.00 waiting to send`. |
| 16.3 | Medium | "Ready to send" reads as though Ana must act, and the queued status wraps to three lines. | Line 602: `<div class="t2" style="color:var(--amber)">Waiting for signal</div>`. The footnote (line 612) already explains the rest. |
| 16.4 | Medium | "Sent by text · No fee" doesn't say whether Mamá has it (see 15.2). It also contradicts Home (4), where the same $250 to Mamá is "Arrived in 0.9s". If sample data is shared, the same payment has two histories. | Use one fixture per scenario. In the offline fixture, the row reads `Arrived · sent by text`. |
| 16.5 | Low | The footnote is 12px ink-400 floating at the bottom. | `.note` 13px (X-5). Move it under the queued card. |

---

## Cross-screen issues

| ID | Sev | Issue | Exact fix |
|---|---|---|---|
| C-1 | Critical | Balance vs goals (4.1, 6.1). The goals total exactly the balance. | Goals are separate. Add "$4,280 set aside in goals, separate from your balance" on Save, and "$4,280.12 available" on Amount. Optionally change First home to $2,480 so the totals no longer coincide. |
| C-2 | Critical | No disclosure anywhere in 16 screens. The handoff's "Honest limits" (not bank deposits, not FDIC insured, issuer can freeze) appear nowhere in the app, while Welcome says "A US dollar account" and Home says "Held in US dollars". | 1.2 (Welcome note), plus make the Home chip "Held in US dollars" tappable to a sheet with COPY_DECK F4 + F5 text word for word. Also add a "Disclosures" row on the You tab. |
| C-3 | Critical | The risky send skips authentication (12.1). | Route 12 → 10 → 13. |
| C-4 | Critical | The absolute "no fees" claim (1.1). "No fee" chips on 5 and 9 are scoped to send/receive and are fine. Welcome isn't scoped. | 1.1. |
| X-1 | High | APP_HANDOFF.md is out of date against the HTML, and each says it's the source of truth (handoff line 3, HTML comment line 9). Stale handoff strings: "Dollars. 24/7. No fees.", "Your face is your password.", "$0 fee", "Undone · money returned", "Saved stays saved.", "New vault", "Vault", "New · undo on for 24h", "Arrives in ~1s", "Arrived in 0.9s." / "Mamá has it.", "Wait. This looks like a scam.", "Sent. Undo anytime in 24h.", "Held safely", "Undo payment", "Ready to send", and "(sends over $500)". The "Approved lines" list also still includes lines Martha cut ("Send it all. Keep it all.", "Scammed? Undo it.", "Saved stays saved.", "Your money answers to you."). | In APP_HANDOFF.md, replace the screen list (lines 36-60) with the HTML strings and remove the cut lines from "Approved lines" (line 100). Change line 101's status words to `"Arrived", "Undone · money back", "Held in US dollars", "No fee"`. State once: "Copy: the HTML wins. Tokens: the table below wins." |
| X-2 | High | The color tokens differ between handoff and CSS: amber `#9A6412` (handoff) vs `#8A5A10` (CSS line 19), and line `#DDD7CA` vs `#E3DED3` (line 17). The handoff amber fails AA on amber-100 (4.2:1); the CSS amber passes (5.0:1). | Handoff line 80: `#8A5A10`. Line `#E3DED3` in both (or `#DDD7CA` in both; pick one). |
| X-3 | Medium | Off-token colors are hard-coded: `#5FA8D6` (pesos line/bar), `#235C7D` (sky text), `#D9A441`, `#A3AAA4`, `#1C2A22`, `#4B3507` (scam text), `#D9D4C8` (toggle off), and `--clay`/`--clay1` (a red-orange, unused, which contradicts the no-red rule). | Add `sky-500 #5FA8D6` and `sky-700 #235C7D` to the handoff token table. Replace `#A3AAA4` → `var(--ink6)`, `#4B3507` → `var(--ink)`. Delete `--clay`/`--clay1` from line 19. Remove `#D9A441` (6.2). |
| X-4 | High | Peso values (3, 4, 9, 10) all use a hard-coded example rate with no label. APP_HANDOFF.md says a live value "needs another source or stays 'Example'". | Until a real ARS source is wired up, append `· example rate` to the Amount line (9.1). On Home, add the chip tooltip/sheet `Example rate: 970 pesos per dollar`. In the build, keep one `ARS_RATE` constant and one `isExampleRate` flag. |
| X-5 | High | WCAG AA fails on the most-used text color. ink-400 `#7C857E` is 3.35:1 on page `#F3F0EA` and 3.8:1 on white. It's used for `.label`, `.t2`, `.note`, `.kv` keys and tab labels on every screen. | Line 17: `--ink4:#646C66` (4.76:1 on page, 5.4:1 on white). Update the handoff token `ink-400` to `#646C66`. |
| X-6 | Medium | There are several sizes under 13px: `.note` 12px, `.chip` 12.5px, `.tab` 11px, and the chart legend 12px. | `.note`, `.chip` and the legend at 13px. Tab labels: 13px, or document an iOS exception in the handoff. |
| X-7 | Medium | Capitalization after "·" is inconsistent: "Undone · Money back", "Sent by text · No fee", "Arrived in 0.9s · No fee" vs "Paid 12 times · last Sunday", "Ready to send · goes out…". | Lowercase after the dot everywhere: `Undone · money back`, `Arrived in 0.9s · no fee`, `Sent by text · no fee`. |
| X-8 | Medium | Fee wording: chips say "No fee", receipts say "$0.00", and the handoff and case study say "$0 fee". Speed: "Arrives in a second" (chips), "About a second" (Confirm), "0.9s" (Home), "0.9 seconds" (Arrived). | Rule: words in chips and statuses ("No fee", "In about a second"), numbers in receipts ("$0.00", "0.9 seconds"). Apply 10.4 and 11.2. |
| X-9 | Medium | Touch targets: back chevrons (5, 7, 9, 10) are 24pt and "See all" is about 17pt tall. | 5.1 and 4.8. |
| X-10 | Medium | Tab bar: present on 4, 6 and 14, missing on 16 (an offline Home). The "You" tab has no screen, but the disclosures and the profile need a home. | 16.1. Add a minimal You screen (name, @handle, Disclosures, Sign out) or remove the tab for the demo. |
| X-11 | Low | Name and face: Rosa's photo (`selfie.jpg`) includes a child cheek to cheek. At 40-44px the child's face competes with Rosa's. | `.rosa{background-size:360%;background-position:40% 44%}` to center on Rosa. |
| X-12 | Low | COPY_DECK.md says it covers "the 14 app screens". There are 16, and screens 15-16 have no copy-deck entries. | Ask Martha to add A15 and A16 to the deck. |
| X-13 | Low | The demo script (PITCH_PLAYBOOK line 82) says the new-number row reads "First payment, undo on for 24h". The screen says "New · 24 hours to undo". | Update PITCH_PLAYBOOK line 82 to the screen string. |
| X-14 | Low | Figcaptions on 4 and 6 still use the tag "Inflation-proof", which COPY_DECK flag 2 retired. | Lines 262 and 323: `<span class="tag">Dollar savings</span>`. |

### Missing states (short; bank basics are covered separately)
- **Amount:** an over-balance state, and the first payment to a new number over a set amount (the amber "Undo on for 24h" chip, per the case study).
- **Send failed / network error** after "Slide to send" (online), with money not taken.
- **Undo:** a done state (13.4), a window-expired state, and a recipient-side view (Rosa sees "On hold until Mon 9:41 PM").
- **Offline:** a queued payment failing on reconnect (for example insufficient balance by then), and a cancel option for a queued payment.
- **Face ID failed / not enrolled**, with a passcode fallback, plus lost-phone recovery (2.2).
- **Claim link:** expired or already claimed, and a wrong phone number.
- **Scam check:** the paste-a-message entry point (12.2), and a "Checked: no red flags" result (NEST_FEATURES line 151).

---

## Simplify (what to cut)

1. **Receive:** drop the "Arrives in a second" chip. Receiving speed doesn't help Ana, and one chip ("No fee to receive") is enough.
2. **Home:** drop the "Held in US dollars" chip *or* the chart legend. Both say the same thing as the moss line. Keep the chip (it's the disclosure entry point, C-2) and drop the legend text `In dollars · same money in pesos`. Move the line meaning into the aria-label and a tap.
3. **Goal (7):** remove round-ups entirely (7.1) and the duplicate title (7.2). The screen should do one job: show the goal and add money.
4. **Undo (13):** cut the "If you do nothing" row once the headline carries the release time (13.5). Three rows: To, Amount, Status.
5. **Sent by text (15):** cut the "Signed" row and the no-signal note (15.3, 15.4). That leaves two rows: Sent by, Fee.
6. **Waiting to send (16):** fold it into Home's offline state (16.1) instead of keeping a separate screen layout.
7. **Confirm (10):** drop "Face ID confirms when you let go". The slider plus the system Face ID prompt explain themselves, and the text fails contrast.
8. **Save (6):** the source note can be one tap down (case study: "Tap the source line"). Keep the card title, the bars and `INDEC, 2023` as a 13px link.
9. **Arrived (11):** the birds are optional. Remove them if they still read as stray marks at 1x.
