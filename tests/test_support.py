"""The QuickBite support demo: its page, ask/simulate/stats/reset endpoints, and learning from the teacher."""

import pytest
from fastapi.testclient import TestClient

from apprentice import gateway
from apprentice.config import settings
from apprentice.engine import Engine
from apprentice.support.questions import CLUSTERS, EXAMPLES, simulation

QUESTION = "How do I cancel my order?"
PARAPHRASE = "How do I cancel my order please?"
TEACHER_ANSWER = "Tap Help > Cancel order. It is free until the restaurant accepts."


@pytest.fixture
def client(shop_db, fake, monkeypatch):
    """The real app with a fake-model engine, empty memory and traces, and no SUPPORT_MIN_SIM override."""
    monkeypatch.delenv("SUPPORT_MIN_SIM", raising=False)
    with TestClient(gateway.app) as c:
        gateway.app.state.engine = Engine(settings, gateway.db, fake.client())
        c.post("/api/reset", json={"targets": ["traces", "memory"]})
        yield c


def ask(client, question):
    return client.post("/api/support/ask", json={"question": question})


def test_ask_returns_the_answer_and_routing_fields(client, fake):
    fake.replies.update(teacher=TEACHER_ANSWER)
    r = ask(client, QUESTION)
    assert r.status_code == 200
    data = r.json()
    assert {"answer", "served_by", "reason", "cost_usd", "latency_ms", "memory_hits", "top_sim"} <= set(data)
    assert data["answer"] == TEACHER_ANSWER
    assert data["served_by"] == "teacher"
    assert data["reason"].startswith("no similar memory")
    assert data["cost_usd"] > 0
    assert data["memory_hits"] == 0


def test_the_policy_is_the_system_prompt(client, fake):
    fake.replies.update(teacher=TEACHER_ANSWER)
    ask(client, QUESTION)
    system = fake.bodies("teacher")[0]["messages"][0]
    assert system["role"] == "system"
    assert "QuickBite" in system["content"]
    assert "Refund timelines" in system["content"]


def test_a_similar_question_is_answered_by_the_student_from_memory(client, fake):
    fake.replies.update(teacher=TEACHER_ANSWER, student="Cancelling is free until the restaurant accepts.")
    assert ask(client, QUESTION).json()["served_by"] == "teacher"
    data = ask(client, PARAPHRASE).json()
    assert fake.roles() == ["teacher", "student"]
    assert data["served_by"] == "student"
    assert data["reason"].startswith("student passed: similar memory found")
    assert data["memory_hits"] == 1
    assert data["top_sim"] >= settings.memory_min_sim
    assert data["cost_usd"] == 0
    # The teacher's answer reaches the student as a few-shot example.
    assert {"role": "assistant", "content": TEACHER_ANSWER} in fake.bodies("student")[0]["messages"]


def test_support_min_sim_overrides_the_threshold_for_this_demo_only(client, fake, monkeypatch):
    monkeypatch.setenv("SUPPORT_MIN_SIM", "0.99")
    fake.replies.update(teacher=TEACHER_ANSWER)
    ask(client, QUESTION)
    data = ask(client, PARAPHRASE).json()
    assert data["served_by"] == "teacher"
    assert fake.roles() == ["teacher", "teacher"]


@pytest.mark.parametrize("body", [{}, {"question": "  "}, {"question": "x" * 1001}], ids=["missing", "blank", "long"])
def test_bad_questions_are_400(client, fake, body):
    r = client.post("/api/support/ask", json=body)
    assert r.status_code == 400
    assert fake.calls == []


def test_upstream_failure_is_a_502(client, fake):
    fake.replies.update(teacher=500)
    r = ask(client, QUESTION)
    assert r.status_code == 502
    assert r.json()["error"]["type"] == "upstream_error"


def test_simulate_replays_customers_and_the_student_takes_over(client, fake, monkeypatch):
    monkeypatch.setenv("SUPPORT_MIN_SIM", "0")  # every question after the first matches memory
    fake.replies.update(teacher=TEACHER_ANSWER, student="From memory.")
    data = client.post("/api/support/simulate", json={"limit": 8}).json()
    assert data["requests"] == 8
    assert data["errors"] == 0
    assert data["by_student"] == 7
    assert data["student_share"] == pytest.approx(7 / 8)
    assert [r["question"] for r in data["results"]] == simulation()[:8]
    assert data["results"][0]["served_by"] == "teacher"
    assert data["cost_usd"] == pytest.approx(data["results"][0]["cost_usd"])


def test_simulate_reports_errors_without_failing(client, fake):
    fake.replies.update(teacher=500)
    data = client.post("/api/support/simulate", json={"limit": 2}).json()
    assert data["requests"] == 2
    assert data["errors"] == 2
    assert data["student_share"] == 0.0


def test_stats_and_reset_cover_support_traffic_only(client, fake):
    fake.replies.update(teacher=TEACHER_ANSWER)
    ask(client, QUESTION)
    client.post("/v1/chat/completions", json={
        "messages": [{"role": "user", "content": "unrelated"}], "apprentice": {"mode": "teacher", "tag": "other"},
    })
    stats = client.get("/api/support/stats").json()
    assert stats["totals"]["requests"] == 1
    assert stats["memory_size"] == 1
    assert stats["timeline"][0]["served_by"] == "teacher"

    assert client.post("/api/support/reset").json() == {"reset": "support"}
    stats = client.get("/api/support/stats").json()
    assert stats["totals"]["requests"] == 0
    assert stats["memory_size"] == 0
    assert client.get("/api/stats").json()["totals"]["requests"] == 1  # the other trace is kept


def test_page_and_assets_are_served(client):
    r = client.get("/support")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
    assert "QuickBite" in r.text
    assert client.get("/support/support.js").status_code == 200
    assert "text/css" in client.get("/support/support.css").headers["content-type"]
    assert client.get("/support/secrets.txt").status_code == 404


def test_questions_endpoint(client):
    data = client.get("/api/support/questions").json()
    assert data["examples"] == EXAMPLES
    assert len(data["simulation"]) == 30
    assert sorted(data["simulation"]) == sorted(q for qs in CLUSTERS.values() for q in qs)
