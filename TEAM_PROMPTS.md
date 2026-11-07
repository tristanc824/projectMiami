# Team guide: what to do and how to prompt

Last updated: November 6, 2026. Time zone: America/New_York.

This file is for the four people building the SharkByte project. Read it before you open Cursor or Claude and start building. The longer research record is [`HACKATHON_CONTEXT.md`](./HACKATHON_CONTEXT.md). That file is the source of truth for facts, sources, and what is still undecided. This file turns those questions into work and into prompts you can paste.

Anything below marked **confirmed** came from Tristan. Anything marked **open** is not a team decision yet. Do not tell an AI that an open item is already chosen.

## Confirmed

- We are in the SharkByte hackathon in Miami, November 6–8, 2026, at Miami Dade College's North Campus.
- We are going for **Best Use of Solana** and **first overall**.
- Team size is **four**.
- Be ready by **Sunday, November 8, 10:00 a.m. EST**. Official hacking ends then. Devpost submission closes at **11:00 a.m. EST**.
- The product is **crypto-specific and built on Solana**. USDC on Solana is the product, not a hidden rail behind a normal remittance app.
- Félix and Littio are alternatives a family might use. They are not the same product as this one. Do not design this as a clone of either.
- The story is a Miami family sending support to relatives abroad.
- Countries Tristan asked to consider: **Cuba** and **Mexico**, plus **Paraguay**. None of those is the chosen corridor yet.
- The original flow is: local fiat in, USDC on Solana, send or hold, local fiat out, then real spending.
- November 7 update: the user selected **React Native / Expo** for a shared web and iPhone app. The first UI/demo implementation is in [`apps/mobile`](apps/mobile/README.md). All money movement there is simulated; do not claim a real wallet or payout exists.

## Run the first mobile preview

```sh
cd apps/mobile
npm install
npm start
```

Scan the terminal QR with an iPhone using Expo Go on the same network. Use `npm run web` for web. Auth0 native sign-in requires a development/TestFlight build and actual tenant configuration; follow the mobile README. `DESIGN.md` records the Cash App / PayPal baseline and original Lazo design choices. Lazo remains a working name.

## What the product is trying to be

A beginner can deposit local money, hold digital dollars, and send them to family without learning crypto jargon. The longer vision is a worldwide family money app. The weekend build is one corridor and one complete flow.

Draft line you can reuse:

> A Solana-native family wallet that lets relatives send money, contribute to a shared expense, and choose how much to keep in digital dollars versus withdraw locally.

## Questions already asked, and where they stand

Use these so you do not restart research that is already in `HACKATHON_CONTEXT.md`.

| Question Tristan raised | Where it stands | What you should do |
| --- | --- | --- |
| Can we win Best Use of Solana and first overall? | Both are in scope. Best Overall criteria on Devpost were still TBD. Solana prize text does not require a custom program. | Select both categories on Devpost. Show real devnet USDC movement. A custom program is optional and only worth it if it does something the demo needs. |
| What are the real deadlines and submission rules? | Hacking ends Sunday 10:00 a.m. EST. Submission closes 11:00 a.m. EST. Live pitch is 3 minutes. Video is 1 minute 30 seconds. Repo link and at least one Discord tag are required. | Freeze features Saturday night. Sunday morning is video, submission, and the live pitch. |
| Can this be a worldwide neobank / "worldwide Zelle" this weekend? | The ambition stays. The weekend build cannot cover every currency. | Pick one funding currency and one payout route after the team answers the open questions below. |
| Is this the same as Félix or Littio? | No. Those products matter as customer alternatives. Littio's listing does mention USDC, so "we use crypto" is not a differentiator by itself. | Pitch Solana-native ownership, interoperability, and programmable family payments. Do not claim those exist until the build actually has them. |
| Should we do Cuba? | Strong Miami story. No usable fiat/USDC/fiat route was verified. Bridge lists Cuba as prohibited for onboarding. OFAC family-remittance rules do not make a provider legal or available. | Do not claim Cuba support unless a qualified partner and eligibility check are in hand. |
| Should we do Mexico? | Clearest documented route: Solana USDC to MXN via SPEI (Bridge, Crossmint). Still a recommendation, not a team decision. Provider access is not approved. | Verify sandbox access before promising a live peso payout. |
| Should we do Paraguay? | Tristan asked for it, including banking and security concerns. Bridge residency support is not the same as a guarani payout. No PYG route was verified. Ueno's November 2026 resolution is a solvency and access issue, not a confirmed cyberattack. | Keep Paraguay in the story only if we can name a real payout path. Do not blur bank failure, phishing, and hacks. |
| Are bank hacks in Paraguay and France a reason this product is safer? | Specific incidents are written up in the context file (Arkéa, FICOBA, La Banque Postale, BCP phishing complaints, MITIC data claims, Ueno). They do not prove every bank is compromised, and they do not prove USDC is safer. | If we show security, show one concrete control: who can move money, what stops a mistake or impersonation, and what the control does not stop. |
| Can people spend this in real life immediately? | Only with a real bank payout, cash partner, card, or merchant. None of that is integrated. | Separate three statuses in the UI: Solana confirmed, provider accepted, fiat paid out. |
| Who holds the keys? | Open. Self-custody and app-managed funds are different products. | Do not start the wallet code until the team picks this. |

## Open questions the team still has to answer

Answer these in the repo or in chat before building past a spike. Number them the same way in prompts so the AI does not invent an answer.

1. What can each of the four people build? Does anyone already know Solana or Anchor?
2. Which destination country is the hackathon corridor?
3. Do recipients have bank accounts, or do they need cash pickup?
4. Do users control a portable Solana wallet, or does the app or a provider hold the funds?
5. How does recovery work, and who is allowed to recover an account?
6. What is the one differentiator we will actually demo: shared family requests, a protected reserve, or something else on Solana?
7. Which funding and payout providers can we log into before the deadline?
8. Which fiat steps are live sandbox, and which are labeled simulated?
9. What exact threat does the security feature stop, and what does it leave open?
10. What did real families say about the last transfer they sent or received?

## What to build if the team accepts the current recommendation

This is a recommendation from the planning brief, not a locked spec.

1. One family expense request created by the recipient.
2. Two relatives pay into it with real devnet USDC. Balances and signatures show up in the UI.
3. The recipient keeps some USDC and withdraws the rest.
4. Fees, quote, and payout status are visible.
5. Transaction fees are sponsored so a new user does not need SOL.
6. Names, phone numbers, and expense notes stay off the chain.
7. If Crossmint or Bridge sandbox access is not working inside a short time box, keep the Solana transfer real and label the fiat leg **simulated**.

Suggested split, still unassigned:

| Person | Job |
| --- | --- |
| Builder 1 | Bilingual, mobile-friendly sender and recipient screens |
| Builder 2 | Wallets, USDC transfers, fee sponsorship, balances, receipts |
| Builder 3 | Provider sandbox, quotes, payout statuses, failure states |
| Builder 4 | Interviews, integration testing, 90-second video, Devpost, 3-minute pitch |

Order of work:

1. Answer the ten open questions, or explicitly mark which ones we are assuming for the demo.
2. Interview at least three people who send or receive family support. Ask about the last real transfer: service, total sender cost, amount received, time until the money was usable, bank versus cash, and the worst part.
3. Prove provider sandbox access early. If it fails, switch that leg to a labeled simulation and move on.
4. Finish the Solana payment before adding extra features.
5. Have one complete click-through by Saturday afternoon.
6. Stop feature work Saturday evening.

## How to prompt

Paste the block that matches the task. Add the files you want changed. Do not paste a shorter version that drops the constraints.

### 1. Start any session

```text
Read HACKATHON_CONTEXT.md and TEAM_PROMPTS.md before you change anything.

We are building a Solana-native family money app for SharkByte in Miami. Crypto and Solana are the product. Do not turn this into a normal remittance app with a swapable chain, and do not treat Félix or Littio as the same product.

Confirmed: four people, ready by Sunday November 8 at 10:00 a.m. EST, aiming for Best Use of Solana and first overall.

Open, so do not decide these for us: destination country, custody model, recovery, provider, and which single differentiator we are demoing. Mexico was recommended. Cuba and Paraguay were requested. No Cuba payout route was verified.

Rules:
- Demo real devnet USDC transfers, balances, and receipts.
- Sponsor fees so beginners do not need SOL.
- If a fiat onramp or offramp is not a live sandbox call, label it simulated in the UI and in the pitch.
- Keep names, phone numbers, and expense descriptions off the public chain.
- Show Solana confirmation, provider acceptance, and fiat payout as separate statuses.
- Do not claim hack-proof funds, deposit insurance, instant global cash-out, or inflation immunity.
- Label recommendations as recommendations until the team confirms them.
- Check HACKATHON_CONTEXT.md before re-researching countries, providers, or bank-security incidents.

Task:
[say the one thing you want done]
```

### 2. Research, without drifting the product

```text
Using HACKATHON_CONTEXT.md as the starting point, answer only this question:

[paste one numbered open question, or one new factual question]

Rules:
- Cite the primary source and the date you checked it.
- Separate what the source says from what you infer.
- Residency eligibility, payout-currency coverage, and permission to serve this use case are three different facts.
- Do not upgrade a recommendation into a team decision.
- End with: what this changes for the weekend demo, and what it does not prove.
```

### 3. Implement one slice

```text
Read HACKATHON_CONTEXT.md and TEAM_PROMPTS.md.

Implement only this slice:
[name the slice: shared request UI, devnet USDC transfer, payout status, pitch page]

Assume these team answers, and stop if one of them is wrong:
- Corridor: [Mexico / other]
- Custody: [user wallet / app-managed]
- Fiat leg: [live sandbox provider / simulated and labeled]
- Differentiator: [shared family request / protected reserve / other]

Definition of done:
- A teammate can run it and see the result without reading your chat.
- Test funds are visibly test funds.
- Personal data is not written on-chain.
- You did not add a second feature.

Tell me what you changed, how to run it, and what is still fake.
```

### 4. Security feature

```text
Read section 11 of HACKATHON_CONTEXT.md.

Design one demo control for this threat only:
[mistaken amount / paying the wrong person / stolen personal info used to impersonate a relative]

Show the unauthorized or mistaken action, the control that stops it, and the limit of that control.
A limit that exists only in the UI is not a security boundary.
Do not describe USDC as an insured bank deposit.
Do not use the France or Paraguay incidents as proof that this app is safer. Use them only if you name the specific risk the control addresses.
```

### 5. Pitch, video, and Devpost

```text
Draft the 3-minute live pitch and the 90-second video from the product we actually built, not from the full vision.

Include: who the Miami sender is, who the recipient is, the one corridor, the Solana action the judges can see, and what is simulated.
Mention Best Use of Solana and that we will select categories explicitly on Devpost.
Do not say worldwide coverage, instant fiat, hack-proof, or Cuba support unless that exact capability is working and sourced.
Leave a blank for our Discord tag and the GitHub URL https://github.com/tristanc824/projectMiami
```

### 6. User interviews

```text
Turn section 13 of HACKATHON_CONTEXT.md into a short interview script.

Interview people who have sent or received family support. Ask about their last real transfer: service used, total amount the sender paid, amount the recipient got, time until it was usable, bank account versus cash pickup, and the worst part.
Then ask whether a shared family expense request would have helped, and whether the recipient would keep part of the money in digital dollars.
Do not lead them toward our answer. Bring back quotes and numbers, and say what they imply for the demo.
```

## Prompt mistakes that waste the weekend

- "Build the worldwide neobank." Ask for one corridor and one flow.
- "Make it like Félix but on blockchain." Say Solana-native family wallet, and say what the user controls.
- "Add Cuba, Mexico, and Paraguay." Ask which single corridor the team chose.
- "It should be secure because it's on Solana." Name the threat and the control.
- "Hook up real bank withdrawals." Ask for a sandbox check first, and for a simulated label if access is missing.
- "Research the hackathon again." Point at `HACKATHON_CONTEXT.md` and ask only for a gap.
- Letting the model pick custody, country, or the main feature. Put the team's answer in the prompt, or tell it the item is still open.
