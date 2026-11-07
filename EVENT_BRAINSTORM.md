# SharkByte event deck: category opportunities, feature ideas, and names

Prepared November 6, 2026, for the four-person Solana family-wallet team.

This is an expansion of [HACKATHON_CONTEXT.md](HACKATHON_CONTEXT.md). All product ideas and names below are proposals; none has been selected by the team.

## 1. What was reviewed

- The supplied [SharkByte 2026 Opening Slides presentation](https://www.canva.com/design/DAHaKGUpDs0/mIZxhJNVD6yT1Oj404c-mA/view).
- Canva identified it as a 58-page presentation titled `SharkByte 2026 Opening Slides.pptx`.
- The full slide-text extraction was read through Canva's connector. Playwright was unnecessary for reading that content.
- Presenter notes were not accessible through the connector. The review covers extracted slide text, not inaccessible notes or a visual inspection of every slide image.
- Additional MLH categories below come from the previously retrieved [official 2026 Devpost](https://sharkbyte2026.devpost.com/), not from an assumption that every sponsor logo is a prize category.
- Prune and Swarms capabilities were checked against official documentation.

The deck explicitly says to create **one project**, with the ability to opt into multiple challenges. This supports using relevant integrations within one coherent product. It does not guarantee multiple prize wins.

## 2. Timing and submission implications

The opening slides state:

- Hacking begins **Friday, November 6, at 10 p.m.**
- Hacking ends **Sunday, November 8, at 10 a.m.**

This is a nominal 36-hour build window. The [Hacker Guide](https://weareinitold.notion.site/Hacker-Guide-2819f4e8ae4e81c6aa2cfa180bd34157) separately gives an 11 a.m. Sunday submission closure. Keep the team's existing 10 a.m. completion target.

The guide's 90-second video, three-minute live presentation, GitHub link, Discord contact, and category selections still apply. Planning this brief is separate from claiming that product implementation began inside the allowed build window.

## 3. Categories actually described in the opening deck

| Category | Actual focus | Fit for the proposed product | Recommendation |
| --- | --- | --- | --- |
| Best Use of Swarms API | Agents coordinated through the Swarms API | A structured review of suspicious payment requests or an evidence-based bilingual assistant | Strong additional target if there is time for one useful AI feature |
| Best Use of Prune API | Use of the sponsor's AI infrastructure; detailed judging criteria are not stated in the extracted slides | Route an actual supported model request through Prune and show real cost/policy receipts | Conditional, especially with a Gemini assistant |
| EC-Council | Verify hurricane news/alerts, label verified/suspicious/unverified, explain why, and keep working offline | Emergency-family-support variant with a genuine alert-verification component | Significant extension; generic financial scam detection does not satisfy this theme |
| MDC North Campus | Career and education pathway navigator beginning at MDC | Education funding alone is insufficient | Poor fit for the current concept; substantial pivot required |
| Best Use of Hardware | A meaningful hardware component | A physical approval device or payment terminal, if hardware is already available | Stretch only; a phone or QR code alone is not a convincing hardware project |
| First Time Hacker | First-time participation category | Depends on the team's eligibility | Ask organizers for the exact team eligibility rule |
| Overall | One submitted project competes overall | Core objective | Prioritize product usefulness, execution, and clear differentiation |

### Sponsor prizes recorded from the deck

- **Swarms:** first prize includes an interview opportunity with the CEO and $1,000 in credits; second $750 in credits; third $250 in credits. An interview opportunity is not a job offer.
- **Prune:** first prize is one year of Prune Pro; second six months of Prune Pro.
- **EC-Council:** first prize lists Hackerverse mugs and COASP certification-bundle scholarships; second swag pouches and a 12-month CTF bundle; third wireless headphones. The listed scholarship face value is not cash.
- **MDC:** backpack/charger/headphone bundles and other listed prizes; the theme remains the MDC pathway navigator.
- **Hardware:** Raspberry Pi 5, 4 GB.
- **First Time Hacker:** Sony WH-CH720N headphones and a $25 Visa gift card.
- **Overall first:** 11-inch iPad A16 and ManaTech package, as already captured in the context document.

Prizes and criteria should be checked against the final submission form and organizer updates.

## 4. Additional opportunities listed on Devpost

These supplement the deck rather than replace its challenge descriptions.

| Category | Useful incorporation | Boundary |
| --- | --- | --- |
| Best Use of Solana | Actual USDC transfers, sponsored fees, and useful Solana-native behavior | Remains the primary sponsor target |
| Best Use of Auth0 | Real application authentication and additional account-access checks | App login and wallet transaction authorization are separate security boundaries |
| Best Use of Gemini API | Explain a transfer request in Spanish/English or extract a draft from a screenshot | Actual Gemini API usage must be demonstrated; do not assume another service's model selection automatically qualifies |
| Best Use of Tiger Data | Payout-state history, transaction activity, and operational metrics if the app needs that database | Do not add a database solely to place a sponsor logo in the pitch |
| Best Use of Vultr | Actually host a needed service there | Optional if deployment is still undecided |
| Best Domain Name from GoDaddy Registry | Select and register an appropriate domain under the sponsor's rules | No domain has been checked or purchased; this brief does not authorize a purchase |
| SpaceXSI workflow raffle | Devpost lists use of Cursor as the core coding agent plus a Grok Bot automation, described in the submission | This is a workflow raffle, not a product-quality prize; both listed conditions matter |

The current Devpost wording is the source for these categories. The extracted opening slides do not independently enumerate all of them.

## 5. New feature brainstorms

### A. Review a suspicious family payment request

Example: the sender receives a message saying, "Mom changed her account. Send the money here immediately."

Proposed experience:

1. The sender pastes the request into the app.
2. Deterministic checks compare the requested destination to the saved recipient and flag relevant changes.
3. A Swarms workflow separates message interpretation, available evidence, and a plain-language explanation.
4. The app explains warning signs, missing evidence, and a next step such as contacting the relative through a known channel.
5. The sender remains responsible for confirming the recipient and authorizing the transaction.

**Category fit:** Solana + Swarms, with Auth0 if genuinely integrated.

**Why this is useful:** it connects the security research to a recognizable family-transfer situation. It can produce a visible demonstration without pretending that AI can prove a stranger is legitimate.

**Important limits:** multiple agents agreeing does not establish truth. Lack of warning signs is not a guarantee. A model cannot establish recipient ownership merely from message wording. Do not give the model private keys or transaction-signing authority, and minimize personal data sent to third parties.

**Effort:** medium. Begin with pasted text rather than adding voice and screenshots immediately.

### B. A Spanish/English transfer draft

Example: "Mándale 50 dólares a mamá."

- Interpret the intended amount and saved contact.
- Resolve the recipient against actual saved records.
- Obtain fees and currency conversion from the actual provider quote.
- Present the exact proposed recipient, amount, fees, and expected proceeds for confirmation.
- Only then enter the normal wallet authorization flow.

**Category fit:** Gemini API, potentially Prune if the real model request is routed through it.

**Distinctive value:** beginner-friendly access to the existing Solana flow. The model prepares a draft; it does not invent exchange rates or autonomously send funds.

**Effort:** low to medium once the transfer flow exists. A plausible alternative to the more elaborate Swarms reviewer.

### C. Recipient receives an exact local amount

Example: "Mom needs exactly 2,000 MXN."

- Make the recipient's target amount the starting point.
- Use a provider-backed quote to calculate what the sender must pay.
- Show all fees, the quote's expiry, and which step remains pending.

**Category fit:** strengthens the core Solana consumer demo and overall utility; it is not a separate sponsor category by itself.

**Distinctive value:** focuses on the actual expense rather than making the recipient work backward from a dollar transfer.

**Effort:** dependent on provider support and sandbox access. This is a product proposal, not a claim that the selected provider already supports the needed exact-output route.

### D. Hurricane-related family support and verified alerts

Proposed larger variant: the wallet helps Miami families coordinate emergency support while checking hurricane claims and assistance messages.

To make a credible EC-Council entry, include the actual required alert-verification experience:

- Compare hurricane claims with authoritative weather/emergency information.
- Display verified, suspicious, or unverified, with evidence and a plain-language explanation.
- Cache previously retrieved information for offline viewing.
- Show the source, retrieval time, and freshness of cached information.
- Mark new claims as unverified when evidence cannot be retrieved offline.

An offline interface can display cached information or prepare a request. It cannot claim to complete a Solana transfer or fiat payout without connectivity.

**Category fit:** EC-Council + Solana; Swarms or Gemini if meaningfully used.

**Distinctive value:** a strong Miami connection and a clear reason families may need urgent cross-border support.

**Effort:** high relative to the existing remittance scope. Treat it as a deliberate product variant, not a small checkbox feature.

### E. Pay a participating merchant directly

Proposed demo: a recipient scans a merchant's payment request and pays in USDC, with a clear amount and destination confirmation.

**Category fit:** Solana and overall product utility. Hardware becomes relevant only if there is a real hardware component.

**Distinctive value:** directly demonstrates spending the received asset, connecting the USDC balance to everyday use.

**Limits:** a demo merchant is not universal merchant acceptance. Receiving USDC does not itself establish that the merchant can withdraw fiat.

**Effort:** medium; decide whether this contributes more than finishing the existing local-payout flow.

## 6. Prune: what is verified and what is not

Official sources describe Prune as a managed AI gateway/proxy with supported provider integrations, request policies, cost controls, optional caching, and response receipts.

Potential demonstration:

- Make a real assistant request through a supported Prune integration.
- Show the actual request's cost/policy metadata in a developer or judge-facing view.
- Demonstrate a configured policy rejection with test data.
- Explain what the service actually did for that request.

Avoid representing a Prune receipt as proof of a safe recipient, safe transaction, or protected wallet funds. Its documented AI-request controls are a different boundary.

Swarms was not established as a directly supported Prune upstream in this review. Do not assume that replacing Swarms' API URL with Prune will work. Select a verified integration path, or keep independently justified requests separate.

Sources: [Prune documentation](https://www.withprune.com/docs), [request lifecycle and controls](https://www.withprune.com/docs/how-it-works), [event signup link](https://www.withprune.com/sharkbyte).

The slides describe Swarms' coordinated-agent API and request-cost reporting. Its official documentation also identifies plan and model restrictions; access should be checked before committing the demo to a specific workflow.

Source: [Swarms API documentation and FAQ](https://docs.swarms.ai/docs/documentation/faq).

## 7. Three coherent project directions

### Direction 1: Lazo — family wallet with a payment-request reviewer

- Core: Solana USDC sending/holding and a clearly supported fiat path.
- Additional feature: review suspicious family payment requests before sending.
- Category priorities: Overall + Solana + Swarms; Auth0 if used.
- Rationale: builds on the current concept and turns the security concern into a visible feature.

**Recommended starting direction.** Finish the core transfer before adding AI.

### Direction 2: Cerca — approachable bilingual digital dollars

- Core: the same Solana family-transfer flow.
- Additional feature: Spanish/English transfer drafts with explicit confirmation.
- Category priorities: Overall + Solana + Gemini; Prune if the model call uses a verified integration.
- Rationale: a simpler assistance feature may fit the remaining time better than a multi-agent workflow.

### Direction 3: Faro — emergency family support

- Core: a Solana family-support wallet.
- Additional feature: hurricane-alert verification with useful offline behavior.
- Category priorities: Overall + Solana + EC-Council; AI category only if actually integrated.
- Rationale: strongest direct connection to the specific Miami emergency challenge, but broadest scope.

Do not combine all three directions into the weekend MVP.

## 8. Name brainstorm

These are **unvetted working names**. Trademark, domain, app-store, company-name, and social-handle availability have not been checked. Inclusion does not mean a name is unique or available.

| Name | Intended association | Best product direction |
| --- | --- | --- |
| **Lazo** | Family ties and connection | Family wallet; strongest overall recommendation |
| **Cerca** | Closeness across distance | Friendly cross-border app |
| **Faro** | Guidance and clarity | Fraud review or emergency information |
| Nido | Home and a place to keep something | Family balances and savings |
| Raíz / Raiz | Roots and connection to home | Immigrant-family story |
| Brisa | Lightness and a Miami/coastal feel | Approachable consumer brand |
| Abrazo | Care and family warmth | Family-support story |
| Puente | Connection across borders | Direct explanation of the mission |
| LazoPay | Connection plus explicit payments | More descriptive alternative to Lazo |
| Faro Wallet | Clarity plus explicit wallet functionality | Security-conscious wallet positioning |

Suggested tagline options:

- **Lazo:** "Your money, closer to home."
- **Lazo:** "Tu dinero, más cerca de casa."
- **Cerca:** "Digital dollars. Family close."
- **Faro:** "Clarity before you send."

The emotional brand can be paired with a clear technical descriptor: "A family USDC wallet on Solana." Avoid relying on the name alone to explain the product.

## 9. Recommended category strategy

1. Preserve the two original goals: **Overall + Solana**.
2. Choose one additional product feature: the Swarms request reviewer **or** the Gemini/Prune transfer assistant.
3. Consider Auth0 if it serves a real authentication requirement and fits the implementation.
4. Consider deployment/database/domain categories only when they match tools the team actually uses.
5. Check First Time Hacker eligibility if relevant.
6. Treat EC-Council, MDC, and hardware as specific challenges with actual requirements, not general thematic labels.
7. Record actual integration evidence in the repository and submission: what each service does, a working demonstration, and any simulated steps.

The recommendation is **Lazo + core Solana family transfers + a narrowly scoped suspicious-request review** if the team can finish the base flow first. This is a planning recommendation, not a finalized name, architecture, or claim of prize eligibility.
