"""When the decision judge is unreachable, JUDGE_FALLBACK=llm asks the LLM judge instead."""

import pytest

from apprentice.db import Database
from apprentice.engine import Engine

from .fakes import GOOD_SQL, ask, make_settings

QUESTION = "How many orders have been placed in total?"


@pytest.fixture
def fallback_engine(tmp_path, shop_db, fake):
    s = make_settings(tmp_path, shop_db, judge_fallback="llm")
    return Engine(s, Database(tmp_path / "apprentice.db"), fake.client())


def cascade(engine):
    return ask(engine, QUESTION, mode="cascade", verifier="sql", judge="decision", learn=False)


def test_judge_up_never_calls_the_fallback(fallback_engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=0.95)
    r = cascade(fallback_engine)
    assert r.served_by == "student"
    assert "llmjudge" not in fake.roles()


def test_fallback_approves(fallback_engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=503, llmjudge="yes")
    r = cascade(fallback_engine)
    assert r.served_by == "student"
    assert "judge unavailable" in r.reason and "fallback llm judge 1.00" in r.reason
    assert r.check_score == 1.0


def test_fallback_rejects_and_escalates(fallback_engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=503, llmjudge="no", teacher=GOOD_SQL)
    r = cascade(fallback_engine)
    assert r.served_by == "teacher"
    assert r.escalated is True
    assert "fallback llm judge 0.00" in r.reason


def test_both_down_lets_the_answer_through(fallback_engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=503, llmjudge=500)
    r = cascade(fallback_engine)
    assert r.served_by == "student"
    assert "judge unavailable" in r.reason and "fallback llm judge unavailable" in r.reason
    assert r.check_score is None


def test_without_fallback_the_answer_is_let_through(engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=503)
    r = cascade(engine)
    assert r.served_by == "student"
    assert "judge unavailable" in r.reason
    assert "llmjudge" not in fake.roles()


def test_failure_note_is_one_short_line(fallback_engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=503, llmjudge=500)
    r = cascade(fallback_engine)
    assert "\n" not in r.reason
