"""Generalization eval: question types the student and the judge have never seen.

The benchmark's train and test questions, and the SQL judge's training data, all
come from the 16 templates in bench/questions.py. The templates here ask about
the same database in new shapes (anti-joins, OFFSET ranking, pivots, weekday
filters, shares, relational division, ...), so nothing in memory or in the
judge's training set is a close match.

Commands:
  build     regenerate data/unseen/questions.json and data/unseen/judge.jsonl
  student   send the unseen questions through a running gateway (memory on, learn off)
  judge     score data/unseen/judge.jsonl with the decision judge (JUDGE_* settings)

Run:  python -m bench.unseen build | student --url http://localhost:8000 | judge
"""

import argparse
import asyncio
import json
import random
import sqlite3
from pathlib import Path

from apprentice.config import ROOT, settings
from apprentice.db import Database

from . import judge_data
from .questions import CATEGORIES, MONTHS, STORE_NAMES, _ITEMS, _mm
from .shopdb import AREAS

OUT_DIR = ROOT / "data" / "unseen"
QUESTIONS_PATH = OUT_DIR / "questions.json"
JUDGE_PATH = OUT_DIR / "judge.jsonl"
RESULTS_PATH = OUT_DIR / "judge_results.json"

_REV = "SUM(oi.quantity * oi.unit_price)"


def _templates() -> list[dict]:
    """Each template: id, parameter combos, question format, SQL format, and optionally a tie check.

    `tie` is a query returning the ranking metric in rank order; a combo is skipped when the
    answer at position `rank` ties with a neighbour, because then the gold answer is arbitrary.
    """
    stores = [{"store": s} for s in STORE_NAMES]
    months = [{"month": m, "mm": _mm(m)} for m in MONTHS]
    pairs = [{"month": a, "mm": _mm(a), "next": b, "nn": _mm(b)} for a, b in zip(MONTHS, MONTHS[1:])]
    store_months = [{**months[i], "store": STORE_NAMES[i % len(STORE_NAMES)]} for i in range(len(MONTHS))]
    growth = (
        "SUM(CASE WHEN strftime('%m', o.order_date) = '{nn}' THEN oi.quantity ELSE 0 END) - "
        "SUM(CASE WHEN strftime('%m', o.order_date) = '{mm}' THEN oi.quantity ELSE 0 END)"
    )
    month_store_rev = (
        f"FROM {_ITEMS} JOIN stores s ON s.id = o.store_id "
        "WHERE strftime('%m', o.order_date) = '{mm}' GROUP BY s.id"
    )
    return [
        {"id": "avg_units_per_order", "combos": stores,
         "q": "On average, how many units (total quantity) does a single order at the {store} store contain?",
         "sql": "SELECT AVG(units) FROM (SELECT o.id, SUM(oi.quantity) AS units FROM " + _ITEMS
                + " JOIN stores s ON s.id = o.store_id WHERE s.name = '{store}' GROUP BY o.id)"},
        {"id": "inactive_customers_month", "combos": months,
         "q": "How many customers who joined before {month} 2026 placed no orders at all during {month} 2026?",
         "sql": "SELECT COUNT(*) FROM customers c WHERE c.joined_on < '2026-{mm}-01' AND c.id NOT IN "
                "(SELECT o.customer_id FROM orders o WHERE strftime('%m', o.order_date) = '{mm}')"},
        {"id": "second_store_month", "combos": months,
         "q": "Which store ranked second by revenue in {month} 2026?",
         "sql": f"SELECT s.name {month_store_rev} ORDER BY {_REV} DESC LIMIT 1 OFFSET 1",
         "tie": f"SELECT {_REV} {month_store_rev} ORDER BY 1 DESC", "rank": 1},
        {"id": "product_growth", "combos": pairs,
         "q": "Which product had the biggest increase in units sold from {month} to {next} 2026?",
         "sql": f"SELECT p.name FROM {_ITEMS} JOIN products p ON p.id = oi.product_id "
                f"GROUP BY p.id ORDER BY {growth} DESC LIMIT 1",
         "tie": f"SELECT {growth} FROM {_ITEMS} GROUP BY oi.product_id ORDER BY 1 DESC", "rank": 0},
        {"id": "weekend_revenue_store", "combos": stores,
         "q": "How much revenue did the {store} store make on weekends (Saturdays and Sundays)?",
         "sql": f"SELECT {_REV} FROM {_ITEMS} JOIN stores s ON s.id = o.store_id "
                "WHERE s.name = '{store}' AND strftime('%w', o.order_date) IN ('0', '6')"},
        {"id": "store_share_month", "combos": store_months,
         "q": "What percentage (0 to 100) of all revenue in {month} 2026 came from the {store} store?",
         "sql": f"SELECT 100.0 * SUM(CASE WHEN s.name = '{{store}}' THEN oi.quantity * oi.unit_price ELSE 0 END) "
                f"/ {_REV} FROM {_ITEMS} JOIN stores s ON s.id = o.store_id "
                "WHERE strftime('%m', o.order_date) = '{mm}'"},
        {"id": "all_stores_customers", "combos": [{"area": a} for a in AREAS],
         "q": "How many customers from {area} have placed orders at every one of the six stores?",
         "sql": "SELECT COUNT(*) FROM (SELECT c.id FROM customers c JOIN orders o ON o.customer_id = c.id "
                "WHERE c.area = '{area}' GROUP BY c.id HAVING COUNT(DISTINCT o.store_id) = 6)"},
        {"id": "price_range_category", "combos": [{"category": c} for c in CATEGORIES],
         "q": "What is the price gap between the most and the least expensive product in the {category} category?",
         "sql": "SELECT MAX(price) - MIN(price) FROM products WHERE category = '{category}'"},
    ]


def _tied(conn: sqlite3.Connection, tie_sql: str, rank: int) -> bool:
    values = [row[0] for row in conn.execute(tie_sql).fetchall()]
    neighbours = [values[i] for i in (rank - 1, rank + 1) if 0 <= i < len(values)]
    return rank >= len(values) or values[rank] in neighbours


def generate(db_path: Path = settings.bench_db_path) -> list[dict]:
    """All unseen questions with non-empty, unambiguous gold answers."""
    conn = sqlite3.connect(db_path)
    items = []
    for t in _templates():
        for i, params in enumerate(t["combos"]):
            sql = t["sql"].format(**params)
            rows = conn.execute(sql).fetchall()
            if not rows or all(v is None for v in rows[0]):
                continue  # skip questions whose answer would be empty
            if "tie" in t and _tied(conn, t["tie"].format(**params), t["rank"]):
                continue
            items.append({"id": f"{t['id']}-{i}", "template": t["id"], "question": t["q"].format(**params), "sql": sql})
    conn.close()
    return items


def judge_examples(items: list[dict], seed: int = 5, max_negatives: int = 5) -> list[dict]:
    """Kev-format judge examples for the unseen questions, labelled by execution (see bench/judge_data.py)."""
    return judge_data.build_split(items, items, random.Random(seed), max_negatives)


def build() -> dict:
    if not settings.bench_db_path.exists():
        from .shopdb import build as build_shop

        build_shop()
    items = generate()
    examples = judge_examples(items)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    QUESTIONS_PATH.write_text(json.dumps(items, indent=2), encoding="utf-8")
    with JUDGE_PATH.open("w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False, default=str) + "\n")
    positives = sum(ex["questions"]["correct"]["label"] for ex in examples)
    by_template: dict[str, int] = {}
    for item in items:
        by_template[item["template"]] = by_template.get(item["template"], 0) + 1
    for tid, n in by_template.items():
        print(f"  {tid:<26} {n}")
    print(f"questions: {len(items)} -> {QUESTIONS_PATH}")
    print(f"judge: {len(examples)} examples ({positives} correct, {len(examples) - positives} wrong) -> {JUDGE_PATH}")
    return {"questions": items, "judge": examples}


def load_questions() -> list[dict]:
    return json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))


def load_judge(path: Path = JUDGE_PATH) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


async def student(
    url: str, items: list[dict], db: Database, judge: str | None = None, concurrency: int = 2,
    modes: tuple[str, ...] = ("student", "cascade"),
) -> list[dict]:
    """Unseen questions through the gateway. Memory is read but never written (learn=false)."""
    from .run_eval import run_phase

    summaries = []
    for mode in modes:
        summaries.append(await run_phase(db, url, items, "unseen", mode, True, False, judge, concurrency))
    return summaries


def main() -> None:
    from .unseen_judge import score

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("build", help="regenerate the unseen questions and judge examples")
    p = sub.add_parser("student", help="run the unseen questions through a gateway")
    p.add_argument("--url", default="http://localhost:8000")
    p.add_argument("--judge", choices=["decision", "llm"], default=None, help="judge for the cascade run")
    p.add_argument("--limit", type=int, default=0, help="use only the first N questions")
    p.add_argument("--concurrency", type=int, default=2)
    p.add_argument("--modes", default="student,cascade", help="comma-separated: student, cascade, teacher")
    j = sub.add_parser("judge", help="score the unseen judge examples with the decision judge")
    j.add_argument("--n", type=int, default=0, help="use only the first N examples")
    j.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()

    if args.command == "build":
        build()
    elif args.command == "student":
        items = load_questions()
        items = items[: args.limit] if args.limit else items
        print(f"[unseen] {len(items)} questions, memory=on, learn=off")
        db = Database(settings.db_path)
        asyncio.run(student(args.url, items, db, args.judge, args.concurrency, tuple(args.modes.split(","))))
    else:
        examples = load_judge()
        examples = examples[: args.n] if args.n else examples
        asyncio.run(score(examples, concurrency=args.concurrency))


if __name__ == "__main__":
    main()
