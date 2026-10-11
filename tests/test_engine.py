"""Routing between student and teacher, escalation, judges, and learning into memory."""

from dataclasses import replace

import pytest

from apprentice.engine import with_examples
from apprentice.memory import Hit

from .fakes import BROKEN_SQL, EMPTY_SQL, GOOD_SQL, LLM_JUDGE, ask, sql_reply

QUESTION = "How many orders have been placed in total?"


def traces(engine) -> list[dict]:
    return engine.db.query("SELECT * FROM traces ORDER BY id")


def memory(engine) -> list[dict]:
    return engine.db.query("SELECT question, answer, trace_id FROM memory ORDER BY id")


def test_mode_teacher_goes_straight_to_the_teacher(engine, fake):
    fake.replies["teacher"] = "teacher says hi"
    r = ask(engine, QUESTION, mode="teacher")
    assert fake.roles() == ["teacher"]
    assert (r.content, r.served_by, r.model) == ("teacher says hi", "teacher", "fake-teacher")
    assert not r.escalated
    assert r.reason == "mode=teacher"
    assert r.cost_usd == pytest.approx((10 * 1.0 + 5 * 2.0) / 1_000_000)


def test_mode_student_never_calls_the_teacher(engine, fake):
    fake.replies["student"] = BROKEN_SQL
    r = ask(engine, QUESTION, mode="student", verifier="sql")
    assert fake.roles() == ["student"]
    assert r.served_by == "student"
    assert r.content == BROKEN_SQL
    assert r.reason == "mode=student"
    assert r.cost_usd == 0.0


def test_student_request_asks_for_no_thinking(engine, fake):
    fake.replies["student"] = GOOD_SQL
    ask(engine, QUESTION, mode="student")
    assert fake.bodies("student")[0]["reasoning_effort"] == "none"


def test_cascade_student_passes_the_sql_check(engine, fake):
    fake.replies["student"] = GOOD_SQL
    r = ask(engine, QUESTION, verifier="sql")
    assert fake.roles() == ["student"]
    assert r.served_by == "student"
    assert not r.escalated
    assert r.reason == "student passed: sql check: 1 row(s)"
    assert memory(engine) == [], "student answers are never written to memory"


@pytest.mark.parametrize(
    "student, why",
    [(BROKEN_SQL, "sql check: SQL error: no such table"), (EMPTY_SQL, "sql check: empty result")],
    ids=["sql-error", "empty-result"],
)
def test_cascade_student_fails_the_sql_check_and_escalates(engine, fake, student, why):
    fake.replies.update(student=student, teacher=GOOD_SQL)
    r = ask(engine, QUESTION, verifier="sql")
    assert fake.roles() == ["student", "teacher"]
    assert r.served_by == "teacher"
    assert r.content == GOOD_SQL
    assert r.escalated
    assert r.reason.startswith(f"escalated: {why}")
    [row] = traces(engine)
    assert (row["served_by"], row["escalated"], row["id"]) == ("teacher", 1, r.trace_id)


def test_cascade_student_outage_escalates(engine, fake):
    fake.replies.update(student=500, teacher=GOOD_SQL)
    r = ask(engine, QUESTION, verifier="sql")
    assert r.served_by == "teacher"
    assert r.reason.startswith("escalated: student unavailable")


def test_cascade_without_verifier_or_memory_uses_the_teacher(engine, fake):
    fake.replies["teacher"] = "Paris"
    r = ask(engine, "What is the capital of France?")
    assert fake.roles() == ["teacher"]
    assert r.escalated
    assert r.reason.startswith("no similar memory")


def test_teacher_answer_is_remembered_and_reused_as_an_example(engine, fake):
    teacher_sql = sql_reply("SELECT COUNT(*) FROM orders o")
    fake.replies.update(student=[BROKEN_SQL, GOOD_SQL], teacher=teacher_sql)

    first = ask(engine, QUESTION, verifier="sql")
    assert first.served_by == "teacher"
    assert memory(engine) == [{"question": QUESTION, "answer": teacher_sql, "trace_id": first.trace_id}]

    second = ask(engine, "How many orders have been placed in total so far?", verifier="sql")
    assert second.served_by == "student"
    assert second.memory_hits == 1
    assert second.top_sim > 0.8
    sent = fake.bodies("student")[1]["messages"]
    # system, remembered question, remembered teacher answer, new question
    assert [m["role"] for m in sent] == ["system", "user", "assistant", "user"]
    assert sent[1]["content"] == QUESTION
    assert sent[2]["content"] == teacher_sql
    assert len(memory(engine)) == 1


def test_memory_can_be_turned_off_per_request(engine, fake):
    fake.replies.update(student=[BROKEN_SQL, GOOD_SQL], teacher=GOOD_SQL)
    ask(engine, QUESTION, verifier="sql")
    r = ask(engine, QUESTION, verifier="sql", use_memory=False)
    assert r.memory_hits == 0
    assert len(fake.bodies("student")[1]["messages"]) == 2


def test_cascade_without_verifier_uses_the_student_when_memory_is_similar(engine, fake):
    fake.replies.update(student="student answer", teacher="teacher answer")
    ask(engine, "What is the capital of France?")
    r = ask(engine, "What is the capital of France?")
    assert r.served_by == "student"
    assert r.reason.startswith("student passed: similar memory found")


def test_learn_false_does_not_store(engine, fake):
    fake.replies["teacher"] = GOOD_SQL
    ask(engine, QUESTION, mode="teacher", learn=False)
    assert memory(engine) == []


def test_teacher_answer_failing_the_verifier_is_not_stored(engine, fake):
    fake.replies.update(student=BROKEN_SQL, teacher=BROKEN_SQL)
    ask(engine, QUESTION, verifier="sql")
    assert memory(engine) == []


def test_decision_judge_low_score_escalates(engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=0.3, teacher=GOOD_SQL)
    r = ask(engine, QUESTION, verifier="sql", judge="decision")
    assert fake.roles() == ["student", "judge", "teacher"]
    assert r.served_by == "teacher"
    assert r.check_score == 0.3
    assert r.reason == "escalated: sql check: 1 row(s); judge 0.30"
    assert traces(engine)[0]["check_score"] == 0.3


def test_decision_judge_high_score_lets_the_student_answer(engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=0.95)
    r = ask(engine, QUESTION, verifier="sql", judge="decision")
    assert fake.roles() == ["student", "judge"]
    assert r.served_by == "student"
    assert r.check_score == 0.95


def test_decision_judge_sees_the_query_and_its_rows(engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=0.95)
    ask(engine, QUESTION, verifier="sql", judge="decision")
    state = fake.bodies("judge")[0]["state"]
    assert QUESTION in state
    assert "SELECT COUNT(*) FROM orders" in state
    assert "3000" in state


def test_judge_is_skipped_when_the_verifier_already_failed(engine, fake):
    fake.replies.update(student=BROKEN_SQL, teacher=GOOD_SQL)
    ask(engine, QUESTION, verifier="sql", judge="decision")
    assert "judge" not in fake.roles()


def test_judge_failure_lets_the_answer_through(engine, fake):
    fake.replies.update(student=GOOD_SQL, judge=503)
    r = ask(engine, QUESTION, verifier="sql", judge="decision")
    assert fake.roles() == ["student", "judge"]
    assert r.served_by == "student"
    assert r.check_score is None
    assert "judge unavailable" in r.reason


def test_llm_judge_no_escalates(engine, fake):
    fake.replies.update(student=GOOD_SQL, llmjudge="no", teacher=GOOD_SQL)
    r = ask(engine, QUESTION, verifier="sql", judge="llm")
    assert fake.roles() == ["student", "llmjudge", "teacher"]
    assert r.served_by == "teacher"
    assert r.check_score == 0.0


def test_llm_judge_without_verdict_lets_the_answer_through(engine, fake):
    fake.replies.update(student=GOOD_SQL, llmjudge="hmm, hard to say")
    r = ask(engine, QUESTION, verifier="sql", judge="llm")
    assert r.served_by == "student"
    assert "judge unavailable" in r.reason


def test_judge_cost_is_added_to_the_request(engine, fake):
    engine.s = replace(engine.s, llm_judge=replace(LLM_JUDGE, price_in=1.0, price_out=2.0))
    fake.replies.update(student=GOOD_SQL, llmjudge="yes")
    r = ask(engine, QUESTION, verifier="sql", judge="llm")
    assert r.served_by == "student"
    assert r.cost_usd == pytest.approx((10 * 1.0 + 5 * 2.0) / 1_000_000)


@pytest.mark.parametrize("opts", [{"mode": "fast"}, {"judge": "vibes"}])
def test_invalid_options_raise(engine, opts):
    with pytest.raises(ValueError):
        ask(engine, QUESTION, **opts)


def test_with_examples_puts_the_most_similar_example_last():
    msgs = [{"role": "system", "content": "s"}, {"role": "user", "content": "q"}]
    hits = [Hit(1, "best q", "best a", 0.9), Hit(2, "other q", "other a", 0.6)]
    out = with_examples(msgs, hits)
    assert [m["content"] for m in out] == ["s", "other q", "other a", "best q", "best a", "q"]
    assert with_examples(msgs, []) == msgs
