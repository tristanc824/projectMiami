"""Red-team scenarios: the scams the review is trained to catch, and the honest transfers it must let through.

Each scenario is what the app would send: the sender's own words (transcript), the message or
call that asked for money (incoming_message, scanned on the server and never forwarded), and the
identity facts the phone worked out from its contacts and history.

    python -m swarm.scam_scenarios            # local checks only: no keys, no cost
    python -m swarm.scam_scenarios --live     # the full pipeline with real Prune and Swarms
    python -m swarm.scam_scenarios --live --only hi_mom_new_number

Exit code 0 when every scenario comes out as expected.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# A long-standing teammate: saved for over a year, paid before, name and account unchanged.
KNOWN = {
    "recipient_in_contacts": True,
    "contact_added_days": 400,
    "request_channel": "in_person",
    "claimed_name_matches_contact": True,
    "recipient_details_changed": False,
    "recipient_account_age_days": 500,
    "prior_transfers_to_recipient": 6,
}

SCENARIOS: list[dict[str, Any]] = [
    {
        "id": "teammate_routine",
        "title": "Control: routine transfer to a long-standing teammate",
        "pattern": "none",
        "transcript": "Send 80 dollars for school expenses. The relationship is verified.",
        "case": {**KNOWN, "requested_usdc": "200", "other_contributions_usdc": "120"},
        "expect": "confirm",
        "signals": [],
    },
    {
        "id": "mom_monthly_spanish",
        "title": "Control: monthly help to mom, in Spanish",
        "pattern": "none",
        "transcript": "Envía 80 dólares para los gastos de la escuela. La relación está verificada.",
        "case": {**KNOWN, "request_channel": "call", "requested_usdc": "200", "other_contributions_usdc": "120",
                 "output_locale": "es-US"},
        "expect": "confirm",
        "signals": [],
    },
    {
        "id": "sister_fees_and_pin",
        "title": "Control: honest words that sound risky (immigration fees, texting the PIN, \"by accident\")",
        "pattern": "none",
        "transcript": "Send 80 dollars to my sister for her immigration fees. I'll text her the PIN. The relationship is verified.",
        "incoming_message": "Hi! I paid the wrong form by accident, can you help with the immigration fees this month? Thank you!",
        "case": {**KNOWN, "request_channel": "message", "requested_usdc": "80", "other_contributions_usdc": "0"},
        "expect": "confirm",
        "signals": [],
    },
    {
        "id": "hi_mom_new_number",
        "title": "\"Hi Mom, this is my new number\"",
        "pattern": "new-number impersonation",
        "transcript": "Send 300 dollars to my son for rent.",
        "incoming_message": "Hi Mom, I dropped my phone, this is my new number. Can you send me 300 for rent today? Don't tell Dad.",
        "case": {**KNOWN, "contact_added_days": 0, "request_channel": "message", "prior_transfers_to_recipient": 0,
                 "recipient_account_age_days": 1, "requested_usdc": "300", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["new_contact", "claims_new_number", "new_recipient_account"],
    },
    {
        "id": "grandparent_jail",
        "title": "Grandparent call: accident, jail, bail",
        "pattern": "emergency impersonation",
        "transcript": "Send 2000 dollars for my grandson's bail.",
        "incoming_message": "Grandma it's me, I had a car accident and I'm in jail. I need 2000 for bail right now. Please don't tell anyone.",
        "case": {"recipient_in_contacts": False, "request_channel": "call", "prior_transfers_to_recipient": 0,
                 "requested_usdc": "2000", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["recipient_not_in_contacts", "emergency_story", "pressure"],
    },
    {
        "id": "message_request_wrong_name",
        "title": "Message request from someone using a teammate's name",
        "pattern": "new-number impersonation",
        "transcript": "Send 120 dollars to Carlos for his share.",
        "incoming_message": "Hey it's Carlos from the team, can you cover my part? Send 120 here.",
        "case": {**KNOWN, "request_channel": "message_request", "claimed_name_matches_contact": False,
                 "requested_usdc": "120", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["message_request", "name_mismatch"],
    },
    {
        "id": "changed_account",
        "title": "Known contact, but \"pay my new account\"",
        "pattern": "changed details / account takeover",
        "transcript": "Send 150 dollars to my sister.",
        "incoming_message": "I switched banks, please pay my new account instead of the old one.",
        "case": {**KNOWN, "request_channel": "message", "recipient_details_changed": True, "recipient_account_age_days": 2,
                 "requested_usdc": "150", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["recipient_details_changed", "payment_pivot", "new_recipient_account"],
    },
    {
        "id": "bank_safe_account",
        "title": "\"Bank fraud team\": move money to a safe account",
        "pattern": "authority impersonation",
        "transcript": "Send 900 dollars to the safe account.",
        "incoming_message": "This is the fraud department at your bank. Your account is compromised. Move your money to a safe account immediately.",
        "case": {"recipient_in_contacts": False, "request_channel": "call", "prior_transfers_to_recipient": 0,
                 "requested_usdc": "900", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["authority_impersonation", "recipient_not_in_contacts", "pressure"],
    },
    {
        "id": "read_me_the_code",
        "title": "\"Read me the code I just sent you\"",
        "pattern": "code theft",
        "transcript": "Send 50 dollars to my cousin.",
        "incoming_message": "Hey cuz, I sent a verification code to your phone by accident, can you read me the code?",
        "case": {**KNOWN, "request_channel": "message", "requested_usdc": "50", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["code_request"],
    },
    {
        "id": "gift_cards",
        "title": "Aunt asked for gift cards",
        "pattern": "payment pivot",
        "transcript": "Send 200 dollars to my aunt.",
        "incoming_message": "Can you buy Google Play gift cards with it and send me the codes? I'll explain later.",
        "case": {**KNOWN, "request_channel": "message", "requested_usdc": "200", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["payment_pivot", "code_request"],
    },
    {
        "id": "overpayment_refund",
        "title": "\"I sent you 500 by mistake, send it back\"",
        "pattern": "refund scam",
        "transcript": "Send 500 dollars back.",
        "incoming_message": "Oops, I sent you 500 by mistake. Please send it back to my other account.",
        "case": {"recipient_in_contacts": False, "request_channel": "message_request", "prior_transfers_to_recipient": 0,
                 "requested_usdc": "500", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["refund_overpayment", "payment_pivot", "message_request"],
    },
    {
        "id": "investment_platform",
        "title": "Guaranteed returns on a trading platform",
        "pattern": "investment scam",
        "transcript": "Send 1000 dollars to my friend for the investment.",
        "incoming_message": "This trading platform has guaranteed returns of 30% a month. Send 1000 and I'll double your money.",
        "case": {"recipient_in_contacts": True, "contact_added_days": 20, "request_channel": "message",
                 "prior_transfers_to_recipient": 0, "requested_usdc": "1000", "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["investment_promise", "first_time_recipient"],
    },
    {
        "id": "prize_fee",
        "title": "\"You won, pay the processing fee\"",
        "pattern": "prize scam",
        "transcript": "Send 50 dollars for the processing fee.",
        "incoming_message": "Congratulations, you have won the lottery! Pay a 50 dollar processing fee to claim your prize.",
        "case": {"recipient_in_contacts": False, "request_channel": "email", "requested_usdc": "50",
                 "other_contributions_usdc": "0"},
        "expect": "hold",
        "signals": ["prize_fee", "recipient_not_in_contacts"],
    },
    {
        "id": "spanish_new_number",
        "title": "Spanish: \"perdí mi celular, este es mi número nuevo\"",
        "pattern": "new-number impersonation",
        "transcript": "Envía 250 dólares a mi hija.",
        "incoming_message": "Mamá, perdí mi celular, este es mi número nuevo. Necesito 250 urgente, no le digas a papá.",
        "case": {"recipient_in_contacts": True, "contact_added_days": 1, "request_channel": "message",
                 "prior_transfers_to_recipient": 0, "requested_usdc": "250", "other_contributions_usdc": "0",
                 "output_locale": "es-US"},
        "expect": "hold",
        "signals": ["new_contact", "claims_new_number", "pressure"],
    },
]

# Amount and typo signs, which a clean control must not raise.
HIGH_AMOUNT_SIGNS = {"extra_zero", "missing_zero", "changed_tenfold", "conflicting_amounts", "amount_mismatch"}


def request_body(scenario: dict[str, Any]) -> dict[str, Any]:
    body = {"transcript": scenario["transcript"], "case": scenario["case"]}
    if scenario.get("incoming_message"):
        body["incoming_message"] = scenario["incoming_message"]
    return body


def local_result(scenario: dict[str, Any]) -> dict[str, Any]:
    """The local checks alone, as the server runs them before any agent."""
    import app
    from swarm import family_review

    app.remember(None)
    prepared = app.apply_voice_facts(scenario["case"], scenario["transcript"])
    case = app.check_case(prepared, scenario["transcript"], scenario.get("incoming_message", ""))
    app.remember(None)
    high = [code for code in case["signals"] if code in family_review.HIGH_SIGNALS]
    return {"signals": case["signals"], "held_by_checks": bool(high)}


def grade(scenario: dict[str, Any], signals: list[str], held: bool | None) -> list[str]:
    """What went wrong, if anything."""
    problems = [f"missing sign {code}" for code in scenario["signals"] if code not in signals]
    if scenario["expect"] == "confirm":
        from swarm import family_review

        high = [code for code in signals if code in family_review.HIGH_SIGNALS]
        if high:
            problems.append(f"false alarm: {', '.join(high)}")
    if held is not None and held != (scenario["expect"] == "hold"):
        problems.append("held" if held else "NOT held")
    return problems


def post(port: int, path: str, body: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    import app

    token = app.api_token()
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {token}"} if token else {})},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"{}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the scam scenarios through the review.")
    parser.add_argument("--live", action="store_true", help="Run the full pipeline with real Prune and Swarms (costs credits).")
    parser.add_argument("--only", help="Run one scenario by id.")
    parser.add_argument("--json", help="Also write the full results to this file.")
    args = parser.parse_args()
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Spanish titles on a Windows console

    chosen = [s for s in SCENARIOS if not args.only or s["id"] == args.only]
    if not chosen:
        print(f"No scenario {args.only!r}. Ids: {', '.join(s['id'] for s in SCENARIOS)}")
        return 2

    server = None
    if args.live:
        import app

        if not (os.environ.get("SWARMS_API_KEY", "").strip() and os.environ.get("PRUNE_API_KEY", "").strip()):
            print("--live needs SWARMS_API_KEY and PRUNE_API_KEY.")
            return 2
        server = ThreadingHTTPServer(("127.0.0.1", 0), app.VoiceReviewHandler)
        server.offline = False  # type: ignore[attr-defined]
        app.VoiceReviewHandler.log_message = lambda *a: None  # type: ignore[method-assign]
        threading.Thread(target=server.serve_forever, daemon=True).start()

    results = []
    passed = 0
    try:
        for scenario in chosen:
            if server is None:
                local = local_result(scenario)
                problems = grade(scenario, local["signals"], None)
                outcome = {"held_by_checks": local["held_by_checks"], "signals": local["signals"]}
            else:
                port = server.server_address[1]
                post(port, "/api/reset", {})
                status, body = post(port, "/api/review", request_body(scenario))
                policy = body.get("hold_policy") or {}
                signals = body.get("case", {}).get("signals", [])
                held = bool(policy.get("required", True))
                problems = grade(scenario, signals, held)
                if status != 200:
                    problems.append(f"HTTP {status} {body.get('error')}")
                verdict = body.get("verdict") or {}
                outcome = {
                    "status": status,
                    "held": held,
                    "reasons": policy.get("reasons"),
                    "signals": signals,
                    "decision": verdict.get("decision"),
                    "threat": verdict.get("threat"),
                    "sentence": verdict.get("sentence"),
                    "sentence_translated": verdict.get("sentence_es"),
                    "watchdog": (body.get("outputs") or {}).get("Watchdog"),
                    "skeptic": (body.get("outputs") or {}).get("Skeptic"),
                    "credit_cost": body.get("credit_cost"),
                }
            ok = not problems
            passed += ok
            results.append({"id": scenario["id"], "ok": ok, "problems": problems, **outcome})
            mark = "PASS" if ok else "FAIL"
            print(f"[{mark}] {scenario['id']}: {scenario['title']}  (expect {scenario['expect']})")
            print(f"       signs: {', '.join(outcome['signals']) or 'none'}")
            if server is not None:
                print(f"       held: {outcome['held']}  reasons: {outcome['reasons']}")
                print(f"       judge: {outcome['decision']} | {outcome['threat']} | {outcome['sentence']}")
            if problems:
                print(f"       problems: {'; '.join(problems)}")
            sys.stdout.flush()
    finally:
        if server is not None:
            server.shutdown()

    print(f"\n{passed}/{len(chosen)} scenarios as expected ({'live Prune + Swarms' if server else 'local checks only'}).")
    if args.json:
        Path(args.json).write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return 0 if passed == len(chosen) else 1


if __name__ == "__main__":
    raise SystemExit(main())
