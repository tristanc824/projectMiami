# Guard: problems, pitch angle and live demo

Researched November 7, 2026. Every fact has a source link. Anything marked **(idea)** or **(recommendation)** is our suggestion, not a fact. Read [HACKATHON_CONTEXT.md](./HACKATHON_CONTEXT.md) first for the earlier planning record.

## The one-paragraph version

Guard is a digital-dollar account on Solana with two jobs: **keep savings safe** from inflation and failing banks, and **send money to family abroad safely**. The angle judges will remember: *instant, irreversible payments are a scammer's favorite feature, so Guard adds an undo button.* The demo has one "aha" moment: a scam transfer gets caught and cancelled live, on-chain. Everything else supports that moment.

---

## 1. Real problems, with evidence

### Money that loses value
| Fact | Source |
|---|---|
| Argentina's inflation was 211.4% in 2023, a 32-year high | [AP via KSAT, Jan 2024](https://www.ksat.com/business/2024/01/11/argentinas-annual-inflation-soars-to-2114-the-highest-in-32-years/) |
| Turkey's inflation reached 85.51% in Oct 2022 | [Daily Sabah](https://www.dailysabah.com/business/economy/turkiyes-annual-inflation-up-in-october-to-reach-855) |
| Nigeria's inflation was 34.80% in Dec 2024 | [Techpoint Africa](https://techpoint.africa/2025/01/16/nigerias-december-inflation-rate-ranks-highest-among-africas-top-10-economies/) |
| Venezuela went from 94% (2024) to 229% (2025). Shops settle in USDT, which locals call "Binance dollars" | [Sumsub](https://sumsub.com/media/news/stablecoins-used-in-venezuela-amid-inflation-fears/), [Cointelegraph](https://cointelegraph.com/news/how-binance-dollars-became-venezuela-s-real-currency) |
| Nigeria received $92.1B on-chain from Jul 2024 to Jun 2025. Chainalysis links this to inflation and limited access to foreign currency | [Cointelegraph on Chainalysis](https://cointelegraph.com/news/sub-saharan-africa-third-fastest-growing-region-crypto-adoption-report) |

### Banks that freeze
| Fact | Source |
|---|---|
| **Paraguay, Nov 3, 2026 (four days ago):** the central bank seized Ueno Bank, which serves about 3M customers (about 60% of adults). Withdrawals and transfers are frozen with no date to restore them, and the first payout is capped at about $1,700 | [AP via News4Jax](https://www.news4jax.com/business/2026/11/03/paraguay-seizes-major-digital-bank-tied-to-president-leaving-millions-of-customers-in-limbo/) |
| Lebanon has had informal capital controls since 2019, and the lira lost more than 98%. Depositors held up banks to get their own money | [Al Jazeera, Oct 2022](https://www.aljazeera.com/news/2022/10/4/depositors-storm-three-lebanese-banks-over-withdrawal-limits) |
| Nigeria, 2023: during a cash crunch, over-the-counter withdrawals were capped at ₦20,000 (about $43) a day | [Nairametrics](https://nairametrics.com/2023/02/03/naira-scarcity-over-the-counter-withdrawals-to-have-a-maximum-payout-of-n20-000-cbn/) |

### Sending money home costs too much
| Fact | Source |
|---|---|
| Sending $200 costs **6.49%** on average worldwide (Q1 2025), against a G20 target of 5% | [World Bank RPW](https://remittanceprices.worldbank.org/sites/default/files/rpw_main_report_and_annex_q125_1_0.pdf) |
| About $685B was expected to flow to low- and middle-income countries in 2024 | [World Bank blog](https://blogs.worldbank.org/en/peoplemove/in-2024--remittance-flows-to-low--and-middle-income-countries-ar) |
| Filipinos abroad sent a record $35.63B home in 2025, 7.3% of GDP, about 40% of it from the US | [BusinessWorld](https://www.bworldonline.com/top-stories/2026/02/16/730762/ofw-remittances-soar-to-all-time-high-35-63-billion-in-2025/) |
| After Hurricane Melissa, remittances to Jamaica fell 8.3% in Oct 2025 because payout networks broke. December 2025 was then a record month. Much of that money comes from South Florida | [Caribbean National Weekly](https://www.caribbeannationalweekly.com/business/jamaicas-remittance-inflows-drop-8-3-in-october-after-hurricane-melissa/), [Gleaner](https://jamaica-gleaner.com/article/business/20260204/jas-remittances-surge-14-nov) |
| Since Jan 1, 2026, the US taxes cash-funded remittances at 1% (transfers funded by bank account or card are exempt) | [RSM](https://www.rsmus.com/insights/tax-alerts/2025/excise-tax-on-cross-border-remittances) |

### Scams target exactly these families
| Fact | Source |
|---|---|
| Reported US fraud losses hit a record $15.9B in 2025. Impostor scams accounted for $3.5B | [FTC, Jun 2026](https://ftc.gov/news-events/news/press-releases/2026/06/ftc-data-show-people-reported-losing-3-point-5-billion-imposter-scams-2025) |
| Americans aged 60+ lost about $3B and are the most likely to lose money to a "family member" impersonator | [PPC Land on FTC testimony](https://ppc.land/older-americans-lost-3-billion-to-fraud-in-2025-ftc-tells-congress/) |
| UK authorised push payment fraud, where victims are tricked into sending the money themselves, reached £576.4M in 2025, up 19% | [Fintech Futures on UK Finance](https://www.fintechfutures.com/financial-crime-fraud-prevention/uk-payment-fraud-losses-topped-1-28bn-in-2025-new-uk-finance-report-finds) |
| "Hi Mum, new number" scams: in Australia, 2/3 of reports came from women over 55. The scams now use AI voice notes | [ACCC](https://www.accc.gov.au/media-release/accc-warning-of-suspicious-messages-as-hi-mum-scams-spike), [Santander](https://santander.co.uk/personal/support/fraud-and-security/fraud-updates) |

### Be honest about the limits (judges will ask)
- **USDC can lose its peg.** It dropped to about $0.87 in March 2023, when $3.3B of its reserves was stuck at SVB, and recovered within days. [Cointelegraph](https://cointelegraph.com/news/usdc-depegs-as-circle-confirms-3-3b-stuck-with-silicon-valley-bank)
- **The US GENIUS Act (2025)** requires 1:1 reserves and **bans paying yield** on stablecoins. Issuers must also be able to freeze tokens under lawful orders. So Guard **cannot promise interest, and cannot promise funds can never be frozen.** [Covington](https://www.cov.com/news-and-insights/insights/2025/07/the-genius-act-becomes-law-key-provisions-from-the-federal-stablecoin-regulatory-framework)
- **Cashing out to local currency** depends on licensed partners in each country. We have not verified coverage, so the demo labels cash-out as simulated.

---

## 2. Features that answer those problems (idea)

Ranked by how well each one serves the demo and how buildable it is this weekend.

1. **Undo window for new recipients.** The first transfer to a new address goes into an on-chain escrow (a PDA, an account controlled by our Solana program) with a cancel window. The sender can claw it back. *Answers: impostor scams and push payment fraud. This is real on-chain logic, which the Solana judges reward.*
2. **Scam check.** The app flags a payment as risky when the recipient is new, the account was "just changed," or the message uses urgency words. It then requires a call-back to a saved contact. *Answers: "Hi Mum" scams.*
3. **Sponsored fees.** Users never hold SOL and only ever see dollars. *Answers: crypto friction for non-crypto families.*
4. **Claim link.** The recipient opens a link (a Solana Pay or Blink URL) on any phone and claims the money. If nobody claims it, it's refunded. *Answers: families without wallets, and payout networks down after a disaster.*
5. **Family vault.** A shared savings goal, with 2-of-2 approval for large withdrawals.
6. **Fee receipt.** Every transfer shows its real cost next to the World Bank's 6.49% average.
7. **Recovery through trusted family.** Guardians can rotate a lost key, after a time delay. (Stretch goal.)

Skip: compressed NFTs, yield on savings (banned), and anything that claims to make money "unfreezable."

---

## 3. What wins hackathons like this

### Winners closest to Guard
| Project | Event, place | What it was |
|---|---|---|
| Credible | Colosseum Cypherpunk 2025, Stablecoin track, 2nd | Stablecoin remittances to India ([Colosseum](https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/)) |
| LocalPay / Xelio | Colosseum Breakout 2025, Stablecoins track, 3rd / 4th | Payments in emerging markets / sending money over SMS ([Colosseum](https://blog.colosseum.com/announcing-the-winners-of-the-solana-breakout-hackathon/)) |
| Paytos | Breakout 2025, University award | Turns any phone into a stablecoin wallet |
| Ripe | Renaissance 2024, Payments track, 4th | Scans GCash/Venmo QR codes and pays merchants in local currency using USDC ([BitPinas](https://bitpinas.com/feature/ph-based-projects-solana-renaissance/)) |
| GlobalX.money | ETHGlobal New Delhi, track 1st | Money from abroad lands in Indian bank accounts in under 10 seconds ([ETHGlobal](https://ethglobal.com/showcase/globalx-money-08tpa)) |

**The pattern:** plain remittance apps place in tracks, but grand prizes go to projects with a **new primitive**. Guard's new primitive is the **undo window**, so it must be real and on-chain.

### What judges say they reward
- Colosseum's criteria: founder–market fit, insight, product and execution, market, communication, viability, traction. The video is "one of the first resources judges review." ([Colosseum](https://www.colosseum.com/hackathon))
- What loses: buzzwords, flashy visuals with little substance, and not explaining *why Solana*. ([Colosseum blog](https://blog.colosseum.com/perfecting-your-hackathon-submission/))
- A working devnet demo is the baseline. Lead with one "aha" moment, and with a problem the team has lived. ([Colosseum blog](https://blog.colosseum.com/how-to-win-a-colosseum-hackathon/))
- **Action item:** SharkByte's own Devpost rubric couldn't be retrieved automatically. Someone should read it by hand.

### Our angle (recommendation)
- **Who:** one Miami family. A parent here sends money to a mother in Caracas, Manila or Kingston. If anyone on the team has lived this, open with it.
- **Two threats:** inflation eats savings back home, and fees and scams eat the transfer.
- **The line:** *"Fast money is easy. Safe money is Guard."* or *"Instant and irreversible is a scammer's favorite feature. Guard gives you an undo button."*
- **Versus Wise, Western Union and Revolut:** days and a 6.49% average fee, and the family still ends up holding a weakening currency. Guard settles in seconds and lets them keep dollars.
- **Versus crypto wallets:** fast, but with no protection and full of jargon. Guard adds bank-style safety without a bank in the middle.
- **Honesty, in one sentence:** "The escrow, sponsored fees and claim links are real on devnet (here's the explorer). Cash-out is simulated until we connect a licensed partner."

---

## 4. Live demo and video

### What famous demos teach
| Reference | Lesson for us |
|---|---|
| Jobs' iPhone keynote, 2007: called someone in the audience and prank-ordered 4,000 lattes ([BGR](https://bgr.com/entertainment/steve-jobs-quotes-prank-call-starbucks-iphone-event/)), with a rehearsed "golden path" and backup phones ([MacRumors](https://www.macrumors.com/2013/10/04/former-apple-engineer-gives-behind-the-scenes-look-at-the-original-iphone-introduction/)) | Involve someone in the room. Script one path and rehearse it until it's boring. Bring backup phones. |
| Dropbox's 2008 video took the waitlist from about 5k to 75k overnight ([Wikipedia](https://www.wikipedia.org/wiki/Timeline_of_Dropbox)) | The video should show the real product, not a sizzle reel. |
| Apple Pay, 2014: one gesture ([TNW](https://thenextweb.com/news/apple-introduces-wireless-payment-feature-iphone-6)) | Sending should be: pick Mom, type the amount, hold to confirm. |
| Solana Pay + Shopify used USDC because people "think in dollars" ([TechCrunch](https://techcrunch.com/2023/08/23/solana-pay-plug-in-with-shopify-for-usdc-payments)) | Say "digital dollars," never "crypto." |
| Wise's "Nothing to Hide" made hidden fees the villain ([Wise](https://wise.com/campaign/knowwhatyoupay)) | Our villains are the 6.49% fee and the scammer. |
| Humane AI Pin had to re-edit its launch video after it showed wrong answers ([Neowin](https://www.neowin.net/news/humane-fixes-promo-video-where-its-ai-pin-gave-wrong-answers/)) | Never fake something in the video. Label what's simulated. |

### Demo moments (pick 4)
1. **The undo (the aha moment).** A text appears on screen: "Mom, it's me, new number, send $500 here." Guard flags it, and the money sits in on-chain escrow. Tap **Cancel** and it comes back. Show the explorer.
2. **Race against the wire.** A big stopwatch: a bank wire takes "1–5 business days, ~6.49% fee," while Guard takes about a second and $0.00. Say "about a second," not "400ms": that figure is the slot time, and confirmation takes a little longer ([Helius](https://www.helius.dev/blog/solana-commitment-levels)).
3. **Across the border.** A teammate at the back plays Mom, with tape on the floor marked "BORDER." Split screen: send $200, and her phone goes green.
4. **"Judges, hold up your phones."** A QR code on the slide opens a claim page, which creates a wallet in the browser, and a judge receives 5 test USDC.
5. **Inflation counter.** It runs during the whole pitch: "$1,000 held in local currency since we started has lost $X." Guard's balance stays at $1,000.00. Close by pointing at it. Use a cited inflation rate.
6. **Cash-out, labeled "Simulated."** Being honest is a feature.

### 3-minute pitch (recommendation)
| Time | Beat |
|---|---|
| 0:00–0:20 | A family's story. Start the inflation counter. |
| 0:20–0:45 | Three problems: money loses value, sending is slow and costly, scams are rising. |
| 0:45–2:00 | Live: race against the wire with a send across the border, then the scam caught and undone, then a judge's QR claim. |
| 2:00–2:25 | Why Solana: sub-cent fees, about a second to settle, programmable escrow, sponsored fees. |
| 2:25–2:45 | Who it's for and why now: Miami's diaspora, Ueno four days ago, and the 6.49% average fee. |
| 2:45–3:00 | Point at the counter: "Since I started, they lost $X. Guard lost nothing." Then the ask. |

### 90-second video (recommendation)
| Time | Shot |
|---|---|
| 0–8s | A phone shows "arrives in 3 days, fee $13.98." Voiceover: "This is how my family sends money." |
| 8–15s | The "new number" scam text, with a caption showing real loss numbers. |
| 15–22s | Title: "Guard. Save in digital dollars. Send home in seconds." |
| 22–40s | Real screen recording: balance in dollars, plus the inflation counter. |
| 40–58s | Two phones, Miami and abroad. Send, and the second phone turns green, with the explorer link flashing. |
| 58–72s | The scam send is caught and undone. |
| 72–80s | Cash-out, captioned "Simulated for demo." |
| 80–90s | Team, "Built on Solana at SharkByte 2026," logo, QR. |

Record each shot in one real take, add captions for silent autoplay, and keep at least half the video on the product itself.

### If wifi or devnet fails
- **Fund everything the night before.** The devnet faucet is rate-limited ([Metaplex](https://developers.metaplex.com/solana/airdrop-sol-for-development)).
- **Use a dedicated RPC endpoint** (Helius or QuickNode), with a fallback URL in the config.
- **Bring your own internet.** Use a phone hotspot first and venue wifi as backup. Preload every page.
- **Run a local validator** (`solana-test-validator`) and switch to it with one toggle. The phone QR moment won't work on a local network, so drop it in that case.
- **Keep a "replay" mode and a 60-second recording** one tab away. Say so out loud if you use it.
- **Bring two charged "Mom" phones.** Rehearse at least 5 times on the venue's projector.
