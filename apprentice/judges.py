"""Answer checks that go beyond "does it run": a decision model scores whether an answer is right.

Decision models answer typed questions about a state over the /v1/systemone
protocol. Open-weight servers that speak it: Von (wfzyx/von, Apache-2.0) and
Kev (jaredpalmer/kev, Apache-2.0); TypeSafe's hosted Jev uses it too.
A Noul question returns the probability that a statement is true, which we
compare against a threshold.
"""

import json
import time
from dataclasses import dataclass

import httpx

from .config import Endpoint


SQL_STATEMENT = "The SQL query correctly answers the user's question, and its result is the requested answer."
TEXT_STATEMENT = "The assistant's answer correctly and completely answers the user's question."


class JudgeError(Exception):
    pass


def sql_state(question: str, preview: dict) -> dict:
    """What the judge sees for a SQL answer. Training data (bench/judge_data.py) uses the same shape."""
    return {"question": question, **preview}


def text_state(instructions: str, question: str, answer: str) -> dict:
    return {"instructions": instructions[:4000], "question": question, "answer": answer}


def noul_question(statement: str) -> dict:
    return {
        "type": "noul",
        "instructions": statement,
        "criteria": {
            "true": "The answer fully and correctly addresses the question",
            "false": "The answer is wrong, incomplete, or answers a different question",
        },
    }


@dataclass
class Verdict:
    ok: bool
    score: float
    cost: float
    latency_ms: float


async def systemone_check(
    client: httpx.AsyncClient,
    ep: Endpoint,
    threshold: float,
    state: dict,
    statement: str,
    timeout_s: float = 30.0,
) -> Verdict:
    headers = {"Content-Type": "application/json"}
    if ep.api_key:
        headers["Authorization"] = f"Bearer {ep.api_key}"
    started = time.perf_counter()
    try:
        r = await client.post(
            f"{ep.base_url}/v1/systemone",
            headers=headers,
            json={
                "model": ep.model,
                "state": json.dumps(state, ensure_ascii=False, default=str),
                "questions": {"correct": noul_question(statement)},
            },
            timeout=timeout_s,
        )
        r.raise_for_status()
        data = r.json()
        score = float(data["answers"]["correct"]["noul"])
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as e:
        raise JudgeError(f"{ep.model}: {type(e).__name__}: {e}") from e
    usage = data.get("usage") or {}
    return Verdict(
        ok=score >= threshold,
        score=score,
        cost=ep.cost(int(usage.get("input_tokens") or 0), int(usage.get("output_tokens") or 0)),
        latency_ms=(time.perf_counter() - started) * 1000,
    )
