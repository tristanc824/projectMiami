"""Run Prune, then the swarm, and stop before any signature unless both pass.

A clean review is sealed by Prune and locked as usual. A flagged review (the
Skeptic flags it, the Watchdog finds a high sign, or the Judge does not
confirm) goes into a Safe Hold: 24 hours on-chain, then only the sender can
confirm it. Either way it locks exactly the reviewed amount. The Solana hold itself is
node hold/hold.mjs. The sender can refund either hold alone. An ordinary hold is released
by the approver, the other family member, with their signature and the PIN.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from family_review import build_task, detect_signals, run_review
from prune_gate import GateStop, clean_request, seal_sentence

ROOT = Path(__file__).resolve().parents[1]


def _number(amount: str) -> str:
    match = re.fullmatch(
        r"\s*\$?\s*(\d+(?:\.\d{1,6})?)\s*(?:usdc|usd|dollars?)?\s*", amount, re.IGNORECASE
    )
    if not match or float(match.group(1)) <= 0:
        raise SystemExit("blocked-in")
    return match.group(1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean a note, review it, then optionally lock test USDC.")
    parser.add_argument("--note", required=True, help="The raw family note. Prune is the only step that reads it.")
    parser.add_argument(
        "--deposit", action="store_true", help="After confirm, lock the reviewed amount of devnet test USDC."
    )
    args = parser.parse_args()

    try:
        fields = clean_request(args.note)
    except GateStop as stop:
        print(stop.reason)
        return 1

    amount = _number(fields["amount"])
    case = {
        "amount_usdc": amount,
        "requested_usdc": amount,
        "other_contributions_usdc": "0",
        "relationship_verified": False,
        "relationship": fields["relationship"],
        "purpose": fields["purpose"],
        # No payout provider is wired up, so the payout stays a labeled simulation
        # whatever the note claims.
        "fiat_leg": "simulated",
        "corridor": "unset",
        "custody": "unset",
        "provider": "unset",
    }
    # The Watchdog's typo and tamper checks run here too, so a high sign keeps the Judge from confirming.
    case["signals"] = detect_signals(case)
    print(build_task(case))

    import os

    api_key = os.environ.get("SWARMS_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Set SWARMS_API_KEY. The note was cleaned and was not sent to Swarms.")

    review = run_review(case, api_key)
    verdict = review["verdict"]
    policy = review["hold_policy"]
    print(verdict["decision"])
    node = ["node", str(ROOT / "hold" / "hold.mjs"), "lock", amount, "--review-hash", policy["review_hash"]]

    if policy["required"]:
        # Flagged: not refused, but the money waits on-chain until the sender confirms it again.
        print("SAFE HOLD: " + ", ".join(policy["reasons"]))
        print(verdict["sentence"])
        print(
            f"The money waits {policy['hold_hours']:g} hours on-chain. Then only the sender can confirm it "
            "(node hold/hold.mjs confirm). The sender can cancel any time."
        )
        if not args.deposit:
            print(f"Pass --deposit to lock {amount} test USDC in a Safe Hold.")
            return 0
        completed = subprocess.run([*node, "--hold-seconds", str(policy["hold_seconds"])], cwd=ROOT, check=False)
        return completed.returncode

    try:
        sealed = seal_sentence(verdict["sentence"])
    except GateStop as stop:
        print(stop.reason)
        return 1

    print(sealed["sentence"])
    print(sealed["receipt"]["receipt_signature"])
    print("ready-to-sign")
    print(
        "The local payout is simulated. The sender can cancel without the PIN. "
        "Release needs the approver's signature and the 6-digit PIN."
    )
    if not args.deposit:
        print(f"Pass --deposit to lock {amount} test USDC after this confirm.")
        return 0

    # Lock exactly the amount the swarm reviewed, with the review's fingerprint on-chain.
    completed = subprocess.run(node, cwd=ROOT, check=False)
    return completed.returncode

if __name__ == "__main__":
    sys.exit(main())
