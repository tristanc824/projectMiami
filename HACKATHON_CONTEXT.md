# SharkByte hackathon: project context and planning brief

Last consolidated: November 6, 2026. Time zone: America/New_York.

This document captures the discussion so far: the team's original vision, user clarifications, research findings, proposed product directions, and unresolved decisions. Recommendations are not final team decisions unless explicitly identified as confirmed. This is a consolidated brief rather than a verbatim transcript.

Teammates should start with [TEAM_PROMPTS.md](./TEAM_PROMPTS.md) for the work split and the prompts to paste into Cursor or Claude. This file is the research record those prompts rely on.

## 1. Confirmed team goals and constraints

- Participate in the SharkByte hackathon in Miami.
- Pursue both **Best Use of Solana** and **first overall**.
- Team size: **four people**.
- Team's stated completion/submission target: **Sunday at 10 a.m.**
- The official guide distinguishes the end of hacking from the submission deadline; details are below.
- Individual technical skills, existing Solana experience, available provider accounts, and current implementation progress have not been established.
- Countries the team specifically wants considered: **Cuba and Mexico**, with **Paraguay** also under consideration.
- No destination country or final feature set has been selected in the conversation.

## 2. Original product vision

The team wants to build a seamless, beginner-friendly way to:

1. Deposit fiat in a local currency.
2. Convert it into USDC.
3. Send or hold the USDC using Solana.
4. Convert back into local fiat when needed.
5. Use the money for real-life spending.

The larger vision is a worldwide neobank or a "worldwide Zelle": accessible international transfers, digital-dollar balances, and everyday usability.

The original motivations are:

- Help people in emerging markets preserve capital against local currency depreciation and inflation.
- Address concerns about hacks, financial fraud, and loss of access to funds.
- Make the experience accessible to people without crypto knowledge.
- Help immigrant families in Miami send support to relatives abroad.

The Miami connection is an important part of the proposed story: a local sender with a real relationship to a recipient abroad, rather than an abstract global financial-inclusion pitch.

## 3. Important user clarification: crypto and Solana are central

The user explicitly pushed back against treating Félix and Littio as equivalent products, explaining that this project is **crypto-specific and built around Solana**.

Preserve that emphasis in future planning. Do not reduce the project to a conventional remittance interface with an interchangeable blockchain backend.

Two separate comparisons remain useful:

- **Technical/product similarity:** wallet ownership, actual USDC holdings, Solana interoperability, programmable transfers, and on-chain functionality.
- **Alternatives for the same customer:** services a family might otherwise use to send money, receive support, or hold dollars.

The distinction was acknowledged. An additional factual clarification was made: Littio's official app listing explicitly mentions USDC, so the presence of crypto alone does not establish uniqueness. This does not make the products identical.

**Unresolved:** Does the user control a portable Solana wallet and its USDC, or does the app manage funds and use Solana behind a banking-style interface? Custody, recovery, and signing authority have not been decided.

## 4. Verified hackathon requirements

Primary sources:

- [Official Hacker Guide](https://weareinitold.notion.site/Hacker-Guide-2819f4e8ae4e81c6aa2cfa180bd34157)
- [SharkByte 2026 Devpost](https://sharkbyte2026.devpost.com/)
- [SharkByte website](https://shark-byte.io/)

The supplied guide identifies the event as November 6–8, 2026, at Miami Dade College's North Campus, School of Justice Building.

| Requirement | Recorded detail |
| --- | --- |
| End of hacking | Sunday, November 8, **10 a.m. EST** |
| Submission closes | Sunday, November 8, **11 a.m. EST** |
| Team's working target | Remain ready by **10 a.m.** |
| Team size | Up to four hackers |
| Live presentation | **Three minutes**, in person |
| Submission video | **One minute and 30 seconds** |
| Repository | Include GitHub repository link |
| Contact | Include at least one Discord tag |
| Team registration | Invite all teammates to the Devpost project and identify members clearly |
| Categories | Explicitly select relevant prize categories; do not rely on automatic consideration |

The guide says projects are automatically eligible for Best Overall and may enter multiple relevant challenges. It also warns that missing category selection can prevent prize consideration. Select all intended categories in Devpost and verify the form before submission. Multiple-category eligibility is documented; no separate guarantee about receiving multiple prizes was established.

### Best Use of Solana

The current Devpost description includes consumer products, trading/DeFi, identity, supply-chain, and payment prototypes. It emphasizes fast execution, low transaction costs, scalability, and innovative use of Solana.

- Listed prize: Unruggable Hardware Wallets for the winning team's members.
- The published description does **not list a custom smart-contract requirement**.
- This observation is not a separate eligibility ruling from organizers.
- A working payment flow with meaningful Solana usage is a reasonable direction.

### Overall judging

Devpost's specific judging criteria were marked **TBD** when retrieved. The event website describes technical complexity, innovation, UI/UX, and practical utility as typical criteria. No official weights or guaranteed winning formula were verified.

The guide lists first overall as an 11-inch iPad A16 and a ManaTech package. Prize details and schedules can change; check organizer updates before presenting.

## 5. Proposed product framing

The assistant recommended narrowing the weekend implementation to a **Solana-native family money app for one corridor**, while retaining global expansion as the longer-term vision.

This is a recommendation, not a settled change to the team's original vision.

Suggested positioning:

> A Solana-native family wallet that connects everyday money to digital dollars—letting families send, hold, coordinate, and spend across borders.

Suggested family-support pitch:

> Supporting your family shouldn't require them to understand crypto. We're building a bilingual app that lets relatives send money, contribute toward shared expenses, and receive digital dollars on Solana. Recipients choose how much to keep in dollars and how much to withdraw locally, with fees and delivery status clearly shown.

Suggested security-focused pitch:

> Families sending money home need control over their savings. We're building a Solana family wallet that combines accessible digital dollars with protections against mistaken and unauthorized transfers.

Use these as draft language. They describe intended behavior, not capabilities already implemented or proven.

"Worldwide Zelle" remains useful shorthand for the ambition. "Family payments app" or "family wallet" was recommended for the prototype; "neobank" implies a broader operating model than has been established.

## 6. What is strong and what needs refinement

| Idea | Assessment and implication |
| --- | --- |
| Miami immigrant families | Specific, relatable initial customer group with potential access to interviewees. |
| Beginner-friendly crypto | Important product requirement: familiar language, clear amounts, verified recipients, and understandable confirmations. |
| Solana-native USDC | Central to the team's intent. Demonstrate benefits through actual wallet/payment behavior. |
| Every global currency | Too broad for a weekend implementation. Start with one funding currency and one payout route. |
| Instant fiat-to-fiat transfers | Blockchain settlement and local bank delivery are separate processes. Display their statuses separately. |
| Immediate real-world spending | Requires a supported bank payout, cash partner, card program, or merchant integration. No universal spending capability has been established. |
| Inflation protection | Retaining a dollar-linked balance may address local currency depreciation; immediately converting everything back removes that benefit. It does not eliminate inflation or other risks. |
| Protection from hacks | Needs specific, demonstrable controls and a defined threat model. Solana or USDC alone does not establish superior safety. |
| Optional dollar holding | Recipient choice is important. Validate whether recipients actually want this versus immediate local currency. |

Do not assume all Latin American customers have the same inflation experience or priorities. Fees, trust, delivery certainty, cash access, and ease of use may matter more for a particular family.

## 7. Country comparison

The assistant provisionally recommended **Mexico** for the hackathon demo. The user has not confirmed that choice.

### Mexico

- Clearest documented route among the countries discussed.
- Bridge documents conversion between Solana USDC and MXN, with SPEI as the local payment rail.
- Crossmint documents MXN SPEI offramps as available.
- Provider access, customer eligibility, onboarding, limits, and actual delivery behavior still require verification for the app.
- It remains unknown whether intended recipients have Mexican bank accounts or need cash pickup.

Sources: [Bridge fiat routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/fiat), [Bridge MXN/SPEI integration guide](https://apidocs.bridge.xyz/get-started/guides/move-money/mxn-spei-integration-guide), [Crossmint payout methods](https://docs.crossmint.com/offramp/payment-methods).

### Cuba

- Strong relevance to the Miami family-support story.
- OFAC authorizes certain family remittances subject to conditions and restrictions.
- That authorization does not by itself establish eligibility for a particular stablecoin or payment provider.
- Bridge lists residents of Cuba as prohibited for onboarding.
- No verified, usable fiat/USDC/fiat route for this project was established.
- A qualified partner and specific eligibility verification would be needed before claiming Cuba support.

Sources: [OFAC Cuba guidance](https://ofac.treasury.gov/faqs/topic/1541), [Bridge customer-country eligibility](https://apidocs.bridge.xyz/platform/customers/compliance/supported-countries-list).

### Paraguay

- User specifically asked that Paraguay be considered and investigated banking/security concerns there.
- Bridge lists Paraguay among supported customer residences for certain services.
- **Residency eligibility is different from local-currency payout coverage.** That list does not establish a guarani/PYG withdrawal route.
- A local payout or cash partner has not been verified.
- Security and institutional-access concerns may be relevant to interviews, but require accurate separation of fraud, data breaches, and bank solvency.

Source: [Bridge customer-country eligibility](https://apidocs.bridge.xyz/platform/customers/compliance/supported-countries-list).

### Earlier exploratory example: Colombia

Before the user named preferred countries, the assistant used Colombia as an illustrative corridor. It was never selected by the team.

- Abroad documents USDC-to-COP payout through Bre-B, including Solana as a funding network.
- Its documented fiat onramp was Brazil-only at the time researched.

Source: [Abroad supported assets and routes](https://docs.abroad.finance/resources/supported-assets).

## 8. Features and innovations proposed so far

These are ideas for prioritization, not a commitment to build all of them.

### A. Shared family requests — recommended main demo feature

A recipient creates one request for a family expense. Multiple relatives contribute, and everyone can see clear progress and confirmed payments.

Illustrative demo:

1. A mother in Mexico creates a request for $200 for school expenses.
2. Two relatives contribute $120 and $80.
3. Funding progress updates with confirmed Solana payments.
4. She chooses to withdraw $150 worth in pesos and retain $50 in USDC.
5. The app shows the withdrawal quote, fees, and payout status.

The recipient should retain control of the money. An on-chain receipt proves a payment occurred; it does not prove the recipient purchased a particular item.

### B. Recipient-controlled spend/save split

- Keep part of a received balance in USDC.
- Convert only the amount needed for local spending.
- Show clear USDC and local-currency amounts.
- Validate demand rather than assuming every recipient wants dollar savings.

### C. Mistake-resistant sending

- Verified recipient details.
- Explicit amount and destination confirmation.
- Clear transaction status and receipts.
- Additional confirmation for unfamiliar recipients.

An expiring, refundable **unclaimed-transfer escrow** was discussed as a later feature. It would need actual escrow logic. Completed transfers should not be presented as reversible.

### D. Protected reserve and everyday spending balance

Following the bank-security research, an additional concept was proposed:

- Separate a protected USDC reserve from the everyday spending balance.
- Require additional approval or a delay for large transfers to unfamiliar destinations.
- Consider spending limits and clear recipient verification.
- Design recovery and authorization carefully.

Restrictions must be enforced by the wallet/program or equivalent authority model. A limit implemented only in the UI is not a reliable security boundary. No security architecture or recovery mechanism has been selected or implemented in this conversation.

### E. Wallet control, interoperability, and access

Potential Solana-native benefits discussed:

- Users control portable USDC balances.
- Transfers work with other Solana wallets.
- Users can pay participating merchants.
- Families can coordinate programmable payments.
- If the architecture permits it, users can access funds outside the app during an app outage.

These depend on the eventual custody and wallet design. A public blockchain does not automatically make the app, its recovery system, its RPC access, or its fiat partners resilient.

## 9. Proposed demo and technical boundaries

Recommended base flow:

```text
Fiat funding provider
  -> USDC in a Solana wallet
  -> Solana transfer / contribution toward a family request
  -> Recipient USDC balance
  -> Recipient keeps USDC and/or requests a fiat withdrawal
  -> Local payout partner
  -> Recipient's bank account or another explicitly supported spending route
```

For the Solana demo:

- Use real **devnet USDC movement**, actual balance updates, and transaction receipts.
- Clearly distinguish test funds from real funds.
- Sponsor transaction fees so beginners do not need to acquire SOL.
- A custom program is optional based on the published prize description; add one only if it contributes useful behavior and the team can implement it reliably.
- Keep names, phone numbers, and expense descriptions off the public blockchain. Payment amounts and wallet activity should not be assumed private.
- Distinguish blockchain confirmation from provider acceptance and completed fiat payout.

Source: [Solana fee sponsorship](https://solana.com/developers/cookbook/transactions/fee-sponsorship).

### Provider options researched

**Crossmint**

- Documents stablecoin onramping, including Solana USDC.
- Onramp funding methods include cards, Apple Pay, and Google Pay; do not assume every method is available for every user or country.
- Documents offramps and MXN SPEI payout support.
- Staging is described as self-serve, but the offramp quickstart identifies a sales-enablement dependency for its user KYC API.
- Production requires additional commercial/onboarding steps, including KYB for the offramp product.
- Do not infer guaranteed weekend access or production approval from the availability of documentation.

Sources: [Onramp overview](https://docs.crossmint.com/onramp/overview), [offramp overview](https://docs.crossmint.com/offramp/overview), [offramp prerequisites](https://docs.crossmint.com/offramp/quickstarts/rest-api), [payout methods](https://docs.crossmint.com/offramp/payment-methods).

**Bridge**

- Documents Solana USDC fiat routes and MXN/SPEI support.
- MXN access requires contacting the provider and relevant enablement.
- Customer-country eligibility, payout-currency coverage, and permission to serve a particular use case are separate checks.

Sources: [Fiat routes](https://apidocs.bridge.xyz/get-started/introduction/what-we-support/fiat), [MXN guide](https://apidocs.bridge.xyz/get-started/guides/move-money/mxn-spei-integration-guide), [country eligibility](https://apidocs.bridge.xyz/platform/customers/compliance/supported-countries-list).

Recommended dependency check: prove sandbox access early within a fixed time budget. If unavailable, keep actual devnet transfers working and **explicitly label the fiat payout as simulated**. Do not represent a mock payout as a completed banking integration.

No provider has been selected, integrated, or approved in the work recorded here.

## 10. Existing products discussed

### Félix

- Offers remittances through WhatsApp.
- Demonstrates that an accessible, familiar sending experience already exists in the market.
- It was discussed as an alternative for a family's remittance needs, not established as technically identical to the proposed app.

Source: [Félix sending guide](https://www.felixpago.com/ayuda/como-enviar-dinero-con-felix).

### Littio

- Offers dollar-oriented account functionality and local withdrawals.
- Its official app listing explicitly mentions USDC.
- It is relevant to evaluating claims about novelty, but the team's Solana-native ownership, interoperability, and programmable-family-payment ideas require a more detailed comparison.

Sources: [Littio](https://littio.co/en), [official app listing](https://play.google.com/store/apps/details?hl=en_GB&id=co.littio.app).

The conversation did not establish that either product offers the exact proposed combination, nor that the proposed combination is unprecedented.

## 11. Bank hacks, fraud, and financial-access research

The user asked specifically about bank hacking in **Paraguay and France**, in connection with the product's security thesis.

The findings below were researched as of November 6, 2026. They are dated events and attributed statements, not evidence that all banks in either country are compromised. Recheck developing incidents before using exact figures in the presentation.

### France: Crédit Mutuel Arkéa — disclosed November 4, 2026

According to the bank's follow-up statement:

- Attackers reached Arkéa through the platform of a service provider.
- Fraudulent transfers used **the bank's own account**.
- The attackers did not use customer accounts at its federations or subsidiaries for those transfers.
- The bank said customer holdings were unaffected; some transfers were delayed.
- Asked about reports of **€118 million / $133 million**, Arkéa confirmed the approximate order of magnitude but did not confirm the exact figure or final loss.
- Some funds had been blocked, and recovery work was ongoing.

Product implication: provider compromise and concentrated institutional authority are relevant risks. This incident does not demonstrate that customers lost their deposits, or establish that a USDC app would withstand the same type of compromise.

Source: [Arkéa follow-up statement](https://www.cm-arkea.com/arkea/banque/assurances/pa_38386/en/informations-complementaires-suite-a-l-attaque-dont-le-credit-mutuel-arkea-a-ete-victime).

### France: FICOBA account-register breach — disclosed February 18, 2026

- An attacker used a government official's stolen credentials to access part of the national bank-account register.
- Unauthorized access began in late January; a subsequent official response describes the period as extending through February 13.
- The ministry identified approximately **1.2 million account records** as potentially affected.
- Exposed fields included account-holder identity, address, and RIB/IBAN details.
- The ministry's updated statement says tax identifiers were not accessed.
- This was access to a government account-information database. The announcement does not establish that affected bank accounts were emptied.

Product implication: leaked identity information can support impersonation and targeted fraud. Storing less personal information and requiring strong transaction authorization are relevant design goals.

Sources: [Finance Ministry announcement](https://presse.economie.gouv.fr/acces-illegitimes-au-fichier-national-des-comptes-bancaires-ficoba), [later parliamentary response](https://questions.assemblee-nationale.fr/q17/17-13370QE.htm).

### France: La Banque Postale / La Poste — December 22, 2025–January 5, 2026

- A distributed denial-of-service attack saturated online access.
- The bank said its internal banking systems were not penetrated and no data leaked.
- This is an example of interrupted digital access, distinct from stolen customer funds or a database breach.

Product implication: the app's availability and a user's ability to access funds through another interface are separate design questions from custody and theft prevention.

Source: [La Banque Postale explanation, January 22, 2026](https://www.labanquepostale.com/newsroom-publications/actualites/2026/cyberattaque-banque-groupe-la-poste.html).

### Paraguay: phishing and electronic-fraud complaints — January–June 2026

A July 10, 2026 report by the Banco Central del Paraguay's banking supervisor records:

| Outcome | Complaints |
| --- | ---: |
| Favorable to the customer | 13 |
| Not favorable to the customer | 7 |
| Pending | 6 |
| Total | 26 |

The category is phishing and electronic scams. These are complaints handled in the described escalation process, **not a count of all Paraguayan cybercrime incidents or all hacked bank accounts**.

The same report describes banks investigating whether an incident arose from a system vulnerability or exposure of customer credentials. It says that, where valid customer security factors were used without a bank-system vulnerability, banks generally treat the transaction as valid and do not assume the economic loss. This describes the report's account of practice, not a universal legal ruling for every case.

Product implication: customer-facing fraud prevention and transaction comprehension may be more relevant than a generic claim about blockchain security.

Source: [BCP technical report, July 10, 2026](https://www.bcp.gov.py/documents/20117/2575815/6795%2B2026%2BINFORME%2BTECNICO%2BNOTA%2BNHCD%2BN%C2%B0%2B4690%2BUSUARIOS%2BDIGITALES-4.pdf/116bd32a-e61d-1cd0-2efc-1a8225ca1849?t=1785946783110).

### Paraguay: citizen-data exposure and extortion claims — June 2025

- Criminals claimed to possess millions of citizen records.
- MITIC's June 13 statement said its preliminary investigation found a compilation of prior leaks rather than a newly established kidnapping of government data.
- Described fields included names, birth dates, and identity-document numbers.
- The ministry said the collection it reviewed did not contain bank-account information.
- It highlighted the potential use of the records for phishing.
- The claimed scale should not be presented as independently verified or as proof of a bank-system breach.

Product implication: treat identity details as potentially exposed. Identity knowledge alone is not a strong authorization mechanism.

Source: [MITIC statement, June 13, 2025](https://mitic.gov.py/ministro-gustavo-villate-afirma-que-el-gobierno-no-negocia-con-ciberdelincuentes-y-descarta-secuestro-de-datos/).

### Paraguay: Ueno bank resolution — November 2026

- The BCP began a bank-resolution process, with the underlying decision dated November 2 and public reporting on November 3.
- Paraguay's state news agency attributed the process to insufficient solvency.
- A November 3 BCP securities resolution suspended public offering and trading of Ueno-issued securities following the resolution decision.
- These materials establish a bank-resolution/financial-access issue; they do not establish that the crisis was caused by a cyberattack.

Product implication: institutional solvency, access to funds, and cyber theft are different risks and should remain separate in the pitch.

Sources: [Paraguayan state news agency](https://mediosdelestado.gov.py/ip/2026/11/03/bcp-inicia-procedimiento-de-resolucion-de-ueno-bank-y-garantiza-depositos-de-ahorristas/), [BCP securities resolution](https://www.bcp.gov.py/documents/20117/0/2026-11-03-Resolucion_SVSG_0014_Suspension+Valores+Ueno+Bank+%281%29.pdf/bf2295d1-1417-13ba-798a-e14216596a32?t=1793732230988).

### Security framing supported by the discussion

The strongest questions to design around are:

1. **Control:** Who can authorize movement of the money?
2. **Fraud resistance:** What happens when someone steals personal information or impersonates a relative?
3. **Access:** Can the family still use its wallet if the app becomes unavailable?

A meaningful hackathon security demonstration would show a specific unauthorized action or mistake being prevented, identify the control that prevented it, and explain its limits.

Self-custody may reduce dependence on the app operator holding everyone's funds, but it introduces signing, key-management, and recovery responsibilities. Users still face phishing and issuer/offramp risk.

USDC is not an insured bank deposit. Circle documents price, operational, freezing, and other risks; completed blockchain transfers generally cannot be recalled.

Source: [Circle USDC risk disclosures](https://www.circle.com/legal/usdc-risk-factors).

## 12. Suggested team ownership and weekend plan

This division was proposed; actual assignments have not been made.

| Owner | Proposed responsibility |
| --- | --- |
| Builder 1 | Bilingual, mobile-friendly sender and recipient screens |
| Builder 2 | Wallets, USDC transfers, fee sponsorship, balances, receipts |
| Builder 3 | Provider sandbox, quotes, payout statuses, failure handling |
| Builder 4 | User interviews, integration testing, pitch, video, submission |

Suggested sequence:

1. Interview potential users and select one recipient profile and corridor.
2. Prove provider sandbox access early.
3. Complete the actual Solana payment flow.
4. Add the selected main feature and connect the sender/recipient experience.
5. Target a complete flow by Saturday afternoon.
6. Freeze features Saturday evening.
7. Reserve Sunday morning for verification, the 90-second video, submission, and the three-minute live presentation.
8. Remain ready by the team's 10 a.m. target.

The suggested strategy for first overall is a reliable product flow, evidence from real users, and one memorable differentiator. It is not a prediction of the outcome.

## 13. User validation and economics

Recommended initial interviews: at least three people who actually send or receive family support.

Ask about the last real transfer:

- Which service did they use?
- How much did the sender pay in total?
- How much did the recipient actually receive?
- How long did it take to become usable?
- Did the recipient use a bank account, wallet, card, or cash pickup?
- What was the biggest frustration or concern?
- Would shared family requests help?
- Would the recipient want to retain part in digital dollars?

Compare actual recipient proceeds, including funding fees, FX spreads, network/account costs, and withdrawal fees. Low blockchain fees alone do not establish a cheaper complete transfer.

A transparent transfer fee was proposed as a business-model hypothesis. No price or viable unit economics have been established. No savings percentage or guaranteed delivery time has been verified for the proposed product.

## 14. Open decisions and next questions

1. What can each of the four teammates build, and does anyone have Solana or Anchor experience?
2. Which destination country will be the actual hackathon corridor?
3. Do recipients have bank accounts, or do they need cash pickup?
4. Will users control their own portable wallets, or will the app/provider control funds?
5. How will account recovery work, and who can authorize recovery?
6. Which is the primary differentiator: shared family requests, protected reserves, or another Solana-native feature?
7. Which funding and payout providers can the team actually access before the deadline?
8. Which fiat steps will be live sandbox integrations, and which, if any, will be explicitly simulated?
9. What threat does the security feature address, and what remains outside its protection?
10. What evidence from actual families supports the chosen problem and feature?

## 15. Current project status

- Planning and source research have been completed to the extent recorded above.
- The user reaffirmed the crypto-specific, Solana-centered direction.
- Mexico is an assistant recommendation, not a confirmed team decision.
- No wallet/custody architecture, feature set, provider, implementation stack, or deployment has been selected in this conversation.
- No money has been moved and no transactions have been signed as part of this work.
- No claim of bank-grade protection, hack-proof funds, guaranteed inflation protection, global coverage, or instant universal fiat access has been established.
- The next useful step is to resolve the open product/technical decisions and turn the selected demo into a concrete build plan.
