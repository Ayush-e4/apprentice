"""Routing between the student and the teacher, and learning from the teacher.

Modes:
  student  - student only (with memory examples unless disabled)
  teacher  - teacher only
  cascade  - with a verifier: student first, escalate if the check fails
             without a verifier: student if memory has a similar example,
             otherwise teacher

In cascade mode, judge="decision" adds a second check on student answers that
pass the verifier: a decision model (Von, Kev or Jev, see judges.py) scores
whether the answer is actually correct, and low scores escalate to the teacher.
judge="llm" does the same with an open LLM answering yes/no (see llm_judge.py).
"""

import time
from dataclasses import dataclass

import httpx

from .config import Settings
from .db import Database
from .judges import SQL_STATEMENT, TEXT_STATEMENT, JudgeError, sql_state, systemone_check, text_state
from .llm_judge import llm_check
from .memory import Hit, Memory, scope_of
from .providers import Completion, ProviderError, chat
from .verifiers import preview_sql, verify_sql

MODES = ("cascade", "student", "teacher")
JUDGES = ("decision", "llm")


@dataclass
class Options:
    mode: str = "cascade"
    use_memory: bool = True
    learn: bool = True
    verifier: str | None = None
    judge: str | None = None
    tag: str | None = None
    scope: str | None = None  # memory scope; default: a hash of the system messages (memory.scope_of)


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
    check_score: float | None
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


def system_text(messages: list[dict]) -> str:
    return "\n".join(m["content"] for m in messages if m.get("role") == "system" and isinstance(m.get("content"), str))


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

    async def _run_judge(self, kind: str, state: dict, statement: str):
        if kind == "decision":
            return await systemone_check(self.client, self.s.judge, self.s.judge_threshold, state, statement)
        return await llm_check(
            self.client, self.s.llm_judge, self.s.llm_judge_threshold, state, statement, timeout_s=self.s.timeout_s
        )

    async def _judge(self, opts: Options, messages: list[dict], answer: str):
        """Returns (ok, score, cost, note).

        If the decision judge is unreachable and JUDGE_FALLBACK=llm, the LLM judge is asked
        instead. If no judge can answer, the answer is let through and the note says why.
        """
        if opts.judge not in JUDGES:
            return True, None, 0.0, ""
        if (self.s.judge if opts.judge == "decision" else self.s.llm_judge) is None:
            return True, None, 0.0, "judge not configured"
        question = last_user_text(messages)
        if opts.verifier == "sql":
            state = sql_state(question, preview_sql(self.s.bench_db_path, answer))
            statement = SQL_STATEMENT
        else:
            state = text_state(system_text(messages), question, answer)
            statement = TEXT_STATEMENT
        try:
            v = await self._run_judge(opts.judge, state, statement)
            return v.ok, v.score, v.cost, f"judge {v.score:.2f}"
        except JudgeError as e:
            failure = f"judge unavailable ({str(e).splitlines()[0][:160]})"
        if opts.judge == "decision" and self.s.judge_fallback == "llm" and self.s.llm_judge is not None:
            try:
                v = await self._run_judge("llm", state, statement)
                return v.ok, v.score, v.cost, f"{failure}; fallback llm judge {v.score:.2f}"
            except JudgeError as e:
                failure += f"; fallback llm judge unavailable ({str(e).splitlines()[0][:160]})"
        return True, None, 0.0, failure

    async def handle(self, messages: list[dict], opts: Options) -> Result:
        if opts.mode not in MODES:
            raise ValueError(f"mode must be one of {MODES}")
        if opts.judge and opts.judge not in JUDGES:
            raise ValueError(f"judge must be one of {JUDGES}")
        started = time.perf_counter()
        question = last_user_text(messages)
        scope = opts.scope or scope_of(system_text(messages))

        hits: list[Hit] = []
        if opts.use_memory and opts.mode != "teacher":
            hits = await self.memory.search(question, self.s.memory_k, scope)
        top_sim = hits[0].sim if hits else 0.0
        relevant = [h for h in hits if h.sim >= self.s.memory_min_sim]

        spent: list[Completion] = []
        extra_cost = 0.0
        check_score = None
        escalated = False

        if opts.mode == "teacher":
            final = await self._teacher(messages)
            reason = "mode=teacher"
        elif opts.mode == "student":
            final = await self._student(messages, relevant)
            reason = "mode=student"
        elif not opts.verifier and not relevant:
            final = await self._teacher(messages)
            escalated = True
            reason = f"no similar memory (best sim {top_sim:.2f})"
        else:
            try:
                attempt = await self._student(messages, relevant)
                spent.append(attempt)
                if opts.verifier:
                    ok, why = self._verify(opts.verifier, attempt.content)
                    why = f"{opts.verifier} check: {why}"
                else:
                    ok, why = True, f"similar memory found (sim {top_sim:.2f})"
                if ok:
                    ok, check_score, judge_cost, note = await self._judge(opts, messages, attempt.content)
                    extra_cost += judge_cost
                    if note:
                        why = f"{why}; {note}"
            except ProviderError as e:
                ok, why = False, f"student unavailable ({e})"
            if ok:
                final = attempt
                reason = f"student passed: {why}"
            else:
                final = await self._teacher(messages)
                escalated = True
                reason = f"escalated: {why}"
        spent.append(final)

        served_by = final.endpoint.name
        cost = sum(c.cost for c in spent) + extra_cost
        latency_ms = (time.perf_counter() - started) * 1000
        trace_id = self.db.execute(
            """INSERT INTO traces (ts, mode, served_by, model, escalated, reason, question, response,
               prompt_tokens, completion_tokens, cost_usd, latency_ms, memory_hits, top_sim, tag, check_score)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                time.time(), opts.mode, served_by, final.endpoint.model, int(escalated), reason,
                question, final.content, final.prompt_tokens, final.completion_tokens, cost,
                latency_ms, len(relevant), top_sim, opts.tag, check_score,
            ),
        )

        if opts.learn and served_by.startswith("teacher") and question:
            keep = True
            if opts.verifier:
                keep, _ = self._verify(opts.verifier, final.content)
            if keep:
                await self.memory.add(question, final.content, trace_id, scope)

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
            check_score=check_score,
            trace_id=trace_id,
        )
