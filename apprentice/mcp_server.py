"""MCP server that lets Claude Code, Cursor and other MCP clients use Apprentice.

A thin HTTP client for a running gateway: it never imports the engine, so it
stays light and works against a gateway on another machine. No tool resets data.

Run with:  python -m apprentice.mcp_server       (stdio transport)
Gateway:   APPRENTICE_URL, default http://localhost:8000
"""

import logging
import os
import re
import time
from typing import Annotated, Any, Literal

import httpx
from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations
from pydantic import Field

from .verifiers import extract_sql

GATEWAY_URL = os.getenv("APPRENTICE_URL", "http://localhost:8000").rstrip("/")
TIMEOUT_S = float(os.getenv("APPRENTICE_TIMEOUT_S", "300"))
TAG = "mcp"  # traces from this server show up with this tag in the dashboard

Mode = Literal["cascade", "student", "teacher"]
Judge = Literal["decision", "llm"]

server = MCPServer(
    name="apprentice",
    instructions=(
        "Apprentice is an OpenAI-compatible gateway: a small open student model answers first, "
        "a large open teacher handles escalations, and teacher answers become few-shot memory for "
        "the student. Use `ask` for any question, `ask_shop_sql` for text-to-SQL on the benchmark "
        "grocery database, and `stats`, `recent_requests`, `benchmark_results` to see how routing, "
        "cost and accuracy are going."
    ),
)

ASKS = ToolAnnotations(read_only_hint=False, destructive_hint=False, idempotent_hint=False, open_world_hint=True)
READS = ToolAnnotations(read_only_hint=True, open_world_hint=False)

_system_prompt_cache: str | None = None


def _error_text(r: httpx.Response) -> str:
    try:
        body = r.json()
    except ValueError:
        return r.text.strip()[:300] or r.reason_phrase
    if isinstance(body, dict):
        err = body.get("error")
        if isinstance(err, dict) and err.get("message"):
            return str(err["message"])
        if body.get("detail"):
            return str(body["detail"])
    return str(body)[:300]


async def _call(method: str, path: str, **kwargs: Any) -> Any:
    """One request to the gateway; every failure becomes a readable ToolError."""
    url = f"{GATEWAY_URL}{path}"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_S) as client:
            r = await client.request(method, url, **kwargs)
    except httpx.ConnectError:
        port = httpx.URL(GATEWAY_URL).port or 8000
        raise ToolError(
            f"Apprentice gateway is not reachable at {GATEWAY_URL}. Start it with "
            f"`uvicorn apprentice.gateway:app --port {port}`, or set APPRENTICE_URL to where it runs."
        ) from None
    except httpx.TimeoutException:
        raise ToolError(f"Timed out after {TIMEOUT_S:.0f}s waiting for {url} (set APPRENTICE_TIMEOUT_S).") from None
    except httpx.HTTPError as e:
        raise ToolError(f"Request to {url} failed: {type(e).__name__}: {e}") from None
    if r.status_code == 404:
        raise ToolError(f"{url} not found. Is APPRENTICE_URL ({GATEWAY_URL}) an Apprentice gateway?")
    if r.status_code >= 400:
        raise ToolError(f"Gateway returned HTTP {r.status_code} for {path}: {_error_text(r)}")
    try:
        return r.json()
    except ValueError:
        raise ToolError(f"{url} did not return JSON. Is APPRENTICE_URL pointing at an Apprentice gateway?") from None


async def _complete(messages: list[dict], mode: str, verifier: str | None, judge: str | None) -> dict:
    options = {"mode": mode, "verifier": verifier, "judge": judge, "tag": TAG}
    body = {
        "model": "apprentice",
        "messages": messages,
        "apprentice": {k: v for k, v in options.items() if v is not None},
    }
    data = await _call("POST", "/v1/chat/completions", json=body)
    if not isinstance(data, dict) or "apprentice" not in data:
        raise ToolError(f"{GATEWAY_URL} answered like a plain OpenAI server, not Apprentice. Check APPRENTICE_URL.")
    return data


def _routing(data: dict) -> str:
    """The `apprentice` block of a completion as short `key: value` lines."""
    meta = data.get("apprentice") or {}
    lines = [
        f"served_by: {meta.get('served_by', '?')} ({data.get('model', '?')})",
        f"escalated: {'yes' if meta.get('escalated') else 'no'}",
        f"reason: {meta.get('reason', '')}",
        f"cost_usd: {meta.get('cost_usd', 0):.6f}",
        f"latency_ms: {meta.get('latency_ms', 0):.0f}",
        f"memory_examples: {meta.get('memory_hits', 0)} (best similarity {meta.get('top_sim', 0):.2f})",
    ]
    if meta.get("check_score") is not None:
        lines.append(f"judge_score: {meta['check_score']:.2f}")
    lines.append(f"trace_id: {meta.get('trace_id', '?')}")
    return "\n".join(lines)


def _answer(data: dict) -> str:
    try:
        return data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        raise ToolError("Gateway response had no answer (choices[0].message.content missing).") from None


def _short(text: Any, width: int) -> str:
    flat = re.sub(r"\s+", " ", str(text or "")).strip()
    return flat if len(flat) <= width else flat[: width - 3] + "..."


@server.tool(annotations=ASKS, structured_output=False)
async def ask(
    question: Annotated[str, Field(description="The question or instruction to answer.")],
    mode: Annotated[Mode, Field(description="cascade: student first, teacher on escalation. "
                                            "student or teacher: force one model.")] = "cascade",
    system: Annotated[str | None, Field(description="Optional system prompt.")] = None,
    verifier: Annotated[Literal["sql"] | None, Field(description="sql: the student's SQL must run and "
                                                                 "return rows on the benchmark DB, "
                                                                 "otherwise escalate.")] = None,
    judge: Annotated[Judge | None, Field(description="Extra correctness check on student answers in "
                                                     "cascade mode: decision model or yes/no LLM.")] = None,
) -> str:
    """Ask Apprentice a question and get the answer plus who served it, why, cost and latency.

    In cascade mode without a verifier, the student answers only when memory holds a similar
    teacher answer; otherwise the teacher answers and that answer is remembered.
    """
    messages = [{"role": "system", "content": system}] if system else []
    messages.append({"role": "user", "content": question})
    data = await _complete(messages, mode, verifier, judge)
    return f"{_answer(data)}\n\n---\n{_routing(data)}"


@server.tool(annotations=ASKS, structured_output=False)
async def ask_shop_sql(
    question: Annotated[str, Field(description="A question about the grocery sales data, e.g. "
                                               "'How many orders were placed at the Dadar TT store?'")],
    mode: Annotated[Mode, Field(description="cascade, student or teacher.")] = "cascade",
    judge: Annotated[Judge | None, Field(description="Optional correctness judge: decision or llm.")] = None,
) -> str:
    """Text-to-SQL on the benchmark database (six Mumbai grocery stores: stores, products,
    customers, orders, order_items). Uses the benchmark's system prompt and the sql verifier,
    so a student query that errors or returns nothing escalates to the teacher.
    Returns the SQLite query and routing info; the query is not executed here.
    """
    global _system_prompt_cache
    if _system_prompt_cache is None:
        _system_prompt_cache = (await _call("GET", "/api/bench/system-prompt"))["prompt"]
    messages = [
        {"role": "system", "content": _system_prompt_cache},
        {"role": "user", "content": question},
    ]
    data = await _complete(messages, mode, "sql", judge)
    sql = extract_sql(_answer(data)) or _answer(data)
    return f"```sql\n{sql}\n```\n\n---\n{_routing(data)}"


@server.tool(annotations=READS, structured_output=False)
async def stats() -> str:
    """Gateway totals: requests, share served by the student, cost, latency, memory size, models."""
    data = await _call("GET", "/api/stats")
    t = data.get("totals") or {}
    n, by_student = t.get("requests", 0) or 0, t.get("by_student", 0) or 0
    share = f"{by_student / n:.1%}" if n else "n/a"
    lines = [
        f"gateway: {GATEWAY_URL}",
        f"requests: {n} (student {by_student}, teacher {n - by_student}; student share {share})",
        f"total_cost_usd: {t.get('cost_usd', 0):.6f}",
        f"avg_latency_ms: {t.get('avg_latency_ms', 0):.0f}",
        f"memory_size: {data.get('memory_size', 0)} remembered teacher answers",
    ]
    config = data.get("config") or {}
    for role in ("student", "teacher"):
        chain = config.get(role) or []
        models = " -> ".join(f"{e['model']} @ {e['base_url']}" for e in chain) or "not configured"
        lines.append(f"{role}: {models}")
    for role in ("embed", "judge", "llm_judge"):
        lines.append(f"{role}: {config.get(role) or 'not configured'}")
    return "\n".join(lines)


@server.tool(annotations=READS, structured_output=False)
async def recent_requests(
    limit: Annotated[int, Field(ge=1, le=100, description="How many traces to show, newest first.")] = 10,
) -> str:
    """The most recent requests: route taken, reason, cost, latency, question and answer (truncated)."""
    rows = await _call("GET", "/api/traces", params={"limit": limit})
    if not rows:
        return "No requests yet."
    out = []
    for r in rows:
        when = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r.get("ts") or 0))
        head = (
            f"#{r['id']} {when} {r.get('mode')} -> {r.get('served_by')} ({r.get('model')}) "
            f"${r.get('cost_usd') or 0:.6f} {r.get('latency_ms') or 0:.0f} ms"
        )
        if r.get("check_score") is not None:
            head += f" judge {r['check_score']:.2f}"
        if r.get("tag"):
            head += f" [{r['tag']}]"
        out.append(
            f"{head}\n  why: {_short(r.get('reason'), 160)}"
            f"\n  Q: {_short(r.get('question'), 160)}\n  A: {_short(r.get('response'), 200)}"
        )
    return "\n".join(out)


@server.tool(annotations=READS, structured_output=False)
async def benchmark_results() -> str:
    """Benchmark runs from `python -m bench.run_eval`: accuracy, student share, cost and latency per phase."""
    rows = await _call("GET", "/api/evals")
    if not rows:
        return "No benchmark runs yet. With the gateway up, run: python -m bench.run_eval all"
    lines = [
        f"{'id':>3}  {'phase':<9} {'mode':<16} {'n':>4} {'accuracy':>8} {'student':>8} "
        f"{'cost_usd':>10} {'p50_ms':>7} {'p95_ms':>7} {'memory':>6}"
    ]
    for r in rows:
        lines.append(
            f"{r['id']:>3}  {r['phase']:<9} {r['mode']:<16} {r.get('n') or 0:>4} "
            f"{r.get('accuracy') or 0:>8.1%} {r.get('student_share') or 0:>8.1%} "
            f"{r.get('cost_usd') or 0:>10.4f} {r.get('p50_ms') or 0:>7.0f} {r.get('p95_ms') or 0:>7.0f} "
            f"{r.get('memory_size') or 0:>6}"
        )
    return "\n".join(lines)


def main() -> None:
    logging.getLogger("httpx").setLevel(logging.WARNING)  # one INFO line per request is noise in client logs
    server.run("stdio")


if __name__ == "__main__":
    main()
