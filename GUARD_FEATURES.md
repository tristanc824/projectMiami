# Guard: features worth building and the app UI

Written November 7, 2026. This builds on [EVENT_BRAINSTORM.md](./EVENT_BRAINSTORM.md) (the SharkByte opening deck's prize tracks) and [PITCH_RESEARCH.md](./PITCH_RESEARCH.md) (sourced problems, judging angle and demo plan). Everything here is a **recommendation** until the team agrees.

## Positioning (decided by Caleb, Nov 7)

**Guard is a neobank, not a family app.** It's a financial tool for anyone to **save, store, use and protect** money in digital dollars, plus many other features. Sending money to family is **one use case and the marketing angle for Miami**, where many families are migrants. It is not the product's identity.

Rules this sets:
- Lead with the account: "Your money, in dollars, protected." Family remittance comes in as a use case.
- Every feature should serve an individual user first. Family features are optional add-ons (invite a trusted contact, send to relatives).
- The pitch can still open with a Miami family story, because it's relatable. The product shown is the bank.

### The neobank, feature map
| Pillar | Features | Status |
|---|---|---|
| **Account** | Digital-dollar balance (USDC), passkey sign-in, add money by card or bank (simulated), cash out (simulated) | Core |
| **Save** | Savings vaults and goals, auto-save rules (round-ups, "save 10% of every deposit"), a savings value shown in local prices (groceries clock), a protected reserve that needs extra approval | Core + pioneer |
| **Spend and pay** | Pay anyone by @handle or QR, Solana Pay at merchants, purpose-locked spending envelopes (bills, school, rent: the "School Dollars" idea generalized), a virtual card (roadmap) | Core + roadmap |
| **Send** | Send anywhere in about a second with fees shown, claim links for people without the app, family remittance | Core (marketing angle) |
| **Protect** | Undo window for new recipients, AI scam check, scam-velocity radar, shared scam registry, a personal safe word for risky transfers, a trusted contact who co-approves big moves (optional), a duress passkey | **The differentiator** |
| **Resilience** | Emergency fund that unlocks automatically on a verified disaster alert (Storm Trigger, framed for individuals), offline send queue for outages | Pioneer |
| **Insights** | Spending and saving insights, how much you'd have lost holding local currency, a fee-savings tracker | Nice to have |

The pioneer features in section 1b still apply. Read each one as "for any Guard user", for example the safe word protects *your* account, and the trusted contact is anyone you choose.

## The short version

1. **Make one hard thing real:** an on-chain **undo window**. The first payment to someone new waits in a Solana escrow (an account our own program controls) and can be cancelled. That is the technical depth judges look for, and it solves a real problem: $3.5B was lost to impostor scams in the US in 2025.
2. **Add one AI layer that earns a second prize:** a **scam check**. You paste the "Mom, new number, send here" message (or a screenshot), and the model explains the red flags. Gemini is the simplest choice; Swarms is the bigger prize if the team has time.
3. **Use Auth0 properly:** passkey login, plus a second check before large transfers. That fits a sponsor track and smooths the app at the same time.
4. Everything else is polish around those three.

---

## 1. Features, ranked

| # | Feature | Problem it fixes | Complexity it adds | Extra prize it can hit | Build time |
|---|---|---|---|---|---|
| 1 | **Undo window for new recipients.** The first transfer to a new address goes into a program-controlled escrow (a PDA) for, say, 10 minutes (24h in production). The sender can cancel; otherwise it releases. | Impostor and "Hi Mum" scams. Instant, irreversible payments are a scammer's favorite feature | Anchor program with escrow, cancel and release instructions, plus a timer | **Best Use of Solana** (real program logic) | 6–10 h |
| 2 | **Sponsored fees.** Guard pays the Solana fee, so users never hold SOL | Families shouldn't have to buy crypto to send $50 | Fee-payer server that co-signs | Solana | 2–3 h |
| 3 | **AI scam check.** Paste a message or upload a screenshot. The app compares it with saved recipients, flags urgency and new-account language, and explains in plain English or Spanish | Same scam problem, caught *before* money moves | Gemini API call, plus rules for new address, recently changed payee and urgency words | **Gemini**, or **Swarms** if built as 3 agents (reader → evidence → explainer). Route through **Prune** for its cost/policy receipt | 3–5 h (Gemini), 6+ h (Swarms) |
| 4 | **Passkey login and a second check on big sends** (Auth0) | Stolen passwords and phones | Auth0 login plus a step-up prompt over $X | **Auth0** | 3–4 h |
| 5 | **Claim link.** The recipient gets a link, opens it on any phone, and claims the money. It's refunded if never claimed | Family without wallets; payout networks down after disasters | Claim program or escrow PDA plus a claim page | Solana | 4–6 h (shares code with #1) |
| 6 | **Family vault.** A shared savings goal, with two approvals needed for big withdrawals | Pooling money for school or medical bills; one person's phone being compromised | PDA vault plus an approval flow | Solana | 5–8 h |
| 7 | **Emergency mode.** On a verified hurricane alert, pre-approved relatives can receive money instantly without the undo delay. The alert is checked against official sources and cached for offline viewing | After Hurricane Melissa, payments to Jamaica fell 8.3% when payout networks broke, and Miami families send that money | Alert verification plus offline cache plus a rule change in the program | **EC-Council** (its challenge is literally hurricane-alert verification with offline support) | 8+ h |
| 8 | **Fee receipt.** Every transfer shows its cost next to the World Bank's 6.49% average | Hidden remittance fees | UI only | Overall | 1 h |

**Recommended weekend scope:** #1, #2, #3 (Gemini), #5 and #8, plus #4 if someone is free. **Skip** #6 and #7 unless the core is finished early. #7 is a strong Miami story but a whole second product.

**Do not build:** interest on savings (US law bans it for stablecoins), anything claiming money "can never be frozen" (the issuer can freeze it under court orders), or NFTs.

### How the pieces show up in the 3-minute demo
1. The "Mom, new number" text arrives on screen. Paste it in, and the **AI scam check** flags it (#3).
2. Send anyway. Because it's a new recipient, the money sits in the **undo window** (#1). Tap **Cancel** and it comes back. Show the Solana Explorer.
3. Send $200 to the real Mom. A teammate's phone gets a **claim link** (#5) and claims it in about a second, with **no fees** (#2) and a **fee receipt** (#8).
4. A big send triggers a **passkey prompt** (#4).

---

## 1b. Pioneer features (prior art checked Nov 7, 2026)

Each idea below was searched for in shipped consumer remittance apps, neobanks and wallets. "No prior art found" means **no shipped consumer product turned up in our searches**. Say "first we know of" on stage, never "first ever."

**Build note:** USDC on Solana is a classic SPL token. Anything that relies on Token-2022 features (transfer hooks, confidential transfers) needs Guard's own wrapped-dollar mint, held 1:1 against USDC.

| Rank | Feature | What it does | Closest thing that exists | Weekend build | Extra prizes |
|---|---|---|---|---|---|
| 1 | **Storm Trigger** | A relative pre-funds a relief pot. When the National Hurricane Center feed shows the recipient's area under threat, the program releases the money **before landfall**. Cash paid before a disaster works ([WFP trial](https://docs.wfp.org/api/documents/WFP-0000165848/download)). | Aid programs and a hackathon disaster fund ([CivicShield](https://ethglobal.com/showcase/civicshield-k88my)). No family-funded, person-to-person version found | Anchor escrow + Switchboard feed reading the [NHC JSON](https://www.nhc.noaa.gov/productexamples/NHC_Tropical_Cyclone_Status_JSON_File_Reference.pdf). Demo by replaying a 2024 advisory | Solana, **EC-Council**, Vultr, Gemini |
| 2 | **Family safe word** | The family's code word (stored hashed) must be answered before an early release from the undo window. Wrong guesses are limited on-chain | The FBI recommends family safe words against AI voice-clone scams ([CBS](https://www.cbsnews.com/news/elder-scams-family-safe-word)). No app ties one to a payment | About 50 lines on top of the undo-window escrow | Solana, Gemini |
| 3 | **Second pair of eyes** | Big or first-time transfers from an elderly parent need a chosen family member's approval | EverSafe and Carefull only *monitor*. Fuse uses multisig, but the user holds all keys | Squads v4 spending limits and time locks | Solana, Auth0 |
| 4 | **Family Key** (hardware) | A Raspberry Pi box with one button at the approver's home. Pressing it signs the approval | DIY signers ([SeedSigner](https://seedsigner.com/)) only sign the owner's own transactions | Pi + display + keypair + Squads approve call | **Hardware**, Solana |
| 5 | **Scam-velocity radar** | When an address suddenly receives many first-time payments from different Guard users, its undo window automatically stretches (1h → 72h) | Enterprise risk scores (TRM, Range) are static. No crowd-driven, on-chain version found | Helius webhook → Tiger Data live rollups → keeper updates the program's settings | **Tiger Data**, Solana |
| 6 | **School Dollars** | Money that can only be spent at verified schools or billers. Unspent money returns to the sender | WFP restricts aid to approved stores on a private chain. Remittance apps pay billers directly instead | Token-2022 transfer-hook allowlist + Solana Attestation Service | Solana, Auth0 |
| 7 | **Staked, private scam registry** | Reporters stake USDC on a report and lose it if the report is wrong. Clients check addresses privately using hash prefixes, the [HIBP k-anonymity method](https://blog.mozilla.org/security/2018/06/25/scanning-breached-accounts-k-anonymity/) | Chainabuse is centralized and unverified | ZK-compressed report accounts + a stake-and-slash program | Solana |
| 8 | **Groceries clock** | Savings shown as "14 months of groceries in Maracaibo", priced live | No consumer product found. Pyth publishes US CPI on-chain | Pyth + a custom price feed | Solana, Gemini |
| 9 | **Off-ramp route agent** | AI agents compare cash-out routes on cost, speed and risk for the recipient's city | deBridge's agents route crypto swaps, not cash-outs | Swarms planner, evaluator and explainer (one real quote, the rest mocked and labeled) | **Swarms**, Gemini |
| 10 | **Voice send that hears coaching** | Send by voice in your own language. The AI also listens for "they told me to send it now" and adds friction | Voice sending exists and Pixel detects scam calls, but not combined in a payment | Gemini Live with function calling | Gemini |
| 11 | **Duress passkey** | A second passkey opens a decoy view. Any transfer from it is held 7 days and a guardian is silently alerted | Hardware wallets have duress PINs, but the decoy money is actually lost | Auth0 + escrow | Auth0, Solana |
| 12 | **Two-sided delivery receipts** | The recipient and the cash-out partner both sign "received", as a verifiable receipt | Banks only prove money was *sent* | Compressed NFT receipt | Solana |
| 13 | **Offline send queue** | Pre-signed payments pass by QR or SMS and anyone with signal broadcasts them, for blackouts after storms | Xelio does SMS transfers with shared custody. Here the relayer never holds funds | Durable nonces | Solana, EC-Council |

**Already done by others** (reuse, don't claim as new): inheritance/dead man's switch (SolWill, Bron), family pooling (Tumar, EazeFi), social recovery (Fuse, Argent), streaming allowances (Streamflow), confidential transfers (risky in 36 hours).

**Recommended pioneer storyline for the 3-minute demo:**
1. A voice-cloned "grandson" fails the **safe word** and the money stays locked.
2. A large transfer waits until the daughter presses the **Family Key** button.
3. The **velocity radar** chart spikes and the undo window stretches.
4. A replayed hurricane advisory triggers **Storm Trigger**, and abuela's balance updates.

That one story hits Solana, Hardware, Tiger Data, EC-Council and Gemini. It also makes the project read as a security platform, not just a payments app.

---

## 2. Prize stack (from the SharkByte Devpost list)

Devpost lists the judging criteria as **"TBD"**, so overall placing will come down to the demo, the story and how big the idea feels. One project can enter several tracks. Select each one on Devpost by hand.

| Track | Prize | How Guard qualifies honestly | Priority |
|---|---|---|---|
| 1st / 2nd / 3rd Overall | iPads + ManaTech / monitors / chairs | The whole product and the live demo | **Core** |
| MLH Best Use of Solana | Unruggable hardware wallets | Undo-window escrow program, sponsored fees, claim links, real devnet transactions | **Core** |
| MLH Best Use of Gemini API | Swag kits | AI scam check that reads the pasted message or screenshot and explains the risk | **High** |
| MLH Best Use of Auth0 | Wireless headphones | Passkey sign-in, plus a second check before large sends | **High** |
| MLH Best Use of Tiger Data | Stream Deck Mini | Store every transfer event in Tiger Data (Postgres for time-series data). Power the scam check with live "velocity" rules (5 new recipients in 1 hour, amounts far above normal) and a real-time activity view | Medium: a genuine use, not decoration |
| MLH Best Use of Vultr | Assorted | Host the fee-payer and API server on Vultr | Medium (easy if we deploy anyway) |
| MLH Best Domain (GoDaddy Registry) | Gift card | Register a domain for Guard. **Costs money; the team decides** | Low |
| MLH SpaceXSI raffle | Cursor keyboard | Build with Cursor, add a Grok Bot automation (for example a bot that posts each deploy and demo transaction to the team chat), and describe both on Devpost | Low effort if we're already using Cursor |
| Swarms API | CEO interview + $1k credits | Swap the Gemini check for a three-agent Swarms review: reader → evidence → explainer | Only if time allows (more work than Gemini) |
| Prune API | Prune Pro | Route the AI scam-check calls through Prune and show its cost and policy receipt | Low (needs a supported integration) |
| EC-Council | COASP certification scholarships | Emergency mode: verify hurricane alerts and keep working offline (feature #7) | Stretch: a second product |
| Best Use of Hardware | Raspberry Pi 5s | A physical "Guard Key" button that approves vault withdrawals | Skip unless someone has hardware |
| First Time Hacker | Headphones | Check whether anyone on the team qualifies | Ask |

Realistic stack: **Overall + Solana + Gemini + Auth0 + Tiger Data + Vultr**, plus the SpaceXSI raffle if we're on Cursor.

---

## 3. Making it look massive (the vision for the pitch)

Judges reward a scrappy weekend build that clearly points at something huge. Present Guard as a **platform with a wedge**, not just an app:

1. **The wedge (built this weekend):** families sending money home, protected by the undo window and scam check.
2. **Save:** a dollar account for people in currencies that keep losing value, the billions in Argentina, Nigeria, Türkiye, Venezuela and beyond (sources in PITCH_RESEARCH.md).
3. **Send:** about $685B a year flows to low- and middle-income countries, and the average fee is 6.49%. That's roughly **$44B a year in fees** (our estimate: 685 × 6.49%) that Guard can undercut.
4. **Protect, the moat:** each scam address one user reports is blocked for every other user. Like a spam filter, the network gets safer as it grows, which a single wallet can't copy.
5. **Spend:** pay merchants by QR in digital dollars, and later a card.
6. **Guard Shield for other apps:** offer the undo window and scam check as an API that other wallets and fintechs plug in. This turns a consumer app into infrastructure, which is what tends to win grand prizes.

Pitch line for the vision: *"Today it's a mom in Manila getting $250 safely. Tomorrow it's the safety layer under every digital-dollar payment."*

Keep the honesty rule: the vision is the roadmap, and only the wedge is claimed as built.

---

## 4. App UI direction

Tristan's app mockup isn't in the repo yet. Once he shares it, we'll line these screens up with his.

### Principles (Apple-minimal, matches the website)
- **One job per screen.** Home shows your money; Send sends; nothing else competes.
- **Dollars, not crypto.** Never show "SOL", "gas" or wallet addresses unless the user taps for details. Say "digital dollars" and "arrives in seconds."
- **Safety is visible but calm.** Checks appear as a quiet green "Checked" pill. Only real risk turns amber or red.
- **Every status is honest.** Three separate steps: Sent on Solana → Accepted by partner → Paid out. "Sent" never pretends to mean "arrived."

### Screens
1. **Welcome / sign in.** One "Continue with passkey" button (Auth0). No seed phrase.
2. **Home.** A big balance with a "Held in US dollars" badge, two buttons (Send, Add money), and recent activity with status pills.
3. **Send: pick who.** Saved family with photo, country and a "Verified" tick. New recipients show a "New: undo window applies" note.
4. **Send: amount.** A big number keypad, "They receive ≈ ₱14,600", and a fee receipt (network $0.00, conversion $X, compared with the 6.49% average).
5. **Scam check.** If a message was pasted or the recipient is new, a calm card shows "Checked: no red flags", or an amber card lists what's wrong with a "Call them first" button.
6. **Hold to send.** Press and hold to confirm (it prevents accidental taps and feels deliberate), with a passkey prompt above a set limit.
7. **Undo window.** A countdown ring ("Cancellable for 9:42") with one big **Cancel transfer** button.
8. **Arrived.** A checkmark animation, "Arrived in 0.9s", and a "View receipt" link to Solana Explorer.
9. **Claim page (recipient, web, no app needed).** "Tomás sent you $200." **Claim** creates a wallet in the browser. Then: keep in dollars or cash out (simulated).
10. **Family vault** (stretch). A goal ring, contributors, and "needs 2 approvals."

### UI rules from Zander Whitehurst (@zanderwhitehurst)

Taken from about 85 of his UI-tip reels (Nov 7, 2026), checked against what we've built. Each rule is his tip; the arrow is what it means for Guard.

| His tip | What we do in Guard |
|---|---|
| Stop adding colors to your UI | One accent (Guard blue). Green and amber only for status. No decorative color. |
| Stop adding backgrounds, borders and containers to cards | Fewer boxed cards. Group with spacing and a hairline divider instead of a filled, bordered box. |
| Stop centering text | Center only short headlines. Body copy, lists and form labels are left-aligned. |
| Stop using tiny text | Nothing under 13px in the app; 15–17px for body. Our 11px labels go up. |
| Stop mixing modes | Pick dark everywhere. The website's phone mockups must match the app's dark screens, not show light screens inside a dark site. |
| Stop overusing primary buttons | One primary button per screen; the rest secondary or plain links. |
| Stop designing "Are you sure?" modals | Use undo instead of confirmation pop-ups. **This is exactly Guard's undo window, so use his point in the pitch.** |
| Stop using red for danger buttons | Destructive actions get clear wording ("Cancel and get $500 back"), not a scary red button. |
| Stop guessing spacing, corner radius, layout and tokens | 4/8px spacing scale, and a corner-radius rule: outer radius = inner radius + padding. Name these as tokens. |
| Stop guessing icon and text alignment | Align icons to the text's center line, using one icon size per text size. |
| Stop designing custom icons | One icon library (Lucide, already on the site) everywhere. |
| Stop skipping button states / designing flat buttons | Every button gets hover, pressed, disabled and loading states, with a subtle top highlight for depth. |
| Stop ignoring button width | Full-width primary buttons on mobile, consistent widths on desktop. |
| Stop telling customers to "Subscribe" | Specific calls to action: "Get early access", "Send $250", "Claim $200". |
| Stop using "e.g." in placeholders | Placeholders like "Name, phone or @handle", not "e.g. John". |
| Stop using columns in mobile menus / design better mobile tab bars | Single-column mobile menu; a 4-item tab bar with labels. |
| Build your waitlist before your app | The website's waitlist form should actually save emails before demo day. |

### Things that make it feel smooth
- **Optimistic UI.** Show "Sending…" instantly and confirm when Solana confirms. Usually under a second, so it feels instant.
- **Live confirmation.** Listen for the transaction over a websocket instead of polling.
- **Skeleton loaders**, not spinners, for the balance and activity.
- **Haptics and one sound on "Arrived"** (mobile web vibration API; native later).
- **Hold-to-confirm and swipe-to-cancel gestures** for the two most important actions.
- **Pre-created token accounts and pre-funded fee payer**, so nothing slow happens on stage.
- **Bilingual toggle** in settings, with every screen in English and Spanish.
- **Error states in plain words:** "Couldn't reach the network. Your money hasn't moved. Try again."
- **Devnet badge** in the corner so judges know what's test money.

The screens are drawn in the brand kit on the Guard App Screens canvas: https://claude.ai/artifact/StsXG6Df5FxqYBPBHWpuEN (private until Caleb shares it).
