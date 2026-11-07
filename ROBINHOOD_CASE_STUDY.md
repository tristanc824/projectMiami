# Robinhood design case study, for Nest

Prepared Nov 7, 2026. Every claim links to its source. Source dates are in the list at the end. Anything I could not confirm is marked **[unverified]**.

---

## 1. The short answer

Robinhood feels simple because each screen answers one question, usually with one big number and one line, and keeps everything else one tap away. It cut the costs and jargon that made investing feel like it was for other people (no commissions, no minimums, no "stodgy" broker screens) ([Robinhood, 2021](https://robinhood.com/newsroom/the-top-secret-robinhood-design-story)). It swapped expert tools like options tables for the few numbers a person actually decides on, such as breakeven, max loss and a profit/loss picture ([Robinhood, 2018](https://robinhood.com/newsroom/introducing-multi-leg-options-strategies/); [Robinhood support](https://robinhood.com/us/en/support/articles/profit-loss-chart)). It used color and motion in the same way everywhere, so people learn the app once ([Fortune, 2024](https://fortune.com/2024/07/30/robinhood-vlad-tenev-trading-investing-wealth-management-ai-blockchain/)). The same lack of friction also got it into trouble. Confetti, scratch-off rewards and push nudges led to a Massachusetts complaint and a $7.5M settlement ([InvestmentNews, 2024](https://www.investmentnews.com/regulation-legal-compliance/robinhood-to-pay-75m-to-settle-massachusetts-charges/248214)). Nest should copy the clarity and leave out the excitement.

---

## 2. The principles

| # | Principle | What Robinhood does | Why it works | Source |
|---|---|---|---|---|
| 1 | **One number, then one line** | The portfolio page leads with today's return in dollars and percent above a single line chart. | People read one number before anything else. The line adds direction ("am I okay?") with no reading needed. | [Robinhood support: Using charts](https://robinhood.com/support/articles/using-charts); [Google Design](https://design.google/library/robinhood-investing-material) |
| 2 | **Color means one thing, always** | Green for up, red for down, on charts, lists and the old Trade button. In 2024 leadership kept these colors because changing them would add "cognitive load". | Fixed meanings get learned once and then read without effort. | [Fortune, 2024](https://fortune.com/2024/07/30/robinhood-vlad-tenev-trading-investing-wealth-management-ai-blockchain/); [Pratt IxD, 2025](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/) |
| 3 | **The screen changes with the state** | The background used to be white during market hours and grey after hours. The large price and its graph animate when the value changes. | State you can see saves a lookup and stops mistakes such as trading after hours without knowing it. | [Google Design](https://design.google/library/robinhood-investing-material) |
| 4 | **Progressive disclosure** | The creative director (Zane Bevan) described showing a little up front and letting people dig in. Cards expand to full screen from the point you tapped. The options chain has a simple "focused" view (calls *or* puts) and a "side-by-side" view for advanced users. | Beginners see a short screen and experts are still one tap from depth. Expanding from the tap point keeps people oriented. | [Google Design](https://design.google/library/robinhood-investing-material); [Robinhood support: Options chain](https://robinhood.com/us/en/support/articles/options-chain) |
| 5 | **Swap jargon for the decision numbers** | In 2018 Robinhood replaced "traditional, complicated options tables" with a design that puts the key information first. The chain shows *Breakeven* and *To breakeven %*. A P/L chart shows max profit, max loss and breakeven before you enter. Since 2025, simulated returns show a range of outcomes before you order. | Options are hard because of the vocabulary. Each number here answers a plain question: what do I need the stock to do, and what can I lose? | [Robinhood, 2018](https://robinhood.com/newsroom/introducing-multi-leg-options-strategies/); [Chain metrics](https://robinhood.com/us/en/support/articles/options-chain-metrics); [P/L chart](https://robinhood.com/us/en/support/articles/profit-loss-chart); [Robinhood, 2025](https://robinhood.com/us/en/newsroom/introducing-robinhood-legend-charts-on-mobile/) |
| 6 | **Each button does one thing** | The redesign replaced one "Trade" dropdown with three buttons: Buy, Sell, Options. Buy is filled and Sell is outlined, and the buttons show live prices. | Natural mapping: no hidden step and no guessing. The live price on the button gives feedback right where you press. | [Pratt IxD, 2025](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/) |
| 7 | **A deliberate last gesture** | Orders are placed with a swipe up rather than a tap. | A swipe is harder to trigger by accident than a tap, so it marks the commit moment. *Caveats:* critics say it made trading too easy ([Mother Jones, 2021](https://motherjones.com/media/2021/10/robinhood-trading-app-design-ui-ux-video)), and VoiceOver users reported trouble with it ([AppleVis thread](https://www.applevis.com/comment/122132), anecdotal). | [Mother Jones, 2021](https://motherjones.com/media/2021/10/robinhood-trading-app-design-ui-ux-video) |
| 8 | **Motion confirms what happened** | Snackbars confirm watchlist changes. A slim progress bar shows processing without blocking. Touch ripples reassure people while they enter personal details. | Feedback at the moment of action answers "did it work?", which is the main worry in a money app. | [Google Design](https://design.google/library/robinhood-investing-material) |
| 9 | **Friendly copy based on research** | The stated aim is design "that doesn't intimidate you, that isn't condescending" (Alex Bond, Product Design Manager). The Retirement team tested value-prop wording with users and paired it with custom illustration, animation and haptics in sign-up. | People trust a voice that sounds like a person. Copy tested with users beats copy written for executives. | [Robinhood, 2021](https://robinhood.com/newsroom/the-top-secret-robinhood-design-story); [Robinhood, 2023](https://robinhood.com/us/en/newsroom/robinhood-retirement-through-the-eyes-of-research-creative-and-design) |
| 10 | **Less is more, one accent** | The 2024 identity is black, white and neutrals, with "Robin Neon" used sparingly. The stated aim is a cleaner, less distracting experience so customers can focus on financial decisions. The team also worked on removing the loading icon and cites Tufte as its data-display reference. | When there is only one accent, wherever it appears is the most important thing on screen. | [Robinhood, 2024](https://robinhood.com/newsroom/a-new-visual-identity); [Fortune, 2024](https://fortune.com/2024/07/30/robinhood-vlad-tenev-trading-investing-wealth-management-ai-blockchain/) |
| 11 | **Familiar platform patterns** | Apple's 2015 award praised a "clean, content-centric design" that balanced brand with iOS conventions. Robinhood's policy page says it uses familiar mobile design "to meet users where they are". | Using conventions people already know means less to learn. Brand lives in the details, not in new kinds of controls. | [TechCrunch, 2015](https://techcrunch.com/2015/06/08/fantastical-2-workflow-robinhood-among-winners-at-apple-design-awards); [Robinhood policy, upd. 2026](https://www.robinhood.com/us/en/policy/design) |
| 12 | **Gestures add power without adding buttons** | Mobile charts (2025) use pinch-to-zoom and swipe-to-pan instead of extra controls, and long-press to scrub. | Depth sits behind gestures, so the default screen stays clean. | [Robinhood, 2025](https://robinhood.com/us/en/newsroom/introducing-robinhood-legend-charts-on-mobile/); [Advanced charts](https://robinhood.com/us/en/support/articles/using-advanced-charts) |

---

## 3. Screen-by-screen notes

| Flow | What's on screen | The move that matters | Source |
|---|---|---|---|
| **Home / portfolio** | Portfolio value, today's return in $ and %, line chart with timeframes (1D, 1W, 1M...), holdings as cards. A newer version adds a customizable widget dashboard. | One number and one line, with green or red set by overall performance. Critics noted there is no allocation view. | [Using charts](https://robinhood.com/support/articles/using-charts); [Google Design](https://design.google/library/robinhood-investing-material); [Pratt IxD, 2025](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/); [HOOD Summit 2025 search result; dashboard page undated, **unverified date**](https://robinhood.com/us/en/support/articles/hood-summit-product-announcements) |
| **Stock detail** | Large price, line chart (or candlestick in settings), timeframes from 1D to MAX, "Show all hours" toggle, news. | Chart type and hours sit behind a gear icon, so the default stays a plain line. | [Using charts](https://robinhood.com/support/articles/using-charts) |
| **Buy / trade** | Buy, Sell and Options buttons with live prices, an order screen, then swipe up to submit. | Direct actions plus a deliberate commit gesture. | [Pratt IxD, 2025](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/); [Mother Jones, 2021](https://motherjones.com/media/2021/10/robinhood-trading-app-design-ui-ux-video) |
| **Options** | Focused or side-by-side chain, with Breakeven and To breakeven % columns. Tap Bid to sell and Ask to buy. P/L chart, pre-trade simulated returns, Strategy Builder. | Plain decision numbers instead of a traditional table. After a customer's death in 2020 it added eligibility limits and more education. | [Options chain](https://robinhood.com/us/en/support/articles/options-chain); [Chain metrics](https://robinhood.com/us/en/support/articles/options-chain-metrics); [P/L chart](https://robinhood.com/us/en/support/articles/profit-loss-chart); [CNBC, 2020](https://www.cnbc.com/2020/06/19/robinhood-increases-guardrails-on-options-trading-in-the-wake-of-a-customer-suicide.html) |
| **Onboarding** | Animated card sequence with one contextual illustration per step (for example a checkbook for bank linking), a low-profile progress bar, and research-tested value props. A free-stock reward is tied to linking a bank. | One idea per card, with motion between steps. The reward is the part Nest should not copy (see section 4). | [Google Design](https://design.google/library/robinhood-investing-material); [Robinhood, 2023](https://robinhood.com/us/en/newsroom/robinhood-retirement-through-the-eyes-of-research-creative-and-design); [Mass. settlement coverage, 2024](https://www.investmentnews.com/regulation-legal-compliance/robinhood-to-pay-75m-to-settle-massachusetts-charges/248214) |
| **Account / security** | Notifications for transactions and account activity. Robinhood says these "weren't designed to prompt engagement". | Alerts carry information, not urges. Regulators disagreed about some of them (section 4). A 2021 breach was part of the Massachusetts order. | [Robinhood, 2021](https://robinhood.com/newsroom/the-top-secret-robinhood-design-story); [InvestmentNews, 2024](https://www.investmentnews.com/regulation-legal-compliance/robinhood-to-pay-75m-to-settle-massachusetts-charges/248214) |
| **Brand surfaces** | 2024 identity (neutral palette with one accent), Gold Card in stainless steel at 17g and a 36g solid gold edition. | The physical product carries the same craft. | [Robinhood, 2024](https://robinhood.com/newsroom/a-new-visual-identity); [CompoSecure, 2024](https://www.composecure.com/composecure-news/partnership-with-composecure-supported-robinhoods-groundbreaking-gold-payment-card-offering) (secondary; I did not find Robinhood's own post) |

---

## 4. What not to copy

Nest sells trust, not activity. The Robinhood lessons below cost more for a savings and remittance app than for a broker, because a person who feels tricked once will move their money and tell their family.

| Don't | What happened | Nest rule |
|---|---|---|
| **Confetti and celebration for actions** | Confetti on first trades and referrals was cited by Massachusetts and criticized in Congress. Robinhood removed it on Mar 31, 2021. | No confetti, streaks or badges. "Arrived" uses a quiet check, a haptic and the facts. ([CNBC, 2021](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html)) |
| **Chance-like rewards** | Scratch-off visuals and free-stock rewards were in the complaint. The 2024 order bans features "that mimic games of chance". | No lottery-style referral prizes. If Nest rewards anything, use a fixed, stated amount. ([InvestmentNews, 2024](https://www.investmentnews.com/regulation-legal-compliance/robinhood-to-pay-75m-to-settle-massachusetts-charges/248214); [Mother Jones, 2021](https://motherjones.com/media/2021/10/robinhood-trading-app-design-ui-ux-video)) |
| **Engagement nudges** | The order restricts push notifications for certain lists. The SEC's 2021 inquiry named behavioral prompts, game-like features, streaks, points and notifications as "digital engagement practices". | Push only for money that moved, money at risk (undo window ending) or security events. Never "come back" pushes. ([SEC, 2021](https://www.sec.gov/news/press-release/2021-167)) |
| **Taking friction out where it protects people** | Swipe-to-trade made trading feel effortless, and critics tied that to overtrading. One inexperienced customer made over 12,700 trades in about six months. | Make sending fast, and add friction only where risk is real: new recipients, large amounts, scam signals. ([Mother Jones, 2021](https://motherjones.com/media/2021/10/robinhood-trading-app-design-ui-ux-video); [InvestmentNews, 2020](https://investmentnews.com/fintech/robinhood-accused-of-manipulating-customers-by-massachusetts-regulator/200482)) |
| **Showing a scary number with no context** | In 2020, 20-year-old Alex Kearns saw a negative cash balance of about $730,000 that reports say was likely temporary, and he died by suicide. | Never show a pending, partial or negative state without plain words saying what it means and what happens next. ([NBC Chicago](https://www.nbcchicago.com/news/local/family-sues-robinhood-after-naperville-college-student-died-by-suicide-thinking-he-owned-730k/2432893/?amp=1)) |
| **Silent restrictions** | During GameStop (Jan 2021), the stock vanished from search and the Buy button was disabled with a vague message, with no reason and no duration. | When Nest blocks or holds anything, say why, for how long and what the person can do instead. ([TechCrunch, 2021](https://techcrunch.com/2021/02/01/5-rushed-ux-changes/)) |
| **Unreliable "always on"** | The Massachusetts complaint cited frequent outages. | "Always open" is a promise. Show honest status if the network or a provider is slow. ([InvestmentNews, 2020](https://investmentnews.com/fintech/robinhood-accused-of-manipulating-customers-by-massachusetts-regulator/200482)) |

---

## 5. Apply to Nest

Nest's mockups already follow several of these principles: one dark button per screen, short copy, faces first, and the safe choice as the dark button on Scam check. The changes below sharpen them. Impact is ranked **High / Med / Low**. Earth palette, Figtree, flat surfaces and the approved lines stay as they are.

**Color rule for all screens (from Principle 2).** Moss means safe, arrived or held in dollars. Amber means check this. Sky means local currency. Ink-400 means the past or "what pesos would have bought". Never use red, and never use green-vs-red performance coloring, because a dollar balance is not a trade.

### Start

**1. Welcome**
- **Med.** Keep the one line and two buttons. Under "Dollars. 24/7. No fees." add nothing more. Everything else belongs to later screens (Principle 1).
- **Low.** Add a three-dot, low-profile progress indicator across Welcome → Face ID → Home so people know setup is short (Principle 8).

**2. Face ID setup**
- **Med.** Add one quiet text link: "Lost your phone?" It opens a sheet that says recovery goes through your trusted contact. This answers the first fear about passkeys without filling the screen (Principle 4).
- **Low.** After success, show the face icon filling in moss with a haptic. No celebration (Principle 8, section 4).

**3. Claim link**
- **High.** Put the sender's face and name above the amount ("Ana Martínez · @ana"), and show "≈ ARS 242,500" under "$250". The face makes it look less like a phishing message, and the peso value answers "what is this to me?" (Principles 1, 5).
- **Med.** Add one honest line under the button: "Nest will never ask for a code or password." It is cheap protection against fake claim links.

### Everyday

**4. Home**
- **High.** Lead with one number ($4,280.12), then one 1-year line: a moss line for the value held in Nest and a dashed ink-400 line for the same money held in pesos. Label the gap in one phrase, such as "In pesos: $[X]", where X is computed from the sourced inflation series. Do not hard-code a figure. Add timeframe chips 1M · 1Y · All, and long-press to scrub, which shows the date and both values. This turns "inflation-proof" from a claim into something people can see. Robinhood's core move applied to Nest's core promise (Principles 1, 12).
- **High.** Keep "Example rate" visible on the chart until a real ARS source exists. Pyth has no ARS feed, so the rate is not live. Showing that honestly is the trust lesson from section 4.
- **Med.** Animate the balance on change by rolling only the digits that changed, then settling. Do this only when money arrives, not on every load (Principle 3).
- **Med.** Activity rows already speak plainly ("Arrived in 0.9s · $0 fee"). Make a pending undo row amber with a live countdown ("Undo · 23h left"), so the one row needing attention stands out (Principles 2, 3).

**5. Receive**
- **Low.** Already minimal. Add a small "Request an amount" text link that adds an amount to the shared link, hidden by default (Principle 4).

**6. Save**
- **Med.** Replace the two static bars with the same chart style as Home, so the app uses one visual language. Show Jan to Dec 2023 with $1,000 in Nest against $321 in pesos, with the end values labelled on the lines. Tap the source line to see "INDEC, 211.4%" (Principles 1, 4).
- **Low.** Show vault progress bars in moss on sand, with no percentages or streak counts.

**7. Vault**
- **Med.** When a goal is reached, show a quiet moss check and "Rainy day is full." No confetti and no badge (section 4).
- **Low.** Show round-ups as one weekly total ("+$4.12 this week"), with the list one tap down (Principle 4).

### Send to Mamá

**8. Send to**
- **High.** Under each recent person, add one trust fact: "Paid 12 times · last Sunday". For a new number, keep "New · undo on for 24h" in amber. Familiar people look familiar and strangers look different, which is the scam defense at a glance (Principles 2, 3).
- **Low.** Show the search field's keyboard on numbers only when the input starts with "+".

**9. Amount**
- **High.** Make "≈ ARS 242,500" update live as each key is pressed, and show it as "Mamá gets ≈ ARS 242,500". This is the decision number, in the recipient's terms (Principle 5).
- **Med.** Rename "Review" to "Next". The real review happens on Confirm, so the word on this button should not promise a second step that adds nothing.
- **Med.** For a new recipient over a set amount, show the amber undo chip here too ("Undo on for 24h"), so the person knows before they commit.

**10. Confirm (Face ID sheet)**
- **High.** Replace the bare Face ID prompt with **"Slide to send"** in ink on the sheet. Sliding triggers Face ID. Keep a tappable fallback ("Send with Face ID") for VoiceOver and Switch Control, because a gesture-only control would repeat Robinhood's accessibility complaint (Principle 7).
- **High.** Add one row stating whether this payment can be undone: "Undo: on for 24h" for new recipients, or "Can't be undone" for saved people. Being clear about what can't be reversed matters more than speed in a money app (section 4).
- Keep the three rows (Fee, Arrives, She gets). They are already the decision numbers.

**11. Arrived**
- **Med.** Show a short live moment before the result: the timer counts up and stops at "0.9s", and the check fills in moss with a success haptic. Motion confirms the event (Principle 8). Birds stay small and static, with no confetti.
- **Low.** Have "Share receipt" produce a clean image with amount, ARS value and timestamp. Mamá's screenshot is marketing that Nest doesn't have to push.

### When it's a scam

**12. Scam check**
- **High.** Keep three reasons and "Don't send" as the dark button. Add one plain line saying what happens if they continue: "If you send, it waits 24h. You can bring it back." Never block silently (section 4, GameStop lesson).
- **Med.** Make "Send anyway" a press-and-hold (about 1 second) with a fallback for assistive tech. That is deliberate friction placed where risk is real (Principle 7, section 4).

**13. Undo**
- **High.** Allow only informational reminders: one push at 2h left ("$500 to +54 9 11... can still be undone for 2h"). No other nudges (section 4, SEC engagement practices).
- **Med.** After Undo, show the balance rolling back up and "Undone · money returned" in moss. The same words then appear on Home, so the story connects (Principle 3).

**14. Security**
- **Med.** Keep "Only you can move your money. Everything is on." as one status line at the top. If anything is off, the line turns amber and says which item ("Trusted contact not set"). It works like Robinhood's state-based background, applied to safety (Principle 3).
- **Low.** Put details such as passkey device or safe-word threshold one tap down. The rows show only name and current value (Principle 4).

---

## 6. Five changes to make first

1. **Home: one number plus a 1-year line comparing dollars held in Nest with the same money in pesos**, scrubbable and labelled "Example rate" until a live source exists. It makes the main promise visible.
2. **Confirm: "Slide to send" that triggers Face ID, with a tap fallback, plus an explicit undo row** ("Undo: on for 24h" or "Can't be undone").
3. **Send to: one trust fact per recipient** ("Paid 12 times · last Sunday") so new numbers stand out in amber before any money moves.
4. **Scam check and Undo: always say what happens next and why**, add press-and-hold on "Send anyway", and keep reminders informational only.
5. **One color and motion rule across the app**: moss = safe/arrived, amber = check, sky = local currency, no red, no confetti. Motion only to confirm money moved (digit roll, check fill, haptic).

---

## Sources and dates

| Source | Date | Type |
|---|---|---|
| [Robinhood: Apple celebrates Robinhood's design](https://robinhood.com/us/en/newsroom/apple-celebrates-robinhoods-design) | Jun 8, 2015 | Primary |
| [TechCrunch: Apple Design Award winners](https://techcrunch.com/2015/06/08/fantastical-2-workflow-robinhood-among-winners-at-apple-design-awards) | Jun 8, 2015 | Secondary |
| [Google Design: Robinhood investing material](https://design.google/library/robinhood-investing-material) | Undated (about 2016-17, inferred) | Secondary, quotes Zane Bevan |
| [Robinhood: Introducing options trading](https://robinhood.com/newsroom/introducing-options-trading/) | Dec 13, 2017 | Primary |
| [Robinhood: Multi-leg options strategies](https://robinhood.com/newsroom/introducing-multi-leg-options-strategies/) | Jun 13, 2018 | Primary |
| [CNBC: Options guardrails](https://www.cnbc.com/2020/06/19/robinhood-increases-guardrails-on-options-trading-in-the-wake-of-a-customer-suicide.html) | Jun 19, 2020 | Secondary |
| [InvestmentNews: Massachusetts complaint](https://investmentnews.com/fintech/robinhood-accused-of-manipulating-customers-by-massachusetts-regulator/200482) | Dec 16, 2020 | Secondary |
| [TechCrunch: 5 rushed UX changes (GameStop)](https://techcrunch.com/2021/02/01/5-rushed-ux-changes/) | Feb 1, 2021 | Secondary |
| [NBC Chicago: Kearns family lawsuit](https://www.nbcchicago.com/news/local/family-sues-robinhood-after-naperville-college-student-died-by-suicide-thinking-he-owned-730k/2432893/?amp=1) | Feb 2021 | Secondary |
| [CNBC: Robinhood removes confetti](https://www.cnbc.com/2021/03/31/robinhood-gets-rid-of-confetti-feature-amid-scrutiny-over-gamification.html) | Mar 31, 2021 | Secondary |
| [Robinhood: The top secret design story](https://robinhood.com/newsroom/the-top-secret-robinhood-design-story) | Apr 14, 2021 | Primary |
| [SEC: Digital engagement practices request](https://www.sec.gov/news/press-release/2021-167) | Aug 27, 2021 | Primary (regulator) |
| [Mother Jones: Robinhood design video](https://motherjones.com/media/2021/10/robinhood-trading-app-design-ui-ux-video) | Oct 7, 2021 | Secondary |
| [AppleVis: VoiceOver and swipe-up](https://www.applevis.com/comment/122132) | 2021 | User forum, anecdotal |
| [Robinhood: Retirement through research, creative and design](https://robinhood.com/us/en/newsroom/robinhood-retirement-through-the-eyes-of-research-creative-and-design) | Jun 7, 2023 | Primary |
| [InvestmentNews: $7.5M Massachusetts settlement](https://www.investmentnews.com/regulation-legal-compliance/robinhood-to-pay-75m-to-settle-massachusetts-charges/248214) | Jan 2024 | Secondary |
| [CompoSecure: Gold Card](https://www.composecure.com/composecure-news/partnership-with-composecure-supported-robinhoods-groundbreaking-gold-payment-card-offering) | May 9, 2024 | Manufacturer release |
| [Fortune: Tenev and the redesign](https://fortune.com/2024/07/30/robinhood-vlad-tenev-trading-investing-wealth-management-ai-blockchain/) | Jul 30, 2024 | Secondary |
| [Robinhood: A new visual identity](https://robinhood.com/newsroom/a-new-visual-identity) | Oct 10, 2024 | Primary |
| [Pratt IxD: Design critique, Robinhood iOS](https://ixd.prattsi.org/2025/02/design-critique-robinhood-ios-app/) | Feb 13, 2025 | Student critique |
| [Robinhood: Legend charts on mobile](https://robinhood.com/us/en/newsroom/introducing-robinhood-legend-charts-on-mobile/) | Jun 17, 2025 | Primary |
| [Robinhood support: Using charts](https://robinhood.com/support/articles/using-charts), [Options chain](https://robinhood.com/us/en/support/articles/options-chain), [Chain metrics](https://robinhood.com/us/en/support/articles/options-chain-metrics), [P/L chart](https://robinhood.com/us/en/support/articles/profit-loss-chart), [Advanced charts](https://robinhood.com/us/en/support/articles/using-advanced-charts) | Undated, live pages | Primary |
| [Robinhood policy: Design](https://www.robinhood.com/us/en/policy/design) | Updated Jul 2026 | Primary |

### Not verified
- **"Jaren Feeley" as a Robinhood design lead:** no source found. I also could not confirm a current head of design. Named people above are only those in sources: Baiju Bhatt (co-founder), Alex Bond (Product Design Manager, 2018), Zane Bevan (Creative Director, earlier era), Tim Scales (Creative Director, 2023), Michael Goodbody (VP Marketing, 2024), Madhu Muthukumar (head of product management, 2021), Dheerja Kaur (VP Product, per a [2025 podcast listing](https://audioscrape.com/podcast/insights-unlocked/episode/designing-products-people-trust-with-robinhoods-dheerja-kaur)).
- **Bloomberg's 2021 design feature and the BusinessWire options release:** both blocked (403). Not read, not cited for claims.
- **Mobbin, Page Flows, Built for Mars, Growth.Design:** no Robinhood teardown with checkable screen detail found. Not cited.
- **Robinhood's current (2026) home background colors and exact layout:** not confirmed by a dated source. The white/grey after-hours background comes from the older Google Design piece and may no longer ship.
- **Rationale for swipe-to-submit:** no official Robinhood explanation found. The reasoning in Principle 7 is mine and the critics'.
- **Date of the widget dashboard ("new app experience"):** support page undated, and the original URL now returns 404.
