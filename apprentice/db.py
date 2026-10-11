"""SQLite storage for traces, memory, and evaluation runs."""

import sqlite3
import threading
from pathlib import Path

SCHEMA = """
CREATE TABLE IF NOT EXISTS traces (
    id INTEGER PRIMARY KEY,
    ts REAL NOT NULL,
    mode TEXT NOT NULL,
    served_by TEXT NOT NULL,
    model TEXT NOT NULL,
    escalated INTEGER NOT NULL,
    reason TEXT,
    question TEXT,
    response TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    cost_usd REAL,
    latency_ms REAL,
    memory_hits INTEGER,
    top_sim REAL,
    tag TEXT,
    check_score REAL
);
CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY,
    ts REAL NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding TEXT,
    trace_id INTEGER,
    scope TEXT
);
CREATE TABLE IF NOT EXISTS eval_runs (
    id INTEGER PRIMARY KEY,
    ts REAL NOT NULL,
    phase TEXT NOT NULL,
    mode TEXT NOT NULL,
    n INTEGER,
    correct INTEGER,
    accuracy REAL,
    student_share REAL,
    cost_usd REAL,
    p50_ms REAL,
    p95_ms REAL,
    memory_size INTEGER
);
CREATE TABLE IF NOT EXISTS eval_results (
    run_id INTEGER NOT NULL,
    qid TEXT NOT NULL,
    correct INTEGER,
    served_by TEXT,
    latency_ms REAL,
    cost_usd REAL,
    error TEXT
);
"""


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.executescript(SCHEMA)
        self._migrate()
        self._lock = threading.Lock()

    def _migrate(self) -> None:
        columns = {r[1] for r in self._conn.execute("PRAGMA table_info(traces)")}
        if "check_score" not in columns:
            self._conn.execute("ALTER TABLE traces ADD COLUMN check_score REAL")
            self._conn.commit()
        # Memory is scoped by system prompt (memory.scope_of). Rows from before that have
        # scope NULL until memory.backfill_scopes, run at gateway startup, fills them in.
        columns = {r[1] for r in self._conn.execute("PRAGMA table_info(memory)")}
        if "scope" not in columns:
            self._conn.execute("ALTER TABLE memory ADD COLUMN scope TEXT")
            self._conn.commit()

    def execute(self, sql: str, params: tuple = ()) -> int:
        with self._lock:
            cur = self._conn.execute(sql, params)
            self._conn.commit()
            return cur.lastrowid

    def query(self, sql: str, params: tuple = ()) -> list[dict]:
        with self._lock:
            return [dict(r) for r in self._conn.execute(sql, params).fetchall()]

    def scalar(self, sql: str, params: tuple = ()):
        rows = self.query(sql, params)
        return next(iter(rows[0].values())) if rows else None
