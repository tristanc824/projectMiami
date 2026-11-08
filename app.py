"""JSON API for the Project Miami family transfer review. It has no UI.

An app sends a transcript (typed or from speech) and the facts it has. This
server keeps only a small allowlist of transfer facts, runs the Watchdog's
local typo and tamper checks, and sends those facts through the
PlainSpeaker -> Skeptic -> Watchdog -> Judge Swarms review. Prune is the only
model call that reads the raw transcript, and it stamps a confirm. It never
signs or sends funds. See FAMILY_REVIEW.md for the contract.
"""

from __future__ import annotations

import argparse
import hmac
import json
import os
import re
import sys
import threading
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import urlparse

from swarm import family_review
from swarm.prune_gate import GateStop, clean_request, seal_sentence

MAX_BODY_BYTES = 32_000
MAX_TRANSCRIPT_CHARS = 2_000
DEFAULT_LOCALE = "es-US"

LANGUAGES = {
    "en-US": "English",
    "es-US": "Spanish (Latin America)",
    "pt-BR": "Portuguese (Brazil)",
    "fr-FR": "French",
    "ht-HT": "Haitian Creole",
    "nl-SR": "Dutch (Suriname)",
    "gn-PY": "Guarani",
    "qu-PE": "Quechua",
    "ay-BO": "Aymara",
    "ar-SA": "Arabic",
    "fa-IR": "Persian",
    "fa-AF": "Dari",
    "ps-AF": "Pashto",
    "tr-TR": "Turkish",
    "sw-KE": "Swahili",
    "am-ET": "Amharic",
    "om-ET": "Oromo",
    "ti-ET": "Tigrinya",
    "ha-NG": "Hausa",
    "yo-NG": "Yoruba",
    "ig-NG": "Igbo",
    "so-SO": "Somali",
    "rw-RW": "Kinyarwanda",
    "zu-ZA": "Zulu",
    "xh-ZA": "Xhosa",
    "hi-IN": "Hindi",
    "bn-BD": "Bengali",
    "ur-PK": "Urdu",
    "pa-IN": "Punjabi",
    "gu-IN": "Gujarati",
    "mr-IN": "Marathi",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "ne-NP": "Nepali",
    "si-LK": "Sinhala",
    "id-ID": "Indonesian",
    "ms-MY": "Malay",
    "fil-PH": "Filipino",
    "vi-VN": "Vietnamese",
    "th-TH": "Thai",
    "km-KH": "Khmer",
    "lo-LA": "Lao",
    "my-MM": "Burmese",
    "uz-UZ": "Uzbek",
    "zh-CN": "Mandarin Chinese",
}

SAFE_CASE_DEFAULTS: dict[str, Any] = {
    "relationship_verified": False,
    "amount_usdc": "80",
    "requested_usdc": "200",
    "other_contributions_usdc": "120",
    "fiat_leg": "simulated",
    "output_locale": DEFAULT_LOCALE,
    "output_language": LANGUAGES[DEFAULT_LOCALE],
}

LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "[::1]", "::1"}

PHONE_LIKE = re.compile(r"(?<!\d)\+?\d(?:[\s\-.()]*\d){6,}(?!\d)")

# A whole number token: "1,000" or "80.50". The lookahead refuses a prefix, so
# "80.999" or "80.5.2" is not read as a smaller amount.
MONEY = r"(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)(?![\d.,]*\d)"

AMOUNT_PATTERNS = {
    "requested_usdc": re.compile(
        rf"\b(?:request(?:ed)? total|total request)\s+(?:is\s+|to\s+)?\$?{MONEY}",
        re.IGNORECASE,
    ),
    "other_contributions_usdc": re.compile(
        rf"\b(?:other contributions?|already contributed)\s+(?:are\s+|is\s+)?\$?{MONEY}",
        re.IGNORECASE,
    ),
    "amount_usdc": re.compile(
        rf"\b(?:(?:send|transfer|contribute|pay|amount(?:\s+is|\s+to)?|sending|enviar|envía|transferir|transfiere|pagar|paga)\s+\$?{MONEY}|(?:prepare|make|prepara|preparar)\s+(?:an?\s+|una?\s+)?(?:transfer(?:encia)?\s+(?:of|de)\s+)?\$?{MONEY})",
        re.IGNORECASE,
    ),
}

RELATIONSHIP_WORDS = r"relationship|relative|recipient|person|relación|familiar|destinatario|persona"
SELF_CORRECTION = re.compile(
    r"\b(?:actually|i mean|wait|sorry|oops|make (?:it|that)|scratch that|en realidad|mejor dicho|perdón|digo)\b",
    re.IGNORECASE,
)
PRESSURE = re.compile(
    r"\b(?:urgent(?:ly)?|right now|immediately|asap|hurry|don'?t tell|keep (?:it|this) (?:a )?secret|between us|"
    r"gift ?cards?|bitcoin|crypto|new (?:phone )?number|different account|new account|"
    r"urgente|ahora mismo|de inmediato|no le digas|en secreto|tarjetas? de regalo|n[uú]mero nuevo|otra cuenta)\b",
    re.IGNORECASE,
)

# The last case this server reviewed. The Watchdog compares each new request with it,
# so an amount or relationship that changes between reviews is noticed. A tab cannot
# hide a change by editing what it sends: the memory lives here, not in the browser.
_last_reviewed: dict[str, Any] | None = None
_last_lock = threading.Lock()


def remember(case: dict[str, Any] | None) -> None:
    global _last_reviewed
    with _last_lock:
        _last_reviewed = None if case is None else {
            "amount_usdc": case.get("amount_usdc"),
            "relationship_verified": case.get("relationship_verified"),
        }


def last_reviewed() -> dict[str, Any] | None:
    with _last_lock:
        return None if _last_reviewed is None else dict(_last_reviewed)

NEGATION = re.compile(
    r"\b(?:not|never|no|isn'?t|unverified|unknown|unconfirmed|nunca|sin|todavía no|aún no)\b",
    re.IGNORECASE,
)


def _safe_amount(value: Any) -> str | None:
    if isinstance(value, bool):
        return None
    text = str(value).strip().replace(",", "")
    if not re.fullmatch(r"\d+(?:\.\d{1,2})?", text):
        return None
    amount = float(text)
    if amount < 0 or amount > 100_000:
        return None
    return text


def safe_case(source: Any) -> dict[str, Any]:
    """Copy only facts that the Swarms task is allowed to receive."""
    result = dict(SAFE_CASE_DEFAULTS)
    if not isinstance(source, dict):
        return result
    for field in ("amount_usdc", "requested_usdc", "other_contributions_usdc"):
        amount = _safe_amount(source.get(field))
        if amount is not None:
            result[field] = amount
    relationship = source.get("relationship_verified")
    if relationship is True or relationship is False:
        result["relationship_verified"] = relationship
    locale = source.get("output_locale")
    if locale in LANGUAGES:
        result["output_locale"] = locale
        result["output_language"] = LANGUAGES[locale]
    # No provider is selected, so the local payout remains explicitly simulated.
    result["fiat_leg"] = "simulated"
    return result


def spoken_amounts(transcript: str) -> list[str]:
    """The distinct amounts to send that the words themselves state, as safe amount strings."""
    found: list[str] = []
    for match in AMOUNT_PATTERNS["amount_usdc"].finditer(PHONE_LIKE.sub(" ", transcript.strip())):
        captured = next((group for group in match.groups() if group is not None), None)
        amount = _safe_amount(captured)
        if amount is not None and all(float(amount) != float(seen) for seen in found):
            found.append(amount)
    return found


def transcript_notes(transcript: str) -> dict[str, Any]:
    """What the words themselves show: distinct amounts to send, a stated verification, corrections, pressure."""
    text = transcript.strip()
    number_text = PHONE_LIKE.sub(" ", text)
    amounts = set()
    for match in AMOUNT_PATTERNS["amount_usdc"].finditer(number_text):
        captured = next((group for group in match.groups() if group is not None), None)
        amount = _safe_amount(captured)
        if amount is not None:
            amounts.add(float(amount))
    stated = False
    for sentence in re.split(r"[.!?;\n]+", text):
        if re.search(
            rf"\b(?:{RELATIONSHIP_WORDS})\b.{{0,40}}?(?:\bverified\b|\bverificad[oa]\b)", sentence, re.IGNORECASE
        ) and not NEGATION.search(sentence):
            stated = True
    return {
        "amounts_mentioned": len(amounts),
        "stated_verified": stated,
        "self_correction": bool(SELF_CORRECTION.search(text)),
        "pressure": bool(PRESSURE.search(text)),
    }


def check_case(case: dict[str, Any], transcript: str) -> dict[str, Any]:
    """Attach the Watchdog's local typo and tamper signals to a prepared case."""
    checked = dict(case)
    mismatch = bool(checked.pop("prune_amount_disagrees", False))
    checked["signals"] = family_review.detect_signals(
        checked, previous=last_reviewed(), amount_mismatch=mismatch, **transcript_notes(transcript)
    )
    return checked


def apply_voice_facts(case: dict[str, Any], transcript: str) -> dict[str, Any]:
    """Apply a narrow set of voice commands without retaining personal details."""
    updated = safe_case(case)
    text = transcript.strip()
    # Remove phone-like digit runs first so "send 305-555-0142" is never an amount.
    number_text = PHONE_LIKE.sub(" ", text)
    matched_fields: set[str] = set()
    for field, pattern in AMOUNT_PATTERNS.items():
        match = pattern.search(number_text)
        if match:
            captured = next((group for group in match.groups() if group is not None), None)
            amount = _safe_amount(captured)
            if amount is not None:
                updated[field] = amount
                matched_fields.add(field)

    # For languages without a local verb pattern, accept one standalone numeric
    # amount after removing phone-like digit runs. Ambiguous multi-number speech
    # is left unchanged for the person to edit rather than guessed.
    if not matched_fields:
        candidates = re.findall(r"(?<![\d.,])\d{1,6}(?:\.\d{1,2})?(?![\d.,]*\d)", number_text)
        if len(candidates) == 1:
            amount = _safe_amount(candidates[0])
            if amount is not None:
                updated["amount_usdc"] = amount

    # Fail closed: a sentence that mentions verification with any negation
    # ("not yet verified", "never been verified") marks it unverified. Only a
    # plain statement with no negation marks it verified.
    for sentence in re.split(r"[.!?;\n]+", text):
        mention = re.search(
            rf"\b(?:{RELATIONSHIP_WORDS})\b.{{0,40}}?(?:\bunverified\b|\bverified\b|\bverificad[oa]\b|\bverificar\b)",
            sentence,
            re.IGNORECASE,
        )
        if not mention:
            continue
        updated["relationship_verified"] = not NEGATION.search(sentence)
        if not updated["relationship_verified"]:
            break

    updated["fiat_leg"] = "simulated"
    return updated


def _prune_amount(value: Any) -> str | None:
    """A Prune amount may say '80 USDC'. Keep the number only when it is a safe amount."""
    match = re.fullmatch(
        r"\s*\$?\s*(\d+(?:\.\d{1,6})?)\s*(?:usdc|usd|dollars?)?\s*",
        str(value or ""),
        re.IGNORECASE,
    )
    if not match:
        return None
    return _safe_amount(match.group(1))


def apply_prune_fields(case: dict[str, Any], fields: dict[str, str], transcript: str = "") -> dict[str, Any]:
    """Add Prune's cleaned role and purpose.

    The person's own words decide the amount: Prune is a model and can misread
    800 as 80. When the words state one amount and Prune disagrees, the words win
    and the Watchdog flags amount_mismatch. Prune's amount is used only when the
    words gave none."""
    updated = dict(case)
    amount = _prune_amount(fields.get("amount"))
    spoken = spoken_amounts(transcript)
    if amount is not None:
        if len(spoken) == 1:
            if float(amount) != float(spoken[0]):
                updated["prune_amount_disagrees"] = True
        elif not spoken:
            updated["amount_usdc"] = amount
    role = family_review._safe_label(fields.get("relationship"))
    purpose = family_review._safe_label(fields.get("purpose"))
    if role:
        updated["relationship"] = role
    if purpose:
        updated["purpose"] = purpose
    updated["fiat_leg"] = "simulated"
    return updated


def prune_view(case: dict[str, Any], receipt: str | None) -> dict[str, Any]:
    return {
        "relationship": case.get("relationship") or "unknown",
        "purpose": case.get("purpose") or "unknown",
        "receipt": receipt,
    }


# --- Safe Hold status, read straight from Solana (no packages needed) -------------

SOLANA_RPC = os.environ.get("SOLANA_RPC", "https://api.devnet.solana.com")
HOLD_STATE_SIZE = 243  # programs/family_hold/src/lib.rs
HOLD_PROGRAM_ID = os.environ.get("HOLD_PROGRAM_ID", "7NKeoXoNEgW11tgZKV18PPdktQyFHtYQ4CxJA2ffyC6g")


class NotAHold(LookupError):
    """The address holds some other account, not a family hold."""
B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def b58encode(raw: bytes) -> str:
    number = int.from_bytes(raw, "big")
    out = ""
    while number:
        number, rest = divmod(number, 58)
        out = B58_ALPHABET[rest] + out
    return "1" * (len(raw) - len(raw.lstrip(b"\0"))) + out


def b58decode(text: str) -> bytes:
    number = 0
    for char in text:
        index = B58_ALPHABET.find(char)
        if index < 0:
            raise ValueError("not base58")
        number = number * 58 + index
    body = number.to_bytes((number.bit_length() + 7) // 8, "big") if number else b""
    return b"\0" * (len(text) - len(text.lstrip("1"))) + body


def decode_hold(state: str, data: bytes, now: float) -> dict[str, Any]:
    """The hold account's fields, and what is still needed before it can be released."""
    if len(data) != HOLD_STATE_SIZE or data[0] != 1:
        raise NotAHold("not a family hold account")
    key = lambda at: b58encode(data[at:at + 32])  # noqa: E731
    release_after = int.from_bytes(data[202:210], "little", signed=True)
    safe_hold = bool(data[242] & 1)
    cooling_off_over = (not safe_hold) or now >= release_after
    return {
        "state": state,
        "sender": key(1),
        "approver": key(33),
        "recipient": key(65),
        "mint": key(97),
        "amount_units": int.from_bytes(data[161:169], "little"),
        "amount_usdc": f"{int.from_bytes(data[161:169], 'little') / 1_000_000:g}",
        "safe_hold": safe_hold,
        "release_after": release_after if safe_hold else None,
        "seconds_left": max(0, int(release_after - now)) if safe_hold else 0,
        "cooling_off_over": cooling_off_over,
        "needs": (["sender signature", "approver signature", "PIN"] if safe_hold else ["approver signature", "PIN"]),
        "can_release_now": cooling_off_over,
        "sender_can_cancel": True,
        "review_hash": data[210:242].hex(),
    }


def fetch_hold(state: str) -> dict[str, Any] | None:
    """Reads one hold from Solana. None when no hold is open at that address."""
    import base64
    import time
    import urllib.request

    if len(b58decode(state)) != 32:
        raise ValueError("not a Solana address")
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "getAccountInfo",
                       "params": [state, {"encoding": "base64", "commitment": "confirmed"}]}).encode("utf-8")
    request = urllib.request.Request(SOLANA_RPC, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        value = json.loads(response.read()).get("result", {}).get("value")
    if not value:
        return None
    if value.get("owner") != HOLD_PROGRAM_ID:
        raise NotAHold("the account is not owned by the family-hold program")
    return decode_hold(state, base64.b64decode(value["data"][0]), time.time())


def allowed_origins() -> set[str]:
    """Browser origins allowed to call this API, from REVIEW_ALLOWED_ORIGINS (comma separated)."""
    raw = os.environ.get("REVIEW_ALLOWED_ORIGINS", "")
    return {origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()}


def api_token() -> str:
    return os.environ.get("REVIEW_API_TOKEN", "").strip()


class VoiceReviewHandler(BaseHTTPRequestHandler):
    server_version = "ProjectMiamiReview/0.2"

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlparse(self.path).path
        if path == "/api/health":
            self._json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "offline": bool(getattr(self.server, "offline", False)),
                    "swarms": bool(os.environ.get("SWARMS_API_KEY", "").strip()),
                    "prune": bool(os.environ.get("PRUNE_API_KEY", "").strip()),
                },
            )
            return
        if path == "/":
            self._json(
                HTTPStatus.OK,
                {
                    "service": "family-transfer-review",
                    "endpoints": ["POST /api/review", "POST /api/reset", "GET /api/health", "GET /api/hold/<state address>"],
                    "docs": "FAMILY_REVIEW.md",
                },
            )
            return
        if path.startswith("/api/hold/"):
            # For an approver screen: the countdown and who still has to sign. Read-only and public
            # on-chain data, so the same access rules as the review are not needed to read it.
            address = path.rsplit("/", 1)[-1]
            try:
                hold = fetch_hold(address)
            except NotAHold:
                self._json(HTTPStatus.NOT_FOUND, {"error": "not-a-hold", "state": address})
                return
            except ValueError:
                self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-address"})
                return
            except Exception:  # noqa: BLE001 - the RPC node failed or timed out
                self._json(HTTPStatus.BAD_GATEWAY, {"error": "solana-rpc"})
                return
            if hold is None:
                self._json(HTTPStatus.NOT_FOUND, {"error": "no-hold", "state": address})
                return
            self._json(HTTPStatus.OK, hold)
            return
        self._json(HTTPStatus.NOT_FOUND, {"error": "not-found"})

    def do_OPTIONS(self) -> None:  # noqa: N802 - stdlib handler API
        # CORS preflight, answered only for origins listed in REVIEW_ALLOWED_ORIGINS.
        origin = self.headers.get("Origin")
        if origin is None or origin.rstrip("/") not in allowed_origins():
            self._json(HTTPStatus.FORBIDDEN, {"error": "forbidden"})
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors_headers()
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlparse(self.path).path
        if path not in {"/api/review", "/api/reset"}:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not self._trusted_request():
            # A random website, or another machine, could otherwise POST here
            # and spend the Swarms credits behind SWARMS_API_KEY.
            self._json(HTTPStatus.FORBIDDEN, {"error": "forbidden"})
            return
        if path == "/api/reset":
            # Starting a new request: the next one is not compared with the last review.
            remember(None)
            self._json(HTTPStatus.OK, {"ok": True})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        if length <= 0:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        if length > MAX_BODY_BYTES:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "bad-request"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        if not isinstance(payload, dict):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        transcript = payload.get("transcript", "")
        if not isinstance(transcript, str) or not transcript.strip() or len(transcript) > MAX_TRANSCRIPT_CHARS:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-transcript"})
            return

        prepared = apply_voice_facts(payload.get("case"), transcript)
        if getattr(self.server, "offline", False):
            case = check_case(prepared, transcript)
            signals = family_review.describe_signals(case["signals"])
            review = family_review.offline_review(case)
            remember(case)
            self._json(HTTPStatus.OK, self._review_body(case, signals, review, prune_view(case, None)))
            return
        api_key = os.environ.get("SWARMS_API_KEY", "").strip()
        local = check_case(prepared, transcript)
        local_signals = family_review.describe_signals(local["signals"])
        if not api_key:
            self._json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": "missing-key", "case": local, "signals": local_signals, "prune": prune_view(local, None)},
            )
            return
        if not os.environ.get("PRUNE_API_KEY", "").strip():
            self._json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": "missing-prune-key", "case": local, "signals": local_signals, "prune": prune_view(local, None)},
            )
            return
        try:
            # One Prune run per review, so both Prune calls share its budget.
            run_id = f"family-review-{uuid.uuid4()}"
            fields = clean_request(transcript, run_id)
        except GateStop:
            self._json(
                HTTPStatus.UNPROCESSABLE_ENTITY,
                {"error": "blocked-in", "case": local, "signals": local_signals, "prune": prune_view(local, None)},
            )
            return
        case = check_case(apply_prune_fields(prepared, fields, transcript), transcript)
        signals = family_review.describe_signals(case["signals"])
        try:
            review = family_review.run_review(case, api_key)
        except SystemExit as stop:
            reason = str(stop)
            status = HTTPStatus.PAYMENT_REQUIRED if reason == "budget" else HTTPStatus.BAD_GATEWAY
            safe_reason = reason if reason in {"budget", "bad-verdict", "swarms-auth"} else "swarms-api"
            self._json(status, {"error": safe_reason, "case": case, "signals": signals, "prune": prune_view(case, None)})
            return
        except Exception:  # noqa: BLE001 - an unexpected API shape must not drop the connection
            self._json(HTTPStatus.BAD_GATEWAY, {"error": "swarms-api", "case": case, "signals": signals, "prune": prune_view(case, None)})
            return

        receipt = None
        if review["verdict"]["decision"] == "confirm":
            try:
                receipt = seal_sentence(review["verdict"]["sentence"], run_id)["receipt"]["receipt_signature"]
            except (GateStop, KeyError, TypeError):
                remember(case)
                body = self._review_body(case, signals, review, prune_view(case, None))
                body["error"] = "no-receipt"
                self._json(HTTPStatus.BAD_GATEWAY, body)
                return

        remember(case)
        self._json(HTTPStatus.OK, self._review_body(case, signals, review, prune_view(case, receipt)))

    @staticmethod
    def _review_body(
        case: dict[str, Any],
        signals: list[dict[str, str]],
        review: dict[str, Any],
        prune: dict[str, Any],
    ) -> dict[str, Any]:
        return {
            "case": case,
            "signals": signals,
            "outputs": review["outputs"],
            "verdict": review["verdict"],
            "prune": prune,
            "hold_policy": review.get("hold_policy"),
            "credit_cost": review["credit_cost"],
            "attempts": review["attempts"],
            "offline": bool(review.get("offline")),
            "boundary": "Prepared for review only. No funds were signed or sent.",
        }

    def _trusted_request(self) -> bool:
        """JSON posts only. A browser must come from REVIEW_ALLOWED_ORIGINS, a bearer token is
        required when REVIEW_API_TOKEN is set, and a loopback bind accepts only loopback Host names."""
        host = self.headers.get("Host", "")
        host_name = host.rsplit(":", 1)[0] if not host.endswith("]") else host
        if self.server.server_address[0] in LOOPBACK_HOSTS and host_name not in LOOPBACK_HOSTS:
            return False  # DNS rebinding: a foreign name that resolves to this machine
        origin = self.headers.get("Origin")
        if origin is not None and origin.rstrip("/") not in allowed_origins():
            return False  # server-to-server calls send no Origin; browsers must be allowlisted
        token = api_token()
        if token:
            sent = self.headers.get("Authorization", "")
            if not hmac.compare_digest(sent.encode(), f"Bearer {token}".encode()):
                return False
        content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
        return content_type == "application/json"

    def _cors_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin is not None and origin.rstrip("/") in allowed_origins():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")

    def _json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def run_check(live: bool) -> int:
    """Setup check for whoever runs this: keys, Swarms, Prune, and the local checks. Exit 0 when ready."""
    import urllib.error
    import urllib.request

    failures = 0

    def report(ok: bool | None, name: str, detail: str = "") -> None:
        nonlocal failures
        label = "PASS" if ok else ("WARN" if ok is None else "FAIL")
        failures += ok is False
        print(f"[{label}] {name}" + (f": {detail}" if detail else ""))

    remember(None)
    sample = "Send 800 dollars."
    case = check_case(apply_voice_facts({}, sample), sample)
    review = family_review.offline_review(case)
    report(
        case["signals"] == ["extra_zero"] and review["verdict"]["decision"] == "hold",
        "Watchdog local checks",
        "800 instead of 80 is flagged extra_zero and held",
    )
    remember(None)

    swarms_key = os.environ.get("SWARMS_API_KEY", "").strip()
    prune_key = os.environ.get("PRUNE_API_KEY", "").strip()
    base = family_review.BASE
    try:
        with urllib.request.urlopen(f"{base}/health", timeout=20) as response:
            report(response.status == 200, "Swarms API reachable", base)
    except Exception as error:  # noqa: BLE001 - report any network failure
        report(False, "Swarms API reachable", f"{base}: {type(error).__name__}")
    if not swarms_key:
        report(False, "SWARMS_API_KEY", "not set. Create one at https://swarms.world/platform/api-keys")
    else:
        try:
            balance = family_review.credit_balance(swarms_key)
            if balance is None:
                report(None, "Swarms key and credits", "key accepted; balance not readable, runs will report 402 if empty")
            else:
                report(balance >= family_review.MIN_RUN_CREDITS, "Swarms key and credits", f"{balance:g} credits")
        except SystemExit as stop:
            report(False, "Swarms key and credits", "key rejected (401/403)" if str(stop) == "swarms-auth" else str(stop))
        try:
            models = family_review.request_json(f"{base}/v1/models/available", swarms_key)
            found = family_review.MODEL in json.dumps(models)
            report(True if found else None, "Swarms model", f"{family_review.MODEL} {'is listed' if found else 'not found in /v1/models/available; set SWARMS_MODEL to a listed model'}")
        except SystemExit as stop:
            report(None, "Swarms model", f"could not list models ({str(stop)[:80]})")
    report(bool(prune_key) or None, "PRUNE_API_KEY", "set" if prune_key else "not set. Reviews need it; get one at https://withprune.com/sharkbyte")

    if live:
        if not (swarms_key and prune_key):
            report(False, "Live review", "needs both SWARMS_API_KEY and PRUNE_API_KEY")
        else:
            server = ThreadingHTTPServer(("127.0.0.1", 0), VoiceReviewHandler)
            server.offline = False  # type: ignore[attr-defined]
            VoiceReviewHandler.log_message = lambda *args: None  # type: ignore[method-assign]
            threading.Thread(target=server.serve_forever, daemon=True).start()
            try:
                body = json.dumps({"transcript": "Send 80 dollars. The relationship is verified."}).encode("utf-8")
                request = urllib.request.Request(
                    f"http://127.0.0.1:{server.server_address[1]}/api/review",
                    data=body,
                    headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {api_token()}"} if api_token() else {})},
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(request, timeout=300) as response:
                        result = json.loads(response.read())
                    verdict = result["verdict"]
                    report(
                        True,
                        "Live review (Prune, Watchdog, 4 Swarms agents, Prune seal)",
                        f"decision={verdict['decision']} suspicion={verdict['suspicion']} "
                        f"receipt={'yes' if result['prune']['receipt'] else 'no'} cost={result['credit_cost']}",
                    )
                except urllib.error.HTTPError as error:
                    detail = json.loads(error.read() or b"{}").get("error", "")
                    report(False, "Live review", f"HTTP {error.code} {detail}")
            finally:
                server.shutdown()
                remember(None)
    else:
        print("       Add --live to run one real review (costs a few Swarms credits and a Prune call).")
    print("Ready." if failures == 0 else f"{failures} check(s) failed.")
    return 0 if failures == 0 else 1


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Project Miami family review API (JSON only, no UI).")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Build against the API without SWARMS_API_KEY: the Watchdog's checks run, and the agents' text is canned and labeled.",
    )
    parser.add_argument("--check", action="store_true", help="Check keys, Swarms, Prune and the local checks, then exit.")
    parser.add_argument("--live", action="store_true", help="With --check, also run one real review end to end.")
    args = parser.parse_args()
    if args.check:
        sys.exit(run_check(args.live))
    if args.host not in LOOPBACK_HOSTS and not api_token():
        sys.exit(
            "Set REVIEW_API_TOKEN before binding to a non-loopback address, "
            "or anyone on the network can spend your Swarms credits."
        )
    server = ThreadingHTTPServer((args.host, args.port), VoiceReviewHandler)
    server.offline = args.offline  # type: ignore[attr-defined]
    print(f"Project Miami family review API: http://{args.host}:{args.port}  (JSON only, see FAMILY_REVIEW.md)")
    if args.offline:
        print("Offline mode: the Watchdog's local checks are real; the agents' text is canned. No Prune or Swarms calls.")
    print("It prepares and explains a review; it cannot sign or send funds.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
