"""Runs the benchmark through the gateway and records results.

Phases:
  baseline  test set: student alone, teacher alone, cascade (memory is empty)
  warm      train set streamed through the cascade; teacher answers fill memory
  after     test set: student with memory, cascade with memory (nothing learned)
  all       baseline, then warm, then after

Run the gateway first, then:  python -m bench.run_eval all
"""

import argparse
import asyncio
import sqlite3
import statistics
import time

import httpx

from apprentice.config import settings
from apprentice.db import Database
from apprentice.verifiers import extract_sql, run_sql

from .questions import SYSTEM_PROMPT, load


def _norm_value(v):
    if isinstance(v, float):
        return round(v, 2)
    if isinstance(v, str) and v.strip().isdigit():
        return int(v)
    return v


def _norm_rows(rows) -> list[tuple]:
    return sorted((tuple(_norm_value(v) for v in row) for row in rows), key=repr)


def matches(pred_rows, gold_rows) -> bool:
    """Same result set, or (for single-column gold answers) one predicted column matches.

    The second case accepts queries that return extra columns, e.g. a store name
    together with its revenue when only the name was asked for.
    """
    pred, gold = _norm_rows(pred_rows), _norm_rows(gold_rows)
    if pred == gold:
        return True
    if not gold or len(gold[0]) != 1 or not pred or len(pred) != len(gold):
        return False
    gold_col = sorted((r[0] for r in gold), key=repr)
    return any(sorted((r[i] for r in pred), key=repr) == gold_col for i in range(len(pred[0])))


async def ask(client: httpx.AsyncClient, url: str, item: dict, mode: str, memory: bool, learn: bool, tag: str) -> dict:
    body = {
        "model": "apprentice",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": item["question"]},
        ],
        "apprentice": {"mode": mode, "memory": memory, "learn": learn, "verifier": "sql", "tag": tag},
    }
    try:
        r = await client.post(f"{url}/v1/chat/completions", json=body, timeout=300)
        r.raise_for_status()
        data = r.json()
    except httpx.HTTPError as e:
        return {"qid": item["id"], "correct": False, "served_by": "error", "latency_ms": 0, "cost_usd": 0, "error": str(e)}

    meta = data["apprentice"]
    result = {
        "qid": item["id"],
        "served_by": meta["served_by"],
        "latency_ms": meta["latency_ms"],
        "cost_usd": meta["cost_usd"],
        "error": None,
    }
    gold = run_sql(settings.bench_db_path, item["sql"])
    try:
        pred = run_sql(settings.bench_db_path, extract_sql(data["choices"][0]["message"]["content"]))
        result["correct"] = matches(pred, gold)
    except sqlite3.Error as e:
        result["correct"] = False
        result["error"] = f"SQL error: {e}"
    return result


async def run_phase(
    db: Database, url: str, items: list[dict], phase: str, mode: str, memory: bool, learn: bool, concurrency: int
) -> dict:
    sem = asyncio.Semaphore(concurrency)
    tag = f"{phase}:{mode}"
    done = 0

    async with httpx.AsyncClient() as client:

        async def one(item):
            nonlocal done
            async with sem:
                res = await ask(client, url, item, mode, memory, learn, tag)
            done += 1
            print(f"\r  {tag:<18} {done}/{len(items)}", end="", flush=True)
            return res

        # Learning runs go in order so later questions can use earlier teacher answers.
        if learn:
            results = [await one(item) for item in items]
        else:
            results = await asyncio.gather(*(one(item) for item in items))
    print()

    latencies = sorted(r["latency_ms"] for r in results)
    n = len(results)
    correct = sum(r["correct"] for r in results)
    summary = {
        "phase": phase,
        "mode": mode,
        "n": n,
        "correct": correct,
        "accuracy": correct / n if n else 0.0,
        "student_share": sum(r["served_by"].startswith("student") for r in results) / n if n else 0.0,
        "cost_usd": sum(r["cost_usd"] for r in results),
        "p50_ms": statistics.median(latencies) if latencies else 0.0,
        "p95_ms": latencies[int(0.95 * (n - 1))] if latencies else 0.0,
        "memory_size": db.scalar("SELECT COUNT(*) FROM memory") or 0,
    }
    run_id = db.execute(
        """INSERT INTO eval_runs (ts, phase, mode, n, correct, accuracy, student_share, cost_usd,
           p50_ms, p95_ms, memory_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (time.time(), *summary.values()),
    )
    for r in results:
        db.execute(
            "INSERT INTO eval_results (run_id, qid, correct, served_by, latency_ms, cost_usd, error) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (run_id, r["qid"], int(r["correct"]), r["served_by"], r["latency_ms"], r["cost_usd"], r["error"]),
        )
    print(
        f"  -> accuracy {summary['accuracy']:.0%}  student {summary['student_share']:.0%}  "
        f"cost ${summary['cost_usd']:.4f}  p50 {summary['p50_ms']:.0f} ms  memory {summary['memory_size']}"
    )
    return summary


PLANS = {
    "baseline": [("test", "student", False, False), ("test", "teacher", False, False), ("test", "cascade", True, False)],
    "warm": [("train", "cascade", True, True)],
    "after": [("test", "student", True, False), ("test", "cascade", True, False)],
}


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("phase", choices=[*PLANS, "all"])
    parser.add_argument("--url", default="http://localhost:8000")
    parser.add_argument("--concurrency", type=int, default=2)
    parser.add_argument("--limit", type=int, default=0, help="use only the first N questions per split")
    args = parser.parse_args()

    data = load()
    db = Database(settings.db_path)
    phases = ["baseline", "warm", "after"] if args.phase == "all" else [args.phase]
    for phase in phases:
        print(f"[{phase}]")
        for split, mode, memory, learn in PLANS[phase]:
            items = data[split][: args.limit] if args.limit else data[split]
            await run_phase(db, args.url, items, phase, mode, memory, learn, args.concurrency)


if __name__ == "__main__":
    asyncio.run(main())
