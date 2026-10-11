"""Kirana Copilot: a shop owner asks about sales in plain English or Hinglish.

Each question goes through the engine like any other request (student first,
SQL check, judge, teacher), then the chosen query runs read-only on the shop
database, so the owner sees the answer itself, not SQL.
"""

import sqlite3
from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from bench.questions import SYSTEM_PROMPT

from .engine import JUDGES, MODES, Options
from .providers import ProviderError
from .verifiers import extract_sql

PAGE = Path(__file__).parent / "dashboard" / "shop.html"
MAX_ROWS = 50

EXAMPLES = [
    "Which store had the most orders in March 2026?",
    "What are the top 3 products by quantity sold at the Dadar TT store?",
    "How many customers live in Andheri?",
    "What was the total revenue of the Bandra Linking Road store in June 2026?",
    "Which customer living in Powai has spent the most money in total?",
    "March 2026 mein sabse zyada orders kis store pe aaye?",
    "Thane Station store pe UPI se kitne orders pay hue?",
    "Andheri mein kitne customers rehte hain?",
]

router = APIRouter()


class Ask(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    mode: str = "cascade"
    judge: str | None = "decision"


def _error(status: int, message: str) -> JSONResponse:
    return JSONResponse(status_code=status, content={"error": message})


def _answer_table(db_path: Path, sql: str) -> tuple[list[str], list[list], str | None]:
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    try:
        cur = conn.execute(sql)
        columns = [d[0] for d in cur.description or []]
        return columns, [list(row) for row in cur.fetchmany(MAX_ROWS)], None
    except sqlite3.Error as e:
        return [], [], str(e)
    finally:
        conn.close()


@router.get("/shop")
def shop_page():
    return FileResponse(PAGE)


@router.get("/api/shop/examples")
def examples():
    return {"examples": EXAMPLES}


@router.post("/api/shop/ask")
async def ask(request: Request, body: Ask):
    if body.mode not in MODES:
        return _error(400, f"mode must be one of {MODES}")
    if body.judge and body.judge not in JUDGES:
        return _error(400, f"judge must be one of {JUDGES}")
    engine = request.app.state.engine
    messages = [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": body.question}]
    opts = Options(mode=body.mode, verifier="sql", judge=body.judge or None, tag="shop")
    try:
        result = await engine.handle(messages, opts)
    except ProviderError as e:
        return _error(502, str(e))

    sql = extract_sql(result.content)
    columns, rows, error = _answer_table(engine.s.bench_db_path, sql) if sql else ([], [], "no SQL in the answer")
    return {
        "question": body.question,
        "sql": sql,
        "columns": columns,
        "rows": rows,
        "truncated": len(rows) == MAX_ROWS,
        "error": error,
        "served_by": result.served_by,
        "model": result.model,
        "escalated": result.escalated,
        "reason": result.reason,
        "judge_score": result.check_score,
        "memory_hits": result.memory_hits,
        "cost_usd": result.cost_usd,
        "latency_ms": round(result.latency_ms, 1),
        "trace_id": result.trace_id,
    }
