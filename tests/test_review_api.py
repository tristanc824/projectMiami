"""End-to-end tests for the review API, with stand-in Swarms and Prune servers.

No keys and no network: the stand-ins answer in the shapes the Swarms docs
(https://docs.swarms.ai/docs/documentation/multi-agent/swarm_completions) and a
live Prune Gemini-proxy call returned. Run from the repo root:

    python -m unittest discover tests
"""

from __future__ import annotations

import json
import os
import re
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import app  # noqa: E402
from swarm import family_review, prune_gate  # noqa: E402

FAKE_PHONE = "305-555-0142"  # a made-up 555 number that must never reach Swarms


class FakeUpstream(BaseHTTPRequestHandler):
    """Plays Swarms (/v1/...) and Prune (/prune) at once, and records what it was sent."""

    judge_decision = "confirm"
    swarm_bodies: list[dict] = []
    prune_bodies: list[dict] = []
    prune_headers: list[dict] = []
    credits = 25.0
    prune_amount: str | None = None  # None: echo the note's amount, like a correct Prune
    same_language = False  # True: the Judge writes both sentences in Spanish, as a real run once did
    skeptic_line = "\nflag: no"

    def log_message(self, *args) -> None:  # keep test output quiet
        pass

    def _send(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802
        if self.headers.get("x-api-key") != "test-swarms-key":
            self._send(401, {"error": {"type": "authentication_error"}})
        elif self.path == "/v1/account/credits":
            self._send(200, {"total_credits": FakeUpstream.credits})
        else:
            self._send(404, {})

    def do_POST(self) -> None:  # noqa: N802
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/rpc-error":  # a Solana node answering with a JSON-RPC error
            self._send(200, {"jsonrpc": "2.0", "id": 1, "error": {"code": -32005, "message": "node is behind"}})
            return
        if self.path == "/prune":
            FakeUpstream.prune_bodies.append(body)
            FakeUpstream.prune_headers.append(dict(self.headers))
            sealing = len(body["messages"]) == 1
            note = body["messages"][-1]["content"]
            seen = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:dollars|usdc)", note, re.IGNORECASE)
            amount = FakeUpstream.prune_amount or (f"{seen.group(1)} USDC" if seen else "unknown")
            fields = {"amount": amount, "relationship": "niece", "purpose": "school supplies", "fiat_leg": "simulated"}
            text = "ok" if sealing else "```json\n" + json.dumps(fields) + "\n```"
            self._send(200, {
                "candidates": [{"content": {"parts": [{"text": text}], "role": "model"}}],
                "prune_metadata": {"receipt_signature": "c2lnbmVk", "run_id": self.headers.get("X-Prune-Run-Id")},
            })
            return
        if self.headers.get("x-api-key") != "test-swarms-key":
            self._send(401, {"error": {"type": "authentication_error"}})
            return
        FakeUpstream.swarm_bodies.append(body)
        verdict = {
            "decision": FakeUpstream.judge_decision,
            "sentence": "Una persona puede revisar esta transferencia." if FakeUpstream.same_language else "A person may review this transfer.",
            "sentence_es": "Una persona puede revisar esta transferencia.",
            "threat": "wrong amount",
            "limit": "It cannot tell whether the person asking is really family.",
            "suspicion": "none",
        }
        # The documented shape: a list of {role, content} turns, here with the task as the first turn.
        self._send(200, {
            "swarm_type": "SequentialWorkflow",
            "output": [
                {"role": "User", "content": body["task"]},
                {"role": "PlainSpeaker", "content": "You are about to send money. La transferencia es una simulación."},
                {"role": "Skeptic", "content": "The amount and relationship are stated." + FakeUpstream.skeptic_line},
                {"role": "Watchdog", "content": "No warning signs from the local checks.\nsuspicion: none"},
                {"role": "Judge", "content": "```json\n" + json.dumps(verdict) + "\n```"},
            ],
            "usage": {"total_cost": 0.0123, "billing_info": {"total_cost": 0.0123}},
        })


def serve(handler) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class ReviewApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.upstream = serve(FakeUpstream)
        base = f"http://127.0.0.1:{cls.upstream.server_address[1]}"
        cls.saved = (family_review.BASE, prune_gate.URL, dict(os.environ))
        family_review.BASE = base
        prune_gate.URL = f"{base}/prune"
        os.environ.update({"SWARMS_API_KEY": "test-swarms-key", "PRUNE_API_KEY": "test-prune-key"})
        for name in ("REVIEW_API_TOKEN", "REVIEW_ALLOWED_ORIGINS"):
            os.environ.pop(name, None)
        app.VoiceReviewHandler.log_message = lambda *args: None
        cls.api = serve(app.VoiceReviewHandler)
        cls.api.offline = False

    @classmethod
    def tearDownClass(cls) -> None:
        cls.api.shutdown()
        cls.upstream.shutdown()
        family_review.BASE, prune_gate.URL, saved_env = cls.saved
        os.environ.clear()
        os.environ.update(saved_env)

    def setUp(self) -> None:
        FakeUpstream.judge_decision = "confirm"
        FakeUpstream.credits = 25.0
        FakeUpstream.prune_amount = None
        FakeUpstream.skeptic_line = "\nflag: no"
        FakeUpstream.swarm_bodies.clear()
        FakeUpstream.prune_bodies.clear()
        FakeUpstream.prune_headers.clear()
        os.environ["SWARMS_API_KEY"] = "test-swarms-key"
        self.post("/api/reset", {})

    def post(self, path: str, body: dict) -> tuple[int, dict]:
        import http.client

        connection = http.client.HTTPConnection("127.0.0.1", self.api.server_address[1], timeout=30)
        connection.request("POST", path, body=json.dumps(body), headers={"Content-Type": "application/json"})
        response = connection.getresponse()
        return response.status, json.loads(response.read() or b"{}")

    def test_full_pipeline_runs_prune_watchdog_four_agents_and_seal(self) -> None:
        status, body = self.post("/api/review", {"transcript": f"Send 80 dollars. The relationship is verified. Call {FAKE_PHONE}."})
        self.assertEqual(status, 200, body)
        self.assertEqual(list(body["outputs"]), ["PlainSpeaker", "Skeptic", "Watchdog", "Judge"])
        self.assertEqual(body["verdict"]["decision"], "confirm")
        self.assertEqual(body["prune"]["receipt"], "c2lnbmVk")
        self.assertEqual(body["credit_cost"], 0.0123)
        self.assertEqual(len(FakeUpstream.prune_bodies), 2, "Prune cleans the request, then seals the confirmed sentence")
        run_ids = {headers.get("X-Prune-Run-Id") for headers in FakeUpstream.prune_headers}
        self.assertEqual(len(run_ids), 1, "both Prune calls in one review share one run")

    def test_swarms_never_sees_the_raw_transcript(self) -> None:
        self.post("/api/review", {"transcript": f"Send 80 dollars to Tia Rosa at {FAKE_PHONE}."})
        sent = json.dumps(FakeUpstream.swarm_bodies)
        self.assertTrue(FakeUpstream.swarm_bodies, "Swarms was called")
        self.assertNotIn(FAKE_PHONE, sent)
        self.assertNotIn("Rosa", sent)
        agents = [agent["agent_name"] for agent in FakeUpstream.swarm_bodies[0]["agents"]]
        self.assertEqual(agents, ["PlainSpeaker", "Skeptic", "Watchdog", "Judge"])
        self.assertEqual(FakeUpstream.swarm_bodies[0]["swarm_type"], "SequentialWorkflow")

    def test_extra_zero_is_held_even_when_the_model_confirms(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Send 800 dollars."})
        self.assertEqual(status, 200, body)
        self.assertIn("extra_zero", [signal["code"] for signal in body["signals"]])
        self.assertEqual(body["verdict"]["decision"], "hold")
        self.assertTrue(body["verdict"]["held_by_checks"])
        self.assertEqual(body["verdict"]["suspicion"], "high")
        self.assertIsNone(body["prune"]["receipt"], "a held transfer is not sealed")
        self.assertIn("extra_zero (high)", FakeUpstream.swarm_bodies[0]["task"], "the agents are told about the warning sign")

    def test_tenfold_change_between_reviews_is_caught(self) -> None:
        self.post("/api/review", {"transcript": "Send 80 dollars."})
        status, body = self.post("/api/review", {"transcript": "Send 800 dollars."})
        self.assertIn("changed_tenfold", [signal["code"] for signal in body["signals"]])

    def test_bad_swarms_key_is_a_clear_error(self) -> None:
        os.environ["SWARMS_API_KEY"] = "wrong-key"
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars."})
        self.assertEqual((status, body["error"]), (502, "swarms-auth"))
        self.assertIn("signals", body)

    def test_low_credits_is_a_budget_error(self) -> None:
        FakeUpstream.credits = 0.2
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars."})
        self.assertEqual((status, body["error"]), (402, "budget"))

    def test_prune_misreading_the_amount_is_caught(self) -> None:
        FakeUpstream.prune_amount = "80 USDC"  # the person said 800; Prune's model drops a zero
        status, body = self.post("/api/review", {"transcript": "Send 800 dollars."})
        codes = [signal["code"] for signal in body["signals"]]
        self.assertEqual(body["case"]["amount_usdc"], "800", "the person's words decide the amount")
        self.assertIn("amount_mismatch", codes)
        self.assertEqual(body["verdict"]["decision"], "hold")

    def test_correct_prune_amount_raises_no_mismatch(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.assertEqual(status, 200, body)
        self.assertNotIn("amount_mismatch", [signal["code"] for signal in body["signals"]])

    def test_task_states_what_is_still_needed(self) -> None:
        self.post("/api/review", {"transcript": "Send 80 dollars."})
        self.assertIn("still needed after other contributions, in digital dollars: 80", FakeUpstream.swarm_bodies[0]["task"])

    def test_untranslated_verdict_is_retried_once(self) -> None:
        FakeUpstream.same_language = True
        try:
            status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        finally:
            FakeUpstream.same_language = False
        self.assertEqual(status, 200, body)
        self.assertEqual(body["attempts"], 2, "an English sentence identical to the Spanish one triggers one retry")

    # --- Safe Hold -------------------------------------------------------------------

    def test_clean_review_needs_no_safe_hold(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        policy = body["hold_policy"]
        self.assertEqual(status, 200, body)
        self.assertFalse(policy["required"])
        self.assertEqual(policy["confirmations"], ["approver"])
        self.assertRegex(policy["review_hash"], r"^[0-9a-f]{64}$")

    def test_extra_zero_goes_to_a_24_hour_double_confirmed_safe_hold(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Send 800 dollars."})
        policy = body["hold_policy"]
        self.assertTrue(policy["required"])
        self.assertEqual((policy["hold_seconds"], policy["hold_hours"]), (86400, 24))
        self.assertEqual(policy["confirmations"], ["sender", "approver"])
        self.assertIn("watchdog:extra_zero", policy["reasons"])
        self.assertTrue(policy["sender_can_cancel"])

    def test_skeptic_flag_forces_a_safe_hold_even_when_the_judge_confirms(self) -> None:
        FakeUpstream.skeptic_line = "\nflag: yes"
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.assertEqual(body["verdict"]["decision"], "confirm")
        self.assertTrue(body["hold_policy"]["required"])
        self.assertEqual(body["hold_policy"]["reasons"], ["skeptic_flag"])

    def test_a_skeptic_without_a_flag_line_fails_closed(self) -> None:
        FakeUpstream.skeptic_line = ""
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.assertTrue(body["hold_policy"]["required"])
        self.assertIn("skeptic_unclear", body["hold_policy"]["reasons"])

    def test_review_hash_changes_with_the_amount(self) -> None:
        _, first = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.post("/api/reset", {})
        _, second = self.post("/api/review", {"transcript": "Send 70 dollars. The relationship is verified."})
        self.assertNotEqual(first["hold_policy"]["review_hash"], second["hold_policy"]["review_hash"])

    def test_hold_account_is_decoded_for_an_approver_screen(self) -> None:
        data = bytearray(243)
        data[0] = 1
        data[1:33] = bytes(range(1, 33))
        data[161:169] = (80_000_000).to_bytes(8, "little")
        data[202:210] = (1_000_000 + 86_400).to_bytes(8, "little", signed=True)
        data[210:242] = bytes.fromhex("ab" * 32)
        data[242] = 1
        hold = app.decode_hold("state", bytes(data), now=1_000_000)
        self.assertEqual(hold["amount_usdc"], "80")
        self.assertTrue(hold["safe_hold"])
        self.assertEqual(hold["seconds_left"], 86_400)
        self.assertFalse(hold["ready_for_signatures"])
        self.assertEqual(hold["needs"], ["sender signature", "approver signature", "PIN"])
        self.assertEqual(hold["review_hash"], "ab" * 32)
        later = app.decode_hold("state", bytes(data), now=1_000_000 + 86_401)
        self.assertTrue(later["ready_for_signatures"])

    def test_hold_endpoint_rejects_a_bad_address(self) -> None:
        import http.client

        connection = http.client.HTTPConnection("127.0.0.1", self.api.server_address[1], timeout=30)
        connection.request("GET", "/api/hold/not-an-address!")
        self.assertEqual(connection.getresponse().status, 400)

    # --- Council round 2: every fix has a test --------------------------------------------

    def codes(self, body: dict) -> list[str]:
        return [signal["code"] for signal in body["signals"]]

    def test_negated_instruction_is_held(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Don't send 80 dollars. The relationship is verified."})
        self.assertIn("negated_instruction", self.codes(body))
        self.assertTrue(body["hold_policy"]["required"])

    def test_a_lone_number_is_only_a_guess(self) -> None:
        status, body = self.post("/api/review", {"transcript": "My cousin was born in 1990."})
        self.assertIn("amount_guessed", self.codes(body))
        self.assertTrue(body["hold_policy"]["required"])

    def test_no_amount_at_all_is_held(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Please help my niece with school."})
        self.assertIn("amount_not_stated", self.codes(body))
        self.assertTrue(body["hold_policy"]["required"])

    def test_dollar_amount_is_not_mistaken_for_a_phone_number(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Send $10000.00 now."})
        self.assertEqual(body["case"]["amount_usdc"], "10000")

    def test_flag_yes_then_no_still_holds(self) -> None:
        FakeUpstream.skeptic_line = "\nflag: yes\nOn reflection:\nflag: no"
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.assertTrue(body["hold_policy"]["required"])
        self.assertIn("skeptic_flag", body["hold_policy"]["reasons"])

    def test_clean_and_flagged_reviews_have_different_hashes(self) -> None:
        _, clean = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.post("/api/reset", {})
        FakeUpstream.skeptic_line = "\nflag: yes"
        _, flagged = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.assertNotEqual(clean["hold_policy"]["review_hash"], flagged["hold_policy"]["review_hash"])
        self.assertTrue(clean["hold_policy"]["needs_policy_cosign"])
        self.assertFalse(flagged["hold_policy"]["needs_policy_cosign"])

    def test_error_responses_hold_rather_than_approve(self) -> None:
        os.environ["SWARMS_API_KEY"] = "wrong-key"
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars."})
        self.assertEqual(body["error"], "swarms-auth")
        self.assertTrue(body["hold_policy"]["required"])
        self.assertEqual(body["hold_policy"]["reasons"], ["review_failed:swarms-auth"])

    def test_offline_review_never_reads_as_approval(self) -> None:
        case = app.check_case(app.apply_voice_facts({}, "Send 80 dollars. The relationship is verified."), "Send 80 dollars.")
        review = family_review.offline_review(case)
        self.assertTrue(review["hold_policy"]["required"])
        self.assertIn("offline_demo", review["hold_policy"]["reasons"])

    def test_ambiguous_agent_output_fails_closed(self) -> None:
        twice = family_review.extract_outputs({"output": [
            {"role": "PlainSpeaker", "content": "a"},
            {"role": "Skeptic", "content": "flag: yes"},
            {"role": "Watchdog", "content": "c"},
            {"role": "Judge", "content": "{}"},
            {"role": "Skeptic", "content": "flag: no"},
        ]})
        self.assertTrue(family_review.skeptic_flag(twice["Skeptic"]), "the earlier flag: yes is kept")
        two_judges = family_review.extract_outputs({"output": [
            {"role": name, "content": "x"} for name in ("PlainSpeaker", "Skeptic", "Watchdog", "Judge", "Judge")
        ]})
        self.assertEqual(two_judges, {})
        unnamed = family_review.extract_outputs({"output": [{"role": "assistant", "content": "x"}] * 4})
        self.assertEqual(unnamed, {}, "roles are never guessed from position")

    def test_malformed_verdict_values_only_make_it_stricter(self) -> None:
        checked = family_review.apply_checks({"decision": "approve", "suspicion": "HIGH"}, [])
        self.assertEqual((checked["decision"], checked["suspicion"]), ("hold", "high"))

    def test_unknown_contributions_are_not_treated_as_zero(self) -> None:
        codes = family_review.detect_signals({"amount_usdc": "200", "requested_usdc": "200", "other_contributions_usdc": "?"})
        self.assertIn("invalid_amount_facts", codes)

    def test_hold_amount_keeps_full_precision(self) -> None:
        data = bytearray(243)
        data[0] = 1
        data[161:169] = (80_000_001).to_bytes(8, "little")
        self.assertEqual(app.decode_hold("state", bytes(data), now=0)["amount_usdc"], "80.000001")

    def test_solana_rpc_error_is_not_reported_as_no_hold(self) -> None:
        import http.client

        saved = app.SOLANA_RPC
        app.SOLANA_RPC = f"http://127.0.0.1:{self.upstream.server_address[1]}/rpc-error"
        try:
            connection = http.client.HTTPConnection("127.0.0.1", self.api.server_address[1], timeout=30)
            connection.request("GET", "/api/hold/4ZkpUtd5vBQQe9ZaYFJw5NhBrNg1LSKQHsZ9zFRxGPh3")
            response = connection.getresponse()
            self.assertEqual((response.status, json.loads(response.read())["error"]), (502, "solana-rpc"))
        finally:
            app.SOLANA_RPC = saved

    # --- Contacts: paying someone the sender has not saved goes to the Safe Hold ----------------

    def test_recipient_not_in_contacts_goes_to_safe_hold(self) -> None:
        status, body = self.post("/api/review", {
            "transcript": "Send 80 dollars. The relationship is verified.",
            "case": {"recipient_in_contacts": False},
        })
        self.assertEqual(status, 200, body)
        self.assertIn("recipient_not_in_contacts", self.codes(body))
        self.assertTrue(body["hold_policy"]["required"])
        self.assertIn("watchdog:recipient_not_in_contacts", body["hold_policy"]["reasons"])
        self.assertIn("recipient is in the sender's contacts: no", FakeUpstream.swarm_bodies[0]["task"])
        self.assertIs(body["case"]["recipient_in_contacts"], False)

    def test_known_contact_goes_through(self) -> None:
        status, body = self.post("/api/review", {
            "transcript": "Send 80 dollars. The relationship is verified.",
            "case": {"recipient_in_contacts": True, "requested_usdc": "200", "other_contributions_usdc": "120"},
        })
        self.assertEqual(self.codes(body), [])
        self.assertFalse(body["hold_policy"]["required"])
        self.assertIn("recipient is in the sender's contacts: yes", FakeUpstream.swarm_bodies[0]["task"])

    def test_unchecked_contacts_is_only_a_note(self) -> None:
        status, body = self.post("/api/review", {"transcript": "Send 80 dollars. The relationship is verified."})
        self.assertIn("recipient_contacts_unchecked", self.codes(body))
        self.assertFalse(body["hold_policy"]["required"], "a low note alone does not hold")

    def test_contacts_flag_only_accepts_booleans(self) -> None:
        status, body = self.post("/api/review", {
            "transcript": "Send 80 dollars.",
            "case": {"recipient_in_contacts": "yes"},
        })
        self.assertNotIn("recipient_in_contacts", body["case"])
        self.assertIn("recipient_contacts_unchecked", self.codes(body))

    def test_judge_output_matched_by_agent_name(self) -> None:
        outputs = family_review.extract_outputs({"output": [
            {"role": "User", "content": "task"},
            {"role": "PlainSpeaker", "content": "a"},
            {"role": "Skeptic", "content": "b"},
            {"role": "Watchdog", "content": "c"},
            {"role": "Judge", "content": "{}"},
        ]})
        self.assertEqual(outputs, {"PlainSpeaker": "a", "Skeptic": "b", "Watchdog": "c", "Judge": "{}"})


if __name__ == "__main__":
    unittest.main()
