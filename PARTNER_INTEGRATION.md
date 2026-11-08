# Voice review integration handoff

This is the merge contract for adding multilingual voice commands to the current Nest app without creating a second payment system. The review service **fills a draft only**. The existing confirmation, wallet signing, and transfer routes remain the only way money can move.

## Recommended merge order

The remote branches were compared on November 8, 2026.

1. Start from `origin/calebs-output` (`d8e829c`). It contains the newest product UI and voice design work.
2. Merge `origin/main` (`8fd04e7`). Main currently has one commit that Caleb's branch does not.
3. Bring in Claude's security commit `81d2740` (double-payout protection, route controls, Stripe idempotency, and transaction verification). Do not overwrite the newer `solana.mjs` wholesale during conflicts.
4. Apply this voice-review integration. Keep Caleb's orb/screens and wire them to `apps/mobile/src/services/review.ts`.

Avoid merging this older working branch over Caleb's branch as a whole. Move the feature files or cherry-pick its final integration commit after it is committed.

## One payment path

```text
speech-to-text
  -> phone matches a contact locally
  -> authenticated POST /api/review
  -> server-only call to the Python review service
  -> ready / clarify / Safe Hold / stop draft
  -> existing Send review screen
  -> existing /api/transfer/prepare
  -> phone verifies exact recipient + amount + wallet
  -> wallet confirmation and signature
  -> existing /api/transfer/submit
```

There should be no `/voice/confirm` route. A second confirmation route would duplicate authorization rules and make it easier for voice and typed payments to behave differently.

## Partner hookup

After speech-to-text produces a final transcript:

1. Resolve the spoken recipient against the phone's contacts and set `recipient.spokenName` to the exact matched words (for example, `mami` for the saved contact `Mamá`). The adapter removes that span before the request leaves the phone.
2. Call `reviewVoiceTranscript(getAccessToken, transcript, locale, recipient)`.
3. Render `draft.readback`, `draft.explanation`, and `draft.needs` in Caleb's confirmation sheet.
4. For `clarify`, ask only for the missing fact. For `hold` or `stop`, do not show an immediate-send action.
5. For `ready`, pass `draft.sendParams` into the existing typed Send flow. Do not call the wallet from the voice component.

The adapter recognizes `es-419`, `es-AR`, and `es-UY` as Spanish and supports amounts normalized from spoken words. The amount is always read back as digits before confirmation.

## Files meant to be portable

- `apps/mobile/src/services/review.ts`: UI-independent voice draft adapter.
- `apps/api/app/api/review/route.ts`: authenticated, rate-limited proxy.
- `apps/api/lib/review.mjs`: strict payload allowlist and server-to-server client.
- `apps/api/lib/server/transactionSecurity.mjs`: input and signing-key guardrails that can be imported by the newer backend.
- `apps/mobile/src/services/dat.ts`: verifies prepared transaction bytes before signing.
- `app.py`, `swarm/prune_gate.py`, `swarm/family_review.py`: multilingual extraction, secret filtering, plain-language review, and Safe Hold decision.

## Configuration

On the Next server:

```dotenv
REVIEW_API_URL=https://review-service.example
REVIEW_API_TOKEN=replace-with-a-long-random-token
REVIEW_API_TIMEOUT_MS=180000
```

Use the same `REVIEW_API_TOKEN` on the Python review service. The token never belongs in an `EXPO_PUBLIC_...` variable or the mobile bundle. Plain HTTP is accepted only for a loopback development address.

## Security boundaries that must remain

- The proxy never adds a user ID or contact record; the phone redacts the locally matched spoken name, and the server rejects phone/account-number-shaped transcripts. Prune sees only the remaining payment sentence.
- A model response cannot sign, submit, or broadcast a transaction.
- Missing or conflicting amounts fail closed and require clarification.
- Unknown contacts and high-risk signals produce a Safe Hold.
- The phone compares the prepared transaction with the confirmed wallet, recipient, amount, token program, and instruction count before asking Privy to sign.
- Raw environment signing keys are allowed only on devnet/localnet. Production needs an external MPC/HSM signer.
- Keep Claude's Stripe idempotency and concurrency controls from `81d2740` when resolving backend conflicts.

## Verification before merge

```powershell
python -m unittest discover -s tests -v
npm --prefix apps/api test
npx --prefix apps/api tsc --noEmit
npm --prefix apps/mobile test
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile run lint
```

The native microphone/speech-to-text screen is intentionally not implemented in this integration branch because Caleb's branch owns that UI. This layer starts at the final transcript and ends at the existing typed-send confirmation parameters.
