"""Cheap checks that decide whether a student answer is good enough to return.

A verifier only catches answers that are clearly broken (SQL that errors or
returns nothing). It does not prove an answer is correct.
"""

import re
import sqlite3
import time
from pathlib import Path

_SQL_BLOCK_RE = re.compile(r"```(?:sql|sqlite)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)
# WITH only counts when it opens a CTE ("WITH name AS ("), so prose like "the query with a join" is skipped
_SQL_START_RE = re.compile(r"\bSELECT\b|\bWITH\s+(?:RECURSIVE\s+)?\w+\s*(?:\([^)]*\)\s*)?AS\s*\(", re.IGNORECASE)


def extract_sql(text: str) -> str:
    match = _SQL_BLOCK_RE.search(text)
    sql = match.group(1) if match else text
    start = _SQL_START_RE.search(sql)
    if start:
        sql = sql[start.start():]
    return sql.split(";")[0].strip()


def _deny_attach(action: int, *_) -> int:
    # mode=ro guards the shop database, but ATTACH and VACUUM INTO (which SQLite authorizes as an
    # ATTACH) still create files on disk, so model-written SQL may not use them
    return sqlite3.SQLITE_DENY if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH) else sqlite3.SQLITE_OK


def connect_readonly(db_path: Path) -> sqlite3.Connection:
    """A connection for running model-written SQL: read-only, and unable to create files."""
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    conn.set_authorizer(_deny_attach)
    return conn


def run_sql(db_path: Path, sql: str, timeout_s: float = 5.0, max_rows: int = 1000) -> list[tuple]:
    conn = connect_readonly(db_path)
    deadline = time.perf_counter() + timeout_s
    conn.set_progress_handler(lambda: 1 if time.perf_counter() > deadline else 0, 10_000)
    try:
        return conn.execute(sql).fetchmany(max_rows)
    finally:
        conn.close()


def preview_sql(db_path: Path, text: str, n: int = 5) -> dict:
    """The query and the first rows it returns, for showing to a judge."""
    sql = extract_sql(text)
    conn = connect_readonly(db_path)
    try:
        cur = conn.execute(sql)
        return {
            "sql": sql,
            "result_columns": [d[0] for d in cur.description or []],
            "result_rows": cur.fetchmany(n),
        }
    except sqlite3.Error as e:
        return {"sql": sql, "error": str(e)}
    finally:
        conn.close()


def verify_sql(db_path: Path, text: str) -> tuple[bool, str]:
    sql = extract_sql(text)
    if not sql:
        return False, "no SQL found"
    try:
        rows = run_sql(db_path, sql)
    except sqlite3.Error as e:
        return False, f"SQL error: {e}"
    if not rows:
        return False, "empty result"
    return True, f"{len(rows)} row(s)"
