# Security review: what is protected, tested, or still missing

Reviewed November 8, 2026. This is a code-level review of the current hackathon/devnet
repository, not a certification, smart-contract audit, penetration test of a deployed service,
or proof of regulatory compliance.

## Bottom line

The repository is a **devnet prototype**, not a crypto bank. It has useful transaction and
family-scam defenses, but it does not yet have production key custody, hardware-backed staff
authentication, a banking ledger, KYC/AML storage, real bank rails, bridges, or price oracles.

| Surface | Current evidence | Status / required next step |
|---|---|---|
| Private keys and recovery phrases | Prune now blocks credential-shaped speech locally before any AI call. User wallets are Privy embedded wallets. Treasury and fee-payer demo keys are still read from environment variables. The code now refuses that raw-key path outside devnet/localnet. | **Critical gap for production.** Replace the server `Keypair` path with an external MPC/HSM signing service, separate duties and approvals, key rotation, audited recovery, and offline reserves. No repository test can prove an HSM or cold-storage deployment exists. |
| Smart contract | The family-hold program validates signers, owners, mint, destinations, program IDs, cooling-off time, review hash, and sender confirmation. CI builds the program and runs a local-validator attack suite. | **Still needs an independent audit.** Keep tests for wrong signer/account substitution, replay, early release, dust/griefing, overflow boundaries, durable nonce, refund authorization, and upgrade authority. EVM reentrancy/flash-loan labels do not map directly; Solana CPI and account-validation attacks do. |
| Wallet API / RPC | API and mobile tests allowlist the exact transfer shape and reject fee-payer drains, account closure, wrong owner/mint/payer, malformed or oversized messages, changed confirmation facts, wrong-sized signatures, stale/extended expiry, and raw production software keys. | Good prototype boundary. Add RPC provider authentication, failover, monitoring, request quotas, and independent transaction simulation before production. |
| Cross-chain bridges | No bridge code is present. | Keep out of scope. If added, it needs a separate threat model, validator/finality policy, replay/domain separation, rate limits, and emergency pause. |
| Ledger and banking rails | No central banking ledger, order book, SWIFT, ACH, or Fedwire integration is present. Stripe is test mode; bank payout is simulated. | Not testable yet. Do not represent the current demo as a bank or real payout service. A production ledger needs double-entry invariants, idempotency, reconciliation, immutable audit logs, and disaster recovery. |
| KYC/AML data | No passport, SSN, or biometric store is present. | Avoid collecting it until a regulated provider, retention/deletion policy, encryption, access audit, and breach process are designed. |
| Admin panels | No privileged operations panel is present. | If added, require passkeys/hardware keys, least privilege, dual control for money movement, immutable logs, session reauthentication, and no shared accounts. |
| Sessions / MFA | Privy access tokens are verified for issuer and audience. The live flow uses SMS phone login. | **High-risk production gap.** SMS alone is exposed to SIM swaps. Add passkeys or hardware-backed MFA, session/device revocation, risk-based step-up, and recovery controls. |
| Price oracles | No live oracle is used; the mobile preview uses a labeled example rate. | Keep example rates out of settlement. Any future oracle needs freshness, confidence/deviation limits, multiple sources, circuit breakers, and stale-price tests. |
| Web/mobile/API | Claude's attack harness exercises origin/Host controls, JSON/body limits, malformed input, prompt injection, forged facts, disguised scam text, data leakage, and timeouts. Transfer/deposit/invite routes have per-instance user rate limits. | Useful defense-in-depth, not a full penetration test. The AI review endpoint still needs a shared production rate limiter and connection limit behind a reverse proxy. Per-instance maps do not protect a multi-instance deployment. |
| Dependencies | The API audit currently reports 20 high and 16 moderate findings, including transitive Solana, Privy/WalletConnect, Next/PostCSS, WebSocket, UUID, and validation packages. The mobile audit reports 6 moderate Expo CLI/fingerprint glob findings. Forced fixes propose breaking major changes. | **Open release blocker.** Triage reachable paths, upgrade with migration tests, pin the lockfiles, generate an SBOM, and run audit/SCA in CI. The audits are report-only until the dependency migrations are completed. |

## AI boundary

Prune is used as a budget/privacy gate, not as key custody. Before the raw transcript is sent,
`sensitive_secret_reason` blocks:

- labeled seed, recovery, mnemonic, or secret phrases with recovery-phrase shape;
- labeled Base58, hexadecimal, or byte-array private keys;
- PEM private-key blocks; and
- common API credential shapes.

The mobile adapter replaces the locally matched contact name with the word "recipient" (whole words
only, any case, with or without accents, so "mama" matches the saved "Mamá" and "Ana" never touches
"bananas"). Phone and account numbers are refused twice with the same rule: by the Next proxy, and
again by the review server before the Prune API call (`422 personal-number`, with a fail-closed
`hold_policy`). Seven or more digits or an IBAN shape count; "$10000.00", "100000.50 dollars" and
ISO dates do not; fullwidth and other-script digits are folded first. The response is scanned again in case the
model repeats a secret. Swarms never receives the raw transcript or incoming scam message; it
receives allowlisted facts and fixed warning codes. Prune does receive the remaining payment
sentence. These filters reduce accidental disclosure but do not replace provider data-retention
controls, device-side secret scanning, or staff training.

## Run the checks

```powershell
python -m unittest discover tests -v
python tests/test_attacks.py --report
python -m swarm.scam_scenarios
npm --prefix apps/api test
npm --prefix apps/api audit --omit=dev --audit-level=high
npm --prefix apps/mobile test
npm --prefix apps/mobile audit --omit=dev --audit-level=high
```

The Rust/Solana program is built in `.github/workflows/family-hold.yml`. This Windows environment
did not have Cargo installed during this review, so the local Rust test command could not run.

## What the passing tests do not prove

- They do not prove that production secrets are in MPC, HSMs, or cold storage.
- They do not exercise a deployed reverse proxy, cloud IAM, logs, backups, or incident response.
- They do not test a real Prune/Swarms provider for retention or isolation.
- They do not audit Privy, Stripe, Solana RPC providers, or their operational controls.
- They do not make SMS a phishing-resistant authentication factor.
- They do not replace an independent smart-contract audit or deployed-system penetration test.
