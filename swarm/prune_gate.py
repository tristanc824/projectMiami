"""Prune gate for the SharkByte family wallet.

Prune is a managed proxy in front of the model. It checks spend caps and
other Shield rules before the provider is called, and it signs a receipt
over the call's cost and cache metadata. It does not sit on the Solana
path. It cannot unsend, delay, or reverse a USDC transfer, and nothing in
this file signs or submits a transaction.

Two calls, both through Prune:

1. clean_request(raw_note) first blocks credential-shaped text and phone or
   account numbers locally, before any network call (the phone matches
   contacts on its own, so the words never need a number; the app replaces
   the matched contact's name with "recipient"), then turns a relative's free-text note into
   four fields: amount, relationship, purpose, fiat_leg. It stops with
   "blocked-in" if the call fails, Prune's metadata is missing, or the
   model's reply still holds a secret, phone, or account number.
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
import unicodedata
import urllib.error
import urllib.request
import uuid

# Prune's Gemini proxy. PRUNE_URL and PRUNE_MODEL override these without a code change.
URL = os.environ.get("PRUNE_URL", "https://api.withprune.com/v1/proxy/gemini/generateContent")
MODEL = os.environ.get("PRUNE_MODEL", "gemini-3.5-flash-lite")
RUN_BUDGET_USD = "0.05"
FIELDS = ("amount", "relationship", "purpose", "fiat_leg")

# Seven or more digits, allowing spaces, dashes, dots, and parentheses
# between them: phone numbers, bank accounts, CLABE. Commas are not
# separators, so "1,000" is not caught. A bare amount of seven or more
# digits is, and the gate fails closed on it.
DIGIT_RUN = re.compile(r"(?<!\d)\+?\d(?:[\s\-.()]*\d){6,}(?!\d)")
IBAN_LIKE = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")

# Secrets are stopped locally, before Prune or any model receives the text. These
# patterns intentionally require either a strong key shape or an explicit label;
# merely discussing "seed phrase safety" must not block an ordinary request.
PEM_PRIVATE_KEY = re.compile(r"-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----", re.IGNORECASE)
API_CREDENTIAL = re.compile(
    r"\b(?:sk_(?:live|test)_[A-Za-z0-9]{16,}|sk-[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b"
)
SEED_LABEL = re.compile(
    r"\b(?:seed|recovery|mnemonic|secret)\s+phrase\s*(?::|is|=)\s*",
    re.IGNORECASE,
)
PRIVATE_KEY_LABEL = re.compile(
    r"\b(?:private|secret)\s+key\s*(?::|is|=)\s*",
    re.IGNORECASE,
)
BASE58_SECRET = re.compile(r"[1-9A-HJ-NP-Za-km-z]{64,128}")
HEX_SECRET = re.compile(r"(?:0x)?[0-9a-fA-F]{64,128}")
JSON_SECRET = re.compile(r"\[(?:\s*\d{1,3}\s*,){31,}\s*\d{1,3}\s*\]")


def sensitive_secret_reason(value: object) -> str | None:
    """Classify credential-shaped text without returning or logging the credential."""
    if not isinstance(value, str):
        return "invalid secret input"
    text = unicodedata.normalize("NFKC", value)
    if PEM_PRIVATE_KEY.search(text):
        return "private key block"
    if API_CREDENTIAL.search(text):
        return "API credential"
    if JSON_SECRET.search(text):
        return "private key byte array"
    private = PRIVATE_KEY_LABEL.search(text)
    if private:
        tail = text[private.end():private.end() + 300]
        if BASE58_SECRET.search(tail) or HEX_SECRET.search(tail) or JSON_SECRET.search(tail):
            return "private key"
    seed = SEED_LABEL.search(text)
    if seed:
        # A real recovery phrase normally has 12-24 words. Eight is a deliberate
        # fail-closed floor that also catches a transcript truncated by speech-to-text.
        tail = text[seed.end():seed.end() + 300]
        words = re.findall(r"[^\W\d_]+", tail, flags=re.UNICODE)
        if len(words) >= 8:
            return "seed or recovery phrase"
    return None


def refuse_sensitive_secret(value: object, reason: str) -> None:
    found = sensitive_secret_reason(value)
    if found:
        raise GateStop(reason, f"{found} detected locally; nothing was sent to Prune")


# Money and dates look like long digit runs too: "$10000.00", "100000.50 dollars", "2026-11-08".
MONEY_WITH_CENTS = re.compile(r"\d{1,6}\.\d{1,2}")
ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def personal_number_reason(value: object) -> str | None:
    """A phone or account number in what the person said, found locally before any AI call.

    The phone resolves who the money is for against its own contacts, so the words never need a
    number. Seven or more digits (spaces, dashes, dots and brackets between them allowed), or an
    IBAN shape, count; a run right after "$", an amount with cents and an ISO date do not.
    Fullwidth and other compatibility digits are folded first, and \\d also matches Arabic-Indic,
    Devanagari and other digits, so a number cannot hide in another script."""
    if not isinstance(value, str):
        return None
    text = unicodedata.normalize("NFKC", value)
    for match in DIGIT_RUN.finditer(text):
        run = match.group().strip()
        if match.start() and text[match.start() - 1] == "$":
            continue
        if MONEY_WITH_CENTS.fullmatch(run) or ISO_DATE.fullmatch(run):
            continue
        return "phone or account number"
    if IBAN_LIKE.search(text.upper()):
        return "bank account number"
    return None


def refuse_personal_number(value: object, reason: str) -> None:
    found = personal_number_reason(value)
    if found:
        raise GateStop(reason, f"{found} detected locally; nothing was sent to Prune")

CLEAN_PROMPT = """You turn one family money request into JSON. Return one JSON object and no other text, with exactly these string keys:
amount: normalize an amount spoken in words or digits to digits plus its stated currency (for example "two hundred fifty dollars" becomes "250 USD"); use "unknown" when missing or ambiguous
relationship: how the requester is related to the sender, as a role such as "niece" or "aunt", never a name, or "unknown"
purpose: a short general category such as "school expenses" or "medicine", with no names, places, or account details, or "unknown"
fiat_leg: always "simulated"
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


def _post(feature_id: str, body: dict, run_id: str | None = None) -> dict:
    """POST one chat completion through Prune. Raises on any HTTP failure.

    Prune requires X-Prune-Run-Id with a run budget. Pass the same run_id to
    calls that belong to one review so they share the budget."""
    api_key = os.environ.get("PRUNE_API_KEY", "").strip()
    if not api_key:
        raise ValueError("PRUNE_API_KEY is not set")
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "X-Prune-Key": api_key,
            "Content-Type": "application/json",
            "User-Agent": "projectmiami-prune-gate/0.1",
            "X-Prune-Feature-Id": feature_id,
            "X-Prune-Run-Budget-Usd": RUN_BUDGET_USD,
            "X-Prune-Run-Id": run_id or f"family-review-{uuid.uuid4()}",
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
        code = None
        try:
            body = json.loads(error.read().decode("utf-8", errors="replace"))
            code = body.get("code") if isinstance(body, dict) else None
        except (ValueError, OSError):
            pass
        detail = f"HTTP {error.code}"
        if shield:
            detail += f" shield={shield}"
        if isinstance(code, str) and code != shield:
            detail += f" code={code[:60]}"
        return detail
    return type(error).__name__


def _reply_text(result: dict) -> str:
    """The model's text from a Gemini-style reply (candidates) or an OpenAI-style one (choices)."""
    candidates = result.get("candidates")
    if isinstance(candidates, list) and candidates:
        parts = (candidates[0].get("content") or {}).get("parts") if isinstance(candidates[0], dict) else None
        if isinstance(parts, list):
            texts = [part["text"] for part in parts if isinstance(part, dict) and isinstance(part.get("text"), str)]
            if texts:
                return "".join(texts)
    return result["choices"][0]["message"]["content"] or ""


FENCE = re.compile(r"^\s*```(?:json)?\s*(.*?)\s*```\s*$", re.DOTALL)


def clean_request(raw_note: str, run_id: str | None = None) -> dict:
    """Return {amount, relationship, purpose, fiat_leg} or raise GateStop("blocked-in")."""
    refuse_sensitive_secret(raw_note, "blocked-in")
    refuse_personal_number(raw_note, "blocked-in")
    try:
        result = _post("family-request", _clean_body(raw_note), run_id)
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise GateStop("blocked-in", _http_detail(error)) from None

    if not isinstance(result, dict) or not isinstance(result.get("prune_metadata"), dict):
        raise GateStop("blocked-in", "response has no prune_metadata")

    try:
        text = _reply_text(result)
    except (KeyError, IndexError, TypeError, AttributeError):
        raise GateStop("blocked-in", "response has no message content") from None
    fenced = FENCE.match(text)
    if fenced:
        text = fenced.group(1)  # Gemini often wraps JSON in a ```json fence

    refuse_sensitive_secret(text, "blocked-in")
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
    # The requester's note cannot switch on a real payout ("the payout is not
    # live" contains the word live too). No provider is wired up, so the
    # payout is always the labeled simulation.
    fields["fiat_leg"] = "simulated"
    return fields


def seal_sentence(sentence: str, run_id: str | None = None) -> dict:
    """Return {sentence, receipt} or raise GateStop("no-receipt")."""
    refuse_sensitive_secret(sentence, "no-receipt")
    refuse_personal_number(sentence, "no-receipt")
    try:
        result = _post("family-council", _seal_body(sentence), run_id)
    except (urllib.error.URLError, OSError, ValueError) as error:
        raise GateStop("no-receipt", _http_detail(error)) from None

    receipt = result.get("prune_metadata") if isinstance(result, dict) else None
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
            print("X-Prune-Run-Id: family-review-<new id per run>")
            print("X-Prune-Key: <PRUNE_API_KEY, not shown>")
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
