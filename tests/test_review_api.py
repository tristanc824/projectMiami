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
            "sentence": "A person may review this transfer.",
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
                {"role": "Skeptic", "content": "The amount and relationship are stated."},
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
