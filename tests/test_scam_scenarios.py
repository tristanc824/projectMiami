"""Scam and identity checks: the red-team scenarios, privacy of the incoming message, and false alarms.

    python -m unittest discover tests
"""

from __future__ import annotations

import json
import os
import sys
import unittest
from http.client import HTTPConnection
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import app  # noqa: E402
import test_review_api as base  # noqa: E402
from swarm import family_review, prune_gate, scam_scenarios  # noqa: E402

SCAMMER_WORDS = "Hi Mom, I dropped my phone, this is my new number. Zebra-7731 needs 300 today."


class ScenarioLocalChecks(unittest.TestCase):
    def test_every_scenario_raises_its_signs_and_controls_stay_quiet(self) -> None:
        for scenario in scam_scenarios.SCENARIOS:
            with self.subTest(scenario["id"]):
                local = scam_scenarios.local_result(scenario)
                self.assertEqual(scam_scenarios.grade(scenario, local["signals"], None), [])
                self.assertEqual(local["held_by_checks"], scenario["expect"] == "hold")

    def test_honest_family_words_are_not_scams(self) -> None:
        honest = [
            "Send 80 dollars to my sister for her immigration fees.",
            "I'll send the PIN to my sister so she can collect it.",
            "I typed 800 by accident.",
            "Her social security check is late this month.",
            "She won a premio at school, send 30 for the trip.",
            "He will refund me later.",
            "Envía 80 dólares, lo hice por accidente.",
            "My brother works at the hacienda.",
        ]
        for text in honest:
            with self.subTest(text):
                self.assertEqual(app.scam_patterns(text), [])

    def test_each_pattern_has_an_example(self) -> None:
        examples = {
            "claims_new_number": "this is my new number",
            "authority_impersonation": "this is the fraud department",
            "code_request": "read me the code",
            "payment_pivot": "buy gift cards",
            "refund_overpayment": "I sent you 500 by mistake",
            "investment_promise": "guaranteed returns",
            "prize_fee": "pay the processing fee",
            "emergency_story": "I'm in jail",
        }
        self.assertEqual(set(examples), set(family_review.SCAM_CODES))
        for code, text in examples.items():
            with self.subTest(code):
                self.assertIn(code, app.scam_patterns(text))

    def test_identity_facts_must_be_well_typed(self) -> None:
        case = app.safe_case({
            "contact_added_days": "3", "recipient_account_age_days": True, "prior_transfers_to_recipient": -1,
            "request_channel": "telegram", "claimed_name_matches_contact": "no", "recipient_details_changed": 1,
        })
        for field in ("contact_added_days", "recipient_account_age_days", "prior_transfers_to_recipient",
                      "request_channel", "claimed_name_matches_contact", "recipient_details_changed"):
            self.assertNotIn(field, case)

    def test_watchdog_agent_can_add_a_hold_but_never_remove_one(self) -> None:
        case = {"amount_usdc": "80", "requested_usdc": "200", "other_contributions_usdc": "120", "signals": []}
        confirm = {"decision": "confirm", "suspicion": "none"}

        def policy(watchdog: str, verdict: dict | None = None, signals: list | None = None) -> dict:
            outputs = {"Skeptic": "ok\nflag: no", "Watchdog": watchdog}
            return family_review.hold_policy({**case, "signals": signals or []}, outputs, verdict or confirm)

        self.assertFalse(policy("No warning signs.\nsuspicion: none")["required"])
        self.assertEqual(policy("Odd wording.\nsuspicion: high")["reasons"], ["watchdog_suspicion"])
        self.assertIn("watchdog_suspicion", policy("suspicion: high\nsuspicion: none")["reasons"])
        self.assertEqual(policy("I forgot the last line.")["reasons"], ["watchdog_unclear"])
        self.assertEqual(policy("suspicion: none", {"decision": "confirm", "suspicion": "high"})["reasons"], ["judge_suspicion"])
        # A calm Watchdog cannot cancel a hold the local checks raised.
        self.assertIn("watchdog:new_contact", policy("suspicion: none", signals=["new_contact"])["reasons"])

    def test_scam_codes_cannot_be_injected_by_name(self) -> None:
        # Only the server's own scan can add scam codes; arbitrary strings are ignored.
        self.assertEqual(
            family_review.detect_signals({"amount_usdc": "80", "requested_usdc": "200", "other_contributions_usdc": "120"},
                                         recipient_in_contacts=True, scam_patterns=["extra_zero", "made_up"]),
            [],
        )


class ScenarioApi(unittest.TestCase):
    """The scam path through the API, with the stand-in Swarms and Prune servers."""

    @classmethod
    def setUpClass(cls) -> None:
        base.ReviewApiTest.setUpClass.__func__(cls)

    @classmethod
    def tearDownClass(cls) -> None:
        base.ReviewApiTest.tearDownClass.__func__(cls)

    def setUp(self) -> None:
        base.FakeUpstream.judge_decision = "confirm"
        base.FakeUpstream.skeptic_line = "\nflag: no"
        base.FakeUpstream.prune_amount = None
        base.FakeUpstream.swarm_bodies.clear()
        base.FakeUpstream.prune_bodies.clear()
        app.remember(None)

    def post(self, body: dict) -> tuple[int, dict]:
        connection = HTTPConnection("127.0.0.1", self.api.server_address[1], timeout=30)
        connection.request("POST", "/api/review", json.dumps(body), {"Content-Type": "application/json"})
        response = connection.getresponse()
        return response.status, json.loads(response.read())

    def test_new_number_scam_goes_to_safe_hold_even_when_the_models_say_confirm(self) -> None:
        scenario = next(s for s in scam_scenarios.SCENARIOS if s["id"] == "hi_mom_new_number")
        status, body = self.post(scam_scenarios.request_body(scenario))
        self.assertEqual(status, 200, body)
        reasons = body["hold_policy"]["reasons"]
        self.assertTrue(body["hold_policy"]["required"])
        self.assertIn("watchdog:new_contact", reasons)
        self.assertIn("watchdog:claims_new_number", reasons)
        self.assertEqual(body["verdict"]["decision"], "hold", "a high sign overrides the Judge's confirm")
        task = base.FakeUpstream.swarm_bodies[0]["task"]
        self.assertIn("recipient saved as a contact: 0 days ago", task)
        self.assertIn("claims_new_number (high)", task)

    def test_incoming_message_never_leaves_the_server(self) -> None:
        status, body = self.post({
            "transcript": "Send 80 dollars. The relationship is verified.",
            "incoming_message": SCAMMER_WORDS,
            "case": {"recipient_in_contacts": True},
        })
        self.assertEqual(status, 200, body)
        self.assertIn("claims_new_number", body["case"]["signals"])
        sent = json.dumps(base.FakeUpstream.swarm_bodies) + json.dumps(base.FakeUpstream.prune_bodies)
        for secret in ("Zebra-7731", "dropped my phone", "new number. "):
            self.assertNotIn(secret, sent)
            self.assertNotIn(secret, json.dumps(body))

    def test_message_request_with_wrong_name_is_held(self) -> None:
        status, body = self.post({
            "transcript": "Send 80 dollars. The relationship is verified.",
            "case": {"recipient_in_contacts": True, "request_channel": "message_request",
                     "claimed_name_matches_contact": False, "requested_usdc": "200", "other_contributions_usdc": "120"},
        })
        self.assertTrue(body["hold_policy"]["required"])
        self.assertIn("watchdog:message_request", body["hold_policy"]["reasons"])
        self.assertIn("watchdog:name_mismatch", body["hold_policy"]["reasons"])
        self.assertIn("how the request reached the sender: message request", base.FakeUpstream.swarm_bodies[0]["task"])

    def test_bad_incoming_message_is_rejected(self) -> None:
        status, body = self.post({"transcript": "Send 80 dollars.", "incoming_message": ["not", "text"]})
        self.assertEqual((status, body["error"]), (400, "bad-incoming-message"))


if __name__ == "__main__":
    unittest.main()
