"""Pre-send review for the SharkByte family wallet.

Three agents run in sequence: a plain-language explanation, a narrow mistake
check, and a verdict for a person to review. The swarm never signs, sends, or
holds USDC, and it does not settle the product decisions that remain open.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any

BASE = "https://api.swarms.world"
MODEL = "gpt-5.4-mini"
MIN_RUN_CREDITS = 1.0
AGENT_NAMES = ("PlainSpeaker", "Skeptic", "Judge")
VERDICT_KEYS = {"decision", "sentence", "sentence_es", "threat", "limit"}

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
    "output_language": "Spanish (Latin America)",
}


def agent(name: str, prompt: str, max_tokens: int = 700) -> dict[str, Any]:
    return {
        "agent_name": name,
        "model_name": MODEL,
        "system_prompt": prompt,
        "max_loops": 1,
        "max_tokens": max_tokens,
        "temperature": 0.2,
    }


def build_swarm(case: dict[str, Any]) -> dict[str, Any]:
    """Return the POST body for /v1/swarm/completions."""
    return {
        "name": "Family transfer review",
        "description": (
            "Plain-language explanation, a narrow mistake check, and a verdict "
            "a person may review before any signature."
        ),
        "swarm_type": "SequentialWorkflow",
        "max_loops": 1,
        "task": build_task(case),
        "agents": [
            agent(
                "PlainSpeaker",
                """Explain the proposed family transfer in exactly two sentences: first one plain English sentence, then one sentence in the output language named in the task.
Use everyday language and no crypto jargon, including no blockchain or token terminology.
Do not invent fees, exchange rates, or delivery times.
If the task says the fiat leg is simulated, each sentence must say the local payout is a labeled simulation.
Do not claim Cuba support, hack-proof funds, deposit insurance, or that a confirmed transfer can be undone.
Carry the amount and whether the family relationship is verified into both sentences so the next reviewer can check them.
Translate naturally and do not mix languages unless a proper noun requires it.""",
            ),
            agent(
                "Skeptic",
                """Review only for a wrong amount, the wrong person, or someone pretending to be a relative.
State which of those checks the supplied facts support, and name what that check cannot stop.
A warning that exists only in the app is not a security boundary; say so if the proposed check is only a warning.
Do not introduce any other threat, feature, fee, exchange rate, delivery time, corridor, provider, custody model, or recovery model.
Pass the checked amount, relationship status, threat, and limit forward clearly for the Judge.""",
            ),
            agent(
                "Judge",
                """Return only one valid JSON object with exactly these string fields: decision, sentence, sentence_es, threat, limit.
decision must be "confirm", "hold", or "stop".
sentence must be one plain English sentence. sentence_es is a legacy field name: put the same sentence in the output language named in the task, even when that language is not Spanish.
Base the decision only on a wrong amount, the wrong person, or someone pretending to be a relative.
Name what the check cannot stop in limit. A warning that exists only in the app is not a security boundary.
"confirm" means only that a person may review it; you do not sign, send, or approve USDC.
Do not claim Cuba support, hack-proof funds, deposit insurance, or that a confirmed Solana transfer can be undone.
Do not add markdown fences or any text outside the JSON object.""",
                max_tokens=900,
            ),
        ],
    }


def _amount(value: Any) -> str:
    """Keep only non-negative numeric transfer facts out of a case file."""
    if isinstance(value, bool):
        return "unknown"
    text = str(value).strip()
    return text if re.fullmatch(r"\d+(?:\.\d+)?", text) else "unknown"


def _language(value: Any) -> str:
    if not isinstance(value, str):
        return "Spanish (Latin America)"
    text = value.strip()
    if re.fullmatch(r"[A-Za-z][A-Za-z ()-]{1,48}", text):
        return text
    return "Spanish (Latin America)"


def _safe_label(value: Any) -> str:
    """A short role or purpose. Digits are rejected so a phone number cannot sneak in."""
    text = " ".join(str(value or "").split())
    if not re.fullmatch(r"[A-Za-z][A-Za-z ]{0,47}", text):
        return ""
    return text


def build_task(case: dict[str, Any]) -> str:
    relationship = case.get("relationship_verified")
    relationship_text = (
        "yes" if relationship is True else "no" if relationship is False else "unknown"
    )
    fiat_leg = (
        "simulated" if str(case.get("fiat_leg", "")).lower() == "simulated" else "not confirmed"
    )
    return "\n".join(
        [
            "Review one proposed family transfer before a person decides whether to sign it.",
            "Safe facts supplied for this review:",
            f"- proposed amount in digital dollars: {_amount(case.get('amount_usdc'))}",
            f"- total requested in digital dollars: {_amount(case.get('requested_usdc'))}",
            "- other contributions in digital dollars: "
            f"{_amount(case.get('other_contributions_usdc'))}",
            f"- family relationship verified: {relationship_text}",
            f"- relationship role: {_safe_label(case.get('relationship')) or 'unknown'}",
            f"- purpose: {_safe_label(case.get('purpose')) or 'unknown'}",
            f"- fiat leg: {fiat_leg}",
            f"- output language: {_language(case.get('output_language'))}",
            "- corridor: unset",
            "- custody: unset",
            "- recovery: unset",
            "- provider: unset",
            "Mexico is a recommendation, not a decision. Do not choose a corridor.",
            "The swarm does not sign or send funds. A person makes the final decision.",
        ]
    )


def request_json(url: str, api_key: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {"x-api-key": api_key, "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        url,
        data=data,
        headers=headers,
        method="GET" if data is None else "POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Swarms API returned {error.code}: {detail}") from error
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        raise SystemExit(f"Swarms API request failed: {error}") from error


def ensure_budget(api_key: str) -> None:
    credits = request_json(f"{BASE}/v1/account/credits", api_key)
    try:
        balance = float(credits["total_credits"])
    except (KeyError, TypeError, ValueError) as error:
        raise SystemExit("budget") from error
    if balance < MIN_RUN_CREDITS:
        raise SystemExit("budget")


def post_swarm(body: dict[str, Any], api_key: str) -> dict[str, Any]:
    ensure_budget(api_key)
    return request_json(f"{BASE}/v1/swarm/completions", api_key, body)


def extract_outputs(result: dict[str, Any]) -> dict[str, str]:
    turns = result.get("output")
    if not isinstance(turns, list) or len(turns) < len(AGENT_NAMES):
        return {}
    outputs: dict[str, str] = {}
    for name, turn in zip(AGENT_NAMES, turns):
        if not isinstance(turn, dict) or "content" not in turn:
            return {}
        content = turn["content"]
        outputs[name] = content if isinstance(content, str) else json.dumps(content)
    return outputs


def valid_verdict(text: str) -> bool:
    try:
        verdict = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return False
    if not isinstance(verdict, dict) or set(verdict) != VERDICT_KEYS:
        return False
    if verdict.get("decision") not in {"confirm", "hold", "stop"}:
        return False
    return all(isinstance(verdict[key], str) and verdict[key].strip() for key in VERDICT_KEYS)


def credit_cost(result: dict[str, Any]) -> float | None:
    usage = result.get("usage")
    if not isinstance(usage, dict):
        return None
    billing = usage.get("billing_info")
    candidates = [
        billing.get("total_cost") if isinstance(billing, dict) else None,
        usage.get("total_cost"),
    ]
    for value in candidates:
        try:
            return float(value)
        except (TypeError, ValueError):
            pass
    return None


def print_result(outputs: dict[str, str], total_cost: float | None) -> None:
    for name in AGENT_NAMES:
        print(f"\n## {name}\n")
        print(outputs[name])
    print("\n## credit cost\n")
    print("unavailable" if total_cost is None else f"{total_cost:.6f}".rstrip("0").rstrip("."))


def run_review(case: dict[str, Any], api_key: str) -> dict[str, Any]:
    """Run the swarm, retrying once only when the Judge verdict is invalid."""
    body = build_swarm(case)
    total_cost = 0.0
    has_cost = True
    for attempt in range(2):
        result = post_swarm(body, api_key)
        outputs = extract_outputs(result)
        run_cost = credit_cost(result)
        if run_cost is None:
            has_cost = False
        else:
            total_cost += run_cost
        if outputs and valid_verdict(outputs["Judge"]):
            return {
                "outputs": outputs,
                "verdict": json.loads(outputs["Judge"]),
                "credit_cost": total_cost if has_cost else None,
                "attempts": attempt + 1,
            }
    raise SystemExit("bad-verdict")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the family transfer review swarm.")
    parser.add_argument(
        "--case",
        help="Path to a JSON object of transfer facts. Defaults to the sample case.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the swarm body and do not call the API.",
    )
    args = parser.parse_args()

    case = SAMPLE_CASE
    if args.case:
        with open(args.case, encoding="utf-8") as handle:
            case = json.load(handle)

    body = build_swarm(case)
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

    review = run_review(case, api_key)
    print_result(review["outputs"], review["credit_cost"])


if __name__ == "__main__":
    main()
