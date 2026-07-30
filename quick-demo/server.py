import json
import os
import re
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SCENARIOS = {
    "angry_customer": {
        "id": "angry_customer", "title": "Angry Customer",
        "description": "A customer's order is two weeks late and they are furious.",
        "objective": "Understand the frustration, demonstrate empathy, and de-escalate.",
        "difficulty": "medium",
        "character": {"name": "Alex", "role": "Customer"},
        "opening_line": "I have been waiting for my order for two weeks! This is completely unacceptable. Why has nobody helped me?",
        "total_questions": 3,
        "initial_emotion": {"primary_emotion": "anger", "intensity": 0.9, "anger": 0.9, "frustration": 0.85, "trust": 0.1, "calmness": 0.1},
    }
}

POSITIVE = {"understand", "sorry", "apologize", "help", "listen", "appreciate", "resolve", "fix", "care"}
NEGATIVE = {"not my problem", "calm down", "whatever", "don't care", "nothing i can do"}

FOLLOWUPS = [
    "What would you do next to resolve this?",
    "How can you make sure this doesn't happen again?",
    "Why should I trust that this will actually get fixed?",
]

SESSIONS = {}


def clamp(v):
    return max(0.0, min(1.0, v))


def analyze(session, user_text):
    text = user_text.lower()
    is_relevant = len(text.split()) >= 3
    pos = sum(1 for w in POSITIVE if w in text)
    neg = sum(1 for w in NEGATIVE if w in text)
    quality = pos - neg

    e = session["emotion"]
    if not is_relevant:
        delta = 0.03
        empathy = comm = listening = deesc = 2
    elif quality > 0:
        delta = -0.15
        empathy = comm = listening = deesc = min(10, 6 + pos)
    elif quality < 0:
        delta = 0.12
        empathy = 3; comm = 3; listening = 3; deesc = 2
    else:
        delta = 0.0
        empathy = comm = listening = deesc = 5

    anger = clamp(e["anger"] + delta)
    frustration = clamp(e["frustration"] + delta * 0.9)
    trust = clamp(e["trust"] - delta * 1.1)
    calmness = clamp(e["calmness"] - delta)
    primary = "anger" if anger > 0.7 else ("frustration" if frustration > 0.55 else ("calm" if calmness > 0.6 else "neutral"))
    new_emotion = {"primary_emotion": primary, "intensity": max(anger, frustration, calmness), "anger": anger, "frustration": frustration, "trust": trust, "calmness": calmness}

    if not is_relevant:
        char_response = "...I don't think that answers what I asked. Can you address my actual concern?"
    elif quality > 0:
        char_response = "...okay. I appreciate you actually listening to me for once."
    elif quality < 0:
        char_response = "Wow. That's really not the answer I was hoping for."
    else:
        char_response = "Okay... I guess we'll see."

    idx = session["question_index"]
    should_continue = (idx + 1) < session["scenario"]["total_questions"]
    next_q = FOLLOWUPS[idx % len(FOLLOWUPS)] if should_continue else None

    return {
        "is_relevant": is_relevant, "empathy_score": empathy, "communication_score": comm,
        "active_listening_score": listening, "deescalation_score": deesc,
        "character_response": char_response, "next_question": next_q,
        "emotion": new_emotion, "should_continue": should_continue,
    }


def evaluate(session):
    resp = session["responses"]
    avg = lambda k: round(sum(r[k] for r in resp) / len(resp)) if resp else 0
    empathy = avg("empathy_score") * 10
    comm = avg("communication_score") * 10
    listening = avg("active_listening_score") * 10
    deesc = avg("deescalation_score") * 10
    history = session["emotion_history"]
    awareness = max(0, min(100, round(50 + (history[0]["anger"] - history[-1]["anger"]) * 100))) if len(history) > 1 else 50
    overall = round((empathy + comm + listening + awareness + deesc) / 5)
    return {
        "empathy_score": empathy, "communication_score": comm, "active_listening_score": listening,
        "emotional_awareness_score": awareness, "conflict_resolution_score": deesc, "overall_score": overall,
        "strengths": ["Acknowledged the customer's emotions."] if empathy >= 70 else ["Completed the full simulation."],
        "weaknesses": ["Offer more concrete next steps."] if deesc < 70 else ["Keep practicing harder scenarios."],
        "feedback": f"Overall you scored {overall}/100.",
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            with open(os.path.join(os.path.dirname(__file__), "index.html"), "rb") as f:
                body = f.read()
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/api/health":
            return self._send(200, {"status": "ok", "llm_provider": "demo", "llm_model": "rule-based-demo"})
        if path == "/api/scenarios":
            return self._send(200, list(SCENARIOS.values()))
        m = re.match(r"^/api/simulations/([\w-]+)/results$", path)
        if m:
            s = SESSIONS.get(m.group(1))
            if not s:
                return self._send(404, {"detail": "not found"})
            return self._send(200, {
                "scenario_title": s["scenario"]["title"], "transcript": s["transcript"],
                "emotion_journey": s["emotion_history"], "evaluation": s.get("evaluation") or evaluate(s),
            })
        self._send(404, {"detail": "not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/simulations/start":
            body = self._read_json()
            scenario = SCENARIOS[body["scenario_id"]]
            sid = str(uuid.uuid4())
            SESSIONS[sid] = {
                "scenario": scenario, "question_index": 0, "current_question": scenario["opening_line"],
                "emotion": dict(scenario["initial_emotion"]), "responses": [],
                "emotion_history": [dict(scenario["initial_emotion"], message_index=0)],
                "transcript": [{"sender": "ai", "message": scenario["opening_line"]}],
                "status": "in_progress",
            }
            return self._send(200, {
                "session_id": sid, "scenario": scenario, "mode": "demo",
                "first_question": scenario["opening_line"], "emotion": scenario["initial_emotion"],
                "question_index": 0, "total_questions": scenario["total_questions"],
            })

        m = re.match(r"^/api/simulations/([\w-]+)/respond$", path)
        if m:
            s = SESSIONS.get(m.group(1))
            if not s:
                return self._send(404, {"detail": "not found"})
            body = self._read_json()
            text = body.get("user_response", "").strip()
            if not text:
                return self._send(400, {"detail": "Response cannot be empty."})
            result = analyze(s, text)
            s["responses"].append(result)
            s["emotion"] = result["emotion"]
            s["emotion_history"].append(dict(result["emotion"], message_index=len(s["transcript"]) + 1))
            s["transcript"].append({"sender": "user", "message": text})
            s["transcript"].append({"sender": "ai", "message": result["character_response"]})
            if result["should_continue"]:
                s["question_index"] += 1
                s["current_question"] = result["next_question"]
            else:
                s["status"] = "completed"
            return self._send(200, {
                "is_relevant": result["is_relevant"], "character_response": result["character_response"],
                "next_question": result["next_question"], "emotion": result["emotion"],
                "should_continue": result["should_continue"], "question_index": s["question_index"],
                "total_questions": s["scenario"]["total_questions"], "mode": "demo",
            })

        m = re.match(r"^/api/simulations/([\w-]+)/complete$", path)
        if m:
            s = SESSIONS.get(m.group(1))
            if not s:
                return self._send(404, {"detail": "not found"})
            s["evaluation"] = evaluate(s)
            return self._send(200, {"status": "completed", "overall_score": s["evaluation"]["overall_score"]})

        self._send(404, {"detail": "not found"})

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    port = 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Mental Gym quick demo running -> open http://127.0.0.1:{port} in your browser")
    print("Press Ctrl+C to stop.")
    server.serve_forever()
