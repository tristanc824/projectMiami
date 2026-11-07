# Nest pitch playbook

SharkByte 2026, judging Sunday, November 8. Written November 7 in Martha's voice and method.
Every fact comes from this repo's research files (source file in brackets). **[UNVERIFIED]** means a teammate must check it before saying it. **[TEAM]** means a decision or fact only the team can fill in.

The rule for the whole kit: say less. Sell how it feels. Let the phone do the explaining. Depth waits for Q&A.

---

## 0. Before the first judge: fill these in

| # | Open item | Why it matters |
|---|---|---|
| 1 | **[TEAM] What in the demo is live on devnet, and what is a clickable mockup?** Fill in the status column in section 5. | Judges will ask. A Humane-style "it was faked" moment would sink us [PITCH_RESEARCH]. |
| 2 | **Resolved in the mockups:** the Save screen now shows **$1,000 in Nest vs $321 in pesos**, from Argentina's 2023 inflation of 211.4% [ECONOMIC_PROBLEMS]. Say "in 2023", not "this year". | It is the savings proof moment, and it is now sourced. |
| 3 | **Proposed in the mockups: Argentina** (Ana in Miami, Mamá in Buenos Aires). [TEAM] confirm. | Strongest inflation story. Pyth has no ARS feed [BLOCKCHAIN_STACK], so peso values are an example rate unless another price source is wired in. |
| 4 | **[TEAM] Custody model.** Still open in the docs [TEAM_PROMPTS, HACKATHON_CONTEXT]. | It is the first hard Q&A question. |
| 5 | **[TEAM] Undo window length in the demo.** Mockup says 24h, the feature plan said 10 minutes on devnet [NEST_FEATURES]. | Say the number the program actually uses. |
| 6 | Say "about a second" unless the screen shows a measured time. Only say "0.9 seconds" if that was this send's real number. | Same rule as PITCH_RESEARCH. |

---

## 1. The angle

**Positioning (one sentence).**
Nest is a dollar account for anyone with a phone: your money keeps its value, moves any hour, costs nothing to send, and comes back if it was a scam.

**Tagline.** Protect what matters.

**The villain.** The old trade-off: money that is fast is easy to steal, and money that is safe is slow and shrinking. Nest refuses the trade.
Short form for the table: *"Fast money is a scammer's favorite thing. So we gave it an undo."*

**Why now (pick one per pitch, keep the other for Q&A).**
- Digital dollars are now law in the US. The GENIUS Act passed in 2025 and takes effect January 18, 2027 [INSTITUTIONS_RESEARCH].
- Solana now settles in about a second. Alpenglow went live on mainnet October 21, 2026 [BLOCKCHAIN_STACK].
- Q&A only: Paraguay seized Ueno Bank on November 3, 2026, freezing about 3M customers [PITCH_RESEARCH].

**Where Nest is different (one line each; positioning, not claims about them).**

| Them | Nest |
|---|---|
| **Revolut** | A bank app on top of local banks. Nest isn't tied to any one bank or country's banking system. |
| **Wise** | Makes sending cheaper. Nest makes sending free to you, and your money stays in dollars after it lands. |
| **Cash App** | A US payments app [UNVERIFIED: check its country list before saying it]. Nest is for anyone with a phone, anywhere. |
| **A crypto wallet** | Fast, but you're on your own: seed phrases, gas, no way back. Nest is Face ID, dollars only, and an undo. |

Never trash a competitor at the table. If a judge names one, ask "What do you use it for?" and answer the gap.

---

## 2. Selling points

One line each, said the way the founder wants it: short, felt, no mechanics. Then the one moment in the demo that proves it.

| # | Point | The line | Proof moment on screen |
|---|---|---|---|
| 1 | Inflation-proof | **Your money stays in dollars.** | Savings screen: the Nest bar holds at $1,000 while the local-currency bar is smaller. Point, don't explain. (Fix item 2 first.) |
| 2 | 24/7 | **Any day. Any hour. About a second.** | Arrived screen: the timestamp says Sunday night. Let them read it. |
| 3 | No fees | **Sending costs you nothing.** | Amount screen: the "$0 fee" chip. |
| 4 | Not tied to one bank | **Your money doesn't depend on one bank staying open.** | Home: "Held in US dollars". No bank logo anywhere. Spoken once, never argued. |
| 5 | Undo | **Sent it to a scammer? Take it back.** | Undo screen: the 24h countdown, one tap, "Undone. Money returned" on Home. |
| 6 | Security | **Your face is the password.** | Face ID confirm, then the Scam check card ("Wait. This looks like a scam."). Safe word: not on the current screens, so mention it only if asked. |

| 7 | Send without Wi-Fi | **Send money with no Wi-Fi.** | Turn on airplane mode except cellular, send to Mamá, show "We sent it by text message." Honest line for Q&A: with no signal at all it waits on the phone and sends on reconnect (durable nonce). [TEAM: only demo if the SMS relay is built; otherwise show the queued screen] |

Bonus moment if a judge has two minutes: the **Claim link**. "No app? She gets a link and her phone number opens it."

---

## 3. The 3-minute table script

Rules for delivery: one teammate talks, one drives the phone. Talk to the judge, not the screen. Pause after the undo. Every spoken line below is under 20 words.

| Time | On screen | Say |
|---|---|---|
| **0:00** Problem | Phone face down. Nothing on screen. | "It's Sunday. Say your mom needs two hundred dollars tonight." *(pause)* "Sending it costs about six and a half percent. And in a lot of countries, it starts shrinking the day it lands." |
| **0:20** Problem, part two | Phone still down. | "So people do the smart thing and hold dollars. Then a text comes in." *(read it)* "'Mom, it's me. New number. Send it here.' And it's gone." |
| **0:35** The turn | Flip the phone. **Home**: balance in dollars, local value under it. | "This is Nest. A dollar account for anyone with a phone." |
| **0:45** Save | **Savings**: $1,000 in Nest vs the local-currency bar. | "Your savings stay in dollars." *(point at the two bars, say nothing else)* |
| **0:55** Send | **Send**: pick Mom. **Amount**: $250, "$0 fee", "Arrives ~1s". **Face ID**. | "Mom. Two fifty. No fee." *(Face ID)* "Your face is the password." |
| **1:10** Arrived | **Arrived**: the time and the Sunday timestamp. | "Arrived. Sunday night. No bank had to open." |
| **1:20** The twist | **Send**: tap the new number, flagged "First payment, undo on for 24h". **Scam check** card. | "Now the scam. A brand new number." *(card appears)* "Nest catches it. But say I'm panicked and send anyway." |
| **1:40** The undo | **Undo**: countdown running. Hand the phone to the judge. | "Fast money is a scammer's favorite thing. So we gave it an undo." *(to the judge)* "Go ahead. Tap it." |
| **1:55** Money back | **Home**: "Undone. Money returned". | *(let it land, two seconds of silence)* "Money's back. One tap." |
| **2:05** No app needed | **Claim** screen. | "Mom doesn't have Nest? She gets a link. Her phone number opens it." |
| **2:15** How | Explorer tab with the escrow transaction, if live. | "Under it are digital dollars on Solana. It settles in about a second. We cover the network fee." "The undo is a real hold on-chain. Here it is." [TEAM: only say this line if the escrow is live] |
| **2:35** Close | Back to **Home**. | "Your money keeps its value and moves any hour. And if it was a scam, you take it back." *(beat)* "Nest. Protect what matters." |
| **2:50** The ask | Hold out the phone. | "What would you want it to protect for you?" |

The last line is the one ask. It opens Q&A on their terms, and the answer tells you which section 4 card to reach for.

**Honesty line, said once, early in Q&A or when asked "is this real?"**
"The [TEAM: escrow, fee sponsorship, claim link] run on Solana devnet with test money. Cash-out is simulated until we connect a licensed partner." [PITCH_RESEARCH]

### The 30-second opener (judge arrives mid-pitch)

Stop, turn to them, start here. Then jump straight to the 1:20 beat.

> "Hi. Short version. Nest is a dollar account for anyone with a phone. Your savings stay in dollars. Money moves any hour, in about a second, and sending costs you nothing. And if you send money to a scammer, you take it back. Watch."

(45 words, about 20 seconds spoken.)

### Reset between judges (30 seconds, the driver's job)

1. Cancel or release any open escrow so the next undo starts clean.
2. Back to Home. Check the balance shows what the script says.
3. Check the devnet badge is visible.
4. Backup ready: the second phone, and the 60-second recording one tab away. If you use it, say so out loud [PITCH_RESEARCH].

---

## 4. Q&A prep

Answer the surface line first. Give the deeper line only if they lean in. If you don't know, say "I don't know yet" and what you'd check. Never guess a number.

| # | Question | Surface answer | Deeper answer |
|---|---|---|---|
| 1 | **Who holds the money? Custody?** | "[TEAM] You do. Your passkey controls your account; Nest can't move it." *(or the app-managed version, whichever the team picked)* | Sign-in is a passkey wallet (Privy or Squads Grid, [TEAM: which]). The undo money sits in our program's escrow account until it releases or you cancel. A passkey used for login is not an on-chain signer, so we [TEAM: say how signing works] [BLOCKCHAIN_STACK]. |
| 2 | **Is this legal? Do you pay interest?** | "No interest. US law bans stablecoin issuers from paying it, and we don't pretend otherwise." | GENIUS Act: 1:1 reserves, no issuer yield, effective January 18, 2027. Nest wouldn't issue a coin, but would likely need US money transmitter licences and FinCEN registration, and a CASP licence under MiCA in the EU [UNVERIFIED: depends on custody] [INSTITUTIONS_RESEARCH]. Savings vaults are a discipline tool, not a yield product. Not legal advice. |
| 3 | **Circle can freeze USDC. So how is this "independent"?** | "True, Circle can freeze an address under a lawful order. We say so. What it can't do is close the bank you depend on." | Circle froze about $109M across 372 addresses from 2023 to 2025 [INSTITUTIONS_RESEARCH]. Compare Paraguay this week: Ueno Bank seized November 3, about 3M customers frozen, no date to restore access, first payout capped near $1,700 [PITCH_RESEARCH]. One is a targeted order against an address. The other froze most of a country's adults. We never claim "unfreezable". |
| 4 | **How does undo work on-chain? Solana is final.** | "We never reverse a payment. The first payment to someone new waits in an on-chain hold. You can cancel it until the window ends." | It's an escrow account our Anchor program controls (a PDA), with cancel and release instructions and a timer. Once it releases, it's final, like any Solana transfer. Saved recipients skip the hold. [TEAM: window length, and whether release is automatic or claimed] [NEST_FEATURES, INSTITUTIONS_RESEARCH] |
| 5 | **Why Solana?** | "Money should move as fast as a text and cost less than one. Solana does both, and lets us write the undo as real code." | About a second to finality since Alpenglow (October 21, 2026); a third-party sample showed a ~404ms median [S]. Fees are a fraction of a cent, which we pay through Kora, the Solana Foundation's fee relayer. USDC is native on Solana, and Visa settles in USDC on Solana [BLOCKCHAIN_STACK, INSTITUTIONS_RESEARCH]. |
| 6 | **If a scam gets past the undo, who pays?** | "Today, the user. We give them a pause button and a warning, not insurance." | We sell controls and evidence, not guarantees; a guarantee would make Nest an insurer [INSTITUTIONS_RESEARCH]. The market is moving our way: UK banks must reimburse push-payment fraud, and Singapore requires a 24-hour hold on suspicious transfers over S$25k. That hold is our undo window. |
| 7 | **What's the business model?** | "Sending stays free. We haven't proven a model yet. Here's what we'd test first." | Two hypotheses [TEAM: pick]: (a) Nest Shield, the undo and scam check sold as an API to banks and wallets that now carry scam liability; (b) fees at the edges, like cash-out and card top-up, set with partners. No pricing or unit economics are established [HACKATHON_CONTEXT]. The network fee we sponsor is a fraction of a cent. |
| 8 | **How do people get cash out?** | "Through licensed local partners. In this demo, cash-out is simulated, and it's labeled that way." | Documented routes we'd start with: Bridge and Crossmint for Mexico (MXN over SPEI); MoonPay test mode; Kotani Pay or Yellow Card sandboxes for Africa. Not verified for us yet. Cuba has no route (Bridge lists Cuban residents as prohibited). Paraguay residency is supported by Bridge, but no guaraní payout is verified [HACKATHON_CONTEXT, BLOCKCHAIN_STACK]. |
| 9 | **What if USDC loses its dollar peg?** | "It has happened once, briefly. We'd show it honestly, not hide it." | USDC fell to about $0.87 in March 2023 when $3.3B of reserves was stuck at SVB, and recovered within days [PITCH_RESEARCH]. GENIUS now requires 1:1 reserves. "Inflation-proof" means against a weak local currency, not against the dollar itself. |
| 10 | **Isn't this just a crypto wallet with a nice skin?** | "A wallet gives you speed. Nest adds what a wallet leaves out: no seed phrase, no gas, and an undo." | The undo window is new program logic, not UI; first we know of in a shipped consumer app [NEST_FEATURES: say "first we know of", never "first ever"]. The scam check flags new numbers, urgency and "new phone" language before money moves [TEAM: Gemini built?]. |

**Two more you may get.**
- *"Did you talk to real users?"* [TEAM] Only answer with interviews that happened. If none: "Not yet. Here's who we'd ask first: three Miami families who send money home." [HACKATHON_CONTEXT]
- *"What if I lose my phone?"* [TEAM] Recovery is open. Say what's built. Trusted-contact recovery is a stretch idea, not built [PITCH_RESEARCH].

**Sponsor tracks, one line each if a sponsor judge asks.** Solana: the undo escrow and fee sponsorship. Gemini: the scam check reading the message [TEAM: built?]. Auth0: passkey sign-in [TEAM: Auth0 or Privy? Only claim the one used]. Tiger Data: transfer events and velocity rules [TEAM: built?]. Vultr: where the fee-payer server runs [TEAM: built?]. Claim only what's real.

---

## 5. The 90-second demo video

Rules from Martha's video file: the loss is on screen in the first 2 seconds, captions on every line, at most two numbers, real product pixels, one call to action, and nothing faked. Label anything simulated on screen.

| Time | Shot | On-screen text | Voiceover |
|---|---|---|---|
| 0:00 | Phone in a hand. A text arrives: "Mom, it's me. New number. Send it here." | Mom, it's me. New number. | "Impostors took three and a half billion dollars from Americans in 2025." [FTC via PITCH_RESEARCH] |
| 0:06 | Same hand. The text's "send here" link, finger hovering. | | "Once it's sent, it's gone." |
| 0:10 | Cut to black. Three rings form the logo. | Nest. Protect what matters. | "This is Nest." |
| 0:14 | **Home** screen recording. | Your money, in dollars. | "A dollar account for anyone with a phone." |
| 0:22 | **Savings** screen, the two bars. | (bar labels only) | "Your savings stay in dollars." |
| 0:30 | **Send** to Mom, **Amount** with "$0 fee", **Face ID**. | $0 fee. About a second. | "Send any day, any hour. It costs you nothing." |
| 0:42 | **Arrived**, Sunday timestamp. Explorer link flashes. | Arrived. Sunday night. | "It lands in about a second." |
| 0:50 | **Send** to the new number. **Scam check** card. | Wait. This looks like a scam. | "Send to someone new, and Nest checks it first." |
| 1:00 | **Undo** screen. Finger taps Undo. **Home** shows "Undone. Money returned." | Sent to a scammer? Take it back. | "And if it was a scam, you take it back." |
| 1:12 | **Claim** screen on a second phone. | No app needed. | "No Nest? A link and a phone number is enough." |
| 1:20 | Logo, team names, "Built on Solana at SharkByte 2026". Devnet badge visible. | Built on Solana at SharkByte 2026 | "Nest. Protect what matters." |

About 95 spoken words, so there's room to breathe. Record each screen in one real take on devnet.

**Real vs simulated: fill in before recording** [TEAM]

| Element | Status | Caption if not live |
|---|---|---|
| Undo escrow, cancel, release | [TEAM: live on devnet / in progress] | "Prototype" |
| Send USDC + sponsored fee | [TEAM] | "Prototype" |
| Arrival time | [TEAM: measured / static] | Drop the exact number; say "about a second" |
| Scam check | [TEAM: Gemini live / rules only / static card] | "Prototype" |
| Face ID / passkey | [TEAM: Auth0 / Privy / mockup] | "Prototype" |
| Claim link | [TEAM] | "Prototype" |
| Local-currency value and the $694 bar | Static unless a Pyth feed exists for that currency (none for ARS) | "Example" |
| Cash-out | Simulated | "Simulated for demo" |
| Add money by card or bank | Simulated | "Simulated for demo" |

---

## 6. Three opening hooks to test

Run each on a few judges, note which one gets them leaning in by the 1:20 beat, keep the winner. Each one is true.

1. **The text (scam first).** Hold up the phone with the scam text already on screen. "If this landed on your mom's phone right now, could she get the money back?" *(wait for "no")* "With Nest, she can." Then go to 0:35. Strongest if the judge has parents abroad.
2. **The shrinking savings.** "Think of the thing you're saving for. Now picture it shrinking every month, and you did nothing wrong. In Argentina in 2023, prices rose 211%." [PITCH_RESEARCH] Then go to 0:35. Best for the inflation-proof point; needs the Savings screen fixed first.
3. **This week (Ueno).** "On Tuesday, about three million people in Paraguay found their bank frozen. No date to get their money back." [PITCH_RESEARCH] Then: "Nest isn't tied to any one bank." Strongest news hook, but you were planning to keep it for Q&A, and it invites "Circle can freeze too". Use it only with card 3 of section 4 ready.

---

## Martha's gate (run on this file)

- Every number traces to a repo file or is marked [UNVERIFIED]. No invented users, results or quotes.
- No interest, no "unfreezable", no "first ever", no "reverses a payment".
- Money outcomes are stated as what the product does, never as promised gains.
- Spoken lines under 20 words; the 30-second opener is 45 words; one ask at the end of the pitch.
- No em dashes, no hype words, no exclamation marks.
- Open risk: items 1 to 5 in section 0 must be filled in before the first judge.
