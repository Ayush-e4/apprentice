"""Builds the v2 training data for the SQL judge, aimed at the two weaknesses of v1.

v1 (bench/judge_data.py) scores 99.3% on held-out questions from its 16 templates but
76.8% on the 8 unseen templates (bench/unseen.py), and it approved a wrong answer to a
Hinglish question. v2 trains on everything v1 did, plus:

  unseen_train  judge examples from 4 of the 8 unseen templates (the other 4 stay held out)
  traces        real student attempts from the gateway's `traces` table, for train-split
                questions and training unseen questions only, labelled by execution
  hinglish      about 60 train-split questions rewritten in Hinglish (bench/hinglish.py),
                with the same gold, rewrites and mutations as their English source

Held-out files (never trained on by v1 or v2):
  heldout_unseen.jsonl    the 4 held-out unseen templates
  heldout_hinglish.jsonl  Hinglish versions of the test-split questions

Commands:
  build   write data/judge_v2/*.jsonl  (--traces points at a gateway database, opened read-only)
  eval    score a JSONL file with the decision judge (JUDGE_* settings)

Run:  python -m bench.judge_data_v2 build --traces data/runtime/apprentice.db
      python -m bench.judge_data_v2 eval --file data/judge_v2/heldout_unseen.jsonl
"""

import argparse
import asyncio
import json
import random
import sqlite3
from pathlib import Path

from apprentice.config import ROOT, settings
from apprentice.verifiers import extract_sql, run_sql

from . import hinglish, judge_data, unseen
from .questions import load

OUT_DIR = ROOT / "data" / "judge_v2"

# Mixed difficulty on both sides: one easy, one medium and two hard templates each.
TRAIN_TEMPLATES = ("price_range_category", "avg_units_per_order", "inactive_customers_month", "product_growth")
HELDOUT_TEMPLATES = ("weekend_revenue_store", "second_store_month", "store_share_month", "all_stores_customers")

HINGLISH_PER_TEMPLATE = 4


def _write(path: Path, examples: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False, default=str) + "\n")


def _counts(examples: list[dict]) -> dict:
    correct = sum(ex["questions"]["correct"]["label"] for ex in examples)
    return {"n": len(examples), "correct": correct, "wrong": len(examples) - correct}


def unseen_split() -> tuple[list[dict], list[dict]]:
    """The committed unseen judge examples (data/unseen/judge.jsonl), split by template."""
    template = {i["question"]: i["template"] for i in unseen.load_questions()}
    examples = unseen.load_judge()
    train = [ex for ex in examples if template[ex["state"]["question"]] in TRAIN_TEMPLATES]
    heldout = [ex for ex in examples if template[ex["state"]["question"]] in HELDOUT_TEMPLATES]
    return train, heldout


def allowed_gold(data: dict, unseen_items: list[dict]) -> dict[str, str]:
    """Question -> gold SQL for every question v2 may train on: train split and training unseen templates."""
    gold = {i["question"]: i["sql"] for i in data["train"]}
    gold.update({i["question"]: i["sql"] for i in unseen_items if i["template"] in TRAIN_TEMPLATES})
    forbidden = {i["question"] for i in data["test"]}
    forbidden |= {i["question"] for i in unseen_items if i["template"] in HELDOUT_TEMPLATES}
    assert not forbidden & set(gold), "a held-out question is in the training set"
    return gold


def harvest_traces(traces_db: Path, gold: dict[str, str]) -> list[dict]:
    """Judge examples from real student answers whose question exactly matches an allowed question.

    SQL that fails or returns no rows is skipped (the verifier rejects it before the judge sees
    it), and each (question, sql) pair is kept once. The database is opened read-only.
    """
    conn = sqlite3.connect(f"file:{traces_db.as_posix()}?mode=ro", uri=True)
    try:
        rows = conn.execute(
            "SELECT question, response FROM traces WHERE question IS NOT NULL AND response IS NOT NULL ORDER BY id"
        ).fetchall()
    finally:
        conn.close()
    gold_rows: dict[str, list] = {}
    seen, examples = set(), []
    for question, response in rows:
        if question not in gold:
            continue
        sql = extract_sql(response)
        if not sql or (question, sql) in seen:
            continue
        seen.add((question, sql))
        if question not in gold_rows:
            gold_rows[question] = run_sql(settings.bench_db_path, gold[question])
        ex = judge_data.example(question, sql, gold_rows[question])
        if ex is not None:
            examples.append(ex)
    return examples


def hinglish_examples(items: list[dict], pool: list[dict], rng: random.Random) -> list[dict]:
    """Hinglish twins of `items`, with the same candidate SQL as v1 builds for English (swaps from `pool`)."""
    return judge_data.build_split(hinglish.translate_all(items), pool, rng, max_negatives=5)


def build(traces_db: Path | None = None, seed: int = 13) -> dict:
    rng = random.Random(seed)
    data = load()
    unseen_items = unseen.load_questions()
    unseen_train, heldout_unseen = unseen_split()
    gold = allowed_gold(data, unseen_items)
    traces = []
    if traces_db is not None and traces_db.exists():
        traces = harvest_traces(traces_db, gold)
    else:
        print(f"no traces database at {traces_db}; skipping real student attempts")
    sources = {
        "v1": unseen.load_judge(judge_data.OUT_DIR / "train.jsonl"),
        "unseen_train": unseen_train,
        "traces": traces,
        "hinglish": hinglish_examples(hinglish.pick(data["train"], HINGLISH_PER_TEMPLATE), data["train"], rng),
    }
    train = [ex for examples in sources.values() for ex in examples]
    rng.shuffle(train)
    # Swaps for held-out Hinglish come from test questions only, as in v1's held-out file.
    heldout_hinglish = hinglish_examples(data["test"], data["test"], rng)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    files = {"train": train, "heldout_unseen": heldout_unseen, "heldout_hinglish": heldout_hinglish}
    for name, examples in files.items():
        _write(OUT_DIR / f"{name}.jsonl", examples)
    summary = {
        "train_templates": list(TRAIN_TEMPLATES),
        "heldout_templates": list(HELDOUT_TEMPLATES),
        "sources": {name: _counts(examples) for name, examples in sources.items()},
        "files": {name: _counts(examples) for name, examples in files.items()},
    }
    (OUT_DIR / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    for group in ("sources", "files"):
        print(f"{group}:")
        for name, c in summary[group].items():
            share = c["correct"] / c["n"] if c["n"] else 0
            print(f"  {name:<18} {c['n']:>5}  correct {c['correct']:>5}  wrong {c['wrong']:>5}  ({share:.0%} correct)")
    print(f"-> {OUT_DIR}")
    return files


def evaluate(path: Path, n: int = 0, concurrency: int = 4) -> dict:
    from .unseen_judge import score

    examples = unseen.load_judge(path)
    examples = examples[:n] if n else examples
    out = path.with_name(f"{path.stem}_results.json")
    return asyncio.run(score(examples, concurrency=concurrency, out=out, label=path.stem))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    b = sub.add_parser("build", help="write data/judge_v2/*.jsonl")
    b.add_argument("--traces", type=Path, default=settings.db_path, help="gateway database with a traces table")
    e = sub.add_parser("eval", help="score a judge JSONL file with the decision judge")
    e.add_argument("--file", type=Path, required=True)
    e.add_argument("--n", type=int, default=0, help="use only the first N examples")
    e.add_argument("--concurrency", type=int, default=4)
    args = parser.parse_args()
    if args.command == "build":
        build(args.traces)
    else:
        evaluate(args.file, args.n, args.concurrency)


if __name__ == "__main__":
    main()
