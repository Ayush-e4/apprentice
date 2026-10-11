"""Routing between the student and the teacher, and learning from the teacher.

Modes:
  student  - student only (with memory examples unless disabled)
  teacher  - teacher only
  cascade  - with a verifier: student first, escalate if the check fails
             without a verifier: student if memory has a similar example,
             otherwise teacher
"""

import time
from dataclasses import dataclass

import httpx

from .config import Settings
from .db import Database
from .memory import Hit, Memory
from .providers import Completion, ProviderError, chat
from .verifiers import verify_sql

MODES = ("cascade", "student", "teacher")


@dataclass
class Options:
    mode: str = "cascade"
    use_memory: bool = True
    learn: bool = True
    verifier: str | None = None
    tag: str | None = None


@dataclass
class Result:
    content: str
    served_by: str
    model: str
    escalated: bool
    reason: str
    prompt_tokens: int
    completion_tokens: int
    cost_usd: float
    latency_ms: float
    memory_hits: int
    top_sim: float
    trace_id: int


def last_user_text(messages: list[dict]) -> str:
    for m in reversed(messages):
        if m.get("role") != "user":
            continue
        content = m.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
    return ""


def with_examples(messages: list[dict], hits: list[Hit]) -> list[dict]:
    """Insert remembered question/answer pairs as few-shot turns before the last user turn."""
    if not hits:
        return messages
    last_user = max(i for i, m in enumerate(messages) if m.get("role") == "user")
    examples = []
    for h in reversed(hits):  # most similar example sits closest to the question
        examples.append({"role": "user", "content": h.question})
        examples.append({"role": "assistant", "content": h.answer})
    return messages[:last_user] + examples + messages[last_user:]


class Engine:
    def __init__(self, settings: Settings, db: Database, client: httpx.AsyncClient):
        self.s = settings
        self.db = db
        self.client = client
        self.memory = Memory(db, client, settings.embed)

    def _verify(self, verifier: str, content: str) -> tuple[bool, str]:
        if verifier == "sql":
            return verify_sql(self.s.bench_db_path, content)
        raise ValueError(f"unknown verifier: {verifier}")

    async def _student(self, messages: list[dict], hits: list[Hit]) -> Completion:
        return await chat(
            self.client,
            self.s.student,
            with_examples(messages, hits),
            no_think=self.s.student_no_think,
            timeout_s=self.s.timeout_s,
        )

    async def _teacher(self, messages: list[dict]) -> Completion:
        return await chat(self.client, self.s.teacher, messages, timeout_s=self.s.timeout_s)

    async def handle(self, messages: list[dict], opts: Options) -> Result:
        if opts.mode not in MODES:
            raise ValueError(f"mode must be one of {MODES}")
        started = time.perf_counter()
        question = last_user_text(messages)

        hits: list[Hit] = []
        if opts.use_memory and opts.mode != "teacher":
            hits = await self.memory.search(question, self.s.memory_k)
        top_sim = hits[0].sim if hits else 0.0
        relevant = [h for h in hits if h.sim >= self.s.memory_min_sim]

        spent: list[Completion] = []
        escalated = False

        if opts.mode == "teacher":
            final = await self._teacher(messages)
            reason = "mode=teacher"
        elif opts.mode == "student":
            final = await self._student(messages, relevant)
            reason = "mode=student"
        elif opts.verifier:
            try:
                attempt = await self._student(messages, relevant)
                spent.append(attempt)
                ok, why = self._verify(opts.verifier, attempt.content)
            except ProviderError as e:
                ok, why = False, f"student unavailable ({e})"
            if ok:
                final = attempt
                reason = f"student passed {opts.verifier} check: {why}"
            else:
                final = await self._teacher(messages)
                escalated = True
                reason = f"student failed {opts.verifier} check: {why}"
        elif relevant:
            try:
                final = await self._student(messages, relevant)
                reason = f"similar memory found (sim {top_sim:.2f})"
            except ProviderError as e:
                final = await self._teacher(messages)
                escalated = True
                reason = f"student unavailable ({e})"
        else:
            final = await self._teacher(messages)
            escalated = True
            reason = f"no similar memory (best sim {top_sim:.2f})"
        spent.append(final)

        served_by = final.endpoint.name
        cost = sum(c.cost for c in spent)
        latency_ms = (time.perf_counter() - started) * 1000
        trace_id = self.db.execute(
            """INSERT INTO traces (ts, mode, served_by, model, escalated, reason, question, response,
               prompt_tokens, completion_tokens, cost_usd, latency_ms, memory_hits, top_sim, tag)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                time.time(), opts.mode, served_by, final.endpoint.model, int(escalated), reason,
                question, final.content, final.prompt_tokens, final.completion_tokens, cost,
                latency_ms, len(relevant), top_sim, opts.tag,
            ),
        )

        if opts.learn and served_by.startswith("teacher") and question:
            keep = True
            if opts.verifier:
                keep, _ = self._verify(opts.verifier, final.content)
            if keep:
                await self.memory.add(question, final.content, trace_id)

        return Result(
            content=final.content,
            served_by=served_by,
            model=final.endpoint.model,
            escalated=escalated,
            reason=reason,
            prompt_tokens=final.prompt_tokens,
            completion_tokens=final.completion_tokens,
            cost_usd=cost,
            latency_ms=latency_ms,
            memory_hits=len(relevant),
            top_sim=top_sim,
            trace_id=trace_id,
        )
