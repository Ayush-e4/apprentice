"""FastAPI app: OpenAI-compatible endpoint plus the APIs behind the web app (web/).

Run with:  uvicorn apprentice.gateway:app --port 8000
"""

import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .config import settings
from .db import Database
from .engine import MODES, Engine, Options
from .health import router as health_router
from .providers import ProviderError
from .shop import router as shop_router
from .support import router as support_router
from .web import router as web_router

db = Database(settings.db_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.bench_db_path.exists():
        from bench.shopdb import build

        build()
    app.state.client = httpx.AsyncClient()
    app.state.engine = Engine(settings, db, app.state.client)
    yield
    await app.state.client.aclose()


app = FastAPI(title="Apprentice", lifespan=lifespan)
app.include_router(shop_router)
app.include_router(support_router)
app.include_router(health_router)
app.include_router(web_router)


def _error(status: int, message: str, kind: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": {"message": message, "type": kind}})


def _flag(value, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _options(request: Request, body: dict) -> Options:
    """Options come from an `apprentice` object in the body, or X-Apprentice-* headers."""
    ext = body.get("apprentice") or {}
    headers = request.headers

    def pick(key: str):
        return ext.get(key, headers.get(f"x-apprentice-{key}"))

    return Options(
        mode=str(pick("mode") or "cascade").lower(),
        use_memory=_flag(pick("memory"), True),
        learn=_flag(pick("learn"), True),
        verifier=pick("verifier") or None,
        judge=pick("judge") or None,
        tag=pick("tag") or None,
    )


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    if body.get("stream"):
        return _error(400, "streaming is not supported yet", "invalid_request_error")
    messages = body.get("messages")
    if not isinstance(messages, list) or not messages:
        return _error(400, "messages must be a non-empty list", "invalid_request_error")
    opts = _options(request, body)
    if opts.mode not in MODES:
        return _error(400, f"mode must be one of {MODES}", "invalid_request_error")

    try:
        result = await request.app.state.engine.handle(messages, opts)
    except ProviderError as e:
        return _error(502, str(e), "upstream_error")
    except ValueError as e:
        return _error(400, str(e), "invalid_request_error")

    return {
        "id": f"chatcmpl-apprentice-{result.trace_id}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": result.model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": result.content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": result.prompt_tokens,
            "completion_tokens": result.completion_tokens,
            "total_tokens": result.prompt_tokens + result.completion_tokens,
        },
        "apprentice": {
            "served_by": result.served_by,
            "escalated": result.escalated,
            "reason": result.reason,
            "cost_usd": result.cost_usd,
            "latency_ms": round(result.latency_ms, 1),
            "memory_hits": result.memory_hits,
            "top_sim": round(result.top_sim, 3),
            "check_score": result.check_score,
            "trace_id": result.trace_id,
        },
    }


@app.get("/v1/models")
def models():
    return {
        "object": "list",
        "data": [{"id": "apprentice", "object": "model", "owned_by": "apprentice"}],
    }


@app.get("/api/stats")
def stats():
    totals = db.query(
        """SELECT COUNT(*) AS requests,
                  COALESCE(SUM(served_by LIKE 'student%'), 0) AS by_student,
                  COALESCE(SUM(cost_usd), 0) AS cost_usd,
                  COALESCE(AVG(latency_ms), 0) AS avg_latency_ms
           FROM traces"""
    )[0]
    timeline = db.query(
        "SELECT id, served_by, latency_ms, cost_usd FROM traces ORDER BY id DESC LIMIT 500"
    )[::-1]

    def describe(endpoints):
        return [{"name": e.name, "model": e.model, "base_url": e.base_url} for e in endpoints]

    return {
        "totals": totals,
        "memory_size": db.scalar("SELECT COUNT(*) FROM memory") or 0,
        "timeline": timeline,
        "config": {
            "student": describe(settings.student),
            "teacher": describe(settings.teacher),
            "embed": settings.embed.model if settings.embed else None,
            "judge": settings.judge.model if settings.judge else None,
            "llm_judge": settings.llm_judge.model if settings.llm_judge else None,
        },
    }


@app.get("/api/traces")
def traces(limit: int = 50):
    return db.query(
        """SELECT id, ts, mode, served_by, model, escalated, reason, question, response,
                  cost_usd, latency_ms, memory_hits, top_sim, tag, check_score
           FROM traces ORDER BY id DESC LIMIT ?""",
        (min(limit, 500),),
    )


@app.get("/api/evals")
def evals():
    return db.query("SELECT * FROM eval_runs ORDER BY id")


@app.post("/api/reset")
async def reset(request: Request):
    body = await request.json() if await request.body() else {}
    targets = body.get("targets") or ["traces", "memory", "evals"]
    if "traces" in targets:
        db.execute("DELETE FROM traces")
    if "memory" in targets:
        db.execute("DELETE FROM memory")
    if "evals" in targets:
        db.execute("DELETE FROM eval_results")
        db.execute("DELETE FROM eval_runs")
    return {"reset": targets}


@app.get("/api/bench/system-prompt")
def bench_system_prompt():
    from bench.questions import SYSTEM_PROMPT

    return {"prompt": SYSTEM_PROMPT}
