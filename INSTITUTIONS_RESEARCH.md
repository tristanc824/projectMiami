# Nest for Institutions: the problems banks, governments, aid agencies and businesses face

Researched November 7, 2026. **[U]** means unverified (only secondary or vendor sources, or the sources disagree). "My math" marks derived numbers. The consumer side is in [ECONOMIC_PROBLEMS.md](./ECONOMIC_PROBLEMS.md).

## Pitch these three
1. **The scam liability shift → the Nest Shield API.** UK APP fraud (victims tricked into sending money themselves) hit **£576.4M in 2025, up 19%**. The UK, EU, Australia and Singapore now make payment providers pay for scams. Nest sells the protection those providers now need.
2. **A $194T cross-border market running on a shrinking bank network.** Only **43%** of Swift payments reach the end customer within an hour. The FSB says the G20's 2027 targets will be missed. Nest is a 24/7 settlement rail.
3. **Programmable aid and government payments.** Humanitarian cash aid is **down 31% from its peak**. WFP proved blockchain cuts fees, and cash that arrives *before* a flood works better. Nest makes every dollar arrive faster and traceably.

## Nest for Institutions: product map
| Product | Buyer | What it does |
|---|---|---|
| **Shield API** | Banks, wallets, payment providers | Scam score + cancellable hold on payments to new payees + an evidence log for liability claims |
| **Payouts API** | Businesses, platforms, NGOs | Bulk USDC payouts with local cash-out and status webhooks |
| **Treasury Vaults** | Small businesses, corporates, banks | Multi-signature custody, spending policies, sweeps into dollars, audit export |
| **Programmable Disbursements** | Governments, aid agencies | Recipient allowlists, expiry, clawback, release on a trigger (e.g. a flood warning) |
| **Settlement Rail** | Small banks, money transfer operators | 24/7 USDC settlement with screening before release |
| **Escrow / Trade** | Importers and exporters | Payment released when delivery is proven |
| **Compliance Layer** | All of the above | KYC attestations, sanctions screening, Travel Rule data, freeze handling |

## Market size (for the "massive" slide)
| Market | Size | Source |
|---|---|---|
| Cross-border payments | **$194T** (2024), forecast $320T by 2032 | [FXC Intelligence](https://www.fxcintel.com/research/press-releases/new-data-cross-border-payments-market-now-worth-over-194tn-and-is-forecast-to-reach-320tn-by-2032) |
| Cross-border B2B | $31.6T; banks handle 92% | [FXC](https://fxcintel.com/research/press-releases/banks-take-92-of-global-b2b-payments-but-are-still-waking-up-to-56tn-opportunity) |
| Payments industry | $2.5T in revenue on $2.0 quadrillion in flows | [McKinsey 2025](https://www.mckinsey.com/industries/financial-services/our-insights/global-payments-report) |
| Remittances | $685B at a 6.49% average cost → about **$44B in fees** (my math) | [World Bank](https://blogs.worldbank.org/en/peoplemove/in-2024--remittance-flows-to-low--and-middle-income-countries-ar) |
| Financial-crime compliance | $206B a year | [LexisNexis](https://risk.lexisnexis.com/about-us/press-room/press-release/20230926-global-financial-crime-compliance-costs) |
| Card fraud / chargebacks | $33.4B / $33.8B a year | [Nilson](https://nilsonreport.com/articles/card-fraud-losses-worldwide-2024/), [Mastercard](https://www.mastercard.com/gb/en/news-and-trends/Insights/2025/2025-global-chargebacks-outlook.html) |
| Stablecoins' share of payments so far | About $390B a year in real payments, ~0.02% of global payments. Visa settles in USDC on Solana | [McKinsey/Artemis](https://www.mckinsey.com/industries/financial-services/our-insights/stablecoins-in-payments-what-the-raw-transaction-numbers-miss), [Decrypt](https://decrypt.co/352548/visa-begins-us-stablecoin-settlement-usdc-solana) |

---

## 1. Banks
| Problem | Key numbers | Nest product · demo · hook |
|---|---|---|
| **Correspondent banks pulling out** of countries and smaller banks ("de-risking") | Active correspondents fell about 22% from 2011 to 2019. The Americas outside North America lost 30% ([BIS CPMI](https://www.bis.org/cpmi/paysysinfo/corr_bank_data/corr_bank_data_commentary_1905.htm)) | A USDC settlement rail for small banks and money transfer operators · two "bank" wallets settle $1M on devnet with screening · *"The banks left a fifth of the world's corridors. Nest gives them a dollar rail back."* |
| **Money stuck in pre-funded foreign accounts and slow settlement** | Only 43% of Swift payments reach the end customer in under an hour ([Swift](https://www.swift.com/news-events/press-releases/swifts-cross-border-payments-processing-speed-surpasses-g20-target)). JPMorgan's Kinexys blockchain rail moves more than $2B a day. Estimates of idle pre-funded money range from $800B to $27T **[U]**. EU, UK and Swiss stock settlement moves to next-day on Oct 11, 2027 | Fund payments in seconds instead of pre-funding for days · *"Swift reaches the bank in an hour. Nest reaches the person in a second."* |
| **Banks now pay for scams** | UK mandatory reimbursement since Oct 2024 returned 88% (£112M) in its first 9 months ([PSR](https://www.psr.org.uk/news-and-updates/latest-news/news/one-year-on-impact-of-app-reimbursement-on-victims/)). APP losses of £576.4M in 2025, +19% **[U]** | **Shield API** · *"UK banks now pay for scams. Nest stops the payment before it leaves."* |
| **Bank runs at internet speed** | SVB lost $42B in one day, with $100B more queued ([CNBC](https://www.cnbc.com/2023/03/28/svb-customers-tried-to-pull-nearly-all-deposits-in-two-days-barr-says.html)). Treasury advisers projected about $2T in stablecoins by 2028 ([Treasury](https://home.treasury.gov/news/press-releases/sb0122)) | White-label USDC vaults that banks run themselves, keeping the customer relationship |
| **KYC/AML cost** | $206B a year; one corporate KYC review costs about $2,598 and takes 95 days ([Fenergo](https://www.corporatecomplianceinsights.com/kyc-review-cost-survey-2023/)) | Reusable "verified" credentials on-chain · demo: a second institution accepts the attestation in one click |

## 2. Governments and central banks
| Problem | Key numbers | Nest angle |
|---|---|---|
| **Dollarization and capital flight** | Argentines hold **$268.8B** in foreign currency outside the banking system **[U]**. Foreign-currency-linked deposits made up 62.2% of Türkiye's deposits in Dec 2023 ([Mondaq](https://www.mondaq.com/turkey/commoditiesderivativesstock-exchanges/1620826/a-new-form-of-dollarization)). Nigeria had a $7B FX backlog ([Nairametrics](https://nairametrics.com/2024/04/08/keyamo-backs-cbn-says-airline-industrys-fx-backlog-cleared/)) | Treasury vaults with regulator-visible audit trails · *"$269B sits under Argentine mattresses. Nest is a mattress with an audit trail."* |
| **Stablecoin regulation is now law** | US GENIUS Act (P.L. 119-27, effective Jan 18, 2027) requires 1:1 reserves and issuer freeze powers ([Covington](https://www.cov.com/news-and-insights/insights/2025/07/the-genius-act-becomes-law-key-provisions-from-the-federal-stablecoin-regulatory-framework)). EU MiCA has applied since Jun 2024. Hong Kong issued its first licences in Apr 2026. Singapore's framework dates from 2023 | *"2027 is the first year regulated digital dollars exist in law across the US, EU, Hong Kong and Singapore."* |
| **Leakage in government payments to citizens** | More than a quarter of adults worldwide receive government payments. The IMF estimates going digital saves 0.2–21% of the money. Niger's mobile transfers cost 20% less to run ([Klapper &amp; Singer](https://paperity.org/p/93982107/the-opportunities-and-challenges-of-digitizing-government-to-person-payments)) | Programmable disbursements · demo: pay 1,000 people from a spreadsheet, and unclaimed money returns automatically |
| **Cash economies and tax collection** | The informal economy is ~32–33% of GDP in developing economies ([World Bank](https://issuu.com/world.bank.publications/docs/9781464817533/36)). Digital firms pay more tax ([IMF WP 2025/089](https://econpapers.repec.org/RePEc:imf:imfwpa:2025/089)) | Opt-in merchant ledger with tax-ready export, framed as formalisation, not surveillance |
| **Central bank digital currencies (CBDCs) vs. stablecoins** | 134 countries are exploring a CBDC; only 3 have fully launched | Nest works with any rail: USDC today, a CBDC or tokenized deposits later |

## 3. Aid agencies and NGOs
- Humanitarian cash aid **fell 11% to $7.3B in 2025**, 31% below its peak ([ALNAP](https://alnap.org/help-library/resources/sohs-2026/chapter-2-what-works-and-at-what-cost/2-2-cash/)).
- WFP's Building Blocks blockchain moved $555M across 25M transactions and **saved $3.5M in bank fees** ([WFP](https://www.wfp.org/building-blocks)). The UN refugee agency (UNHCR) has used USDC for aid in Ukraine since Dec 2022 ([UNHCR](https://www.unhcr.org/ua/en/node/305)).
- WFP sent cash in Bangladesh **up to 4 days before** the 2020 floods, about 100 days earlier than in 2019. Families were 36% less likely to go a day without food ([WFP review](https://www.wfp.org/publications/acting-flood-protect-most-vulnerable-independent-review-wfps-anticipatory-cash)).
- **Nest product:** pre-funded disaster vaults that release automatically on a trigger. **Demo:** a mock early-warning signal fires and 500 wallets are paid in under 10s. **Hook:** *"Aid that lands before the flood, not 100 days after."*

## 4. Businesses
| Problem | Key numbers | Nest product |
|---|---|---|
| Small-business FX costs and contractor payroll | $31.6T in cross-border B2B payments. FX markups of 2–4% **[U]** | **Payouts API:** pay contractors in 40 countries on Friday, and everyone has the money on Friday |
| Trade finance gap | $2.5T; 41% of small-business requests rejected ([GTR on ADB](https://www.gtreview.com/news/global/measures-needed-to-close-trade-finance-gap-amid-tariff-upheaval-adb-says/)) | Escrow that releases payment when delivery is proven · demo: a mock shipping confirmation releases funds |
| Treasury in high-inflation countries | Stripe launched stablecoin accounts for businesses in 101 countries after buying Bridge for about $1.1B ([Bloomberg](https://www.bloomberg.com/news/articles/2025-05-07/stripe-introduces-stablecoin-accounts-in-more-than-100-countries)) | Multi-signature business vault that sweeps local-currency income into dollars |
| Chargebacks and card fraud | Every $1 of fraud costs US merchants $4.61 ([LexisNexis](https://risk.lexisnexis.com/about-us/press-room/press-release/20250402-tcof-ecommerce-and-retail)) | USDC checkout with no chargebacks, plus an optional buyer-protection hold |
| Late B2B payments | 43% of US B2B invoices are overdue **[U]** | Invoices that pay themselves on the due date |

## 5. The scam liability shift: the market for Nest Shield
- **UK:** banks must reimburse authorised push payment (APP) fraud victims, up to £85k per claim.
- **EU:** a Nov 2025 deal makes providers refund customers when a scammer impersonates their bank ([Taylor Wessing](https://www.taylorwessing.com/en/insights-and-events/insights/2025/11/eu-lawmakers-strike-a-deal-on-payments-reforms)).
- **Australia:** the Scams Prevention Framework allows penalties of up to A$50M ([Vixio](https://www.vixio.com/insights/pc-australia-enacts-world-leading-scams-prevention-framework)).
- **Singapore:** the Shared Responsibility Framework requires a **24-hour hold on suspicious transactions over S$25k** ([HSF Kramer](https://www.hsfkramer.com/notes/data/2024-posts/financial-institutions-and-telcos-required-to-share-responsibility-for-phishing-scams-in-singapore)). That is exactly Nest's undo window, already written into law.
- **Crypto scams:** at least $14B was taken on-chain in 2025. The FATF reports only 3.8% of stolen funds were recovered in 2024 ([FATF](https://www.fatf-gafi.org/en/publications/Fatfrecommendations/targeted-update-virtual-assets-vasps-2025.html)).
- **Hook:** *"Singapore already requires a 24-hour hold. Nest Shield sells that hold as an API."*

## Risks and realities (say these before judges do)
- **Licensing:** Nest wouldn't issue a stablecoin. It would likely still need US money transmitter licences and FinCEN registration (depends on the custody model **[U]**), and a crypto service licence (CASP) in the EU under MiCA.
- **Compliance:** sanctions (OFAC) screening, the FATF Travel Rule, and the US Bank Secrecy Act for institutional clients.
- **Freezes:** issuers must be able to freeze funds. Circle froze about $109M across 372 addresses (2023–25), versus Tether's $3.29B. Present this as protection against bad actors, and disclose that it also applies to users.
- **Finality:** a settled Solana transfer can't be reversed. The "undo" only works as a hold inside Nest's own escrow before release. Never claim to reverse a settled payment.
- **Yield:** the GENIUS Act bans interest from issuers. Any yield product must be separate and disclosed, never called a deposit.
- **Liability creep:** sell evidence and controls, not guarantees. A guarantee would make Nest an insurer.
- **Policy:** the IMF and BIS are skeptical, and some countries may restrict dollar stablecoins. Build country-by-country switches.
