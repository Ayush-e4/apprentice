"""The v2 judge data: fair held-out splits, execution labels, trace harvesting and Hinglish rewrites."""

import random
import sqlite3

from apprentice.verifiers import run_sql
from bench import hinglish, judge_data_v2, unseen
from bench.questions import _templates, load
from bench.run_eval import matches


def _questions(name: str) -> set[str]:
    return {ex["state"]["question"] for ex in unseen.load_judge(judge_data_v2.OUT_DIR / f"{name}.jsonl")}


def _gold(data: dict) -> dict[str, str]:
    items = data["train"] + data["test"]
    pairs = [(i["question"], i["sql"]) for i in items + hinglish.translate_all(items) + unseen.load_questions()]
    return dict(pairs)


def test_unseen_templates_are_split_four_and_four():
    train, held = set(judge_data_v2.TRAIN_TEMPLATES), set(judge_data_v2.HELDOUT_TEMPLATES)
    assert len(train) == len(held) == 4 and not train & held
    assert train | held == {t["id"] for t in unseen._templates()}


def test_no_heldout_unseen_template_appears_in_train():
    held = {i["question"] for i in unseen.load_questions() if i["template"] in judge_data_v2.HELDOUT_TEMPLATES}
    assert not held & _questions("train")
    assert _questions("heldout_unseen") <= held
    assert len(_questions("heldout_unseen")) > 10


def test_no_test_split_question_appears_in_train(shop_db):
    test = load()["test"]
    english = {i["question"] for i in test}
    hindi = {i["question"] for i in hinglish.translate_all(test)}
    train = _questions("train")
    assert not english & train
    assert not hindi & train
    assert _questions("heldout_hinglish") <= hindi


def test_train_mixes_every_source(shop_db):
    data = load()
    train = _questions("train")
    assert {i["question"] for i in hinglish.translate_all(data["train"])} & train
    unseen_train = {i["question"] for i in unseen.load_questions() if i["template"] in judge_data_v2.TRAIN_TEMPLATES}
    assert unseen_train & train


def test_committed_labels_match_execution(shop_db):
    gold = _gold(load())
    for name in ("train", "heldout_unseen", "heldout_hinglish"):
        examples = unseen.load_judge(judge_data_v2.OUT_DIR / f"{name}.jsonl")
        labels = [ex["questions"]["correct"]["label"] for ex in examples]
        assert 0.35 <= sum(labels) / len(labels) <= 0.6, name
        for ex in examples[::25]:
            state = ex["state"]
            expected = matches(run_sql(shop_db, state["sql"]), run_sql(shop_db, gold[state["question"]]))
            assert ex["questions"]["correct"]["label"] is expected, (name, state)


def _traces_db(path, rows: list[tuple[str | None, str | None]]):
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE traces (id INTEGER PRIMARY KEY, question TEXT, response TEXT)")
    conn.executemany("INSERT INTO traces (question, response) VALUES (?, ?)", rows)
    conn.commit()
    conn.close()
    return path


def test_harvest_keeps_only_allowed_questions_and_working_sql(shop_db, tmp_path):
    data = load()
    unseen_items = unseen.load_questions()
    gold = judge_data_v2.allowed_gold(data, unseen_items)
    train_q, test_q = data["train"][0], data["test"][0]
    seen_unseen = next(i for i in unseen_items if i["template"] in judge_data_v2.TRAIN_TEMPLATES)
    held_unseen = next(i for i in unseen_items if i["template"] in judge_data_v2.HELDOUT_TEMPLATES)
    wrong = f"SELECT COUNT(*) FROM ({train_q['sql']}) UNION ALL SELECT 1"

    def block(sql: str) -> str:
        return f"Here you go:\n```sql\n{sql};\n```"

    db = _traces_db(tmp_path / "traces.db", [
        (train_q["question"], block(train_q["sql"])),
        (train_q["question"], block(train_q["sql"])),  # duplicate
        (train_q["question"], block(wrong)),
        (train_q["question"], block("SELECT * FROM no_such_table")),
        (train_q["question"], block("SELECT * FROM stores WHERE name = 'Nowhere'")),
        (train_q["question"], None),
        (test_q["question"], block(test_q["sql"])),
        (held_unseen["question"], block(held_unseen["sql"])),
        (seen_unseen["question"], block(seen_unseen["sql"])),
        ("Something else entirely", block("SELECT 1")),
    ])
    examples = judge_data_v2.harvest_traces(db, gold)
    got = [(ex["state"]["question"], ex["questions"]["correct"]["label"]) for ex in examples]
    assert got == [(train_q["question"], True), (train_q["question"], False), (seen_unseen["question"], True)]
    assert test_q["question"] not in gold and held_unseen["question"] not in gold


def test_hinglish_phrasebook_covers_every_template():
    assert set(hinglish.PHRASEBOOK) == {tid for tid, *_ in _templates()}


def test_hinglish_rewrite_example(shop_db):
    item = next(i for i in load()["train"] if i["template"] == "revenue_store_month")
    hi = hinglish.translate(item)
    assert hi["sql"] == item["sql"] and hi["id"] == item["id"] + "-hi"
    assert hi["question"].endswith("store ka total revenue kitna tha?")
    assert " mein " in hi["question"] and hi["question"] != item["question"]


def test_hinglish_output_is_deterministic(shop_db):
    train = load()["train"]
    picked = hinglish.pick(train, 4)
    assert picked == hinglish.pick(list(reversed(train)), 4)
    assert 50 <= len(picked) <= 64
    first = judge_data_v2.hinglish_examples(picked[:6], train, random.Random(1))
    again = judge_data_v2.hinglish_examples(picked[:6], train, random.Random(1))
    assert first == again and first
    labels = [ex["questions"]["correct"]["label"] for ex in first]
    assert any(labels) and not all(labels)
