"""Memory of teacher answers, searched by similarity to new questions.

Uses an embedding endpoint when one is configured and reachable, and falls back
to lexical (bag-of-words cosine) similarity otherwise.
"""

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

    async def add(self, question: str, answer: str, trace_id: int | None = None) -> None:
        vector = await self._embed(question)
        self.db.execute(
            "INSERT INTO memory (ts, question, answer, embedding, trace_id) VALUES (?, ?, ?, ?, ?)",
            (time.time(), question, answer, json.dumps(vector) if vector else None, trace_id),
        )

    async def search(self, question: str, k: int) -> list[Hit]:
        rows = self.db.query("SELECT id, question, answer, embedding FROM memory")
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
