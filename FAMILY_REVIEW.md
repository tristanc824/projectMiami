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
   - **Skeptic** checks for a wrong amount, the wrong person, or an impersonator.
   - **Watchdog** turns each warning sign into a question, such as "Did you mean 80 or 800?".
   - **Judge** returns a JSON verdict.
6. If any high warning sign was found, the server turns a "confirm" into "hold",
   whatever the model said.
7. Prune stamps the sentence only when the final decision is `confirm`. The stamp is
   `prune.receipt`. Hold and stop come back with `prune.receipt` set to `null`.

It never signs or sends money. "confirm" means only that a person may now review the
transfer and decide.

## Run it

```powershell
$env:SWARMS_API_KEY = "your-key"     # from https://cloud.swarms.world/api-keys
$env:PRUNE_API_KEY = "your-key"      # from https://withprune.com/sharkbyte ; sent as X-Prune-Key, the model key stays in the Prune vault
python app.py                        # http://127.0.0.1:8000, JSON only
python app.py --offline              # no keys needed: the checks are real, the agents' text is canned
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
| `self_correction` | medium | "actually", "I mean", "make it", "mejor dicho"... |
| `pressure` | medium | "urgent", "don't tell", "gift card", "new number", "otra cuenta"... |

Show `signals[].text` as it is, high first. The server remembers the last review in
memory, so one server serves one person at a time. Each user needs their own session
before this goes multi-user.

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
python swarm/open_hold.py --note "..." --deposit   # Prune, Watchdog checks, swarm, then lock the reviewed amount
```

## Family hold (devnet test token)

`programs/family_hold` locks test USDC until the approver releases it. The sender can
refund alone. Release needs the approver's signature and the 6-digit PIN. The PIN hash
is public on-chain, so the signature is the real check.

```powershell
node hold/hold.mjs demo            # lock, check the refusals, refund, lock, release
node hold/hold.mjs lock 80         # lock 80 test USDC and print the PIN
node hold/hold.mjs refund          # the sender cancels
node hold/hold.mjs release 123456  # the approver releases to the recipient
```

Release takes these accounts: `fee_payer, sender, approver (signer), state, vault,
recipient_token, mint, token_program`. The program must be rebuilt and redeployed with
the Solana toolchain before release works on devnet. Keys live in `hold/keys/`, which
Git ignores.

## Still open

- Tested live on Nov 7 with real Swarms and Prune keys: a clean request was confirmed and sealed with a Prune receipt,
  and "Send 800" was held, with the Watchdog asking "Did you mean 80 instead of 800?". Each review costs about
  0.046 Swarms credits and takes 30 to 60 seconds. `tests/` covers the same pipeline offline.
- The last-review memory is per process, so one person at a time.
- Amount and "verified" parsing understands English and Spanish. Other languages fall back to a single standalone number.
