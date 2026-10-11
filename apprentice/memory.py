"""Memory of teacher answers, searched by similarity to new questions.

Uses an embedding endpoint when one is configured and reachable, and falls back
to lexical (bag-of-words cosine) similarity otherwise.

Memory is scoped by the request's system prompt: an answer remembered for one app
is only ever an example for requests with the same system prompt (or the same
explicit `scope` option), never for another app sharing the gateway.
"""

import functools
import hashlib
import json
import math
import re
import time
from collections import Counter
from dataclasses import dataclass

import httpx
import numpy as np

from .config import Endpoint
from .db import Database
from .providers import embed

_TOKEN_RE = re.compile(r"[a-z0-9]+")

NO_SYSTEM = "none"  # the scope of requests without a system message


def scope_of(system: str) -> str:
    """A short stable id for a system prompt: the first 16 hex chars of its sha256."""
    if not system:
        return NO_SYSTEM
    return hashlib.sha256(system.encode("utf-8")).hexdigest()[:16]


@functools.cache
def legacy_scopes() -> tuple[dict[str, str], str]:
    """Scopes for memory saved before scoping: by trace tag, and the default for every other row.

    Before scoping, only two apps wrote memory: the support demo (traces tagged "support")
    and Kirana Copilot / the benchmark, which share the SQL system prompt.
    """
    from bench.questions import SYSTEM_PROMPT as SQL_PROMPT

    from .support.knowledge import SYSTEM_PROMPT as SUPPORT_PROMPT

    return {"support": scope_of(SUPPORT_PROMPT)}, scope_of(SQL_PROMPT)


def backfill_scopes(db: Database) -> int:
    """Give rows without a scope the scope of the app that created them. Idempotent; returns rows updated."""
    pending = db.scalar("SELECT COUNT(*) FROM memory WHERE scope IS NULL") or 0
    if not pending:
        return 0
    by_tag, default = legacy_scopes()
    for tag, scope in by_tag.items():
        db.execute(
            "UPDATE memory SET scope = ? WHERE scope IS NULL AND trace_id IN (SELECT id FROM traces WHERE tag = ?)",
            (scope, tag),
        )
    db.execute("UPDATE memory SET scope = ? WHERE scope IS NULL", (default,))
    return pending


@dataclass
class Hit:
    id: int
    question: str
    answer: str
    sim: float


def _bag(text: str) -> Counter:
    return Counter(_TOKEN_RE.findall(text.lower()))


def _lexical_sim(a: Counter, b: Counter) -> float:
    dot = sum(a[t] * b[t] for t in a.keys() & b.keys())
    norm = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    return dot / norm if norm else 0.0


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    norm = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(a @ b) / norm if norm else 0.0


class Memory:
    def __init__(self, db: Database, client: httpx.AsyncClient, embed_ep: Endpoint | None):
        self.db = db
        self.client = client
        self.embed_ep = embed_ep

    async def _embed(self, text: str) -> list[float] | None:
        if self.embed_ep is None:
            return None
        try:
            return (await embed(self.client, self.embed_ep, [text]))[0]
        except (httpx.HTTPError, KeyError, IndexError, ValueError):
            return None

    async def add(self, question: str, answer: str, trace_id: int | None = None, scope: str = NO_SYSTEM) -> None:
        vector = await self._embed(question)
        self.db.execute(
            "INSERT INTO memory (ts, question, answer, embedding, trace_id, scope) VALUES (?, ?, ?, ?, ?, ?)",
            (time.time(), question, answer, json.dumps(vector) if vector else None, trace_id, scope),
        )

    async def search(self, question: str, k: int, scope: str = NO_SYSTEM) -> list[Hit]:
        """The k most similar remembered questions in this scope.

        Rows that still have no scope (made before scoping and not yet backfilled) are
        treated as SQL memory, the default in backfill_scopes, so they never reach another app.
        """
        sql = "SELECT id, question, answer, embedding FROM memory WHERE scope = ?"
        if scope == legacy_scopes()[1]:
            sql += " OR scope IS NULL"
        rows = self.db.query(sql, (scope,))
        if not rows:
            return []
        q_vec = await self._embed(question)
        q_arr = np.array(q_vec) if q_vec else None
        q_bag = _bag(question)
        hits = []
        for r in rows:
            if q_arr is not None and r["embedding"]:
                sim = _cosine(q_arr, np.array(json.loads(r["embedding"])))
            else:
                sim = _lexical_sim(q_bag, _bag(r["question"]))
            hits.append(Hit(r["id"], r["question"], r["answer"], sim))
        hits.sort(key=lambda h: h.sim, reverse=True)
        return hits[:k]

    def size(self) -> int:
        return self.db.scalar("SELECT COUNT(*) FROM memory") or 0

    def clear(self) -> None:
        self.db.execute("DELETE FROM memory")
