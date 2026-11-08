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
import unicodedata
import uuid
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from decimal import Decimal
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

# Seven or more digits, as in a phone or account number. A "$" right before it marks money,
# so "$10000.00" is kept as an amount.
PHONE_LIKE = re.compile(r"(?<![\d$])\+?\d(?:[\s\-.()]*\d){6,}(?!\d)")
# An instruction not to send: "don't send 80", "never transfer", "no envíes".
NEGATED_COMMAND = re.compile(
    r"\b(?:don'?t|do not|never|not|can'?t|cannot|won'?t|shouldn'?t|no|nunca)\s+(?:\w+\s+){0,2}?"
    r"(?:send|transfer|pay|sending|make|prepare|envíes|enviar|envíe|mandes|mandar|transfieras|transferir|pagues|pagar)\b",
    re.IGNORECASE,
)

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

# Common speech-to-text commands. These phrases are deliberately narrow: a number is
# treated as money only when it follows a transfer phrase. This gives the voice agent
# useful multilingual coverage without turning a year, address, or phone number into
# a payment. Prune still supplies short relationship and purpose labels in live mode.
VOICE_TERMS: dict[str, dict[str, tuple[str, ...]]] = {
    "en-US": {
        "amount_usdc": ("send", "transfer", "contribute", "pay", "sending", "amount"),
        "requested_usdc": ("request total", "total request", "total requested"),
        "other_contributions_usdc": ("other contributions", "already contributed", "already paid"),
        "verified": ("relationship is verified", "relationship verified", "relative is verified"),
        "unverified": ("relationship is not verified", "relationship unverified", "relative is not verified"),
    },
    "es-US": {
        "amount_usdc": ("enviar", "envía", "envíe", "transferir", "transfiere", "pagar", "paga", "mandar"),
        "requested_usdc": ("total solicitado", "solicitud total", "total de la solicitud"),
        "other_contributions_usdc": ("otras contribuciones", "ya contribuyeron", "ya pagaron"),
        "verified": ("relación verificada", "familiar verificado", "familiar verificada"),
        "unverified": ("relación no verificada", "familiar no verificado", "familiar no verificada"),
    },
    "pt-BR": {
        "amount_usdc": ("enviar", "envie", "transferir", "transfira", "pagar", "pague", "mandar"),
        "requested_usdc": ("total solicitado", "pedido total", "total do pedido"),
        "other_contributions_usdc": ("outras contribuições", "já contribuído", "já pagaram"),
        "verified": ("relação verificada", "relacionamento verificado", "familiar verificado"),
        "unverified": ("relação não verificada", "relacionamento não verificado", "familiar não verificado"),
    },
    "fr-FR": {
        "amount_usdc": ("envoyer", "envoyez", "transférer", "transférez", "payer", "payez"),
        "requested_usdc": ("total demandé", "demande totale", "montant demandé"),
        "other_contributions_usdc": ("autres contributions", "déjà contribué", "déjà payé"),
        "verified": ("relation vérifiée", "lien familial vérifié"),
        "unverified": ("relation non vérifiée", "relation pas vérifiée", "lien familial non vérifié"),
    },
    "ht-HT": {
        "amount_usdc": ("voye", "transfere", "peye"),
        "requested_usdc": ("total yo mande", "kantite yo mande"),
        "other_contributions_usdc": ("lòt kontribisyon", "deja kontribye", "deja peye"),
        "verified": ("relasyon verifye", "fanmi verifye"),
        "unverified": ("relasyon pa verifye", "fanmi pa verifye"),
    },
    "ar-SA": {
        "amount_usdc": ("أرسل", "ارسل", "حوّل", "حول", "ادفع"),
        "requested_usdc": ("إجمالي الطلب", "المبلغ المطلوب"),
        "other_contributions_usdc": ("مساهمات أخرى", "تم دفعه"),
        "verified": ("العلاقة مؤكدة", "القرابة مؤكدة"),
        "unverified": ("العلاقة غير مؤكدة", "القرابة غير مؤكدة"),
    },
    "fa-IR": {
        "amount_usdc": ("بفرست", "ارسال کن", "انتقال بده", "پرداخت کن"),
        "requested_usdc": ("مبلغ درخواستی", "مجموع درخواست"),
        "other_contributions_usdc": ("کمک های دیگر", "پرداخت شده"),
        "verified": ("رابطه تایید شده", "نسبت تایید شده"),
        "unverified": ("رابطه تایید نشده", "نسبت تایید نشده"),
    },
    "hi-IN": {
        "amount_usdc": ("भेजो", "भेजें", "ट्रांसफर करो", "ट्रांसफर करें", "भुगतान करो"),
        "requested_usdc": ("कुल अनुरोध", "कुल मांग"),
        "other_contributions_usdc": ("अन्य योगदान", "पहले दिया"),
        "verified": ("रिश्ता सत्यापित है", "रिश्तेदार सत्यापित है"),
        "unverified": ("रिश्ता सत्यापित नहीं है", "रिश्तेदार सत्यापित नहीं है"),
    },
    "bn-BD": {
        "amount_usdc": ("পাঠান", "টাকা পাঠান", "স্থানান্তর করুন", "পরিশোধ করুন"),
        "requested_usdc": ("মোট অনুরোধ", "মোট চাওয়া"),
        "other_contributions_usdc": ("অন্যান্য অবদান", "আগেই দেওয়া"),
        "verified": ("সম্পর্ক যাচাই করা হয়েছে",),
        "unverified": ("সম্পর্ক যাচাই করা হয়নি",),
    },
    "ur-PK": {
        "amount_usdc": ("بھیجیں", "منتقل کریں", "ادائیگی کریں"),
        "requested_usdc": ("کل درخواست", "مانگی گئی رقم"),
        "other_contributions_usdc": ("دیگر تعاون", "پہلے ادا شدہ"),
        "verified": ("رشتہ تصدیق شدہ ہے",),
        "unverified": ("رشتہ تصدیق نہیں ہے",),
    },
    "tr-TR": {
        "amount_usdc": ("gönder", "gönderin", "transfer et", "transfer edin", "öde", "ödeyin"),
        "requested_usdc": ("toplam istek", "istenen toplam", "talep edilen tutar"),
        "other_contributions_usdc": ("diğer katkılar", "zaten ödendi", "önceden katkı"),
        "verified": ("ilişki doğrulandı", "akrabalık doğrulandı"),
        "unverified": ("ilişki doğrulanmadı", "akrabalık doğrulanmadı"),
    },
    "sw-KE": {
        "amount_usdc": ("tuma", "hamisha", "lipa"),
        "requested_usdc": ("jumla iliyoombwa", "ombi lote"),
        "other_contributions_usdc": ("michango mingine", "tayari imelipwa"),
        "verified": ("uhusiano umethibitishwa", "undugu umethibitishwa"),
        "unverified": ("uhusiano haujathibitishwa", "undugu haujathibitishwa"),
    },
    "id-ID": {
        "amount_usdc": ("kirim", "transfer", "bayar"),
        "requested_usdc": ("total permintaan", "jumlah yang diminta"),
        "other_contributions_usdc": ("kontribusi lain", "sudah dibayar"),
        "verified": ("hubungan terverifikasi", "keluarga terverifikasi"),
        "unverified": ("hubungan belum terverifikasi", "keluarga belum terverifikasi"),
    },
    "fil-PH": {
        "amount_usdc": ("magpadala", "ipadala", "ilipat", "bayaran"),
        "requested_usdc": ("kabuuang hiling", "halagang hiniling"),
        "other_contributions_usdc": ("ibang ambag", "nabayaran na"),
        "verified": ("napatunayan ang relasyon", "beripikado ang kamag-anak"),
        "unverified": ("hindi napatunayan ang relasyon", "hindi beripikado ang kamag-anak"),
    },
    "vi-VN": {
        "amount_usdc": ("gửi", "chuyển", "thanh toán"),
        "requested_usdc": ("tổng yêu cầu", "số tiền yêu cầu"),
        "other_contributions_usdc": ("đóng góp khác", "đã thanh toán"),
        "verified": ("mối quan hệ đã xác minh", "người thân đã xác minh"),
        "unverified": ("mối quan hệ chưa xác minh", "người thân chưa xác minh"),
    },
    "zh-CN": {
        "amount_usdc": ("发送", "转账", "付款"),
        "requested_usdc": ("请求总额", "申请总额"),
        "other_contributions_usdc": ("其他贡献", "已经支付"),
        "verified": ("关系已验证", "亲属已验证"),
        "unverified": ("关系未验证", "亲属未验证"),
    },
}

VOICE_CONNECTOR = r"(?:is|are|was|es|son|são|est|sont|se|ni|là|adalah|是|为|هو|هي)?"
VOICE_CANCEL_PHRASES = (
    "do not send", "don't send", "never send",
    "no enviar", "no envíes", "nunca enviar",
    "não envie", "não enviar", "nunca envie",
    "ne pas envoyer", "n'envoyez pas",
    "pa voye", "ne voye pa",
    "لا ترسل", "لا تحول",
    "نفرست", "ارسال نکن",
    "मत भेजो", "नहीं भेजें",
    "পাঠাবেন না", "পাঠিয়েন না",
    "نہ بھیجیں", "مت بھیجیں",
    "gönderme", "göndermeyin",
    "usitume", "tuma usitume",
    "jangan kirim", "jangan transfer",
    "huwag ipadala", "huwag magpadala",
    "đừng gửi", "không gửi",
    "不要发送", "不要转账",
)


def _ascii_digits(text: str) -> str:
    """Turn any Unicode decimal digits into ASCII while leaving all words intact."""
    out = []
    for char in text:
        try:
            out.append(str(unicodedata.decimal(char)))
        except (TypeError, ValueError):
            out.append(char)
    return "".join(out)


def _phrase_pattern(phrase: str) -> str:
    return re.escape(phrase).replace(r"\ ", r"\s+")


def _field_amounts(transcript: str, field: str) -> list[str]:
    """All distinct amounts explicitly tied to one supported form field."""
    text = PHONE_LIKE.sub(" ", _ascii_digits(transcript.strip()))
    found: list[str] = []

    legacy = AMOUNT_PATTERNS[field]
    for match in legacy.finditer(text):
        captured = next((group for group in match.groups() if group is not None), None)
        amount = _safe_amount(captured)
        if amount is not None and amount not in found:
            found.append(amount)

    phrases = tuple(
        phrase
        for fields in VOICE_TERMS.values()
        for phrase in fields.get(field, ())
    )
    if not phrases:
        return found
    terms = "|".join(sorted((_phrase_pattern(phrase) for phrase in phrases), key=len, reverse=True))
    pattern = re.compile(
        rf"(?<!\w)(?:{terms})(?=$|[^\w]|\d)\s*{VOICE_CONNECTOR}\s*(?:\$|USD\s*)?{MONEY}",
        re.IGNORECASE,
    )
    for match in pattern.finditer(text):
        captured = next((group for group in match.groups() if group is not None), None)
        amount = _safe_amount(captured)
        if amount is not None and amount not in found:
            found.append(amount)
    return found


def _phrase_present(text: str, phrase: str) -> bool:
    return bool(re.search(rf"(?<!\w){_phrase_pattern(phrase)}(?=$|[^\w]|\d)", text, re.IGNORECASE))


def detect_spoken_locale(transcript: str) -> str | None:
    """Infer a locale only when its command vocabulary clearly wins."""
    text = _ascii_digits(transcript)
    scores: dict[str, int] = {}
    for locale, fields in VOICE_TERMS.items():
        score = sum(
            2 if field in {"verified", "unverified"} else 1
            for field, phrases in fields.items()
            for phrase in phrases
            if _phrase_present(text, phrase)
        )
        if score:
            scores[locale] = score
    if not scores:
        return None
    best = max(scores.values())
    winners = [locale for locale, score in scores.items() if score == best]
    return winners[0] if len(winners) == 1 else None


def spoken_relationship_verified(transcript: str) -> bool | None:
    """Return the explicitly spoken relationship status; negative always wins."""
    text = _ascii_digits(transcript)
    for fields in VOICE_TERMS.values():
        if any(_phrase_present(text, phrase) for phrase in fields.get("unverified", ())):
            return False
    for fields in VOICE_TERMS.values():
        if any(_phrase_present(text, phrase) for phrase in fields.get("verified", ())):
            return True
    return None

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

# Scam patterns, in English and Spanish. They run here on the request and on the message that
# asked for money; only the matching codes reach the agents, never the words.
# Asked to give it to *them*: "send the PIN to my sister" is how a hold is collected, "read me the PIN" is not.
_ASK = r"(?:(?:send|tell|give|read|share|text|forward)\s+(?:me|us)|dame|env[ií]ame|m[aá]ndame|dime|p[aá]same|l[eé]eme)"
SCAM_PATTERNS: dict[str, re.Pattern[str]] = {
    "claims_new_number": re.compile(
        r"\b(?:new (?:phone |cell |mobile |whatsapp )?number|my new (?:phone|cell|whatsapp)|"
        r"(?:lost|broke|dropped|cracked) my (?:phone|cell)|(?:my )?phone (?:broke|is broken|got stolen|was stolen)|"
        r"n[uú]mero nuevo|nuevo n[uú]mero|perd[ií] (?:mi )?(?:tel[eé]fono|celular)|se me rompi[oó] el (?:tel[eé]fono|celular))\b",
        re.IGNORECASE,
    ),
    "authority_impersonation": re.compile(
        # Narrow on purpose: "immigration fees" or "her social security check" are honest family reasons.
        r"\b(?:police|sheriff|irs|tax office|fraud (?:department|team|unit)|bank security|"
        r"safe account|secure account|social security (?:administration|office)|federal agent|fbi|government agency|"
        r"(?:immigration|customs) (?:officer|agent)|polic[ií]a|departamento de fraude|seguridad del banco|cuenta segura)\b",
        re.IGNORECASE,
    ),
    "code_request": re.compile(
        rf"\b(?:{_ASK}\s+(?:\w+\s+){{0,3}}?(?:pin|codes?|passcode|password|c[oó]digos?|clave|contrase[ñn]a)\b|"
        r"verification codes?|one[- ]time (?:code|password)|recovery phrase|seed phrase|secret phrase|private key|"
        r"anydesk|teamviewer|remote access|frase (?:de recuperaci[oó]n|semilla)|c[oó]digo de verificaci[oó]n)",
        re.IGNORECASE,
    ),
    "payment_pivot": re.compile(
        r"\b(?:gift ?cards?|itunes cards?|google play cards?|steam cards?|bitcoin|btc|crypto(?:currency)? atm|"
        r"(?:new|different|another|other) (?:bank )?(?:account|wallet|address)|switched banks|"
        r"tarjetas? de regalo|otra cuenta|cuenta nueva|nueva cuenta|billetera nueva|cambi[eé] de banco)\b",
        re.IGNORECASE,
    ),
    "refund_overpayment": re.compile(
        r"\b(?:(?:sent|paid|transferred|deposited) (?:you |to you )?(?:\w+ ){0,2}by mistake|sent (?:you )?too much|"
        r"overpa(?:id|yment)|send (?:it |the (?:difference|extra|rest) )?back|refund (?:the|my) (?:difference|extra|overpayment)|"
        r"(?:envi[eé]|deposit[eé]|mand[eé]) (?:\w+ ){0,2}por error|devu[eé]lv[ea]me)\b",
        re.IGNORECASE,
    ),
    "investment_promise": re.compile(
        r"\b(?:guaranteed (?:returns?|profits?)|double your money|investment opportunity|trading platform|"
        r"returns? of \d+ ?%|\d+ ?% (?:returns?|profit)|ganancias? garantizadas?|duplica(?:r)? tu dinero|oportunidad de inversi[oó]n)",
        re.IGNORECASE,
    ),
    "prize_fee": re.compile(
        r"\b(?:you (?:have )?won|lottery|sweepstakes|inheritance|release fee|processing fee|claim (?:your|the) (?:prize|winnings)|"
        r"ganaste|loter[ií]a|herencia|reclam(?:a|ar) (?:tu|el) premio)\b",
        re.IGNORECASE,
    ),
    "emergency_story": re.compile(
        # "by accident" / "por accidente" is not an accident story.
        r"\b(?:(?<!by )(?<!by an )accident|car crash|in jail|arrested|bail|hospital|emergency|stranded|kidnapp?ed|ransom|"
        r"(?<!por )accidente|c[aá]rcel|preso|arrestad[oa]|fianza|emergencia|secuestrad[oa]|rescate)\b",
        re.IGNORECASE,
    ),
}


# Scammers write the incoming message, so they can disguise words to slip past a word list:
# "new​number" (zero-width space), "co­de" (soft hyphen), Cyrillic "е" for Latin "e",
# fullwidth letters, "g1ft c4rds", "n.e.w number". The scan folds those back first. Only the
# scan sees the folded text; the transcript itself is not changed.
_CONFUSABLES = str.maketrans({
    # Cyrillic and Greek letters that look like Latin ones.
    "а": "a", "в": "b", "е": "e", "к": "k", "м": "m", "н": "h", "о": "o", "р": "p", "с": "c", "т": "t",
    "у": "y", "х": "x", "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "һ": "h", "ӏ": "l", "ԛ": "q", "ԝ": "w",
    "А": "A", "В": "B", "Е": "E", "К": "K", "М": "M", "Н": "H", "О": "O", "Р": "P", "С": "C", "Т": "T",
    "Х": "X", "І": "I", "Ј": "J", "Ѕ": "S",
    "α": "a", "ε": "e", "ι": "i", "κ": "k", "ν": "v", "ο": "o", "ρ": "p", "τ": "t", "υ": "u", "χ": "x",
    "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K", "Μ": "M", "Ν": "N", "Ο": "O",
    "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
})
_LEET = str.maketrans({"0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "|": "l"})
# A dot, dash, star or underscore between two letters: "n.e.w", "c-o-d-e", "g_i_f_t".
_SPLIT_LETTERS = re.compile(r"(?<=[^\W\d_])[.\-_*·•](?=[^\W\d_])")


def scan_forms(text: str) -> list[str]:
    """The forms of a text that the scam scan reads: as written once disguises are undone, with
    look-alike digits read as letters, and with letters joined across dots and dashes. Several
    forms, so undoing one disguise never hides a phrase another form still shows."""
    text = unicodedata.normalize("NFKC", text)  # fullwidth and other compatibility letters
    forms = []
    # An invisible character either splits a word ("co­de") or stands in for a space ("new​number").
    for joiner in ("", " "):
        plain = "".join(joiner if unicodedata.category(char) == "Cf" else char for char in text)
        plain = re.sub(r"\s+", " ", plain.translate(_CONFUSABLES))
        leet = plain.translate(_LEET)
        forms += [plain, leet, _SPLIT_LETTERS.sub("", leet)]
    return forms


def scam_patterns(*texts: str) -> list[str]:
    """Scam pattern codes found in any of the texts, disguised or not."""
    joined = "\n".join(form for text in texts if isinstance(text, str) for form in scan_forms(text))
    return [code for code, pattern in SCAM_PATTERNS.items() if pattern.search(joined)]


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
    amount = Decimal(text)
    if amount < 0 or amount > 100_000:
        return None
    return format(amount.normalize(), "f")  # canonical: "080.50" -> "80.5"


def safe_case(source: Any) -> dict[str, Any]:
    """Copy only facts that the Swarms task is allowed to receive."""
    result = dict(SAFE_CASE_DEFAULTS)
    # Internal markers, removed by check_case before anything leaves the server.
    result["_amount_source"] = "default"
    result["_request_defaulted"] = True
    if not isinstance(source, dict):
        return result
    supplied = set()
    for field in ("amount_usdc", "requested_usdc", "other_contributions_usdc"):
        amount = _safe_amount(source.get(field))
        if amount is not None:
            result[field] = amount
            supplied.add(field)
    if "amount_usdc" in supplied:
        result["_amount_source"] = "case"
    result["_request_defaulted"] = not {"requested_usdc", "other_contributions_usdc"} <= supplied
    # The app says whether the recipient is in the sender's contacts. Only this yes/no
    # leaves the phone: no contact list and no phone numbers.
    known = source.get("recipient_in_contacts")
    if known is True or known is False:
        result["recipient_in_contacts"] = known
    # Identity facts the phone works out from its own contacts and history: counts, yes/no,
    # and a channel name. The names and numbers they come from never leave the phone.
    for field in ("claimed_name_matches_contact", "recipient_details_changed"):
        if source.get(field) is True or source.get(field) is False:
            result[field] = source[field]
    for field in ("contact_added_days", "recipient_account_age_days", "prior_transfers_to_recipient"):
        value = source.get(field)
        if isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= 100_000:
            result[field] = value
    if source.get("request_channel") in family_review.REQUEST_CHANNELS:
        result["request_channel"] = source["request_channel"]
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
    return _field_amounts(transcript, "amount_usdc")


def transcript_notes(transcript: str) -> dict[str, Any]:
    """What the words themselves show: distinct amounts to send, a stated verification, corrections, pressure."""
    text = transcript.strip()
    amounts = {Decimal(amount) for amount in spoken_amounts(text)}
    spoken_verified = spoken_relationship_verified(text)
    stated = spoken_verified is True
    negated = False
    for sentence in re.split(r"[.!?;\n]+", text):
        if NEGATED_COMMAND.search(sentence) or any(_phrase_present(sentence, phrase) for phrase in VOICE_CANCEL_PHRASES):
            negated = True
        if re.search(
            rf"\b(?:{RELATIONSHIP_WORDS})\b.{{0,40}}?(?:\bverified\b|\bverificad[oa]\b)", sentence, re.IGNORECASE
        ) and not NEGATION.search(sentence):
            stated = True
    return {
        "amounts_mentioned": len(amounts),
        "stated_verified": stated,
        "self_correction": bool(SELF_CORRECTION.search(text)),
        "pressure": bool(PRESSURE.search(text)),
        "negated_instruction": negated,
    }


def check_case(case: dict[str, Any], transcript: str, incoming_message: str = "") -> dict[str, Any]:
    """Attach the Watchdog's local typo, tamper, identity and scam signals to a prepared case.

    incoming_message is the text or call that asked for money. It is only scanned here for scam
    patterns and pressure; its amounts are not the sender's instruction, and it is never forwarded."""
    checked = dict(case)
    mismatch = bool(checked.pop("prune_amount_disagrees", False))
    source = checked.pop("_amount_source", "case")
    defaulted = bool(checked.pop("_request_defaulted", False))
    notes = transcript_notes(transcript)
    notes["pressure"] = notes["pressure"] or any(PRESSURE.search(form) for form in scan_forms(incoming_message or ""))
    checked["signals"] = family_review.detect_signals(
        checked,
        previous=last_reviewed(),
        amount_mismatch=mismatch,
        amount_source=source,
        request_facts_assumed=defaulted,
        recipient_in_contacts=checked.get("recipient_in_contacts"),
        scam_patterns=scam_patterns(transcript, incoming_message),
        **notes,
    )
    return checked


def apply_voice_facts(case: dict[str, Any], transcript: str) -> dict[str, Any]:
    """Apply a narrow set of voice commands without retaining personal details."""
    updated = safe_case(case)
    text = transcript.strip()
    # When the caller did not choose a language, use the spoken command vocabulary.
    # An explicit valid output_locale always wins.
    supplied_locale = isinstance(case, dict) and case.get("output_locale") in LANGUAGES
    if not supplied_locale:
        detected_locale = detect_spoken_locale(text)
        # Preserve the established English-input/Spanish-output default. Other
        # clearly detected languages follow the speaker unless the app chose one.
        if detected_locale and detected_locale != "en-US":
            updated["output_locale"] = detected_locale
            updated["output_language"] = LANGUAGES[detected_locale]

    # Remove phone-like digit runs first so "send 305-555-0142" is never an amount.
    number_text = PHONE_LIKE.sub(" ", _ascii_digits(text))
    matched_fields: set[str] = set()
    for field in AMOUNT_PATTERNS:
        amounts = _field_amounts(number_text, field)
        if amounts:
            updated[field] = amounts[0]
            matched_fields.add(field)
    if "amount_usdc" in matched_fields:
        updated["_amount_source"] = "spoken"
    if {"requested_usdc", "other_contributions_usdc"} <= matched_fields:
        updated["_request_defaulted"] = False

    # For languages without a local verb pattern, take one standalone number as the
    # amount, but only as a guess: the Watchdog flags amount_guessed, so it is held
    # until a person confirms it ("born in 1990" is a number, not a transfer).
    if not matched_fields:
        candidates = re.findall(r"(?<![\d.,])\d{1,6}(?:\.\d{1,2})?(?![\d.,]*\d)", number_text)
        if len(candidates) == 1:
            amount = _safe_amount(candidates[0])
            if amount is not None:
                updated["amount_usdc"] = amount
                updated["_amount_source"] = "guessed"

    # Fail closed: an explicit multilingual negative phrase always wins.
    spoken_verified = spoken_relationship_verified(text)
    if spoken_verified is not None:
        updated["relationship_verified"] = spoken_verified

    # Keep support for broader English/Spanish wording: a sentence that mentions verification with any negation
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


PLAIN_REPLACEMENTS = (
    (r"\bUSDC\b", "dollars"),
    (r"\bSolana(?:\s+devnet)?\b", "the payment system"),
    (r"\bblockchain\b", "payment record"),
    (r"\bon[- ]chain\b", "in the payment record"),
    (r"\bcrypto(?:currency)?\b", "digital money"),
    (r"\btokens?\b", "money"),
    (r"\bfiat\b", "local money"),
)


def _without_jargon(value: Any) -> str:
    """Keep model-written display text useful even if it leaks implementation terms."""
    text = " ".join(str(value or "").split())
    for pattern, replacement in PLAIN_REPLACEMENTS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def plain_language_summary(
    case: dict[str, Any], review: dict[str, Any], policy: dict[str, Any]
) -> dict[str, Any]:
    """A ready-to-render response for the voice UI, with no crypto vocabulary."""
    verdict = review.get("verdict") if isinstance(review.get("verdict"), dict) else {}
    decision = verdict.get("decision")
    amount = _safe_amount(case.get("amount_usdc")) or "unknown"
    money = f"${amount}" if amount != "unknown" else "not provided"
    stopped = decision == "stop"
    held = bool(policy.get("required"))
    if stopped:
        status = "Do not continue"
        explanation = "This payment should not continue. Nothing has been sent."
        next_step = "Check the person and the amount before starting a new request."
    elif held:
        status = "Needs another look"
        explanation = f"The {money} payment needs another review. Nothing has been sent."
        next_step = "Check the highlighted details. If you continue, both the sender and a family approver must confirm."
    else:
        status = "Ready for your review"
        explanation = f"The details for the {money} payment are filled in. Nothing has been sent yet."
        next_step = "Review the amount and the person, then choose whether to continue."

    translated = _without_jargon(verdict.get("sentence_es"))
    if not translated or translated.startswith("[Offline demo:"):
        translated = explanation

    contacts = {True: "yes", False: "no"}.get(case.get("recipient_in_contacts"), "not checked")
    verified = "yes" if case.get("relationship_verified") is True else "no"
    filled = {
        "amount": money,
        "request_total": f"${case.get('requested_usdc')}",
        "already_contributed": f"${case.get('other_contributions_usdc')}",
        "family_connection_verified": verified,
        "recipient_is_saved": contacts,
        "family_connection": case.get("relationship") or "not provided",
        "reason": case.get("purpose") or "not provided",
    }
    needs: list[str] = []
    codes = set(family_review.signal_codes(case))
    if "amount_not_stated" in codes or "amount_guessed" in codes:
        needs.append("Say the amount after a word such as send, transfer, or pay.")
    if "request_facts_assumed" in codes:
        needs.append("Say the request total and how much others have already contributed.")
    if case.get("recipient_in_contacts") is None:
        needs.append("Check whether the person is saved in the sender's contacts.")
    if case.get("relationship_verified") is not True:
        needs.append("Confirm that the person is really the family member they claim to be.")
    if not case.get("relationship"):
        needs.append("Say how the person is related to you.")
    if not case.get("purpose"):
        needs.append("Say what the money is for.")

    return {
        "status": status,
        "explanation": explanation,
        "in_your_language": translated,
        "language": case.get("output_language") or LANGUAGES[DEFAULT_LOCALE],
        "filled": filled,
        "needs": needs,
        "next_step": next_step,
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
    if len(text) > 44:  # a 32-byte address is at most 44 base58 characters
        raise ValueError("not base58")
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
        "amount_usdc": format((Decimal(int.from_bytes(data[161:169], "little")) / 1_000_000).normalize(), "f"),
        "safe_hold": safe_hold,
        "release_after": release_after if safe_hold else None,
        "seconds_left": max(0, int(release_after - now)) if safe_hold else 0,
        "cooling_off_over": cooling_off_over,
        "needs": (["sender signature", "approver signature", "PIN"] if safe_hold else ["approver signature", "PIN"]),
        # The cooling-off is over; release still needs every signature in "needs".
        "ready_for_signatures": cooling_off_over,
        "sender_can_cancel": True,
        "review_hash": data[210:242].hex(),
    }


def solana_rpc(method: str, params: list[Any]) -> Any:
    """One JSON-RPC call. An RPC error is raised, never mistaken for "nothing there"."""
    import urllib.request

    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode("utf-8")
    request = urllib.request.Request(SOLANA_RPC, data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=30) as response:
        reply = json.loads(response.read())
    if not isinstance(reply, dict) or "error" in reply or "result" not in reply:
        raise RuntimeError(f"Solana RPC {method} failed")
    return reply["result"]


def cluster_time() -> float:
    """Solana's own clock, which is what the program checks; this machine's clock only if that fails."""
    import time

    try:
        block_time = solana_rpc("getBlockTime", [solana_rpc("getSlot", [{"commitment": "confirmed"}])])
        if isinstance(block_time, int):
            return float(block_time)
    except Exception:  # noqa: BLE001 - fall back to local time
        pass
    return time.time()


_hold_cache: dict[str, tuple[float, dict[str, Any] | None]] = {}
_hold_cache_lock = threading.Lock()
HOLD_CACHE_SECONDS = 5.0


def fetch_hold(state: str) -> dict[str, Any] | None:
    """Reads one hold from Solana. None when no hold is open at that address.

    Answers are cached for a few seconds per address, so a busy approver screen cannot turn
    into one RPC call per request."""
    import base64
    import time

    if len(b58decode(state)) != 32:
        raise ValueError("not a Solana address")
    with _hold_cache_lock:
        cached = _hold_cache.get(state)
        if cached and time.monotonic() - cached[0] < HOLD_CACHE_SECONDS:
            return cached[1]
    result = solana_rpc("getAccountInfo", [state, {"encoding": "base64", "commitment": "confirmed"}])
    value = result.get("value") if isinstance(result, dict) else None
    if not value:
        hold = None
    else:
        if value.get("owner") != HOLD_PROGRAM_ID:
            raise NotAHold("the account is not owned by the family-hold program")
        hold = decode_hold(state, base64.b64decode(value["data"][0]), cluster_time())
    with _hold_cache_lock:
        if len(_hold_cache) > 1000:
            _hold_cache.clear()
        _hold_cache[state] = (time.monotonic(), hold)
    return hold


def allowed_origins() -> set[str]:
    """Browser origins allowed to call this API, from REVIEW_ALLOWED_ORIGINS (comma separated)."""
    raw = os.environ.get("REVIEW_ALLOWED_ORIGINS", "")
    return {origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()}


def api_token() -> str:
    return os.environ.get("REVIEW_API_TOKEN", "").strip()


class VoiceReviewHandler(BaseHTTPRequestHandler):
    server_version = "ProjectMiamiReview/0.2"
    # Seconds a client may stay silent while sending its request. Without it, a client that
    # trickles headers or promises a body it never sends holds a server thread forever.
    timeout = 15

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
            except RuntimeError:
                self._json(HTTPStatus.BAD_GATEWAY, {"error": "solana-rpc"})
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
            # Read the (ignored) body first: closing a socket with unread data resets the
            # connection on Windows, and the client sees "connection aborted".
            try:
                self.rfile.read(min(max(int(self.headers.get("Content-Length", "0")), 0), MAX_BODY_BYTES))
            except ValueError:
                pass
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
        except (UnicodeDecodeError, json.JSONDecodeError, RecursionError):
            # RecursionError: "[[[[..." nested thousands deep fits in the size limit.
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        if not isinstance(payload, dict):
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-request"})
            return
        transcript = payload.get("transcript", "")
        if not isinstance(transcript, str) or not transcript.strip() or len(transcript) > MAX_TRANSCRIPT_CHARS:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-transcript"})
            return
        # The text or call that asked for money, if the app has it. Scanned here for scam
        # patterns only: it is not sent to Prune or Swarms and not echoed back.
        incoming = payload.get("incoming_message", "")
        if not isinstance(incoming, str) or len(incoming) > MAX_TRANSCRIPT_CHARS:
            self._json(HTTPStatus.BAD_REQUEST, {"error": "bad-incoming-message"})
            return

        prepared = apply_voice_facts(payload.get("case"), transcript)
        if getattr(self.server, "offline", False):
            case = check_case(prepared, transcript, incoming)
            signals = family_review.describe_signals(case["signals"])
            review = family_review.offline_review(case)
            remember(case)
            self._json(HTTPStatus.OK, self._review_body(case, signals, review, prune_view(case, None)))
            return
        api_key = os.environ.get("SWARMS_API_KEY", "").strip()
        local = check_case(prepared, transcript, incoming)
        local_signals = family_review.describe_signals(local["signals"])
        if not api_key:
            self._json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": "missing-key", "case": local, "signals": local_signals, "prune": prune_view(local, None), "hold_policy": family_review.failed_policy(local, "missing-key")},
            )
            return
        if not os.environ.get("PRUNE_API_KEY", "").strip():
            self._json(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": "missing-prune-key", "case": local, "signals": local_signals, "prune": prune_view(local, None), "hold_policy": family_review.failed_policy(local, "missing-prune-key")},
            )
            return
        try:
            # One Prune run per review, so both Prune calls share its budget.
            run_id = f"family-review-{uuid.uuid4()}"
            fields = clean_request(transcript, run_id)
        except Exception:  # noqa: BLE001 - GateStop or anything unexpected from Prune: fail closed
            self._json(
                HTTPStatus.UNPROCESSABLE_ENTITY,
                {"error": "blocked-in", "case": local, "signals": local_signals, "prune": prune_view(local, None), "hold_policy": family_review.failed_policy(local, "blocked-in")},
            )
            return
        case = check_case(apply_prune_fields(prepared, fields, transcript), transcript, incoming)
        signals = family_review.describe_signals(case["signals"])
        try:
            review = family_review.run_review(case, api_key)
        except SystemExit as stop:
            reason = str(stop)
            status = HTTPStatus.PAYMENT_REQUIRED if reason == "budget" else HTTPStatus.BAD_GATEWAY
            safe_reason = reason if reason in {"budget", "bad-verdict", "swarms-auth"} else "swarms-api"
            self._json(status, {"error": safe_reason, "case": case, "signals": signals, "prune": prune_view(case, None),
                                "hold_policy": family_review.failed_policy(case, safe_reason)})
            return
        except Exception:  # noqa: BLE001 - an unexpected API shape must not drop the connection
            self._json(HTTPStatus.BAD_GATEWAY, {"error": "swarms-api", "case": case, "signals": signals, "prune": prune_view(case, None),
                                                "hold_policy": family_review.failed_policy(case, "swarms-api")})
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
        # Never pass a hold decision through: recompute it here from the case, the agents' text and
        # the verdict, so a missing or malformed policy can only come out stricter.
        review = dict(review)
        review["hold_policy"] = family_review.hold_policy(
            case, review.get("outputs") or {}, review.get("verdict") or {}, offline=bool(review.get("offline"))
        )
        return {
            "assistant": plain_language_summary(case, review, review["hold_policy"]),
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
        "extra_zero" in case["signals"] and review["verdict"]["decision"] == "hold" and review["hold_policy"]["required"],
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
                # A complete, clean request: it should confirm with no Safe Hold.
                body = json.dumps({
                    "transcript": "Send 80 dollars. The relationship is verified.",
                    "case": {"requested_usdc": "200", "other_contributions_usdc": "120", "recipient_in_contacts": True},
                }).encode("utf-8")
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
                    if not isinstance(result.get("hold_policy"), dict) or "required" not in result["hold_policy"]:
                        report(False, "Live review", "the response has no hold_policy")
                        raise SystemExit(1)
                    report(
                        True,
                        "Live review (Prune, Watchdog, 4 Swarms agents, Prune seal)",
                        f"decision={verdict['decision']} suspicion={verdict['suspicion']} "
                        f"receipt={'yes' if result['prune']['receipt'] else 'no'} "
                        f"safe_hold={result['hold_policy']['required']} cost={result['credit_cost']}",
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
