# Nest copy deck

Written by Martha, 2026-11-07. Covers every customer-facing string on the website (web-earth) and in the 14 app screens (app-design/nest-app-screens.html). Design notes, figcaptions and the doc header are left out because they're for the build team.

"Current" is the exact string in the source, so it can be found and replaced. Where "New" says **keep**, the line already works.

## Voice rules I applied

1. **Write it the way a person would say it.** Full, plain sentences. If you wouldn't say it out loud to a friend, rewrite it.
2. **No pairs of short fragments.** No "X. Y." rhythm ("Send it all. Keep it all.", "Nothing to remember. Nothing to steal."). One clear sentence does more.
3. **No reversals, no wordplay.** No "isn't X, it's Y", no puns on "nest" or "home", no lines that only work as a slogan.
4. **Be specific.** Name the real moment (a Sunday night, her college fund, 24 hours to undo) and skip general claims like "everything money should be".
5. **Sell how it feels, and keep the mechanics in the product.** Headlines talk about Mamá, savings and peace of mind. The chain, the stablecoin and the escrow stay in the footer or out of sight.
6. **Only say what's true.** No absolutes the product can't back up ("never froze", "inflation-proof"). Disclosures stay in the legal footer, word for word in meaning.
7. **Short, but not cryptic.** Grade 5 words. Labels and chips stay short, and headlines can be shorter than today's but never much longer.
8. **Calm in the hard moments.** On the scam screens, plain and steady, with no "Wait." drama. The safe choice is always the clear one.

## Lines I cut and why

| Line | Pattern |
|---|---|
| "The scam she undid" | Cute verb twist, and it reads like a made-up customer story |
| "Trust isn't a feature. It's a feeling." | Textbook "isn't X, it's Y" reversal |
| "Send it all. Keep it all." | Two-fragment parallel slogan |
| "Your money. Your rules." | Two-fragment parallel slogan, crypto cliché |
| "Nothing to remember. Nothing to steal." | Two-fragment parallel |
| "Scammed? Undo it." (twice) | Question-then-snap answer, used twice |
| "Split it. Free." | Two fragments, says almost nothing |
| "Home in a second." | Wordplay (home = family) |
| "Savings that hold." / "Saved stays saved." | Wordplay, vague |
| "Life, in dollars." / "Everything money should be." | Slogans that could sit on any fintech site |
| "Your face is your password." | Metaphor where a plain instruction works better |
| "Your money answers to you." | Personifying money, and it overstates (Circle can freeze) |
| "Her savings never froze" | Invented customer, plus an absolute the product can't promise |
| "Some things should never lose value." | Greeting-card line, and USD does lose some value |
| "Save, spend and send dollars. 24/7. No fees." / "Dollars. 24/7. No fees." / "It's yours. No fees. No bank needed." | Staccato triads |
| "Wait. This looks like a scam." / "Sent. Undo anytime in 24h." | One-word dramatic openers |

---

## Website

### index.html (title and meta)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| W1 | `<title>` | Nest · Protect what matters | **keep** | Brand plus tagline |
| W2 | meta description | Nest is a digital-dollar account on Solana. Save, spend and send money in dollars, with scam protection built into every payment. | Nest is a US dollar account on your phone, built on Solana. Send money in about a second with no fees, and undo a payment to someone new for 24 hours. | Specific, no triad |

### Nav (Nav.tsx)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| N1 | link | For you | **keep** | Plain |
| N2 | link | For family | **keep** | Plain |
| N3 | link | For business | **keep** | Plain (see flag 9) |
| N4 | link | About Nest | **keep** | Plain |
| N5 | link | Log in | **keep** | Standard |
| N6 | button | Open an account | **keep** | Says what you get |

### Hero (Hero.tsx)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| H1 | h1 | Protect what matters. | **keep** | Tagline |
| H2 | subline | Save, spend and send dollars. 24/7. No fees. | Keep your money in dollars and send it in about a second, with no fees. | One sentence, not three fragments |
| H3 | button 1 | Open an account | **keep** | Clear |
| H4 | button 2 | See how it works | **keep** | Clear |

### Stories (Brand.tsx, STORIES)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| S0 | h2 | Life, in dollars. | Everyday money, held in dollars. | States the point, no slogan |
| S1 | card 1 tag | Send home | **keep** | Real term people use |
| S2 | card 1 title | Home in a second. | Mom gets it in about a second. | Human, no pun |
| S3 | card 2 tag | Inflation-proof | Dollar savings | "Inflation-proof" isn't strictly true (flag 2) |
| S4 | card 2 title | Savings that hold. | Your savings stay in US dollars. | Says what actually happens |
| S5 | card 3 tag | Undo | **keep** | Product name |
| S6 | card 3 title | Scammed? Undo it. | Undo a scam payment within 24 hours. | Specific, no snap Q&A |
| S7 | card 4 tag | No fees | **keep** | Clear |
| S8 | card 4 title | Split it. Free. | Split dinner without paying a fee. | A real moment |
| S9 | card 5 tag | Independent | **keep** | Clear |
| S10 | card 5 title | Your money. Your rules. | Take your account with you when you move. | Specific to people who move countries |

### Moments (Brand.tsx, MOMENTS)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| M0 | h2 | Everything money should be. | A better place to keep your money. | Confident and plain |
| M1 | card 1 tag | 24/7 | **keep** | Short |
| M2 | card 1 title | Always open. | Send money on a Sunday night. | Shows "24/7" with a real moment |
| M3 | card 2 tag | No transaction fees | **keep** | Clear |
| M4 | card 2 title | Send it all. Keep it all. | Every dollar you send gets there. | One plain sentence |
| M5 | card 3 tag | Government-independent | Independent | Matches Stories, less political |
| M6 | card 3 title | Your money answers to you. | Your savings aren't tied to one country's banks. | True, and doesn't overpromise |
| M7 | card 4 tag | Undo | **keep** | Product name |
| M8 | card 4 title | Scammed? Undo it. | Pay someone new and you have a day to undo it. | Accurate, not a repeat of S6 |
| M9 | img alt (x4) | (alt texts) | **keep** | Fine for accessibility |

### Trust (Brand.tsx, Trust)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| T1 | big line | Trust isn't a feature. It's a feeling. | Only you can move your money. | A promise, not a reversal |

### Keep (Brand.tsx, Keep)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| K1 | label | Inflation-proof | Dollar savings | Same as S3 (flag 2) |
| K2 | h2 | Some things should never lose value. | Keep her college fund in dollars. | Matches the father and daughter photo, specific |
| K3 | button | Start saving | **keep** | Clear |

### Cards (Brand.tsx, CARDS)

These read like customer stories ("she", "her"), but no real customers are on record, so I rewrote them as short guides. See flag 1.

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| C0 | h2 | From the Nest | Money guides | Honest label, no "nest" pun |
| C1 | link | All stories | All guides | Matches C0 |
| C2 | card 1 tag | Independent | **keep** | |
| C3 | card 1 title | Her savings never froze | How to save outside your country's banks | No invented person, no absolute |
| C4 | card 2 tag | No fees | **keep** | |
| C5 | card 2 title | Paid in full, on day one | How to pay your team with no fees | Plain use case |
| C6 | card 3 tag | Undo | **keep** | |
| C7 | card 3 title | The scam she undid | What to do if you paid a scammer | Something people actually search for |

### Closing (Brand.tsx, Closing)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| CL1 | h2 | Protect what matters. | **keep** | Tagline |
| CL2 | subline | All you need is your phone. | **keep** | Plain and true |
| CL3 | button 1 | Open an account | **keep** | Same as hero |
| CL4 | button 2 | Talk to our team | **keep** | Plain (see flag 9) |

### Footer (Brand.tsx, Footer)

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| F1 | brand line | Protect what matters. | **keep** | Tagline |
| F2 | column heads | For you / For business / Company / Legal | **keep** | Standard |
| F3 | links | Personal, Family, Saving, Small business, Payouts, Partners, About Nest, Careers, Newsroom, Privacy, Terms, Disclosures | **keep** | Standard (see flag 9) |
| F4 | legal 1 | Balances are held as USDC, a dollar stablecoin issued by Circle. Stablecoins are not bank deposits, are not FDIC insured, and the issuer can freeze tokens in some cases. Undo applies to the first payment to a new recipient. The US dollar also has inflation, usually far lower than the currencies it protects against. | Balances are held as USDC, a US dollar stablecoin issued by Circle. USDC is not a bank deposit and is not FDIC insured. Circle can freeze tokens in some cases. Undo covers the first payment to a new recipient, for 24 hours. The US dollar also loses value to inflation, usually far less than many local currencies. | Same disclosures, shorter sentences, adds the 24h fact |
| F5 | legal 2 | Nest is a financial technology company, not a bank. Cash-out to local currency is provided by licensed partners where available. | Nest is a financial technology company, not a bank. Licensed partners handle cash-out to local currency where available. | Active voice, same disclosure |
| F6 | bottom left | © 2026 Nest | **keep** | |
| F7 | bottom right | Made in Miami | **keep** | Real and human |

---

## App screens

### 1. Welcome

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A1.1 | brand | Nest | **keep** | |
| A1.2 | h1 | Protect what matters. | **keep** | Tagline |
| A1.3 | subline | Dollars. 24/7. No fees. | A US dollar account with no fees. | One phrase, not three fragments |
| A1.4 | button | Create account | **keep** | |
| A1.5 | ghost button | I already have one | **keep** | Sounds like a person |

### 2. Face ID

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A2.1 | h1 | Your face is your password. | Sign in with Face ID. | Plain instruction, no metaphor |
| A2.2 | subline | Nothing to remember. Nothing to steal. | There's no password to forget or steal. | One sentence, same idea |
| A2.3 | button | Set up Face ID | **keep** | |
| A2.4 | note | Uses a passkey stored on this phone. | Your passkey stays on this phone. | Says the reassuring part |

### 3. Claim

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A3.1 | h1 | Ana sent you $250. | **keep** | Perfect already |
| A3.2 | subline | It's yours. No fees. No bank needed. | You don't need a bank account to get it. | Answers her real worry |
| A3.3 | button | Claim with your phone number | **keep** | Clear |
| A3.4 | note | Opens a Nest account in seconds. | **keep** | Plain |

### 4. Home

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A4.1 | card label | Balance | **keep** | |
| A4.2 | chip | Held in US dollars | **keep** | Best line in the app |
| A4.3 | chip | ≈ ARS 4.15M | **keep** | Example rate (flag 4) |
| A4.4 | actions | Send / Add / Receive | **keep** | Standard |
| A4.5 | list header | Activity | **keep** | |
| A4.6 | link | See all | **keep** | |
| A4.7 | row 1 name | Mamá | **keep** | |
| A4.8 | row 1 status | Arrived in 0.9s · $0 fee | Arrived in 0.9s · No fee | Reads faster than "$0 fee" |
| A4.9 | row 2 name | New number | **keep** | |
| A4.10 | row 2 status | Undone · money returned | Undone · Money back | Shorter, warmer |
| A4.11 | row 3 status | Received | **keep** | |
| A4.12 | tab bar | Home / Save / Security / You | **keep** | |

### 5. Receive

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A5.1 | title | Receive | **keep** | |
| A5.2 | name / handle | Ana Martínez / @ana | **keep** | |
| A5.3 | chip | $0 to receive | No fee to receive | Plain words |
| A5.4 | chip | Arrives in ~1s | Arrives in a second | No "~", reads like speech |
| A5.5 | button | Share my link | **keep** | |

### 6. Save

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A6.1 | h1 | Save | **keep** | |
| A6.2 | card title | Saved stays saved. | What $1,000 was worth a year later | Lets the chart make the point |
| A6.3 | bar labels | In Nest / In pesos | **keep** | |
| A6.4 | amounts | $1,000 / $321 | **keep** | Sourced (INDEC 211.4%) |
| A6.5 | note | $1,000 saved in January 2023. Argentina, 211% inflation that year. | Saved in January 2023. Argentina had 211% inflation that year (INDEC). | Full sentence, cites the source |
| A6.6 | goal names | Rainy day / School fees / First home | **keep** | Human, specific |
| A6.7 | button | New vault | New goal | Plainer word (optional, flag 11) |

### 7. Vault

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A7.1 | header label | Vault | Goal | Matches A6.7 (optional) |
| A7.2 | name / amount | Rainy day / $1,240 / of $2,000 | **keep** | |
| A7.3 | toggle title | Round-ups | **keep** | |
| A7.4 | toggle sub | Spare change from every purchase | Save the change from every purchase | Says what it does for you |
| A7.5 | list header | This week | **keep** | |
| A7.6 | rows | Round-up · Café / Round-up · Market / Added | **keep** | |
| A7.7 | row dates | Today / Yesterday / Friday | **keep** | |
| A7.8 | buttons | Withdraw / Add money | **keep** | |

### 8. Send to

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A8.1 | h1 | Send to | **keep** | |
| A8.2 | search | Name, @handle or phone | **keep** | Functional |
| A8.3 | favorites | Mamá / Tío Luis / Daniel / New | **keep** | |
| A8.4 | list header | Recent | **keep** | |
| A8.5 | cities | Buenos Aires / Córdoba | **keep** | |
| A8.6 | new number sub | New · undo on for 24h | New · 24 hours to undo | Reads like speech |

### 9. Amount

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A9.1 | amount | $250 / ≈ ARS 242,500 | **keep** | Example rate (flag 4) |
| A9.2 | chip | $0 fee | No fee | Plain |
| A9.3 | chip | Arrives in ~1s | Arrives in a second | Same as A5.4 |
| A9.4 | button | Review | **keep** | |

### 10. Confirm

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A10.1 | sheet title | Send $250.00 to Mamá | **keep** | |
| A10.2 | sheet sub | Buenos Aires | **keep** | |
| A10.3 | row | Fee / $0.00 | **keep** | |
| A10.4 | row | Arrives / About a second | **keep** | |
| A10.5 | row | She gets / ≈ ARS 242,500 | She gets / $250.00 (≈ ARS 242,500) | She gets dollars, and pesos only if she cashes out (flag 8) |
| A10.6 | prompt | Confirm with Face ID | **keep** | |

### 11. Arrived

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A11.1 | h1 | Arrived in 0.9s. | Mamá has your $250. | Leads with the feeling |
| A11.2 | subline | Mamá has it. | It got there in 0.9 seconds. | Speed as the proof, not the headline |
| A11.3 | rows | Amount / Fee / When / Sunday, 9:41 PM | **keep** | Sunday night says "24/7" on its own |
| A11.4 | buttons | Done / Share receipt | **keep** | |

### 12. Scam check

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A12.1 | h1 | Wait. This looks like a scam. | This might be a scam. | Calm, honest ("might") |
| A12.2 | reason 1 | A number you've never paid | You've never paid this number | Full sentence |
| A12.3 | reason 2 | "Mamá, it's me. New phone." | **keep** | The real scam text, which people recognize |
| A12.4 | reason 3 | Pressure to send right now | They want it sent right now | Says who's pushing |
| A12.5 | note | Sent anyway? You can undo it for 24 hours. | If you send it, you can still undo it for 24 hours. | No snap Q&A |
| A12.6 | buttons | Don't send / Send anyway | **keep** | Clear choices |

### 13. Undo

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A13.1 | h1 | Sent. Undo anytime in 24h. | You have 24 hours to undo this. | One calm sentence |
| A13.2 | timer label | left to undo | **keep** | |
| A13.3 | rows | To / Amount | **keep** | |
| A13.4 | status value | Held safely | On hold | Honest status, no selling |
| A13.5 | button | Undo payment | Undo and get $500 back | Says what you get |
| A13.6 | ghost button | Done | **keep** | |

### 14. Security

| ID | Where | Current | New | Why |
|---|---|---|---|---|
| A14.1 | h1 | Security | **keep** | |
| A14.2 | card title | Only you can move your money. | **keep** | Plain promise (also on the site, T1) |
| A14.3 | card sub | Everything is on. | All protections are on. | Says what "everything" means |
| A14.4 | Face ID | Face ID / Passkey on this iPhone | **keep** | |
| A14.5 | Scam check sub | Before every new payment | Before you pay someone new | Accurate, plain |
| A14.6 | Undo window | Undo window / 24 hours for someone new | **keep** | |
| A14.7 | Safe word | Family safe word / For sends over $500 | **keep** for now | $500 not in the docs (flag 5) |
| A14.8 | Trusted contact | Trusted contact / Mamá | **keep** | |

---

## Flags

1. **Story cards implied real customers.** "Her savings never froze", "The scam she undid" and "From the Nest / All stories" read as testimonials, but none are on record. I rewrote them as guides. Each guide needs a real page behind it, or the section should come out. If real users agree to share their stories later, we can bring stories back with their own words.
2. **"Inflation-proof" isn't strictly true.** The dollar inflates too, and the footer already says so. I swapped the visible tag for "Dollar savings". If you want the word back for the pitch, the footer covers it, but the plainer label is safer for a live product.
3. **"Never froze" was an absolute.** Circle can freeze USDC, so no headline should promise that money can't be frozen. The independence lines now say "not tied to one country's banks", which is true.
4. **Peso amounts use an example rate** (about 970 ARS per dollar, per APP_HANDOFF.md). Pyth has no ARS feed. A live product needs a real rate source, or the chip needs an "Example rate" label.
5. **The safe word's "over $500" threshold isn't sourced.** NEST_FEATURES.md says the safe word gates early release from the undo window, and it never mentions $500. Please confirm the rule, then update A14.7.
6. **"No fees" and cash-out.** Nest covers the network fee. If cash-out partners charge their own fees, the footer should say so. I didn't add that line because the brief says to keep disclosures as they are, so this is your call.
7. **"0.9s" has to be the real measured time** for each transfer in the build. It can't be a fixed string.
8. **"She gets ≈ ARS 242,500" suggested a conversion.** Rosa actually receives $250 in dollars. A10.5 now shows both.
9. **Live-product links.** "For business", "Talk to our team", Careers, Newsroom, Payouts and Partners all need real pages or a real contact before launch. Right now they point to #top or #moments.
10. **Optional rename, Vault to Goal** (A6.7, A7.1). Only do it if it changes everywhere, including APP_HANDOFF.md.

## Quality gate

- Tagline "Protect what matters." is unchanged everywhere it appears (W1, H1, CL1, F1, A1.2). Meta description is 150 characters.
- No em or en dashes, semicolons, exclamation marks or ALL CAPS in any New line. No "isn't X, it's Y". No two-fragment pairs. No triads in headlines.
- Headlines are the same length or shorter, except M0 (+7 characters, still 3 lines at the current width) and the guide titles C3, C5, C7 (2 lines in a 3-column card).
- Every number is unchanged and sourced: $1,000 / $321 / 211% (INDEC, APP_HANDOFF.md), 24 hours (brief), about a second (APP_HANDOFF.md). $500 for the safe word and the ARS rate are flagged.
- Every legal disclosure is kept: USDC from Circle, not a bank deposit, not FDIC insured, can be frozen, undo scope, USD inflation, not a bank, licensed cash-out partners.
- Live product: no waitlist or "early access" wording anywhere.
