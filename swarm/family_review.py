"""Pre-send review for the SharkByte family wallet.

This is the graph from the Swarms sponsor slides: two agents start
together, an analyst weighs them, and a judge writes the only sentence
the app may show before a person confirms.

The swarm does not sign, send, or hold USDC. It also does not decide
the questions still open in TEAM_PROMPTS.md: corridor, custody,
recovery, provider, or the one demo differentiator.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

BASE = "https://api.swarms.world"
MODEL = "gpt-5.4-mini"

SAMPLE_CASE = {
    "sender_role": "relative in Miami",
    "recipient_role": "family member",
    "relationship_verified": False,
    "amount_usdc": "80",
    "requested_usdc": "200",
    "other_contributions_usdc": "120",
    "keep_usdc": "unknown",
    "withdraw_local": "unknown",
    "expense_note": "school expenses",
    "corridor": "unset",
    "custody": "unset",
    "fiat_leg": "simulated",
    "provider": "unset",
}


def agent(name: str, prompt: str, max_tokens: int = 700) -> dict:
    return {
        "agent_name": name,
        "model_name": MODEL,
        "system_prompt": prompt,
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }


def build_graph(case: dict) -> dict:
    """Return the POST body for /v1/graph-workflow/completions."""
    return {
        "name": "Family transfer review",
        "description": (
            "Plain-language explanation and a mistake check, then a verdict "
            "a person can confirm before any Solana signature."
        ),
        "task": build_task(case),
        "max_loops": 1,
        "agents": [
            agent(
                "PlainSpeaker",
                """You explain one family transfer in everyday language, in English and in Spanish.
No crypto jargon. If you mention Solana, also say what the person is doing with the money.
Do not invent fees, exchange rates, or delivery times.
Do not treat Mexico, Cuba, or Paraguay as a chosen corridor. Mexico is only a recommendation.
If the fiat leg is simulated, say the local payout is a labeled simulation.
Do not say the money is insured, hack-proof, instant everywhere, or protected from inflation.
Do not repeat phone numbers, account numbers, or government IDs if they appear.""",
            ),
            agent(
                "Skeptic",
                """You review one family transfer for only these threats: a mistaken amount, paying the wrong person, or stolen personal information used to impersonate a relative.
Name the threat the facts support, the control that would stop it, and the limit of that control.
A warning that exists only in the app is not a security boundary. Say that when it applies.
Do not use bank incidents in France or Paraguay as proof this app is safer.
Do not describe USDC as an insured bank deposit.
If the facts are too thin to judge, say what a person must confirm before anyone signs.
Do not repeat phone numbers, account numbers, or government IDs.""",
            ),
            agent(
                "Analyst",
                """You weigh the plain-language explanation and the skeptic review.
Keep three statuses separate: Solana confirmed, provider accepted, and fiat paid out. This review has confirmed none of them.
Leave these as unset when the task says they are unset: destination country, custody, recovery, provider, and the one demo differentiator.
Do not claim a Cuba payout route. A residency list is not a local-currency payout.
If the fiat leg is not a live sandbox call, label it simulated.
Names, phone numbers, and expense notes stay off the public chain. Say that if someone proposes writing them on-chain.
Payment amounts and wallet activity are not private.""",
                max_tokens=900,
            ),
            agent(
                "Judge",
                """You write the only text the app may show before a person confirms a transfer.
Return one JSON object and no other text. Keys:
decision: "confirm", "hold", or "stop"
sentence: one plain English sentence a beginner can read
sentence_es: the same sentence in Spanish
threat: the specific threat, or "none shown"
control: what would have to stop it
limit: what that control does not stop
simulated: array of steps that are simulated or not yet confirmed
off_chain: array of fields that must not be written on Solana
Use "confirm" only when the amount, the recipient relationship, and the fiat label are specific enough for a person to check them.
"confirm" means the person may review and sign. You do not sign, send, or approve movement of funds.""",
                max_tokens=900,
            ),
        ],
        "edges": [
            {"source": "PlainSpeaker", "target": "Analyst"},
            {"source": "Skeptic", "target": "Analyst"},
            {"source": "Analyst", "target": "Judge"},
        ],
        "entry_points": ["PlainSpeaker", "Skeptic"],
        "end_points": ["Judge"],
    }


def build_task(case: dict) -> str:
    lines = [
        "Review this family transfer. The team has not locked the open decisions.",
        "Facts:",
    ]
    for key, value in case.items():
        lines.append(f"- {key}: {value}")
    lines.append(
        "Shared-request shape, if the numbers are present: a recipient asked "
        "relatives to fund one expense, this sender is paying one part, and "
        "the recipient may later keep some digital dollars and withdraw the rest."
    )
    lines.append(
        "Do not add a corridor, a custody model, a provider, or a second feature."
    )
    return "\n".join(lines)


def post_graph(body: dict, api_key: str) -> dict:
    request = urllib.request.Request(
        f"{BASE}/v1/graph-workflow/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Swarms API returned {error.code}: {detail}") from error


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the family transfer review swarm.")
    parser.add_argument(
        "--case",
        help="Path to a JSON object of transfer facts. Defaults to the sample case.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the graph body and do not call the API.",
    )
    args = parser.parse_args()

    case = SAMPLE_CASE
    if args.case:
        with open(args.case, encoding="utf-8") as handle:
            case = json.load(handle)

    body = build_graph(case)
    if args.dry_run:
        json.dump(body, sys.stdout, indent=2)
        sys.stdout.write("\n")
        return

    api_key = os.environ.get("SWARMS_API_KEY", "").strip()
    if not api_key:
        raise SystemExit(
            "Set SWARMS_API_KEY, or pass --dry-run to print the request. "
            "Create a key at https://cloud.swarms.world/api-keys"
        )

    result = post_graph(body, api_key)
    outputs = result.get("outputs") or {}
    for name in ("PlainSpeaker", "Skeptic", "Analyst", "Judge"):
        text = outputs.get(name, "")
        print(f"\n## {name}\n")
        print(text if not str(text).startswith("[ERROR]") else text)
    usage = result.get("usage") or result.get("cost")
    if usage:
        print("\n## usage\n")
        print(json.dumps(usage, indent=2))


if __name__ == "__main__":
    main()
