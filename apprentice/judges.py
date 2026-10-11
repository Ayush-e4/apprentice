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


class JudgeError(Exception):
    pass


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
                "questions": {
                    "correct": {
                        "type": "noul",
                        "instructions": statement,
                        "criteria": {
                            "true": "The answer fully and correctly addresses the question",
                            "false": "The answer is wrong, incomplete, or answers a different question",
                        },
                    }
                },
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
