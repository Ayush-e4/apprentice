"""Memory is scoped by system prompt (issue #14): one app's answers never become another app's examples."""

import asyncio
import sqlite3

import pytest
from fastapi.testclient import TestClient

from apprentice import gateway
from apprentice.config import settings
from apprentice.db import Database
from apprentice.engine import Engine, Options, Result
from apprentice.memory import NO_SYSTEM, Memory, backfill_scopes, scope_of
from apprentice.support.knowledge import SYSTEM_PROMPT as SUPPORT_PROMPT
from bench.questions import SYSTEM_PROMPT as SQL_PROMPT

from .fakes import BROKEN_SQL, GOOD_SQL, sql_reply

PROMPT_A = "You answer questions about QuickBite orders."
PROMPT_B = "You write SQLite queries for a grocery chain."
QUESTION = "mera order abhi tak nahi aaya, kab aayega?"

# The schema before scoping: memory has no scope column.
OLD_SCHEMA = """
CREATE TABLE traces (
    id INTEGER PRIMARY KEY, ts REAL NOT NULL, mode TEXT NOT NULL, served_by TEXT NOT NULL,
    model TEXT NOT NULL, escalated INTEGER NOT NULL, reason TEXT, question TEXT, response TEXT,
    prompt_tokens INTEGER, completion_tokens INTEGER, cost_usd REAL, latency_ms REAL,
    memory_hits INTEGER, top_sim REAL, tag TEXT, check_score REAL
);
CREATE TABLE memory (
    id INTEGER PRIMARY KEY, ts REAL NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
    embedding TEXT, trace_id INTEGER
);
"""


def chat(engine: Engine, system: str | None, question: str = QUESTION, **opts) -> Result:
    msgs = [{"role": "system", "content": system}] if system else []
    msgs.append({"role": "user", "content": question})
    return asyncio.run(engine.handle(msgs, Options(**opts)))


def scopes(db: Database) -> dict[str, str | None]:
    return {r["question"]: r["scope"] for r in db.query("SELECT question, scope FROM memory")}


def search(db: Database, question: str, scope: str) -> list[str]:
    hits = asyncio.run(Memory(db, None, None).search(question, 5, scope))
    return [h.question for h in hits]


# --- scope_of


def test_scope_is_a_short_stable_hash_of_the_system_prompt():
    assert scope_of(PROMPT_A) == scope_of(PROMPT_A)
    assert scope_of(PROMPT_A) != scope_of(PROMPT_B)
    assert len(scope_of(PROMPT_A)) == 16
    int(scope_of(PROMPT_A), 16)
    assert scope_of("") == NO_SYSTEM == "none"


# --- the engine


def test_an_answer_remembered_for_one_prompt_is_never_an_example_for_another(engine, fake):
    fake.replies.update(teacher="Your order is on its way.", student="Student answer.")
    first = chat(engine, PROMPT_A)
    assert first.served_by == "teacher"
    assert scopes(engine.db) == {QUESTION: scope_of(PROMPT_A)}

    other = chat(engine, PROMPT_B)  # the identical question, another app
    assert other.served_by == "teacher"
    assert other.memory_hits == 0
    assert other.top_sim == 0.0
    assert fake.roles() == ["teacher", "teacher"]
    assert [m["role"] for m in fake.bodies("teacher")[1]["messages"]] == ["system", "user"]

    same = chat(engine, PROMPT_A)
    assert same.served_by == "student"
    assert same.memory_hits == 1
    sent = fake.bodies("student")[0]["messages"]
    assert [m["role"] for m in sent] == ["system", "user", "assistant", "user"]
    assert sent[2]["content"] == "Your order is on its way."


def test_requests_without_a_system_message_have_their_own_scope(engine, fake):
    fake.replies.update(teacher="teacher answer", student="student answer")
    chat(engine, None)
    assert scopes(engine.db) == {QUESTION: NO_SYSTEM}
    assert chat(engine, PROMPT_A).served_by == "teacher"
    assert chat(engine, None).served_by == "student"


def test_an_explicit_scope_shares_memory_on_purpose(engine, fake):
    fake.replies.update(teacher="teacher answer", student="student answer")
    chat(engine, PROMPT_A, scope="quickbite")
    assert scopes(engine.db) == {QUESTION: "quickbite"}
    r = chat(engine, PROMPT_B, scope="quickbite")
    assert r.served_by == "student"
    assert r.memory_hits == 1
    assert chat(engine, PROMPT_A).served_by == "teacher", "without the option, the prompt's own scope is used"


def test_the_sql_flow_still_reuses_its_memory(engine, fake):
    teacher_sql = sql_reply("SELECT COUNT(*) FROM orders o")
    fake.replies.update(student=[BROKEN_SQL, GOOD_SQL], teacher=teacher_sql)
    q = "How many orders have been placed in total?"
    assert chat(engine, SQL_PROMPT, q, verifier="sql").served_by == "teacher"
    r = chat(engine, SQL_PROMPT, "How many orders have been placed in total so far?", verifier="sql")
    assert r.served_by == "student"
    assert r.memory_hits == 1
    assert scopes(engine.db) == {q: scope_of(SQL_PROMPT)}


# --- migration and backfill


@pytest.fixture
def old_db(tmp_path):
    """A database made before scoping, with support, shop, benchmark and untraced memory."""
    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.executescript(OLD_SCHEMA)
    for trace_id, tag in [(1, "support"), (2, "shop"), (3, "bench-warm"), (4, None)]:
        conn.execute(
            "INSERT INTO traces (id, ts, mode, served_by, model, escalated, tag) VALUES (?, 0, 'cascade', 'teacher', 'm', 1, ?)",
            (trace_id, tag),
        )
    rows = [
        ("How do I cancel my order?", 1),
        ("How many orders were placed?", 2),
        ("How many customers live in Andheri?", 3),
        ("How many stores are there?", 4),
        ("How many products are there?", None),
    ]
    conn.executemany("INSERT INTO memory (ts, question, answer, trace_id) VALUES (0, ?, 'answer', ?)", rows)
    conn.commit()
    conn.close()
    return path


def test_the_migration_adds_the_scope_column_and_keeps_every_row(old_db):
    db = Database(old_db)
    assert "scope" in {r["name"] for r in db.query("PRAGMA table_info(memory)")}
    assert db.scalar("SELECT COUNT(*) FROM memory") == 5
    assert set(scopes(db).values()) == {None}
    Database(old_db)  # opening it again is fine


def test_backfill_gives_support_rows_the_support_scope_and_the_rest_the_sql_scope(old_db):
    db = Database(old_db)
    assert backfill_scopes(db) == 5
    support, sql = scope_of(SUPPORT_PROMPT), scope_of(SQL_PROMPT)
    assert scopes(db) == {
        "How do I cancel my order?": support,
        "How many orders were placed?": sql,
        "How many customers live in Andheri?": sql,
        "How many stores are there?": sql,
        "How many products are there?": sql,
    }
    assert backfill_scopes(db) == 0, "idempotent"
    assert search(db, "How do I cancel my order?", support) == ["How do I cancel my order?"]
    assert "How do I cancel my order?" not in search(db, "How do I cancel my order?", sql)
    assert len(search(db, "How many orders?", sql)) == 4


def test_rows_not_yet_backfilled_are_only_visible_to_the_sql_scope(old_db):
    db = Database(old_db)
    assert len(search(db, "How many orders were placed?", scope_of(SQL_PROMPT))) == 5
    assert search(db, "How many orders were placed?", scope_of(SUPPORT_PROMPT)) == []
    assert search(db, "How many orders were placed?", NO_SYSTEM) == []


# --- the gateway


@pytest.fixture
def client(shop_db, fake, monkeypatch):
    monkeypatch.delenv("SUPPORT_MIN_SIM", raising=False)
    with TestClient(gateway.app) as c:
        gateway.app.state.engine = Engine(settings, gateway.db, fake.client())
        c.post("/api/reset", json={"targets": ["traces", "memory"]})
        yield c


def test_the_gateway_backfills_old_memory_at_startup(shop_db):
    db = gateway.db
    db.execute("DELETE FROM memory")
    trace_id = db.execute(
        "INSERT INTO traces (ts, mode, served_by, model, escalated, tag) VALUES (0, 'cascade', 'teacher', 'm', 1, 'support')"
    )
    db.execute("INSERT INTO memory (ts, question, answer, trace_id) VALUES (0, 'support q', 'a', ?)", (trace_id,))
    db.execute("INSERT INTO memory (ts, question, answer) VALUES (0, 'sql q', 'a')")
    with TestClient(gateway.app):
        assert scopes(db) == {"support q": scope_of(SUPPORT_PROMPT), "sql q": scope_of(SQL_PROMPT)}


def test_the_scope_option_is_read_from_the_body_and_headers(client, fake):
    fake.replies.update(teacher="teacher answer", student="student answer")

    def post(system, headers=None, **apprentice):
        msgs = [{"role": "system", "content": system}, {"role": "user", "content": QUESTION}]
        body = {"model": "apprentice", "messages": msgs, "apprentice": apprentice}
        return client.post("/v1/chat/completions", json=body, headers=headers or {}).json()["apprentice"]

    assert post(PROMPT_A, scope="shared")["served_by"] == "teacher"
    assert post(PROMPT_B, headers={"X-Apprentice-Scope": "shared"})["served_by"] == "student"
    assert post(PROMPT_B)["served_by"] == "teacher"


def test_support_and_shop_never_share_memory_and_support_reset_still_works(client, fake):
    fake.replies.update(teacher="Tap Help > Cancel order.", student=GOOD_SQL, judge=0.95)
    q = "How many orders have been placed?"
    assert client.post("/api/support/ask", json={"question": q}).json()["served_by"] == "teacher"
    fake.replies.update(teacher=GOOD_SQL)
    shop = client.post("/api/shop/ask", json={"question": q}).json()
    assert shop["memory_hits"] == 0, "the support answer is not an example for the shop"
    assert [m["role"] for m in fake.bodies("student")[0]["messages"]] == ["system", "user"]
    gateway.db.execute(
        "INSERT INTO memory (ts, question, answer, scope) VALUES (0, ?, ?, ?)", (q, GOOD_SQL, scope_of(SQL_PROMPT))
    )

    assert client.post("/api/support/reset").json() == {"reset": "support"}
    assert scopes(gateway.db) == {q: scope_of(SQL_PROMPT)}
    assert client.get("/api/support/stats").json()["memory_size"] == 0
    assert client.post("/api/shop/ask", json={"question": q}).json()["memory_hits"] == 1
