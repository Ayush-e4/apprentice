"""The generalization eval: unseen question templates, their judge data, and the runner commands."""

import asyncio
import difflib
import json

import httpx

from apprentice import gateway
from apprentice.config import settings
from apprentice.engine import Engine
from apprentice.verifiers import run_sql
from bench import questions, unseen
from bench.run_eval import matches
from bench.unseen_judge import score, summarize

from .fakes import BROKEN_SQL, GOOD_SQL


def _existing_questions() -> list[str]:
    return [q.format(**params) for _, combos, q, _ in questions._templates() for params in combos]


def test_every_template_builds_non_empty_gold_answers(shop_db):
    items = unseen.generate(shop_db)
    assert {i["template"] for i in items} == {t["id"] for t in unseen._templates()}
    assert 40 <= len(items) <= 60
    for item in items:
        rows = run_sql(shop_db, item["sql"])
        assert rows and rows[0][0] is not None, item["id"]


def test_committed_questions_match_the_templates(shop_db):
    assert unseen.load_questions() == unseen.generate(shop_db)


def test_no_unseen_template_reuses_an_existing_template_id():
    existing = {tid for tid, *_ in questions._templates()}
    assert not existing & {t["id"] for t in unseen._templates()}


def test_no_unseen_question_duplicates_a_benchmark_question(shop_db):
    existing = _existing_questions()
    for item in unseen.generate(shop_db):
        assert item["question"] not in existing
        closest = max(difflib.SequenceMatcher(None, item["question"], q).ratio() for q in existing)
        assert closest < 0.8, f"{item['question']!r} is too close to a benchmark question ({closest:.2f})"


def test_ranking_questions_skip_ties(shop_db):
    for item in unseen.generate(shop_db):
        if item["template"] == "product_growth":
            assert len(run_sql(shop_db, item["sql"].replace("LIMIT 1", "LIMIT 2"))) == 2


def test_judge_labels_match_execution(shop_db):
    items = unseen.generate(shop_db)[:12]
    examples = unseen.judge_examples(items)
    gold = {i["question"]: run_sql(shop_db, i["sql"]) for i in items}
    labels = [ex["questions"]["correct"]["label"] for ex in examples]
    assert any(labels) and not all(labels)
    for ex in examples:
        state = ex["state"]
        expected = matches(run_sql(shop_db, state["sql"]), gold[state["question"]])
        assert ex["questions"]["correct"]["label"] is expected


def test_committed_judge_data_is_kev_format():
    examples = unseen.load_judge()
    assert len(examples) > 100
    unseen_questions = {i["question"] for i in unseen.load_questions()}
    for ex in examples[:50]:
        assert ex["state"]["question"] in unseen_questions
        assert ex["questions"]["correct"]["type"] == "noul"
        assert isinstance(ex["questions"]["correct"]["label"], bool)


def test_summarize_counts():
    s = summarize([True, True, False, False], [0.9, 0.2, 0.85, 0.1], threshold=0.8)
    assert s["confusion"] == {"tp": 1, "fp": 1, "fn": 1, "tn": 1}
    assert (s["accuracy"], s["precision"], s["recall"]) == (0.5, 0.5, 0.5)
    assert s["wrong_above_threshold"] == 1
    assert s["mean_score_correct"] == 0.55


def test_judge_command_against_a_fake_systemone(shop_db, fake, tmp_path):
    examples = unseen.judge_examples(unseen.generate(shop_db)[:6])
    positives = sum(ex["questions"]["correct"]["label"] for ex in examples)
    fake.replies.update(judge=0.95)
    out = tmp_path / "judge_results.json"
    s = asyncio.run(score(examples, client=fake.client(), out=out))
    assert fake.roles() == ["judge"] * len(examples)
    assert s["n"] == len(examples) and s["errors"] == 0
    assert s["recall"] == 1.0
    assert s["confusion"]["fp"] == len(examples) - positives
    assert json.loads(out.read_text(encoding="utf-8"))["n"] == len(examples)


def test_judge_command_counts_errors(shop_db, fake, tmp_path):
    examples = unseen.judge_examples(unseen.generate(shop_db)[:2])
    fake.replies.update(judge=500)
    s = asyncio.run(score(examples, client=fake.client(), out=tmp_path / "r.json"))
    assert (s["n"], s["errors"]) == (0, len(examples))


def test_student_command_never_writes_memory(shop_db, fake, monkeypatch):
    # The student fails the SQL check, so the cascade escalates; with learn=true that would fill memory.
    fake.replies.update(student=BROKEN_SQL, teacher=GOOD_SQL)
    gateway.app.state.engine = Engine(settings, gateway.db, fake.client())
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda *a, **kw: real_client(transport=httpx.ASGITransport(app=gateway.app))
    )
    memory_before = gateway.db.scalar("SELECT COUNT(*) FROM memory")
    items = unseen.generate(shop_db)[:3]
    summaries = asyncio.run(unseen.student("http://gateway.test", items, gateway.db))
    assert [s["mode"] for s in summaries] == ["student", "cascade"]
    assert all(s["phase"] == "unseen" and s["n"] == 3 for s in summaries)
    assert "teacher" in fake.roles()
    assert gateway.db.scalar("SELECT COUNT(*) FROM memory") == memory_before
    runs = gateway.db.query("SELECT phase, mode FROM eval_runs WHERE phase = 'unseen'")
    assert {r["mode"] for r in runs} >= {"student", "cascade"}
