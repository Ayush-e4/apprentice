"""Kirana Copilot: questions go through the engine, and the chosen SQL runs read-only."""

import pytest
from fastapi.testclient import TestClient

from apprentice import gateway
from apprentice.config import settings
from apprentice.engine import Engine

from .fakes import BROKEN_SQL, GOOD_SQL, sql_reply


@pytest.fixture
def client(shop_db, fake):
    with TestClient(gateway.app) as c:
        gateway.app.state.engine = Engine(settings, gateway.db, fake.client())
        yield c


def ask(client, question="How many orders have been placed?", **body):
    return client.post("/api/shop/ask", json={"question": question, **body})


def test_page_and_examples_are_served(client):
    page = client.get("/shop")
    assert page.status_code == 200
    assert "Kirana Copilot" in page.text
    examples = client.get("/api/shop/examples").json()["examples"]
    assert len(examples) >= 5
    assert any("mein" in q for q in examples), "includes Hinglish examples"


def test_student_answer_comes_back_as_a_number(client, fake):
    fake.replies.update(student=GOOD_SQL, judge=0.95)
    d = ask(client).json()
    assert d["served_by"] == "student"
    assert d["columns"] == ["COUNT(*)"]
    assert d["rows"] == [[3000]]
    assert d["error"] is None
    assert d["judge_score"] == pytest.approx(0.95)
    assert d["cost_usd"] == 0


def test_low_judge_score_escalates_to_the_teacher(client, fake):
    wrong = sql_reply("SELECT COUNT(*) FROM stores")
    fake.replies.update(student=wrong, judge=0.05, teacher=GOOD_SQL)
    d = ask(client).json()
    assert d["served_by"] == "teacher"
    assert d["escalated"] is True
    assert "judge 0.05" in d["reason"]
    assert d["rows"] == [[3000]]
    assert d["cost_usd"] > 0


def test_broken_student_sql_escalates_without_asking_the_judge(client, fake):
    fake.replies.update(student=BROKEN_SQL, teacher=GOOD_SQL)
    d = ask(client, judge=None).json()
    assert d["served_by"] == "teacher"
    assert "SQL error" in d["reason"]
    assert "judge" not in fake.roles()


def test_rows_are_capped(client, fake):
    fake.replies.update(student=sql_reply("SELECT id FROM orders"), judge=0.9)
    d = ask(client, question="List every order id").json()
    assert len(d["rows"]) == 50
    assert d["truncated"] is True


def test_queries_cannot_write(client, fake):
    fake.replies.update(student=sql_reply("SELECT 1"), judge=0.9)
    d = ask(client).json()
    assert d["rows"] == [[1]]
    # The answer table runs on a read-only connection; a write never reaches the database.
    from apprentice.shop import _answer_table

    _, _, error = _answer_table(settings.bench_db_path, "DELETE FROM orders")
    assert error and "readonly" in error.replace("-", "").replace(" ", "").lower()


@pytest.mark.parametrize("body", [{"question": ""}, {"question": "x", "mode": "bogus"}, {"question": "x", "judge": "bogus"}])
def test_bad_requests_are_rejected(client, body):
    assert client.post("/api/shop/ask", json=body).status_code in (400, 422)
