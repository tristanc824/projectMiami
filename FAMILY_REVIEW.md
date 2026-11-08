# Family transfer review: handoff for Caleb

Caleb, this is yours to build on. It's the backend for checking a family transfer before
anyone signs it. It has **no UI**: the Nest app owns all the screens. This guide covers
what it does, how to run it, the API contract, and what is still open.

Everything here lives in `app.py`, `swarm/`, `tests/`, `hold/` and `programs/family_hold/`.
None of it touches `apps/`, `web-earth/` or the site, so it merges with `main` and
`calebs-output` without conflicts.


## Current Nest app integration (sender-controlled holds)

This section supersedes the older separate-approver CLI design below **for the Nest app**.

- A recipient saved in this device’s Nest contacts **or** present in its previous successful sends is known. The app keeps the normal payment confirmation and sends immediately, without a Swarms/Prune call or a hold.
- An unfamiliar recipient goes through the authenticated review API. A review failure never authorizes a payment. A successful review returns a server-signed receipt bound to the sender wallet, recipient wallet, exact amount, review hash, and expiry. The raw recipient address goes only to the Nest server; it is not forwarded to the models.
- After reviewing the warning and choosing a 6-digit release PIN, the sender explicitly confirms a **24-hour on-chain Safe Hold**. The sender is also the approver. The recipient cannot spend the held funds.
- The sender can cancel at any time without the PIN, release with the PIN after the wait, or explicitly override the wait after a warning to call/text the person using a trusted number. Release is manual; there is no automatic payout job.
- Normal release is instruction 2 and retains the 24-hour check. **Instruction 3** is a separate early override, valid only when `sender == approver`. It still requires a fresh sender signature and the PIN. The legacy separate-approver holds cannot use it. This requires deploying the updated program, not just updating the app.
- **Deployed and verified on Solana devnet on November 8, 2026 at 9:16 AM ET.** Program: `5ZucuntpueZMRDBEs31gL3HrUpZ13NZRahu7T9rLWzv6`. [Deployment transaction](https://explorer.solana.com/tx/5ws4kcWvDr4Mhibq9yG7ikxAbzzDgMDkrpJXjHitvMHCotsmVt3wDQNW1og21aiCzWXJcZkeoPZtCQmaRRFGuLen?cluster=devnet). The binary was rebuilt with Solana 1.18.26 and `--locked`; Cargo.lock is unchanged. The ignored program keypair matches all client references. `POLICY_AUTHORITY` and the upgrade authority are the server fee payer, `77m7HCt9N6VBCRiJi3WUUeL2QFbMtKmt9mdv6KbyYCCb`.
- **Real devnet refund verified:** a disposable sender deposited 0.01 Circle devnet USDC into a full 24-hour self-approved hold, then Undo refunded the entire amount and closed state/vault. [Deposit](https://explorer.solana.com/tx/2NPt2FQgQJTZxovYC8DfKFLJhVEEamqAY2ki7V2j5rakn14RMYqHY2BffnHzWwLiY5jCrCscPsHt4Uxno6zfxzAb?cluster=devnet) · [Refund](https://explorer.solana.com/tx/4hck3CCxKpxas5XQnwAHZuFEWUbBjEHcajTVRjPAXfwLiYUiLCWDeanvUhAYZoG5aFsDQJpCvdX5ZnwxWbYygyvm?cluster=devnet). Normal release before 24 hours returned error 8; wrong PIN returned error 3; a second deposit and explicit correct-PIN sender override paid the correct recipient. The test USDC was returned to the treasury, leaving its USDC balance unchanged. [Machine-readable proof](audit/hold-devnet-proof.json).
- Initial stdin-signer and public-RPC upload failures were resolved using a temporary owner-only signer file and the privately configured dedicated devnet RPC, with deployment requests throttled locally. No private keys or RPC credentials were logged or committed. The integration test used a server-signed review fixture; browser review tests and previous live provider checks are separate from this chain proof. Rehearse the combined physical-phone flow before judging.

### Rebuilt program verification (November 8, 2026)

An isolated Solana 1.18.26 validator loaded the rebuilt binary and passed:

- Self-approved deposit locks the exact amount for 86,400 seconds.
- Normal release before the wait returns error 8.
- Explicit early override with the wrong PIN returns error 3.
- Missing sender signature is rejected.
- Undo refunds the entire held amount to the sender and closes the state.
- A second deposit and explicit correct-PIN override pay the recipient and close the state.

The invalid-signature test accepts Solana 1.18's RPC rejection as well as the newer validator response shape. These local runtime results are supplemented by the real devnet refund proof above. The CLI's empty bundled `syscalls.txt` caused build warnings for standard syscalls; the runtime exercised those calls successfully. The app’s 24-hour devnet flow now passed the deposit/refund and explicit-override checks. The separate legacy 20-second CLI demo was not run; its local policy-authority key file is absent.

### Deployment operator command

The [devnet-only deployment script](scripts/deploy-hold-devnet.mjs) completed the initial deployment. It refuses an existing program account, so do not re-run it to perform an unreviewed upgrade. It rebuilds with `--locked`, validates program ID/policy authority/devnet genesis, uses a temporary owner-only signer file, and removes that file afterward. The dedicated RPC URL stays in ignored `apps/api/.env.local`. The local deployment throttle is [scripts/devnet-rpc-proxy.mjs](scripts/devnet-rpc-proxy.mjs).

The explicit devnet integration test is `node --import ../mobile/node_modules/tsx/dist/loader.mjs scripts/test-hold-devnet.mts --run` from `apps/api`. It uses disposable wallets and 0.01 test USDC; it is not part of ordinary unit tests. Do not run it against mainnet. Public proofs are in `audit/hold-devnet-proof.json`; test wallet keys remain ignored in `hold/keys/`.

### Keys and startup on this computer

Put only `SWARMS_API_KEY` and `PRUNE_API_KEY` in the Git-ignored, owner-readable `.env.review.local` at the repository root. The Gemini provider key stays in Prune’s vault. Then:

```sh
npm run review:check          # connectivity, credentials, credits and model availability
npm run review:check:live     # one paid, clean provider round-trip; requires a cleared result and Prune receipt
npm run review               # starts Python on the local port configured by REVIEW_API_URL (8011 here)
```

The npm launcher also uses the macOS system CA bundle when Python’s certificate bundle is missing; it never disables TLS verification.

`REVIEW_API_URL` in `apps/api/.env.local` points to this Python server. If using `REVIEW_API_TOKEN`, put the same token in both server env files. `EXPO_PUBLIC_FAMILY_REVIEW=on` enables the app integration. Swarms/Prune secrets must never use `EXPO_PUBLIC_` names.

The app API signs short-lived review/action receipts using `REVIEW_SIGNING_SECRET`, falling back to the existing server-only `PRIVY_APP_SECRET`. Wallets sign on the client; the server only adds the existing fee-payer signature. Hold transactions are simulated before asking the wallet to sign and again before submission. Mainnet and other clusters are rejected by genesis hash. The hold uses the app’s devnet USDC mint; the legacy CLI uses its own test mint.

### API additions

- `POST /api/review`: authenticated; requires `session`, `recipient`, `amountCents`, transcript and case. Per-user/per-draft history replaces the previous global reset. Provider calls share a 95-second deadline.
- `GET /api/holds`: authenticated active holds for the sender/recipient, or deployment availability. `?state=...` fetches one participating wallet’s hold.
- `POST /api/holds`: `{ step: 'prepare', action: 'deposit', reviewTicket, pin }`, or `{ step: 'prepare', action: 'refund' | 'release' | 'release-early', state, pin?, verified? }`. Early release requires `verified: true` after the explicit UI warning. Prepare returns a simulated message and signed action receipt. Submit accepts only `{ step: 'submit', preparedTicket, signature }`; it never co-signs an arbitrary client-supplied transaction.

A known-recipient history is currently local to the browser/device, consistent with the app’s existing activity storage. A new device does not invent a previous payment history.

### Verification commands

```sh
npm run test:review
npm --prefix apps/api test
npm --prefix apps/api run test:holds
cd apps/mobile && node --import tsx --test tests/*.test.ts
# From the repository root:
NEST_TEST_REVIEW=true npm run test:website -- --output=test-results-review
```

The program was compiled with `cargo build-sbf` and tested on a local validator using throwaway wallets: exact deposit, normal premature release error 8, wrong PIN error 3, missing-signature rejection, full cancellation refund, and explicit sender override to the correct recipient all passed. `apps/api/test/hold-runtime.mjs` reproduces those checks against `http://127.0.0.1:18999`; it deliberately cannot target devnet. No user wallet or real funds are used.

Live Swarms/Prune provider verification passed in the preceding audit using the configured server-only keys. A real devnet hold still needs the updated program rebuilt and deployed through the project’s deployment signer. Source/binary build success and local execution do not establish that devnet deployment has happened.

## Start here (5 minutes)

```powershell
python -m unittest discover tests          # 1. the whole pipeline against stand-in Swarms and Prune; no keys needed
$env:SWARMS_API_KEY = "..."                # 2. your keys (https://swarms.world/platform/api-keys, https://withprune.com/sharkbyte)
$env:PRUNE_API_KEY  = "..."
python app.py --check                      # 3. PASS/FAIL for each key, credits, the Swarms model, and the local checks
python app.py --check --live               # 4. one real review end to end (a few Swarms credits and one Prune call)
python app.py                              # 5. serve the API on http://127.0.0.1:8000
```

Only Python 3.10+ is needed: the standard library, no packages to install.

| Variable | Needed | What it does |
|---|---|---|
| `SWARMS_API_KEY` | yes | The four review agents |
| `PRUNE_API_KEY` | yes | Cleans the transcript and seals a confirmed sentence |
| `SWARMS_MODEL` | no | The agents' model (default `gpt-5.4-mini`). `--check` says whether Swarms lists it. |
| `SWARMS_BASE_URL` | no | Default `https://api.swarms.world` |
| `SAFE_HOLD_SECONDS` | no | The Safe Hold's cooling-off (default 86400 = 24 hours). Shorten it for a live demo. |
| `SOLANA_RPC`, `HOLD_PROGRAM_ID` | no | Where `GET /api/hold/...` reads holds (default devnet and the family-hold program) |
| `PRUNE_URL`, `PRUNE_MODEL` | no | Default Prune Gemini proxy, `gemini-3.5-flash-lite` |
| `REVIEW_API_TOKEN` | to listen on a network | Bearer token callers must send |
| `REVIEW_ALLOWED_ORIGINS` | for browser callers | Comma-separated origins allowed with CORS |

## What it does

1. Your app sends what the person said or typed (`transcript`) and the facts it already has (`case`).
2. The server keeps only safe facts: amounts, whether the relationship is verified, and
   the output language. Names, phone numbers and notes never leave this machine.
3. The **Watchdog's local checks** look for typos and tampering (list below). They run
   on this machine, and only fixed codes such as `extra_zero` go any further.
4. **Prune** is the only model call that reads the raw transcript. It returns an amount,
   a relationship role, and a purpose. A phone number or account number still in that
   result stops the review with `blocked-in`. The raw transcript is not sent to Swarms.
5. Four Swarms agents run in order:
   - **PlainSpeaker** explains the transfer in English and the chosen language.
   - **Skeptic** checks for a wrong amount, the wrong person, or an impersonator, and ends with `flag: yes` or `flag: no`.
   - **Watchdog** turns each warning sign into a question, such as "Did you mean 80 or 800?".
   - **Judge** returns a JSON verdict.
6. If any high warning sign was found, the server turns a "confirm" into "hold",
   whatever the model said.
7. Prune stamps the sentence only when the final decision is `confirm`. The stamp is
   `prune.receipt`. Hold and stop come back with `prune.receipt` set to `null`.
8. **Safe Hold.** If the Skeptic flags it, the Watchdog finds a high sign, or the Judge does
   not confirm, `hold_policy.required` is `true`. The money is not refused. It goes into the
   on-chain family hold for 24 hours, and then **both the sender and the approver** must sign
   to release it. The sender can cancel at any time. See [Safe Hold](#safe-hold) below.

It never signs or sends money. "confirm" means only that a person may now review the
transfer and decide.

## Run it

```powershell
$env:SWARMS_API_KEY = "your-key"     # from https://cloud.swarms.world/api-keys
$env:PRUNE_API_KEY = "your-key"      # from https://withprune.com/sharkbyte ; sent as X-Prune-Key, the model key stays in the Prune vault
python app.py                        # http://127.0.0.1:8000, JSON only
python app.py --offline              # no keys needed: the checks are real, the agents' text is canned, and every result holds
```

Prune runs through its Gemini proxy (`/v1/proxy/gemini/generateContent`, model `gemini-3.5-flash-lite`).
Set `PRUNE_URL` or `PRUNE_MODEL` to change either without editing code. Each review is one Prune run
(`X-Prune-Run-Id`), with a $0.05 budget shared by its two calls. A Prune call takes about 8 to 10 seconds.

`GET /api/health` returns `{"ok": true, "offline": false, "swarms": true, "prune": true}`.
`swarms` and `prune` say whether those keys are set. The values of the keys are never returned.

### Who may call it

| Setting | Effect |
|---|---|
| Default | Listens on 127.0.0.1. Calls from your Next server or `curl` work. Browser calls are refused. |
| `REVIEW_ALLOWED_ORIGINS=http://localhost:5184` | Lets those browser origins call it, with CORS. |
| `REVIEW_API_TOKEN=...` | Requires `Authorization: Bearer <token>`. Needed before you use `--host 0.0.0.0`; the server refuses to start without it. |

Every POST must send `Content-Type: application/json`. These rules stop a random website
or another machine from spending the Swarms credits.

## API

### `POST /api/review`

```json
{
  "transcript": "Send 800 dollars. The relative is not verified.",
  "case": {
    "amount_usdc": "80",
    "requested_usdc": "200",
    "other_contributions_usdc": "120",
    "relationship_verified": false,
    "output_locale": "es-US",
    "recipient_in_contacts": true
  }
}
```

- `transcript` is required: 1 to 2000 characters. The server reads the payment amount,
  request total, earlier contributions, and "verified / not verified" from supported
  multilingual commands, and those override `case`. It recognizes native decimal digits
  as well as 0-9. A number without a payment word is treated only as a guess and is held.
- `recipient_in_contacts` is `true` or `false`, worked out **on the phone** from the sender's contacts.
  Only this yes/no is sent, never the contact list or phone numbers. `false` puts the transfer in a Safe Hold.
  Leave it out and the review only notes that contacts were not checked.
- **Identity facts**, all optional and all worked out on the phone. Only these values are sent, never names
  or phone numbers. A missing or wrongly typed value is ignored, not guessed.

  | Field | Type | Holds when |
  |---|---|---|
  | `contact_added_days` | whole number | under 7: a brand-new contact (`new_contact`) |
  | `request_channel` | `in_person`, `call`, `message`, `message_request`, `email`, `unknown` | `message_request` |
  | `claimed_name_matches_contact` | boolean | `false`: the name they gave is not the saved name |
  | `recipient_details_changed` | boolean | `true`: a different payment account than last time |
  | `recipient_account_age_days` | whole number | under 7 adds a medium sign |
  | `prior_transfers_to_recipient` | whole number | 0 adds a low sign |
- `incoming_message` (optional, top level, up to 2000 characters): the text or call that asked for money.
  The server scans it for scam patterns and pressure. It is **not** sent to Prune or Swarms and is not
  echoed back; only the matching codes reach the agents.
- `case` is optional. Amounts are strings with up to 2 decimals, at most 100000, and
  invalid values fall back to defaults. `output_locale` must be one of the 47 keys of
  `LANGUAGES` in `app.py`.
- Send back the `case` from the previous response on each turn, so facts carry over.

**200 response:**

```json
{
  "assistant": {
    "status": "Needs another look",
    "explanation": "The $800 payment needs another review. Nothing has been sent.",
    "in_your_language": "...",
    "language": "Spanish (Latin America)",
    "filled": {
      "amount": "$800",
      "request_total": "$200",
      "already_contributed": "$120",
      "family_connection_verified": "no",
      "recipient_is_saved": "yes",
      "family_connection": "aunt",
      "reason": "school expenses"
    },
    "needs": ["Confirm that the person is really the family member they claim to be."],
    "next_step": "Check the highlighted details. If you continue, both the sender and a family approver must confirm."
  },
  "case": { "amount_usdc": "800", "requested_usdc": "200", "other_contributions_usdc": "120",
            "relationship_verified": false, "fiat_leg": "simulated",
            "output_locale": "es-US", "output_language": "Spanish (Latin America)",
            "signals": ["extra_zero"] },
  "signals": [
    { "code": "extra_zero", "level": "high",
      "text": "The amount is about 10 or 100 times what is still needed. An extra zero?" }
  ],
  "outputs": { "PlainSpeaker": "...", "Skeptic": "...", "Watchdog": "...", "Judge": "{...}" },
  "verdict": {
    "decision": "hold",
    "sentence": "One plain English sentence.",
    "sentence_es": "The same sentence in the chosen language (legacy field name).",
    "threat": "...",
    "limit": "What the check cannot stop.",
    "suspicion": "high",
    "held_by_checks": true
  },
  "prune": { "relationship": "aunt", "purpose": "school expenses", "receipt": null },
  "credit_cost": 0.0123,
  "attempts": 1,
  "offline": false,
  "boundary": "Prepared for review only. No funds were signed or sent."
}
```

- `decision` is `confirm`, `hold` or `stop`, and `suspicion` is `none`, `low` or `high`.
- `held_by_checks: true` means the model said "confirm" but the Watchdog's checks overruled it.
- `sentence_es` holds the chosen language even when it is not Spanish. The name is legacy.
- `assistant` is the preferred UI contract. It is ready to render, tells the person what
  was filled and what is still needed, and replaces crypto implementation terms with
  ordinary payment language. `in_your_language` carries the selected-language explanation.
- `prune.relationship` and `prune.purpose` are short labels of at most three words from
  Prune. Unicode letters are allowed; a name with a number is still dropped.
- `prune.receipt` is Prune's signature over the model call. It is present only for a final `confirm`. It is not a Solana signature, and it does not belong on the chain.

**Errors** come back as `{"error": "<code>"}`. Where facts were already prepared, they also include `case` and `signals`:

| Status | `error` | Meaning |
|---|---|---|
| 400 | `bad-request`, `bad-transcript` | Bad JSON, a body that is not an object, or an empty or too-long transcript |
| 403 | `forbidden` | Wrong origin, wrong token, not JSON, or a non-loopback Host |
| 402 | `budget` | The Swarms balance is too low |
| 502 | `swarms-auth` | Swarms rejected `SWARMS_API_KEY` (missing, wrong or revoked) |
| 502 | `bad-verdict`, `swarms-api` | The Judge returned invalid JSON twice, or the Swarms API failed |
| 422 | `blocked-in` | Prune failed, or the cleaned text still held a phone or account number. Swarms was not called. |
| 502 | `no-receipt` | The decision was `confirm`, but Prune did not stamp it. The verdict is included. Do not treat it as ready. |
| 503 | `missing-key` | `SWARMS_API_KEY` isn't set. The response still includes `signals`. |

Every error response also carries a `hold_policy` with `required: true` and a `review_failed:<code>` reason.
A failed review is never an approval: do not make an express deposit after an error.
| 503 | `missing-prune-key` | `PRUNE_API_KEY` isn't set. The response still includes `signals`. Swarms was not called. |

### `POST /api/reset`

Body: `{}`. The server forgets the last review. Call it when the person starts a new
request, otherwise the next one is compared with the old one.

## Watchdog warning signs

| Code | Level | Fires when |
|---|---|---|
| `extra_zero` | high | The amount is 9.5 or more times what is still needed (requested minus other contributions) |
| `missing_zero` | high | The amount is exactly 1/10 or 1/100 of what is still needed |
| `above_needed` | medium | The amount is more than what is still needed |
| `contributions_exceed_request` | medium | Other contributions are more than the total requested |
| `changed_tenfold` | high | The amount changed 10x or more since the last review |
| `amount_changed` | low | The amount changed since the last review |
| `verified_without_statement` | high | `relationship_verified: true` arrived with nothing in the transcript or the last review saying so |
| `verified_flipped` | medium | The relationship went from not verified to verified since the last review |
| `conflicting_amounts` | high | The transcript gives two different amounts to send |
| `amount_mismatch` | high | Prune cleaned a different amount than the one in the person's words. The words win; this flags the disagreement. |
| `negated_instruction` | high | "Don't send 80", "never transfer", "no envíes": the words say not to send |
| `amount_not_stated` | high | No amount was said or supplied; the amount shown is only a placeholder |
| `amount_guessed` | high | The amount came from a lone number ("born in 1990"), not from "send 80" |
| `invalid_amount_facts` | high | An amount, the total requested or the other contributions is missing or invalid. Unknown is never treated as zero. |
| `recipient_not_in_contacts` | high | The recipient is not in the sender's contacts: paying someone you have not saved is how most scams start |
| `recipient_contacts_unchecked` | low | The app did not send `recipient_in_contacts` |
| `new_contact` | high | The recipient was saved less than 7 days ago |
| `message_request` | high | The request came as a message request from someone never messaged before |
| `name_mismatch` | high | The name the requester gave is not the saved contact's name |
| `recipient_details_changed` | high | A known contact now wants a different payment account |
| `new_recipient_account` | medium | The recipient's account is less than 7 days old |
| `first_time_recipient` | low | No earlier transfers to this recipient |
| `claims_new_number` | high | "this is my new number", "I dropped my phone", "perdí mi celular" |
| `authority_impersonation` | high | Police, bank fraud team, "safe account", government agency |
| `code_request` | high | "read me the code", verification codes, recovery phrase, AnyDesk. "Send the PIN to my sister" is fine; "send *me* the PIN" is not. |
| `payment_pivot` | high | Gift cards, bitcoin, crypto ATM, "pay my new account", "switched banks" |
| `refund_overpayment` | high | "I sent you 500 by mistake, send it back" |
| `investment_promise` | high | Guaranteed returns, "double your money", trading platform |
| `prize_fee` | high | Lottery, inheritance, "processing fee to claim your prize" |
| `emergency_story` | medium | Accident, jail, bail, hospital, stranded ("by accident" does not count) |
| `request_facts_assumed` | low | The total requested and other contributions were not supplied, so sample values were used. Send them in `case`. |
| `self_correction` | medium | "actually", "I mean", "make it", "mejor dicho"... |
| `pressure` | medium | "urgent", "don't tell", "gift card", "new number", "otra cuenta"... |

Show `signals[].text` as it is, high first. The server remembers the last review in
memory, so one server serves one person at a time. Each user needs their own session
before this goes multi-user.

## Safe Hold

Scams run on urgency, so a flagged transfer is not blocked. It waits.

| | Normal hold | Safe Hold (flagged) |
|---|---|---|
| When | `hold_policy.required` is `false` | `hold_policy.required` is `true` |
| Release | approver signs + PIN | after 24 hours: **sender signs again + approver signs** + PIN |
| Sender cancels | any time | any time |
| On-chain | amount, parties, PIN hash | also the release time and the review's fingerprint (`review_hash`) |

Every review response carries:

```json
"hold_policy": {
  "required": true,
  "hold_seconds": 86400, "hold_hours": 24,
  "confirmations": ["sender", "approver"],
  "reasons": ["skeptic_flag", "watchdog:extra_zero", "judge:hold"],
  "review_hash": "d862107b...64 hex",
  "sender_can_cancel": true,
  "needs_policy_cosign": false
}
```

- **Flagged when:** the Skeptic says `flag: yes` anywhere in its answer (`skeptic_flag`), or gives no flag line, which counts as flagged (`skeptic_unclear`); a high Watchdog sign (`watchdog:<code>`); the Watchdog agent's own `suspicion: high` (`watchdog_suspicion`), or no suspicion line at all (`watchdog_unclear`); a Judge verdict with `suspicion: high` when the Watchdog said less (`judge_suspicion`); a Judge decision other than confirm (`judge:hold`, `judge:stop`); an offline review (`offline_demo`); or a failed review (`review_failed:<code>`). A model can add a flag but cannot remove one. A malformed verdict only ever comes out stricter, and the server recomputes `hold_policy` itself rather than passing through what a review returned.
- **The 24 hours are enforced by the Solana program, not the app.** A release before `release_after` fails with program error 8 (`TOO_EARLY`), and a release without the sender's signature fails as a missing signature.
- **The double confirmation must be fresh.** A Safe Hold release that uses a durable nonce fails with error 11 (`PRESIGNED_RELEASE`). Without a durable nonce a signed transaction expires in about two minutes, so nobody can collect both signatures during the pressure of the moment and submit them a day later.
- **`review_hash`** is the sha256 of the safe facts, the verdict and the hold decision (required, seconds, reasons). It is stored in the hold, so anyone can check later that the hold came from this review with this outcome; a clean review's hash differs from a flagged one's. It holds no names or phone numbers.

### Why a client cannot skip it: the policy authority

The program fails closed. On its own, a client can only open a hold of **at least 24 hours** with a
non-zero `review_hash`. Anything shorter, including an ordinary hold with no cooling-off, must be
co-signed by the **policy authority**: the review server's key. So skipping the review gets you the
slow path, never the fast one.

| `hold_policy` | Deposit to build | Who signs |
|---|---|---|
| `required: true` | `hold_seconds: 86400`, the `review_hash` | sender alone |
| `required: false` (`needs_policy_cosign: true`) | `hold_seconds: 0`, the `review_hash` | sender **and the policy authority** |

- The authority's public key is `POLICY_AUTHORITY` in `programs/family_hold/src/lib.rs`
  (`77m7HCt9N6VBCRiJi3WUUeL2QFbMtKmt9mdv6KbyYCCb`). Its secret is `hold/keys/policy-authority.json` on
  Chad's machine. It is never committed, and it belongs on the server (for example `apps/api`, which already
  has `@solana/web3.js`), never on a phone. To use your own key, generate one, put its public key in
  `POLICY_AUTHORITY`, and rebuild.
- The server should co-sign only a deposit whose amount, parties and `review_hash` match a review it
  ran with `required: false`.
- Program errors: 9 `BAD_HOLD` (over 30 days, or a zero review hash), 10 `NEEDS_POLICY_COSIGN` (under
  24 hours without the authority), 1 `SAME_PERSON` (approver is the sender or the recipient).

### `GET /api/hold/<state address>`

For the approver screen: the countdown and who still has to sign, read from Solana.

```json
{ "state": "...", "sender": "...", "approver": "...", "recipient": "...", "amount_usdc": "800",
  "safe_hold": true, "release_after": 1794268800, "seconds_left": 85211, "cooling_off_over": false,
  "needs": ["sender signature", "approver signature", "PIN"], "ready_for_signatures": false,
  "sender_can_cancel": true, "review_hash": "d862107b..." }
```

`ready_for_signatures` means only that the cooling-off is over; release still needs everything in `needs`.
Time comes from Solana's own clock, which is what the program checks. Answers are cached for 5 seconds.
The response is 404 `no-hold` when nothing is locked there, 404 `not-a-hold` for another kind of account,
400 `bad-address`, and 502 `solana-rpc` when the Solana node fails. An RPC error is never reported as "no hold".

## Demo for the judges: unknown recipient goes to the Safe Hold

Team members send each other money. Someone who is in your contacts gets it normally; someone who is not
goes to the Safe Hold. Tested live with real Swarms and Prune:

| Request | Result |
|---|---|
| "Send 80 dollars", recipient **in** contacts | `confirm`, no hold |
| Same request, recipient **not** in contacts | **Safe Hold**: `skeptic_flag`, `watchdog:recipient_not_in_contacts`, `judge:hold` |

1. Save the teammates in each other's contacts in the app, and leave one person out (or have a judge's
   number be the "stranger").
2. In the send screen, work out `recipient_in_contacts` from the contact list (in live mode, compare the
   typed phone number with the saved contacts) and pass it in `case`.
3. Send to a teammate: it goes through. Send to the stranger: the app shows the Safe Hold, the reasons,
   and the Judge's sentence: *"The recipient is not in the sender's contacts, so the transfer should be
   reviewed before signing."*
4. For an on-chain demo that does not take a day, start the review server with `SAFE_HOLD_SECONDS=120`.
   A hold under 24 hours needs the policy authority's co-signature, so the server signs that deposit.

In the app, for example:

```ts
const recipientInContacts = contacts.some((c) => normalizePhone(c.phone) === normalizePhone(typedPhone));
body: JSON.stringify({ transcript, case: { ...previousCase, recipient_in_contacts: recipientInContacts } })
```

## Scam scenarios the agents are trained on

The Skeptic, Watchdog and Judge carry a scam playbook (`SCAM_PLAYBOOK` in `swarm/family_review.py`):
new-number impersonation, emergency/grandparent calls, authority impersonation, code theft, changed
account details, and refund, investment and prize scams. For each one it gives the signs to look for
and the safe step to tell the family, usually *"call them back on the number you already had saved"*.
The playbook helps the agents explain; it never lets them add a sign the local checks did not find,
and a model can never remove a hold the checks raised.

`swarm/scam_scenarios.py` is the red-team suite: 11 scams (English and Spanish) and 3 honest controls
that must go through, including one full of words that sound risky ("immigration fees", "I'll text her
the PIN", "by accident").

```bash
python -m swarm.scam_scenarios            # local checks only: free, no keys
python -m swarm.scam_scenarios --live     # real Prune + Swarms, prints the Judge's verdict for each
python -m swarm.scam_scenarios --live --only hi_mom_new_number   # one scenario, for a judge demo
```

Live run on 2026-11-07 with real Prune and Swarms: **14/14**. All 11 scams went to the Safe Hold (the
Judge chose `stop` for most), and all 3 honest controls were approved with no hold. What the Judge told the family:

| Scenario | Judge |
|---|---|
| "Hi Mom, this is my new number" | stop: *"Do not sign it yet; call the son back on the old number already saved before sending anything."* |
| Message request using a teammate's name | hold: *"Call the number you already had saved before anyone signs, because the message request and name mismatch could be a family impersonation scam."* |
| Known contact, "pay my new account" | hold: *"Call your sister back on a number you already saved before you sign anything."* |
| "Read me the code" | stop: *"Do not share any PIN, verification code, password, recovery phrase, or remote access request..."* |
| Routine transfer to a teammate | confirm: *"You may review this family transfer of 80 digital dollars for school expenses."* |

To teach it a new scam: add a scenario to `SCENARIOS`, run it, and if it is missed add a pattern to
`SCAM_PATTERNS` in `app.py` (and a code in `SIGNALS`) or a line to `SCAM_PLAYBOOK`. Add an honest
control for every new pattern so it does not start holding normal family transfers.

For the judges, in the app send screen:

```ts
const saved = contacts.find((c) => normalizePhone(c.phone) === normalizePhone(typedPhone));
const facts = {
  recipient_in_contacts: Boolean(saved),
  contact_added_days: saved ? daysSince(saved.addedAt) : undefined,
  request_channel: requestCameFrom,            // "message_request" when it came from an unknown sender
  claimed_name_matches_contact: saved ? sameName(claimedName, saved.name) : undefined,
  recipient_details_changed: saved ? saved.lastWallet !== typedWallet : undefined,
  prior_transfers_to_recipient: saved?.transfers ?? 0,
};
body: JSON.stringify({ transcript, incoming_message: messageThatAskedForMoney, case: { ...previousCase, ...facts } })
```

## Calling it from the Nest app

Call it from the Next server in `apps/api`, not from the phone, so no token ships in
the app. For example, in a route at `apps/api/app/api/review/route.ts`:

```ts
const res = await fetch(`${process.env.REVIEW_API_URL ?? 'http://127.0.0.1:8000'}/api/review`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    ...(process.env.REVIEW_API_TOKEN ? { authorization: `Bearer ${process.env.REVIEW_API_TOKEN}` } : {}),
  },
  body: JSON.stringify({ transcript, case: previousCase }),
});
const review = await res.json(); // 503 missing-key and missing-prune-key still return signals you can show
```

The same route runs Prune and then Swarms. Do not call `swarm/prune_gate.py` from the app separately.

## Command line (no server)

```powershell
python swarm/family_review.py --dry-run        # print the Swarms request
python swarm/family_review.py                  # run the sample case
python swarm/prune_gate.py --dry-run           # the Prune gate's two requests
python swarm/open_hold.py --note "..." --deposit   # review, then lock the reviewed amount (a Safe Hold when flagged)
```

## Family hold (devnet test token)

`programs/family_hold` locks test USDC until the approver releases it. The sender can
refund alone. Release needs the approver's signature and the 6-digit PIN. The PIN hash
is public on-chain, so the signature is the real check.

```powershell
node hold/hold.mjs demo                                  # refusals, refund, release; a skipped hold refused on-chain; a 24 h and a 20 s Safe Hold
node hold/hold.mjs lock 80 --review-hash <64 hex>        # ordinary hold, co-signed by the policy authority
node hold/hold.mjs lock 800 --hold-seconds 86400 --review-hash <64 hex>   # a Safe Hold the client may open alone
node hold/hold.mjs status                                # the open hold: release time, flags, review hash
node hold/hold.mjs refund                                # the sender cancels, any time
node hold/hold.mjs release 123456                        # approver releases (sender signs too on a Safe Hold)
```

Release takes these accounts: `fee_payer, sender (writable; signer on a Safe Hold), approver (signer),
state, vault, recipient_token, mint, token_program, instructions sysvar` (the last is required on a Safe Hold). A deposit's data is always 80 bytes: amount
u64, PIN hash, `hold_seconds` u64, `review_hash`. Its accounts are `fee_payer, sender, approver,
recipient, mint, sender_token, vault, state, token_program, system_program`, plus `policy_authority`
(signer) for anything under 24 hours. The hold account is 243 bytes. Unknown or repeated CLI options
are errors, so a typo cannot quietly turn a Safe Hold into an ordinary one.

**The program builds in CI** (`.github/workflows/family-hold.yml`): every push runs `cargo check`,
then `cargo build-sbf` with Solana 1.18.26, and keeps `family_hold.so` as a download on the run page
(Actions tab → Family hold → the run → Artifacts). First successful build: Nov 7, 128,576 bytes.
Solana 1.18's build tools use Cargo/Rust 1.75, so `programs/family_hold/Cargo.lock` pins dependency
versions that still build there (blake3 1.5.5, jobserver 0.1.32, proc-macro-crate 3.1.0, indexmap 2.2.6).
Keep that lockfile; if you run `cargo update`, CI's "Every locked crate must build with Cargo/Rust 1.75"
step names any crate that breaks it and what pulls it in.

**Deployment completed November 8; see the verified program and transaction proofs above.** For a new initial deployment only: set `POLICY_AUTHORITY` in `src/lib.rs` to the server's
key, add the `SOLANA_DEPLOYER_KEYPAIR` (a devnet keypair with about 3 SOL) and
`FAMILY_HOLD_PROGRAM_KEYPAIR` (`hold/keys/program.json`) repository secrets, then run the workflow by hand
with `deploy` ticked. Keys live in `hold/keys/`, which Git ignores.

## Still open

- Tested live on Nov 7 with real Swarms and Prune keys: a clean request was confirmed and sealed with a Prune receipt,
  and "Send 800" was held, with the Watchdog asking "Did you mean 80 instead of 800?". Each review costs about
  0.046 Swarms credits and takes 30 to 60 seconds. `tests/` covers the same pipeline offline.
- The Safe Hold was tested in the review API live (the real Skeptic flagged "Send 800, it's urgent", and the
  policy came back 24 h with sender + approver), and in unit tests. The on-chain part, including
  `node hold/hold.mjs demo` with its 20-second Safe Hold, has not run yet: the program first has to be
  compiled and deployed.
- In this demo `hold.mjs` holds the sender's key and the policy authority's key, so "the sender signs
  again" and "the server co-signs" happen on the same machine. In the app, the sender confirms on their own
  phone and the policy authority signs on the server.
- A mint with a freeze authority (real USDC has one) can freeze the vault, which would block refunds
  until it is thawed. The demo's test mint has none.
- The Safe Hold covers money that goes through the family hold. Nothing on-chain can stop someone
  sending USDC some other way; the app should route every family transfer through the review.
- `hold.mjs` checks `POLICY_AUTHORITY` (env var, default the program's key) before co-signing, but the
  program's own check is the real boundary.
- `/api/reset` clears the last-review memory, so a caller can reset before a tenfold change. The
  Watchdog's other checks (extra zero against what is still needed) still apply.
- "Relationship verified" is what the person says, not something proven.
- The last-review memory is per process, so one person at a time.
- Deterministic form filling currently recognizes command vocabulary in English, Spanish,
  Portuguese, French, Haitian Creole, Arabic, Persian, Hindi, Bengali, Urdu, Turkish,
  Swahili, Indonesian, Filipino, Vietnamese, and Mandarin Chinese. The full output-language
  list remains available through `output_locale`; unrecognized wording fails closed instead
  of inventing a value.
