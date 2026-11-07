# Guard: blockchain stack and integrations

Status checked **November 7, 2026**. **[V]** = verified from a primary source (official docs or GitHub, npm/crates, a live API, or on-chain data). **[S]** = secondary source, probably right. **[U]** = unverified.

## 0. The finding that shapes the design

**USDC on Solana uses the classic SPL Token program, not Token-2022 [V on-chain].** So transfer hooks, confidential transfers and the other Token-2022 extensions can never apply to USDC.

→ Every Guard protection (undo window, envelopes, co-approval, Storm Trigger) has to live in **program-controlled custody**: our Anchor program's accounts (PDAs) or Squads accounts.

PYUSD and USDG *are* Token-2022 [V], if a mint with extensions is ever needed. USDC also has a freeze authority held by Circle, so say "the issuer can freeze" honestly.

## Weekend stack (recommended)

| Need | Use | Notes |
|---|---|---|
| App | Next.js + `@solana/kit` 8.x | |
| On-chain programs | **Anchor 1.2.2** (npm `@anchor-lang/core`) | One program for the undo escrow, vaults/goals, purpose envelopes and claim escrow. Pin the version across the team; tutorials still show `@coral-xyz/anchor` 0.32 |
| Sign-in | **Privy** passkey/email (`@privy-io/react-auth` 3.51.x) or **Squads Grid** (passkey smart account; sandbox accounts come with 1 USDC) | Privy is the fastest. A passkey used for login is not an on-chain signer |
| No SOL needed | **Kora**, the Solana Foundation's fee relayer (audited) | Use a tagged release; give the relayer devnet SOL |
| Trusted contact co-approval | **Squads v4** `SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf` (devnet + mainnet) | Spending limits, time locks, roles. A misconfigured time lock can freeze funds |
| FX quotes | **Pyth**: 40 live FX feeds incl. MXN, BRL, PHP, INR, TRY, VND, ZAR [V]. **No feed for NGN, KES, COP or ARS** [V] | Post a fresh price update in the same transaction; check staleness |
| Indexing + velocity radar | **Helius** (free tier: 1M credits, 10 req/s) webhooks → **Tiger Data / TimescaleDB** | Tiger has a 30-day trial with no card; Docker TimescaleDB is the fallback. Webhooks need a public URL |
| Scam registry | **Solana Attestation Service (SAS)**, program `22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG` | A "reported scam address" schema that other wallets can read too |
| Merchant QR | **Solana Pay** (`@solana/pay` 1.0.26; repo moved to `solana-foundation/pay`) | Confirm payment with a `reference` key |
| Offline send queue | **Durable nonces** | One nonce account per pending payment; `nonceAdvance` must be the first instruction |
| AI scam check | LLM tool-calling (Gemini for the prize track) over Helius + SAS + Range + Pyth | Solana Agent Kit and GOAT are slowing down; prefer direct tool calls |

## Stretch stack
- **Storm Trigger:** a **Switchboard On-Demand** job reads `api.weather.gov/alerts/active?area=FL&event=Hurricane%20Warning` (the endpoint was confirmed live [V]). The program checks the signed result before releasing the vault. Needs a User-Agent header; quotes add 2–3s; build a demo mode with a test zone. The Switchboard docs site didn't load on Nov 7, so use the GitHub examples.
- **Streamed paychecks:** Streamflow (`@streamflow/stream` 13.4.0; devnet program `HqDGZjaVRXJ9MGRQEw7qDc2rAr6iH1n1kAQdCZaCMfMZ`).
- **Claim links / invoices as Blinks:** Actions spec. The `@solana/actions` package was last published Jun 2025, so fall back to dial.to or our own page.
- **Pay-per-call AI scam check:** **x402** (`@x402/svm` 2.30.0), with USDC payments and gas sponsorship on Solana.
- **Rent-free claim accounts:** ZK Compression (Light Protocol, now owned by Helius); needs Helius RPC for indexing.
- **Inbound from other chains:** Circle **CCTP V2** (Solana domain 5; same program IDs on devnet and mainnet).
- **On-chain risk score:** Range address risk API, verifiable through Switchboard.
- **Goal badges and receipts:** compressed NFTs (Bubblegum v2, soulbound).
- **Real cash-out:** MoonPay test mode (`sk_test_` keys) or Kotani Pay / Yellow Card sandboxes for M-Pesa and Africa. Otherwise **mock the cash-out** with a real Pyth quote and a stubbed SPEI, PIX or M-Pesa payout, labeled "simulated".

## Reference architecture
- **Client:** an installable web app (PWA) with an offline queue of pre-signed durable-nonce transactions.
- **Sign-in and fees:** a Privy or Grid passkey session; **Kora** co-signs as fee payer, so the user never needs SOL.
- **Programs:** the **Guard Anchor program** holds escrow (undo window, claim links), vaults and goals (auto-save), and purpose envelopes (merchant allowlist). A **Squads v4** account requires 2 of 2 signatures above a limit (trusted contact). **Streamflow** handles paychecks. **SAS** stores scam-registry attestations.
- **Oracles:** **Pyth** for FX quotes; **Switchboard** for NWS hurricane alerts and the Range risk score, which gate releases.
- **Indexing:** **Helius** webhooks feed **TimescaleDB** for the velocity radar, which feeds the **AI scam check** (also uses SAS and Range).
- **Cash-out:** a route agent compares the Pyth rate with ramp quotes, then pays out through SPEI, PIX or M-Pesa (mocked for the demo).

## The 5 integrations most likely to impress Solana judges
1. **Undo-window escrow + Squads co-approval:** real programmable custody. The pitch: *"Solana now finalizes in about a second (Alpenglow went live Oct 21, 2026). Guard makes fast money safe: fast **and** reversible, through escrow."*
2. **Switchboard-verified NOAA Storm Trigger:** a novel custom data feed, and very Miami.
3. **SAS shared scam registry:** uses a new Solana Foundation building block that other wallets can read.
4. **Passkey + Kora gasless USDC:** the user never sees SOL, and Kora is a Foundation tool.
5. **x402 pay-per-call AI scam check:** agent payments are a current Foundation focus.

## Network facts worth saying on stage
- **Alpenglow went live on mainnet Oct 21, 2026** [V Anza announcement]. Finality is pitched at about 150ms; one third-party sample showed a ~404ms median [S]. Use `finalized` commitment.
- **Transaction v1 (larger 4KB transactions)** has been live since Sep 15, 2026 [S]. Stay on v0 for compatibility.
- **100M compute-unit blocks** since Jul 29, 2026 [S].
- **Confidential transfers** were re-enabled on mainnet in Jun 2026 [S], but they can't be used with USDC and are heavy to build. Skip them.
- **Firedancer** is live; its stake share is disputed (2.5–14%) [S].

## Stablecoins and the law
- **USDC devnet mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` [V]. Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`.
- **GENIUS Act:** the OCC's final rule (Oct 21, 2026; effective Jan 18, 2027) keeps the ban on *issuers* paying yield, and reviews third-party rewards case by case [S]. **Don't market interest on USDC.** Present savings goals as a discipline tool; any yield would be an opt-in third-party product, clearly labeled. (Not legal advice.)

## Devnet pitfalls and fixes
- **SOL faucet:** 2 requests per 8 hours. Fund a team treasury on Friday; use `solana-test-validator` for tests.
- **USDC faucet:** 20 USDC per address every 2 hours (faucet.circle.com). Pre-fill 4 wallets; distribute from a treasury during the demo.
- **Public RPC:** 100 requests per 10s per IP. Venue Wi-Fi puts everyone on one IP. **Each teammate gets their own Helius key.**
- **Webhooks:** they can't reach localhost; deploy or use ngrok.
- **Passkeys:** tied to the domain. If the ngrok URL changes, passkeys break, so use a stable deployed domain.
- **Token program IDs:** USDC uses the classic `Tokenkeg…` program; mixing it up with Token-2022 produces wrong token accounts.
- **Stale oracles:** post a fresh price in the same transaction, and keep a recorded demo backup.

## Not verified
Pyth CPI feed IDs; whether the Dialect Blinks registry is still enforced; Bridge sandbox approval; Solana support at Transak, Bitso, Kotani and GCash; Chainalysis free API coverage of Solana; Grid pricing; Streamflow fees; Firedancer's exact stake share; current Switchboard docs.
