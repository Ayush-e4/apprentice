"""Settings loaded from .env.

Each role (student, teacher) is an ordered list of OpenAI-compatible endpoints.
The first one is the primary; the rest are fallbacks tried when it fails
(connection refused, timeout, HTTP error).
"""

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")


@dataclass(frozen=True)
class Endpoint:
    name: str
    base_url: str
    model: str
    api_key: str = ""
    price_in: float = 0.0  # USD per 1M input tokens
    price_out: float = 0.0  # USD per 1M output tokens

    def cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        return (prompt_tokens * self.price_in + completion_tokens * self.price_out) / 1_000_000


def _float(name: str, default: float = 0.0) -> float:
    raw = os.getenv(name, "").strip()
    return float(raw) if raw else default


def _endpoint(prefix: str, name: str) -> Endpoint | None:
    base_url = os.getenv(f"{prefix}_BASE_URL", "").strip()
    model = os.getenv(f"{prefix}_MODEL", "").strip()
    if not base_url or not model:
        return None
    return Endpoint(
        name=name,
        base_url=base_url.rstrip("/"),
        model=model,
        api_key=os.getenv(f"{prefix}_API_KEY", "").strip(),
        price_in=_float(f"{prefix}_PRICE_IN"),
        price_out=_float(f"{prefix}_PRICE_OUT"),
    )


def _chain(prefix: str, name: str) -> list[Endpoint]:
    endpoints = [
        _endpoint(prefix, name),
        _endpoint(f"{prefix}_FALLBACK", f"{name}-fallback"),
    ]
    return [e for e in endpoints if e is not None]


@dataclass(frozen=True)
class Settings:
    student: list[Endpoint]
    teacher: list[Endpoint]
    embed: Endpoint | None
    db_path: Path
    bench_db_path: Path
    memory_k: int
    memory_min_sim: float
    student_no_think: bool
    timeout_s: float
    judge: Endpoint | None
    judge_threshold: float


def load_settings() -> Settings:
    return Settings(
        student=_chain("STUDENT", "student"),
        teacher=_chain("TEACHER", "teacher"),
        embed=_endpoint("EMBED", "embed"),
        db_path=ROOT / os.getenv("APPRENTICE_DB", "data/runtime/apprentice.db"),
        bench_db_path=ROOT / os.getenv("BENCH_DB", "data/runtime/shop.db"),
        memory_k=int(os.getenv("MEMORY_K", "3")),
        memory_min_sim=_float("MEMORY_MIN_SIM", 0.55),
        student_no_think=os.getenv("STUDENT_NO_THINK", "1") == "1",
        timeout_s=_float("REQUEST_TIMEOUT_S", 120.0),
        # Decision judge: any server speaking the /v1/systemone protocol (Von, Kev, Jev)
        judge=_endpoint("JUDGE", "judge"),
        judge_threshold=_float("JUDGE_THRESHOLD", 0.8),
    )


settings = load_settings()
