"""Run Prune, then the swarm, and stop before any signature unless both pass.

Deposit happens only when the Judge says confirm and Prune returns a receipt
signature. The Solana hold itself is node hold/hold.mjs. The sender can refund
that hold alone. Only the other family member can release it.
"""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

from family_review import build_task, run_review
from prune_gate import GateStop, clean_request, seal_sentence

ROOT = Path(__file__).resolve().parents[1]


def _number(amount: str) -> str:
    match = re.fullmatch(r"\s*(\d+(?:\.\d+)?)\s*(?:USDC|usdc|dollars?)?\s*", amount)
    if not match:
        raise SystemExit("blocked-in")
    return match.group(1)


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean a note, review it, then optionally lock test USDC.")
    parser.add_argument("--note", required=True, help="The raw family note. Prune is the only step that reads it.")
    parser.add_argument("--deposit", action="store_true", help="After confirm, run the devnet test-token demo lock.")
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
        "fiat_leg": fields["fiat_leg"],
        "corridor": "unset",
        "custody": "unset",
        "provider": "unset",
    }
    print(build_task(case))

    import os

    api_key = os.environ.get("SWARMS_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("Set SWARMS_API_KEY. The note was cleaned and was not sent to Swarms.")

    review = run_review(case, api_key)
    verdict = review["verdict"]
    print(verdict["decision"])
    if verdict["decision"] != "confirm":
        print(verdict["sentence"])
        return 0

    try:
        sealed = seal_sentence(verdict["sentence"])
    except GateStop as stop:
        print(stop.reason)
        return 1

    print(sealed["sentence"])
    print(sealed["receipt"]["receipt_signature"])
    print("ready-to-sign")
    print("The local payout is simulated. The sender can cancel without the PIN. Release needs the 6-digit PIN.")
    if not args.deposit:
        print("Run node hold/hold.mjs demo to lock test USDC. Pass --deposit to do that after this confirm.")
        return 0

    completed = subprocess.run(
        ["node", str(ROOT / "hold" / "hold.mjs"), "demo"],
        cwd=ROOT,
        check=False,
    )
    return completed.returncode


if __name__ == "__main__":
    sys.exit(main())
