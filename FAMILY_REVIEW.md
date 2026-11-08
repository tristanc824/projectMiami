# Family transfer review: handoff for Caleb

Caleb, this is yours to build on. It's the backend for checking a family transfer before
anyone signs it. It has **no UI**: the Nest app owns all the screens. This guide covers
what it does, how to run it, the API contract, and what is still open.

Everything here lives in `app.py`, `swarm/`, `tests/`, `hold/` and `programs/family_hold/`.
None of it touches `apps/`, `web-earth/` or the site, so it merges with `main` and
`calebs-output` without conflicts.

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
    "output_locale": "es-US"
  }
}
```

- `transcript` is required: 1 to 2000 characters. The server reads amounts and
  "verified / not verified" from it, in English and Spanish, and those override `case`.
- `case` is optional. Amounts are strings with up to 2 decimals, at most 100000, and
  invalid values fall back to defaults. `output_locale` must be one of the 47 keys of
  `LANGUAGES` in `app.py`.
- Send back the `case` from the previous response on each turn, so facts carry over.

**200 response:**

```json
{
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
- `prune.relationship` and `prune.purpose` are short letter-only labels from Prune. A name or a number is dropped.
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

- **Flagged when:** the Skeptic says `flag: yes` anywhere in its answer (`skeptic_flag`), or gives no flag line, which counts as flagged (`skeptic_unclear`); a high Watchdog sign (`watchdog:<code>`); a Judge decision other than confirm (`judge:hold`, `judge:stop`); an offline review (`offline_demo`); or a failed review (`review_failed:<code>`). A model can add a flag but cannot remove one. A malformed verdict only ever comes out stricter, and the server recomputes `hold_policy` itself rather than passing through what a review returned.
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
  (`GFYKxxnMQkBP8m1rx18xd1h1fwy6RDpADK9R5KJoREDF`). Its secret is `hold/keys/policy-authority.json` on
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

**The program must be rebuilt and redeployed** with the Solana toolchain (`cargo build-sbf`,
then `solana program deploy`) before any of this works on devnet. It has not been compiled
yet: no Rust toolchain was available. Keys live in `hold/keys/`, which Git ignores.

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
- Amount and "verified" parsing understands English and Spanish. Other languages fall back to a single standalone number.
