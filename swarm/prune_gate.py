"""Prune gate for the SharkByte family wallet.

Prune is a managed proxy in front of the model. It checks spend caps and
other Shield rules before the provider is called, and it signs a receipt
over the call's cost and cache metadata. It does not sit on the Solana
path. It cannot unsend, delay, or reverse a USDC transfer, and nothing in
this file signs or submits a transaction.

Two calls, both through Prune:

1. clean_request(raw_note) turns a relative's free-text note into four
   fields: amount, relationship, purpose, fiat_leg. It stops with
   "blocked-in" if the call fails, Prune's metadata is missing, or the
   model's reply still holds a phone or account number.
2. seal_sentence(sentence) sends one sentence and returns it with Prune's
   receipt. It stops with "no-receipt" if receipt_signature is missing.

None of these fields belong on-chain. relationship and purpose are
personal context and stay off Solana. The provider key lives in the Prune
vault. Only PRUNE_API_KEY is read here, and it is never printed.

This gate does not choose a corridor, custody model, recovery path, or
provider, and it does not produce fees, exchange rates, or delivery dates.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

URL = "https://api.withprune.com/v1/chat/completions"
MODEL = "gpt-4o-mini"
RUN_BUDGET_USD = "0.05"
FIELDS = ("amount", "relationship", "purpose", "fiat_leg")

# Seven or more digits, allowing spaces, dashes, dots, and parentheses
# between them: phone numbers, bank accounts, CLABE. Commas are not
# separators, so "1,000" is not caught. A bare amount of seven or more
# digits is, and the gate fails closed on it.
DIGIT_RUN = re.compile(r"(?<!\d)\+?\d(?:[\s\-.()]*\d){6,}(?!\d)")
IBAN_LIKE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")

CLEAN_PROMPT = """You turn one family money request into JSON. Return one JSON object and no other text, with exactly these string keys:
amount: the amount and currency exactly as written in the note, or "unknown"
relationship: how the requester is related to the sender, as a role such as "niece" or "aunt", never a name, or "unknown"
purpose: a short general category such as "school expenses" or "medicine", with no names, places, or account details, or "unknown"
fiat_leg: "live" only if the note says the local payout is live, otherwise "simulated"
Do not include names, phone numbers, account numbers, addresses, or IDs.
Do not add fees, exchange rates, delivery dates, a country, a provider, or a custody choice."""

SAMPLE_NOTE = (
    "Hola, it's Tia Rosa, call me at 305-555-0142. My niece needs 80 USDC "
    "for school supplies this month. Bank acct 0123456789."
)
SAMPLE_SENTENCE = (
    "You are about to send 80 USDC to a family member for school expenses, "
    "and the local payout is a labeled simulation."
)


class GateStop(Exception):
    """Raised when the gate refuses to return a result."""

    def __init__(self, reason: str, detail: str) -> None:
        super().__init__(f"{reason}: {detail}")
        self.reason = reason
        self.detail = detail


def _clean_body(raw_note: str) -> dict:
    return {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": CLEAN_PROMPT},
            {"role": "user", "content": raw_note},
        ],
        "temperature": 0,
        "response_format": {"type": "json_object"},
    }


def _seal_body(sentence: str) -> dict:
    return {
        "model": MODEL,
        "messages": [{"role": "user", "content": sentence}],
        "max_tokens": 1,
    }


def _post(feature_id: str, body: dict) -> dict:
    """POST one chat completion through Prune. Raises on any HTTP failure."""
    api_key = os.environ.get("PRUNE_API_KEY", "").strip()
    if not api_key:
        raise ValueError("PRUNE_API_KEY is not set")
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "projectmiami-prune-gate/0.1",
            "X-Prune-Feature-Id": feature_id,
            "X-Prune-Run-Budget-Usd": RUN_BUDGET_USD,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def _http_detail(error: Exception) -> str:
    if isinstance(error, ValueError) and "PRUNE_API_KEY" in str(error):
        return "PRUNE_API_KEY is not set"
    if isinstance(error, urllib.error.HTTPError):
        shield = error.headers.get("X-Prune-Shield-Code") if error.headers else None
        return f"HTTP {error.code}" + (f" shield={shield}" if shield else "")
    return type(error).__name__


def clean_request(raw_note: str) -> dict:
    """Return {amount, relationship, purpose, fiat_leg} or raise GateStop("blocked-in")."""
    try:
        result = _post("family-request", _clean_body(raw_note))
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise GateStop("blocked-in", _http_detail(error)) from None

    if not isinstance(result.get("prune_metadata"), dict):
        raise GateStop("blocked-in", "response has no prune_metadata")

    try:
        text = result["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        raise GateStop("blocked-in", "response has no message content") from None

    if DIGIT_RUN.search(text) or IBAN_LIKE.search(text):
        raise GateStop("blocked-in", "cleaned text still holds a phone or account number")

    try:
        parsed = json.loads(text)
    except ValueError:
        raise GateStop("blocked-in", "cleaned text is not JSON") from None
    if not isinstance(parsed, dict) or not all(
        isinstance(parsed.get(key), str) for key in FIELDS
    ):
        raise GateStop("blocked-in", "cleaned JSON is missing a field")

    fields = {key: parsed[key].strip() for key in FIELDS}
    note_says_live = re.search(r"\blive\b", raw_note, re.IGNORECASE)
    if not (fields["fiat_leg"].lower() == "live" and note_says_live):
        fields["fiat_leg"] = "simulated"
    return fields


def seal_sentence(sentence: str) -> dict:
    """Return {sentence, receipt} or raise GateStop("no-receipt")."""
    try:
        result = _post("family-council", _seal_body(sentence))
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise GateStop("no-receipt", _http_detail(error)) from None

    receipt = result.get("prune_metadata")
    if not isinstance(receipt, dict) or not receipt.get("receipt_signature"):
        raise GateStop("no-receipt", "prune_metadata.receipt_signature is missing")
    return {"sentence": sentence, "receipt": receipt}


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the two Prune gate calls.")
    parser.add_argument("--note", default=SAMPLE_NOTE, help="Raw family request note.")
    parser.add_argument("--sentence", default=SAMPLE_SENTENCE, help="Sentence to seal.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print both request bodies and make no network call.",
    )
    args = parser.parse_args()

    if args.dry_run:
        for feature_id, body in (
            ("family-request", _clean_body(args.note)),
            ("family-council", _seal_body(args.sentence)),
        ):
            print(f"## POST {URL}")
            print(f"X-Prune-Feature-Id: {feature_id}")
            print(f"X-Prune-Run-Budget-Usd: {RUN_BUDGET_USD}")
            print("Authorization: Bearer <PRUNE_API_KEY, not shown>")
            print(json.dumps(body, indent=2))
            print()
        return 0

    if not os.environ.get("PRUNE_API_KEY", "").strip():
        raise SystemExit("Set PRUNE_API_KEY, or pass --dry-run to print the requests.")

    stopped = False

    print("## family-request")
    try:
        print(json.dumps(clean_request(args.note), indent=2))
    except GateStop as stop:
        stopped = True
        print(f"{stop.reason} ({stop.detail})")

    print("\n## family-council")
    try:
        sealed = seal_sentence(args.sentence)
        print(sealed["sentence"])
        print(f"receipt_signature: {sealed['receipt']['receipt_signature']}")
        print(json.dumps(sealed["receipt"], indent=2))
    except GateStop as stop:
        stopped = True
        print(f"{stop.reason} ({stop.detail})")

    return 1 if stopped else 0


if __name__ == "__main__":
    sys.exit(main())
