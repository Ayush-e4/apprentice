"""A backup judge: an open LLM behind any OpenAI-compatible chat endpoint answers yes or no.

It sees the same state and statement as the decision judge (judges.py). A "yes"
scores 1.0 and a "no" scores 0.0. By default it uses the teacher's endpoint.
"""

import json
import re
import time

import httpx

from .config import Endpoint
from .judges import JudgeError, Verdict
from .providers import ProviderError, chat

_YES_NO_RE = re.compile(r"\b(yes|no)\b", re.IGNORECASE)

SYSTEM_PROMPT = (
    "You are a strict grader. You are given a state as JSON and a statement about it. "
    "Decide whether the statement is true. Reply with exactly one word: yes or no."
)


def judge_messages(state: dict, statement: str) -> list[dict]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"State:\n{json.dumps(state, ensure_ascii=False, default=str)}\n\n"
                f"Statement: {statement}\n\n"
                "Is the statement true? Reply with exactly one word: yes or no."
            ),
        },
    ]


def parse_verdict(text: str) -> float | None:
    """1.0 for yes, 0.0 for no, None if neither. The last standalone yes/no wins."""
    words = _YES_NO_RE.findall(text)
    if not words:
        return None
    return 1.0 if words[-1].lower() == "yes" else 0.0


async def llm_check(
    client: httpx.AsyncClient,
    ep: Endpoint,
    threshold: float,
    state: dict,
    statement: str,
    max_tokens: int = 512,
    timeout_s: float = 60.0,
) -> Verdict:
    started = time.perf_counter()
    try:
        c = await chat(client, [ep], judge_messages(state, statement), max_tokens=max_tokens, timeout_s=timeout_s)
    except ProviderError as e:
        raise JudgeError(str(e)) from e
    score = parse_verdict(c.content)
    if score is None:
        raise JudgeError(f"{ep.model}: no yes/no in reply {c.content[:80]!r}")
    return Verdict(
        ok=score >= threshold,
        score=score,
        cost=c.cost,
        latency_ms=(time.perf_counter() - started) * 1000,
    )
