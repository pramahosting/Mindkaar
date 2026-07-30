"""
Basic smoke tests. Run with: pytest (from the backend/ directory)
Forces demo mode so tests never depend on Ollama being installed.
"""
import os
os.environ["LLM_PROVIDER"] = "demo"
os.environ["DATABASE_URL"] = "sqlite:///./test_mental_gym.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_list_scenarios():
    r = client.get("/api/scenarios")
    assert r.status_code == 200
    scenarios = r.json()
    assert len(scenarios) >= 1
    assert any(s["title"] == "Angry Customer" for s in scenarios)


def test_full_simulation_flow():
    scenarios = client.get("/api/scenarios").json()
    angry_customer = next(s for s in scenarios if s["title"] == "Angry Customer")

    start = client.post("/api/simulations/start", json={"scenario_id": angry_customer["id"]})
    assert start.status_code == 200
    body = start.json()
    session_id = body["session_id"]
    assert body["first_question"]

    resp = client.post(
        f"/api/simulations/{session_id}/respond",
        json={"user_response": "I understand your frustration, let me check your order and help resolve this."},
    )
    assert resp.status_code == 200
    r_body = resp.json()
    assert r_body["is_relevant"] is True
    assert "character_response" in r_body

    # irrelevant response should be flagged
    resp2 = client.post(
        f"/api/simulations/{session_id}/respond",
        json={"user_response": "cricket"},
    )
    assert resp2.status_code == 200

    results = client.get(f"/api/simulations/{session_id}/results")
    assert results.status_code == 200
    assert "evaluation" in results.json()


def test_empty_response_rejected():
    scenarios = client.get("/api/scenarios").json()
    scenario = scenarios[0]
    start = client.post("/api/simulations/start", json={"scenario_id": scenario["id"]})
    session_id = start.json()["session_id"]

    resp = client.post(f"/api/simulations/{session_id}/respond", json={"user_response": "   "})
    assert resp.status_code in (400, 422)


def test_session_not_found():
    resp = client.get("/api/simulations/does-not-exist")
    assert resp.status_code == 404


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    if os.path.exists("test_mental_gym.db"):
        os.remove("test_mental_gym.db")
