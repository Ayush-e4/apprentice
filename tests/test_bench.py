"""The benchmark data: the shop database and the labelled SQL-judge examples."""

import random
import sqlite3

from apprentice.verifiers import run_sql
from bench import judge_data
from bench.questions import _templates
from bench.shopdb import STORES, build

QUESTION = "What was the total revenue of the Dadar TT store in March 2026?"
GOLD = (
    "SELECT SUM(oi.quantity * oi.unit_price) FROM order_items oi JOIN orders o ON o.id = oi.order_id "
    "JOIN stores s ON s.id = o.store_id WHERE s.name = 'Dadar TT' AND strftime('%m', o.order_date) = '03'"
)


def label(example: dict) -> bool:
    return example["questions"]["correct"]["label"]


def test_shop_db_contents(shop_db):
    conn = sqlite3.connect(shop_db)
    counts = {t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0] for t in ("stores", "orders", "customers")}
    conn.close()
    assert counts == {"stores": len(STORES), "orders": 3000, "customers": 300}


def test_shop_db_is_deterministic(shop_db, tmp_path):
    query = "SELECT SUM(quantity * unit_price) FROM order_items"
    assert run_sql(build(tmp_path / "again.db"), query) == run_sql(shop_db, query)


def test_every_template_query_runs(shop_db):
    for tid, combos, question, sql in _templates():
        run_sql(shop_db, sql.format(**combos[0]))


def test_gold_query_is_labelled_correct(shop_db):
    ex = judge_data.example(QUESTION, GOLD, run_sql(shop_db, GOLD))
    assert label(ex) is True
    state = ex["state"]
    assert state["question"] == QUESTION
    assert state["sql"] == GOLD
    assert state["result_rows"] == run_sql(shop_db, GOLD)


def test_rewrites_are_labelled_correct(shop_db):
    gold_rows = run_sql(shop_db, GOLD)
    rewrites = judge_data.rewrites(GOLD)
    assert len(rewrites) == 2
    assert all(label(judge_data.example(QUESTION, sql, gold_rows)) for sql in rewrites)


def test_store_swap_is_labelled_wrong(shop_db):
    gold_rows = run_sql(shop_db, GOLD)
    mutations = judge_data.literal_mutations(GOLD, random.Random(0))
    swapped = next(m for m in mutations if "'Dadar TT'" not in m)
    assert run_sql(shop_db, swapped) != gold_rows
    assert label(judge_data.example(QUESTION, swapped, gold_rows)) is False


def test_labels_come_from_execution_not_from_the_mutation(shop_db):
    # Swapping the month filter for itself changes the SQL text but not the result: still correct.
    same = GOLD.replace("= '03'", "= '0' || '3'")
    assert label(judge_data.example(QUESTION, same, run_sql(shop_db, GOLD))) is True


def test_broken_or_empty_sql_is_skipped(shop_db):
    gold_rows = run_sql(shop_db, GOLD)
    assert judge_data.example(QUESTION, "SELECT nope FROM stores", gold_rows) is None
    assert judge_data.example(QUESTION, "SELECT * FROM stores WHERE id = -1", gold_rows) is None


def test_build_split_labels(shop_db):
    thane = GOLD.replace("Dadar TT", "Thane Station")
    items = [
        {"id": "rev-0", "template": "revenue_store_month", "question": QUESTION, "sql": GOLD},
        {"id": "rev-1", "template": "revenue_store_month", "question": QUESTION.replace("Dadar TT", "Thane Station"),
         "sql": thane},
    ]
    examples = judge_data.build_split(items[:1], items, random.Random(3), max_negatives=5)
    by_sql = {ex["state"]["sql"]: label(ex) for ex in examples}
    assert by_sql[GOLD] is True
    assert by_sql[thane] is False, "another question's gold query is a wrong answer here"
    assert sum(by_sql.values()) >= 2
    assert len(by_sql) - sum(by_sql.values()) >= 2
