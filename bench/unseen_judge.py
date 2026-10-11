"""Scores the decision judge on SQL from question types it was never trained on.

Reads data/unseen/judge.jsonl (built by `python -m bench.unseen build`), asks the
judge configured by JUDGE_* about each example, and compares its verdict with the
execution-based label. Run:  python -m bench.unseen judge
"""

import asyncio
import json
import statistics
from pathlib import Path

import httpx

from apprentice.config import Endpoint, settings
from apprentice.judges import SQL_STATEMENT, JudgeError, systemone_check


def summarize(labels: list[bool], scores: list[float], threshold: float, errors: int = 0) -> dict:
    preds = [s >= threshold for s in scores]
    tp = sum(p and y for p, y in zip(preds, labels))
    fp = sum(p and not y for p, y in zip(preds, labels))
    fn = sum(not p and y for p, y in zip(preds, labels))
    tn = sum(not p and not y for p, y in zip(preds, labels))
    n = len(labels)

    def mean(values: list[float]) -> float | None:
        return round(statistics.fmean(values), 4) if values else None

    return {
        "n": n,
        "errors": errors,
        "threshold": threshold,
        "accuracy": round((tp + tn) / n, 4) if n else 0.0,
        "precision": round(tp / (tp + fp), 4) if tp + fp else 0.0,
        "recall": round(tp / (tp + fn), 4) if tp + fn else 0.0,
        "confusion": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "mean_score_correct": mean([s for s, y in zip(scores, labels) if y]),
        "mean_score_wrong": mean([s for s, y in zip(scores, labels) if not y]),
        "wrong_above_threshold": fp,
        "wrong_total": fp + tn,
    }


def report(summary: dict, judge_model: str) -> str:
    c = summary["confusion"]
    return "\n".join([
        f"judge {judge_model}  threshold {summary['threshold']}  n {summary['n']}  errors {summary['errors']}",
        f"  accuracy {summary['accuracy']:.1%}  precision {summary['precision']:.1%}  recall {summary['recall']:.1%}"
        "  (positive = correct)",
        "                 judged correct  judged wrong",
        f"  is correct     {c['tp']:>14}  {c['fn']:>12}",
        f"  is wrong       {c['fp']:>14}  {c['tn']:>12}",
        f"  mean score: correct {summary['mean_score_correct']}  wrong {summary['mean_score_wrong']}",
        f"  wrong queries scoring >= threshold: {summary['wrong_above_threshold']}/{summary['wrong_total']}",
    ])


async def score(
    examples: list[dict],
    client: httpx.AsyncClient | None = None,
    ep: Endpoint | None = None,
    threshold: float | None = None,
    concurrency: int = 4,
    out: Path | None = None,
) -> dict:
    from .unseen import RESULTS_PATH

    ep = ep or settings.judge
    if ep is None:
        raise SystemExit("Set JUDGE_BASE_URL and JUDGE_MODEL to run the judge eval.")
    threshold = settings.judge_threshold if threshold is None else threshold
    out = out or RESULTS_PATH
    sem = asyncio.Semaphore(concurrency)
    own_client = client is None
    client = client or httpx.AsyncClient()
    done = 0

    async def one(ex: dict) -> float | None:
        nonlocal done
        async with sem:
            try:
                verdict = await systemone_check(client, ep, threshold, ex["state"], SQL_STATEMENT)
                result = verdict.score
            except JudgeError as e:
                print(f"\n  judge error: {e}")
                result = None
        done += 1
        print(f"\r  unseen:judge {done}/{len(examples)}", end="", flush=True)
        return result

    try:
        scored = await asyncio.gather(*(one(ex) for ex in examples))
    finally:
        if own_client:
            await client.aclose()
    print()
    pairs = [(ex["questions"]["correct"]["label"], s) for ex, s in zip(examples, scored) if s is not None]
    summary = summarize([y for y, _ in pairs], [s for _, s in pairs], threshold, errors=len(examples) - len(pairs))
    summary["judge_model"] = ep.model
    print(report(summary, ep.model))
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"  -> {out}")
    return summary
