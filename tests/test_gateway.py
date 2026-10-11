"""The FastAPI gateway: the OpenAI-compatible endpoint and the dashboard API."""

import time

import pytest
from fastapi.testclient import TestClient

from apprentice import gateway
from apprentice.config import settings
from apprentice.engine import Engine

from .fakes import BROKEN_SQL, GOOD_SQL, messages

QUESTION = "How many orders have been placed in total?"


@pytest.fixture
def client(shop_db, fake):
    """The real app, with its engine swapped for one that talks to the fake models."""
    with TestClient(gateway.app) as c:
        gateway.app.state.engine = Engine(settings, gateway.db, fake.client())
        yield c


def chat(client, headers=None, **apprentice):
    body = {"model": "apprentice", "messages": messages(QUESTION), "apprentice": apprentice}
    return client.post("/v1/chat/completions", json=body, headers=headers or {})


def test_chat_completion_has_the_openai_shape(client, fake):
    fake.replies.update(student=GOOD_SQL)
    r = chat(client, verifier="sql", tag="test")
    assert r.status_code == 200
    data = r.json()
    assert data["object"] == "chat.completion"
    assert data["id"] == f"chatcmpl-apprentice-{data['apprentice']['trace_id']}"
    assert data["model"] == "fake-student"
    [choice] = data["choices"]
    assert choice["index"] == 0
    assert choice["finish_reason"] == "stop"
    assert choice["message"] == {"role": "assistant", "content": GOOD_SQL}
    assert data["usage"] == {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}


def test_chat_completion_has_the_apprentice_block(client, fake):
    fake.replies.update(student=BROKEN_SQL, teacher=GOOD_SQL)
    meta = chat(client, verifier="sql", memory=False, learn=False).json()["apprentice"]
    assert set(meta) == {
        "served_by", "escalated", "reason", "cost_usd", "latency_ms",
        "memory_hits", "top_sim", "check_score", "trace_id",
    }
    assert meta["served_by"] == "teacher"
    assert meta["escalated"] is True
    assert meta["reason"].startswith("escalated: sql check: SQL error")
    assert meta["cost_usd"] > 0
    assert meta["check_score"] is None


def test_options_can_come_from_headers(client, fake):
    fake.replies.update(teacher="from the teacher")
    r = client.post(
        "/v1/chat/completions",
        json={"model": "apprentice", "messages": messages(QUESTION)},
        headers={"X-Apprentice-Mode": "Teacher", "X-Apprentice-Learn": "false"},
    )
    assert r.json()["apprentice"]["reason"] == "mode=teacher"
    assert fake.roles() == ["teacher"]


def test_invalid_mode_is_a_400(client, fake):
    r = chat(client, mode="fastest")
    assert r.status_code == 400
    assert r.json()["error"]["type"] == "invalid_request_error"
    assert "mode must be one of" in r.json()["error"]["message"]
    assert fake.calls == []


def test_invalid_judge_is_a_400(client):
    r = chat(client, judge="vibes")
    assert r.status_code == 400
    assert "judge must be one of" in r.json()["error"]["message"]


@pytest.mark.parametrize(
    "body",
    [{"messages": []}, {"messages": "hi"}, {"messages": [{"role": "user", "content": "hi"}], "stream": True}],
    ids=["empty-messages", "messages-not-a-list", "stream"],
)
def test_bad_requests_are_400(client, body):
    r = client.post("/v1/chat/completions", json=body)
    assert r.status_code == 400


def test_upstream_failure_is_a_502(client, fake):
    fake.replies.update(teacher=500)
    r = chat(client, mode="teacher")
    assert r.status_code == 502
    assert r.json()["error"]["type"] == "upstream_error"


def test_models(client):
    assert client.get("/v1/models").json()["data"][0]["id"] == "apprentice"


def test_stats(client, fake):
    fake.replies.update(student=GOOD_SQL)
    chat(client, verifier="sql")
    data = client.get("/api/stats").json()
    assert data["totals"]["requests"] >= 1
    assert data["totals"]["by_student"] >= 1
    assert isinstance(data["memory_size"], int)
    assert data["timeline"][-1]["served_by"] == "student"
    assert data["config"]["student"][0]["model"] == "fake-student"
    assert data["config"]["teacher"][0]["model"] == "fake-teacher"


def test_traces(client, fake):
    fake.replies.update(student=GOOD_SQL)
    trace_id = chat(client, verifier="sql", tag="traces-test").json()["apprentice"]["trace_id"]
    rows = client.get("/api/traces", params={"limit": 5}).json()
    assert len(rows) <= 5
    assert rows[0]["id"] == trace_id
    assert rows[0]["tag"] == "traces-test"
    assert rows[0]["question"] == QUESTION


def test_evals(client):
    run_id = gateway.db.execute(
        """INSERT INTO eval_runs (ts, phase, mode, n, correct, accuracy, student_share, cost_usd,
           p50_ms, p95_ms, memory_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (time.time(), "baseline", "cascade", 10, 8, 0.8, 0.6, 0.01, 900.0, 2000.0, 0),
    )
    rows = client.get("/api/evals").json()
    assert any(r["id"] == run_id and r["accuracy"] == 0.8 for r in rows)


def test_reset_clears_traces(client, fake):
    fake.replies.update(teacher="hi")
    chat(client, mode="teacher")
    assert client.post("/api/reset", json={"targets": ["traces"]}).json() == {"reset": ["traces"]}
    assert client.get("/api/traces").json() == []


def test_bench_system_prompt(client):
    assert "```sql" in client.get("/api/bench/system-prompt").json()["prompt"]


