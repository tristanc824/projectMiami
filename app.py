"""Local voice-controlled demo for the Project Miami family review swarm.

The browser handles speech recognition. This server receives the transcript,
keeps only a small allowlist of transfer facts, and sends those facts through
the existing Swarms review. It never signs or sends funds.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from swarm import family_review

ROOT = Path(__file__).resolve().parent
WEB_DIR = ROOT / "voice"
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

PHONE_LIKE = re.compile(r"(?<!\d)\+?\d(?:[\s\-.()]*\d){6,}(?!\d)")

AMOUNT_PATTERNS = {
    "requested_usdc": re.compile(
        r"\b(?:request(?:ed)? total|total request)\s+(?:is\s+|to\s+)?\$?(\d+(?:\.\d{1,2})?)\b",
        re.IGNORECASE,
    ),
    "other_contributions_usdc": re.compile(
        r"\b(?:other contributions?|already contributed)\s+(?:are\s+|is\s+)?\$?(\d+(?:\.\d{1,2})?)\b",
        re.IGNORECASE,
    ),
    "amount_usdc": re.compile(
        r"\b(?:(?:send|transfer|contribute|pay|amount(?:\s+is|\s+to)?|sending|enviar|envía|transferir|transfiere|pagar|paga)\s+\$?(\d+(?:\.\d{1,2})?)|(?:prepare|make|prepara|preparar)\s+(?:an?\s+|una?\s+)?(?:transfer(?:encia)?\s+(?:of|de)\s+)?\$?(\d+(?:\.\d{1,2})?))\b",
        re.IGNORECASE,
    ),
}


def _safe_amount(value: Any) -> str | None:
    if isinstance(value, bool):
        return None
    text = str(value).strip()
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


def apply_voice_facts(case: dict[str, Any], transcript: str) -> dict[str, Any]:
    """Apply a narrow set of voice commands without retaining personal details."""
    updated = safe_case(case)
    text = transcript.strip()
    matched_fields: set[str] = set()
    for field, pattern in AMOUNT_PATTERNS.items():
        match = pattern.search(text)
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
        number_text = PHONE_LIKE.sub(" ", text)
        candidates = re.findall(r"(?<![\d.])\d{1,6}(?:\.\d{1,2})?(?![\d.])", number_text)
        if len(candidates) == 1:
            amount = _safe_amount(candidates[0])
            if amount is not None:
                updated["amount_usdc"] = amount

    relationship_words = r"relationship|relative|recipient|person|relación|familiar|destinatario|persona"
    if re.search(
        rf"\b(?:{relationship_words})\b.{{0,24}}\b(?:not verified|unverified|unknown|no (?:está )?verificad[oa]|sin verificar)\b",
        text,
        re.IGNORECASE,
    ):
        updated["relationship_verified"] = False
    elif re.search(
        rf"\b(?:{relationship_words})\b.{{0,24}}\b(?:verified|verificad[oa])\b",
        text,
        re.IGNORECASE,
    ):
        updated["relationship_verified"] = True

    updated["fiat_leg"] = "simulated"
    return updated


class VoiceReviewHandler(BaseHTTPRequestHandler):
    server_version = "ProjectMiamiVoice/0.1"

    def do_GET(self) -> None:  # noqa: N802 - stdlib handler API
        path = urlparse(self.path).path
        files = {
            "/": ("index.html", "text/html; charset=utf-8"),
            "/app.js": ("app.js", "text/javascript; charset=utf-8"),
            "/styles.css": ("styles.css", "text/css; charset=utf-8"),
        }
        entry = files.get(path)
        if entry is None:
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        filename, content_type = entry
        try:
            data = (WEB_DIR / filename).read_bytes()
        except OSError:
            self.send_error(HTTPStatus.INTERNAL_SERVER_ERROR)
            return
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self) -> None:  # noqa: N802 - stdlib handler API
        if urlparse(self.path).path != "/api/review":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        if length <= 0 or length > MAX_BODY_BYTES:
            self._json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "bad-request"})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        transcript = payload.get("transcript", "") if isinstance(payload, dict) else ""
        if not isinstance(transcript, str) or len(transcript) > MAX_TRANSCRIPT_CHARS:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-transcript"})
            return

        case = apply_voice_facts(payload.get("case"), transcript)
        api_key = os.environ.get("SWARMS_API_KEY", "").strip()
        if not api_key:
            self._json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": "missing-key", "case": case},
            )
            return
        try:
            review = family_review.run_review(case, api_key)
        except SystemExit as stop:
            reason = str(stop)
            status = HTTPStatus.PAYMENT_REQUIRED if reason == "budget" else HTTPStatus.BAD_GATEWAY
            safe_reason = reason if reason in {"budget", "bad-verdict"} else "swarms-api"
            self._json(status, {"error": safe_reason, "case": case})
            return

        self._json(
            HTTPStatus.OK,
            {
                "case": case,
                "outputs": review["outputs"],
                "verdict": review["verdict"],
                "credit_cost": review["credit_cost"],
                "attempts": review["attempts"],
                "boundary": "Prepared for review only. No funds were signed or sent.",
            },
        )

    def _json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local Project Miami voice demo.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.host, args.port), VoiceReviewHandler)
    print(f"Project Miami voice demo: http://{args.host}:{args.port}")
    print("Voice can prepare and explain a review; it cannot sign or send funds.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
