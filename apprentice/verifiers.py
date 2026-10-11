"""Cheap checks that decide whether a student answer is good enough to return.

A verifier only catches answers that are clearly broken (SQL that errors or
returns nothing). It does not prove an answer is correct.
"""

import re
import sqlite3
import time
from pathlib import Path

_SQL_BLOCK_RE = re.compile(r"```(?:sql|sqlite)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)
_SQL_START_RE = re.compile(r"\b(SELECT|WITH)\b", re.IGNORECASE)


def extract_sql(text: str) -> str:
    match = _SQL_BLOCK_RE.search(text)
    sql = match.group(1) if match else text
    start = _SQL_START_RE.search(sql)
    if start:
        sql = sql[start.start():]
    return sql.split(";")[0].strip()


def run_sql(db_path: Path, sql: str, timeout_s: float = 5.0, max_rows: int = 1000) -> list[tuple]:
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
    deadline = time.perf_counter() + timeout_s
    conn.set_progress_handler(lambda: 1 if time.perf_counter() > deadline else 0, 10_000)
    try:
        return conn.execute(sql).fetchmany(max_rows)
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
