"""HTTP routes for the QuickBite support demo.

Every question goes through the same engine as /v1/chat/completions, in cascade
mode with no verifier: the student answers when memory holds a similar teacher
answer, otherwise the teacher answers and the answer is remembered. Traces are
tagged "support", so the page's numbers and its reset cover this demo only.
"""

import os
from dataclasses import replace

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ..engine import Engine, Options
from ..providers import ProviderError
from .knowledge import SYSTEM_PROMPT
from .questions import EXAMPLES, simulation

TAG = "support"
MAX_QUESTION = 1000

router = APIRouter()


def _error(status: int, message: str, kind: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"message": message, "type": kind}})


def _engine(request: Request) -> Engine:
    """The app's engine, or a copy with SUPPORT_MIN_SIM as the memory threshold if that is set."""
    base: Engine = request.app.state.engine
    raw = os.getenv("SUPPORT_MIN_SIM", "").strip()
    if not raw or float(raw) == base.s.memory_min_sim:
        return base
    return Engine(replace(base.s, memory_min_sim=float(raw)), base.db, base.client)


async def _ask(engine: Engine, question: str) -> dict:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": question}]
    r = await engine.handle(messages, Options(mode="cascade", tag=TAG))
    return {
        "question": question,
        "answer": r.content,
        "served_by": r.served_by,
        "escalated": r.escalated,
        "reason": r.reason,
        "cost_usd": r.cost_usd,
        "latency_ms": round(r.latency_ms, 1),
        "memory_hits": r.memory_hits,
        "top_sim": round(r.top_sim, 3),
        "trace_id": r.trace_id,
    }


@router.get("/api/support/questions")
def questions():
    return {"examples": EXAMPLES, "simulation": simulation()}


@router.post("/api/support/ask")
async def ask(request: Request):
    body = await request.json()
    question = str(body.get("question") or "").strip()
    if not question:
        return _error(400, "question must be a non-empty string", "invalid_request_error")
    if len(question) > MAX_QUESTION:
        return _error(400, f"question must be at most {MAX_QUESTION} characters", "invalid_request_error")
    try:
        return await _ask(_engine(request), question)
    except ProviderError as e:
        return _error(502, str(e), "upstream_error")


@router.post("/api/support/simulate")
async def simulate(request: Request):
    """Replay the built-in customer questions in order. Body: {"limit": n} to replay only the first n."""
    body = await request.json() if await request.body() else {}
    limit = int(body.get("limit") or 0)
    batch = simulation()[:limit] if limit > 0 else simulation()
    engine = _engine(request)
    results = []
    for question in batch:
        try:
            results.append(await _ask(engine, question))
        except ProviderError as e:
            results.append({"question": question, "error": str(e)})
    answered = [r for r in results if "error" not in r]
    by_student = sum(r["served_by"].startswith("student") for r in answered)
    return {
        "requests": len(results),
        "by_student": by_student,
        "student_share": by_student / len(answered) if answered else 0.0,
        "cost_usd": sum(r["cost_usd"] for r in answered),
        "errors": len(results) - len(answered),
        "results": results,
    }


@router.get("/api/support/stats")
def stats(request: Request):
    db = request.app.state.engine.db
    totals = db.query(
        """SELECT COUNT(*) AS requests,
                  COALESCE(SUM(served_by LIKE 'student%'), 0) AS by_student,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd,
                  COALESCE(AVG(latency_ms), 0) AS avg_latency_ms
           FROM traces WHERE tag = ?""",
        (TAG,),
    )[0]
    timeline = db.query(
        "SELECT id, served_by, cost_usd FROM traces WHERE tag = ? ORDER BY id DESC LIMIT 200", (TAG,)
    )[::-1]
    memory = db.scalar(
        "SELECT COUNT(*) FROM memory WHERE trace_id IN (SELECT id FROM traces WHERE tag = ?)", (TAG,)
    )
    return {"totals": totals, "memory_size": memory or 0, "timeline": timeline}


@router.post("/api/support/reset")
def reset(request: Request):
    """Forget this demo's traces and the memory they created; other traces and memory are kept."""
    db = request.app.state.engine.db
    db.execute("DELETE FROM memory WHERE trace_id IN (SELECT id FROM traces WHERE tag = ?)", (TAG,))
    db.execute("DELETE FROM traces WHERE tag = ?", (TAG,))
    return {"reset": TAG}
