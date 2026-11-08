# Nest current demo recording script

Use this script instead of the previous design-only film beats. The deadline is not a reason to imply an unbuilt feature works.

## Suggested 60–90 second cut

1. Show Nest on the laptop or the updated native build. Introduce phone-number payments using test USDC on Solana devnet.
2. Show the account and an app PIN. Describe approval as **fingerprint, face or PIN**, and only record the biometric prompt if it works on the actual device.
3. Send a small, funded amount to a known recipient. Keep the amount, number and explicit approval visible.
4. Show the real receipt and Explorer transaction ID. If the chain has not confirmed, show the pending state; do not cut to a fabricated success screen.
5. Enter an unfamiliar recipient and show the Swarms/Prune warning. Explain that a review error blocks payment.
6. Show Lock Nest and a genuine unlock. Explain that it stops outgoing Nest app and text payments.
7. End with the Nest mark and **Live demo at the Nest table · Solana devnet**, or a verified public HTTPS URL once one exists.

## Development previews

Safe Hold is deployed on devnet and its real deposit/refund are verified. Use the actual app and Explorer receipts from [audit/hold-devnet-proof.json](./audit/hold-devnet-proof.json). Existing rendered design animations remain illustrations; re-record the physical-phone flow for live evidence.

Trusted contacts currently provide saved call/text shortcuts. Do not say they can recover an account. Bank payouts, card spending and Apple Pay are not connected. Do not claim full transaction privacy, guaranteed scam prevention or a guaranteed transfer time.

The expanded film lives on `origin/calebs-output`, not in this working branch. Its three affected scenes have a ready patch at [audit/caleb-film-copy.patch](./audit/caleb-film-copy.patch). Apply it to the stated base and re-render before using that film; this document does not change an already-rendered video.

The current Remotion end card supports an optional `publicUrl` input prop. With no verified HTTPS URL, it displays the laptop-demo fallback rather than a made-up domain. See [the video handoff](./pitch/youtube/YOUTUBE.md).
