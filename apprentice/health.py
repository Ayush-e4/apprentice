"""Health check: is every model this gateway depends on reachable right now?

`GET /api/health` checks the student, teacher, judges and embeddings in parallel
with short timeouts, plus the shop database, so a demo or deployment can spot a
dead dependency before a user does. It never sends a real prompt and costs nothing.
"""

import asyncio
import sqlite3
import time

from pathlib import Path

import httpx
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse

from .config import Endpoint, Settings

TIMEOUT_S = 5.0
SCRIPT = Path(__file__).parent / "dashboard" / "health.js"

router = APIRouter()


def _headers(ep: Endpoint) -> dict[str, str]:
    return {"Authorization": f"Bearer {ep.api_key}"} if ep.api_key else {}


async def _models(client: httpx.AsyncClient, ep: Endpoint, path: str) -> dict:
    """GET the endpoint's model list: cheap, and proves the server is up and the key works."""
    started = time.perf_counter()
    try:
        r = await client.get(f"{ep.base_url}{path}", headers=_headers(ep), timeout=TIMEOUT_S)
        ok = r.status_code == 200
        detail = "ok" if ok else f"HTTP {r.status_code}"
    except httpx.HTTPError as e:
        ok, detail = False, f"{type(e).__name__}: {e}" if str(e) else type(e).__name__
    return {"ok": ok, "model": ep.model, "url": ep.base_url, "latency_ms": round((time.perf_counter() - started) * 1000), "detail": detail}


def _database(s: Settings) -> dict:
    try:
        conn = sqlite3.connect(f"file:{s.bench_db_path.as_posix()}?mode=ro", uri=True)
        try:
            orders = conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
        finally:
            conn.close()
        return {"ok": orders > 0, "detail": f"{orders} orders"}
    except sqlite3.Error as e:
        return {"ok": False, "detail": str(e)}


async def check(s: Settings, client: httpx.AsyncClient) -> dict:
    tasks: dict[str, object] = {}
    for ep in s.student:
        tasks[ep.name] = _models(client, ep, "/models")
    for ep in s.teacher:
        tasks[ep.name] = _models(client, ep, "/models")
    if s.judge:
        tasks["judge"] = _models(client, s.judge, "/v1/models")
    if s.embed:
        tasks["embed"] = _models(client, s.embed, "/models")
    results = dict(zip(tasks, await asyncio.gather(*tasks.values())))
    results["database"] = _database(s)
    # Fallbacks are optional: the gateway works if each role's primary or a fallback is up.
    required = [
        any(results[ep.name]["ok"] for ep in s.student),
        any(results[ep.name]["ok"] for ep in s.teacher),
        results["database"]["ok"],
    ]
    return {"ok": all(required), "checks": results}


@router.get("/api/health")
async def health(request: Request):
    engine = request.app.state.engine
    return await check(engine.s, engine.client)


@router.get("/health.js")
def health_script():
    return FileResponse(SCRIPT, media_type="text/javascript")
