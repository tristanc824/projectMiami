# Audit implementation — November 8, 2026

The supplied review describes `calebs-output`. The active workspace is `main`, with substantial uncommitted integration work already present. I preserved that work. No commits, pushes, repository-visibility changes or external publications were performed. Authorized devnet deployment and test transactions are recorded below; no real funds were used.

## Findings and resolutions

| Finding | Resolution in the current workspace |
| --- | --- |
| Review/Undo/security claims exceed the build | Scam review, app PIN, native biometric approval, Lock Nest and saved trusted contacts were already integrated locally. Safe Hold deployment and real refund verification are now complete; contact-only recovery remains unavailable and are now labeled accordingly in the website, pitch, handoffs and film patch. No stale branch merge overwrote the integrated app. |
| RPC errors appear as a zero balance | Already fixed: zero is returned only for a missing associated token account; RPC failures propagate. Existing balances stay visible with a refresh error. |
| Balance changes amplify history reads | Already fixed: balance and transaction history poll independently; the history reader coalesces requests and parses only new signatures. Pending-status queries also coalesce in flight and cache results for three seconds. |
| Windows npm startup fails silently | All three affected npm child-process calls use the Windows shell when required. Spawn failures now produce actionable diagnostics and nonzero exit codes. Mac execution and a deliberately missing npm executable were checked; a real Windows machine was not available. |
| Confirmation timeout can misreport failure or cause a duplicate | A deterministic transaction ID is exposed at preparation and retained on ambiguous submit/confirmation. API replies are pending, with the original signature. Receipts persist pending state, avoid success animation, offer Explorer/Activity, block another outgoing payment, and resolve from matching wallet/mint/amount chain data. Mainnet broadcasts are refused. |
| SMS retries can repeat a payment | Gateway IDs are required. Per-sender work is serialized and signed transaction bytes are checkpointed in an owner-only local SQLite ledger before broadcast. Stable gateway IDs are retained durably; retries reuse the same bytes. Unknown confirmation does not roll back reserved daily spending. Pending SMS appears in app Activity and blocks conflicting app sends until resolved. Atomic reservations protect daily usage and allow one active SMS payment per owner. Expired unsigned preparations cannot later save/broadcast. Finalization targets its own message ID, preserving newer work. The store requires Node 24 and a persistent disk; ephemeral serverless SMS is refused. Privy custom metadata is capped at 1 KB total, so transaction bytes are not stored there. |
| Mobile/API/root handoffs describe an older app | Rewritten around the actual Privy SMS app and website entry point, current funding cap, native modules and honest limitations. Working local-demo screens were retained; the report's removed-tab description does not match this `main` workspace. Legacy Auth0 is not presented as connected wallet sign-in. |
| Fresh checkout lacks installation steps | Root Website setup now lists installs for API, mobile and website, with the verified Node version. |
| Environment examples omit operational knobs | Added `SOLANA_RPC_URL`, Circle devnet `USDC_MINT`, optional public `NEST_WEBSITE_URL`, and the existing `MAX_DEPOSIT_USD=1000`. No new provider key was invented or printed. |
| Port 5184 opens the old DAT consumer UI | Replaced `/` with a plain Nest API page linking to the actual website and API health; metadata title is Nest API. |
| Public links/repository access are not ready | Selected the review's allowed laptop-demo fallback. Public materials no longer imply an available public judge URL. The source repository remains private. Native sharing still requires a real public HTTPS URL; no localhost or invented public URL is substituted. |
| Pitch/video copy overstates privacy, cash-out, recovery or Undo | Removed cash-out/license claims and guaranteed timing. Approval is described as fingerprint, face or PIN. New submission/one-pager/YouTube drafts are in `pitch/`. The current end card has a verified-HTTPS URL prop and a laptop-demo fallback. |

## Film branch

The expanded film scenes are absent from `main`. A source snapshot of `origin/calebs-output` is prepared at `/private/tmp/nest-caleb-film-audit`, with the corrected Undo, security and closing scenes and updated pitch drafts applied. It was typechecked and the affected frames were rendered and visually inspected. This is an isolated snapshot, not a branch switch, merge, commit or published video.

The portable [film patch](./caleb-film-copy.patch) applies cleanly to the recorded [base commit](./caleb-film-copy-base.txt). Apply it on the film branch and re-render before using that film; editing source does not change an existing uploaded MP4. The current `main` Remotion end card is updated directly and was rendered separately.

Preview artifacts from verification:

- `/private/tmp/nest-caleb-undo-preview.png`
- `/private/tmp/nest-caleb-security.png`
- `/private/tmp/nest-caleb-close.png`
- `/private/tmp/nest-handoff-endcard.png`

## Checks

- API unit tests: 36 passed.
- API service tests: 24 passed, including pending confirmations, SMS checkpoint replay, cross-flow pending guards and metadata races.
- Mobile unit tests: 40 passed.
- Python review suite: 52 passed.
- Connected browser suite: 19 passed.
- Review/hold browser suite: 8 passed, using mocked chain responses.
- Mobile demo/browser suite: 24 passed.
- Mobile TypeScript/lint, API production build, website production build and both video-source typechecks passed.
- Native iOS build/welcome screen was verified in the preceding security follow-up. Physical Face ID and SMS gateway delivery still need device rehearsal; the later real devnet refund proof is recorded below.
- The rebuilt Solana 1.18.26 binary passed six local runtime checks: deposit, early-release rejection, wrong PIN, missing signature, full refund and explicit override. The runtime harness now supports the 1.18 invalid-signature RPC error shape.
- Missing-npm startup diagnostic, patch applicability and Git diff whitespace were checked. The one-pager fits phone/desktop widths, and the actual API root serves the Nest landing page.

No real funds were moved by these checks. Test confirmations do not replace actual devnet deployment or a two-phone rehearsal.

## Deployment evidence and remaining requirements

1. Safe Hold: completed November 8. The program is executable on devnet; a real 0.01 USDC deposit/refund, early normal-release rejection, wrong-PIN rejection and explicit sender override passed. All test USDC was returned to the treasury. See [proofs](./hold-devnet-proof.json) and [FAMILY_REVIEW.md](../FAMILY_REVIEW.md). The combined physical-phone flow still needs rehearsal.
2. Contact-only recovery: enable the wallet provider's supported custom authentication integration, link it to existing accounts before phone loss, and implement native SDK support. Saving a contact currently enables call/text shortcuts only.
3. Public HTTPS: configure a real deployed app address and native payment-link base. Until then, use the team laptop and avoid a remote-receiving claim.
4. Persistent SMS storage: the laptop uses ignored `.data/nest-sms.sqlite`, configurable with `SMS_STORE_PATH`. Keep that directory on persistent disk and back it up if moving the demo server. Do not use ephemeral serverless storage for SMS signing. Account PIN/trusted-contact metadata stays within Privy’s separate 1 KB limit.
5. Dedicated devnet RPC: configure an actual provider URL/key server-side. The public fallback remains available but can be rate-limited.
6. Physical devices: rehearse SMS login, actual wallet signing, biometric approval, contacts and the cellular gateway using the updated native build. Browser mocks and rendered film frames cannot verify those steps.

RPC confirmation handling follows the official [signature-status API](https://solana.com/docs/rpc/http/getsignaturestatuses) and [confirmation/expiry guidance](https://solana.com/developers/cookbook/transactions/confirmation). It checks chain evidence instead of treating an HTTP timeout as proof that no money moved.

The [Privy metadata limit](https://docs.privy.io/user-management/users/custom-metadata) applies to the entire JSON object, not each field. The final implementation keeps SMS checkpoints and daily reservations in SQLite instead. Tests cover persistence across database restarts, multiple connections, exact-byte reuse, bounded preparation leases and stale-finalization safety.

## Session/security follow-up

Returning to a signed-in app no longer requests Face ID/PIN. Each send, hold action, freeze, biometric-setting/trusted-contact change and own-profile edit still requires approval. A frozen wallet still requires authenticated unfreezing. Four focused browser regression tests passed for PIN change/freeze, trusted-contact security, reopening without a grant followed by a protected send, and approval before saving a profile edit. Mobile TypeScript/lint and the production web build passed.
