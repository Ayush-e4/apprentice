"""Builds labelled data for training a SQL judge (Kev fine-tuning format).

Each example shows the judge a question, a SQL query and the first rows it
returns, and asks whether the query answers the question. Labels are not
guessed: a query is labelled correct exactly when its result matches the gold
query's result, so a mutation that happens to give the same answer is a positive.

Sources of SQL per question:
  gold        the reference query
  rewrites    the same query written differently (still correct)
  swaps       the gold query of another question from the same template
  mutations   the gold query with one literal or one operator changed

Train examples come from the train split, held-out examples from the test split.

Run:  python -m bench.judge_data
"""

import json
import random
import re
import sqlite3

from apprentice.config import ROOT, settings
from apprentice.judges import SQL_STATEMENT, noul_question, sql_state
from apprentice.verifiers import preview_sql, run_sql

from .questions import CATEGORIES, MONTHS, PRODUCT_NAMES, STORE_NAMES, load
from .run_eval import matches
from .shopdb import AREAS, PAYMENTS

OUT_DIR = ROOT / "data" / "judge"

_LITERAL_POOLS = [
    STORE_NAMES,
    CATEGORIES,
    PRODUCT_NAMES,
    AREAS,
    PAYMENTS,
    [f"{i:02d}" for i in range(1, len(MONTHS) + 1)],
]

_STRUCTURAL = [
    ("SUM(", "AVG("),
    ("AVG(", "SUM("),
    ("COUNT(DISTINCT ", "COUNT("),
    (" DESC", " ASC"),
    ("LIMIT 3", "LIMIT 1"),
    ("LIMIT 1", "LIMIT 3"),
    ("> ", ">= "),
    ("SUM(oi.quantity * oi.unit_price)", "SUM(oi.quantity)"),
    ("SUM(oi.quantity)", "COUNT(*)"),
    ("COUNT(*)", "COUNT(DISTINCT o.customer_id)"),
]

_DATE_FILTER_RE = re.compile(r" AND strftime\('%m', o\.order_date\) = '\d\d'")


def rewrites(sql: str) -> list[str]:
    """Equivalent queries in a different surface form."""
    out = [f"SELECT * FROM ({sql}) AS answer"]
    lowered = re.sub(
        r"\b(SELECT|FROM|JOIN|ON|WHERE|AND|GROUP BY|ORDER BY|LIMIT|DESC|AS|HAVING|COUNT|SUM|AVG|DISTINCT)\b",
        lambda m: m.group(1).lower(),
        sql,
    )
    if lowered != sql:
        out.append(lowered)
    return out


def literal_mutations(sql: str, rng: random.Random) -> list[str]:
    out = []
    for pool in _LITERAL_POOLS:
        for value in pool:
            if f"'{value}'" in sql:
                other = rng.choice([v for v in pool if v != value])
                out.append(sql.replace(f"'{value}'", f"'{other}'", 1))
    return out


def structural_mutations(sql: str) -> list[str]:
    out = [sql.replace(old, new, 1) for old, new in _STRUCTURAL if old in sql]
    dropped = _DATE_FILTER_RE.sub("", sql, count=1)
    if dropped != sql:
        out.append(dropped)
    return out


def candidates(item: dict, same_template: list[dict], rng: random.Random, max_negatives: int) -> list[str]:
    sql = item["sql"]
    wrong = literal_mutations(sql, rng) + structural_mutations(sql)
    wrong += [o["sql"] for o in same_template if o["sql"] != sql][:2]
    rng.shuffle(wrong)
    return [sql, *rewrites(sql), *wrong[:max_negatives]]


def example(question: str, sql: str, gold_rows) -> dict | None:
    try:
        rows = run_sql(settings.bench_db_path, sql)
    except sqlite3.Error:
        return None  # broken SQL never reaches the judge; the verifier rejects it first
    if not rows:
        return None
    preview = preview_sql(settings.bench_db_path, f"```sql\n{sql}\n```")
    question_spec = {**noul_question(SQL_STATEMENT), "label": matches(rows, gold_rows)}
    return {"state": sql_state(question, preview), "questions": {"correct": question_spec}}


def build_split(items: list[dict], pool: list[dict], rng: random.Random, max_negatives: int) -> list[dict]:
    by_template: dict[str, list[dict]] = {}
    for q in pool:
        by_template.setdefault(q["template"], []).append(q)
    examples, seen = [], set()
    for item in items:
        gold_rows = run_sql(settings.bench_db_path, item["sql"])
        for sql in candidates(item, by_template[item["template"]], rng, max_negatives):
            key = (item["id"], sql)
            if key in seen:
                continue
            seen.add(key)
            ex = example(item["question"], sql, gold_rows)
            if ex is not None:
                examples.append(ex)
    rng.shuffle(examples)
    return examples


def main(max_negatives: int = 5, seed: int = 3) -> None:
    rng = random.Random(seed)
    data = load()
    # Swaps for test questions come from test questions only, so no train SQL leaks into held-out.
    splits = {
        "train": build_split(data["train"], data["train"], rng, max_negatives),
        "heldout": build_split(data["test"], data["test"], rng, max_negatives),
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, examples in splits.items():
        path = OUT_DIR / f"{name}.jsonl"
        with path.open("w", encoding="utf-8") as f:
            for ex in examples:
                f.write(json.dumps(ex, ensure_ascii=False, default=str) + "\n")
        positives = sum(ex["questions"]["correct"]["label"] for ex in examples)
        print(f"{name}: {len(examples)} examples ({positives} correct, {len(examples) - positives} wrong) -> {path}")


if __name__ == "__main__":
    main()
