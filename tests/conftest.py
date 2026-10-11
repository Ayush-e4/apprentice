"""Shared test setup: a temp shop database and fake model servers.

Environment variables are set here, before any `apprentice` import, so the
module-level settings used by the gateway and the bench scripts point at temp
files and fake hosts, and never at a developer's real .env. python-dotenv does
not override variables that are already set, even to an empty string.
"""

import os
import tempfile
from pathlib import Path

_DATA = Path(tempfile.mkdtemp(prefix="apprentice-tests-"))

os.environ.update(
    {
        "APPRENTICE_DB": str(_DATA / "apprentice.db"),
        "BENCH_DB": str(_DATA / "shop.db"),
        "STUDENT_BASE_URL": "http://student.test/v1",
        "STUDENT_MODEL": "fake-student",
        "STUDENT_API_KEY": "",
        "STUDENT_PRICE_IN": "0",
        "STUDENT_PRICE_OUT": "0",
        "STUDENT_NO_THINK": "1",
        "STUDENT_FALLBACK_BASE_URL": "",
        "STUDENT_FALLBACK_MODEL": "",
        "TEACHER_BASE_URL": "http://teacher.test/v1",
        "TEACHER_MODEL": "fake-teacher",
        "TEACHER_API_KEY": "",
        "TEACHER_PRICE_IN": "1",
        "TEACHER_PRICE_OUT": "2",
        "TEACHER_FALLBACK_BASE_URL": "",
        "TEACHER_FALLBACK_MODEL": "",
        "EMBED_BASE_URL": "",
        "EMBED_MODEL": "",
        "JUDGE_BASE_URL": "http://judge.test",
        "JUDGE_MODEL": "fake-judge",
        "JUDGE_API_KEY": "",
        "JUDGE_THRESHOLD": "0.8",
        "LLM_JUDGE_BASE_URL": "http://llmjudge.test/v1",
        "LLM_JUDGE_MODEL": "fake-llm-judge",
        "LLM_JUDGE_API_KEY": "",
        "LLM_JUDGE_THRESHOLD": "0.5",
        "MEMORY_K": "3",
        "MEMORY_MIN_SIM": "0.55",
        "REQUEST_TIMEOUT_S": "5",
    }
)

import pytest  # noqa: E402

from apprentice.config import settings  # noqa: E402
from apprentice.db import Database  # noqa: E402
from apprentice.engine import Engine  # noqa: E402
from bench.shopdb import build  # noqa: E402

from .fakes import FakeModels, make_settings  # noqa: E402


@pytest.fixture(scope="session")
def shop_db() -> Path:
    """The synthetic shop database, built once into the temp dir that BENCH_DB points at."""
    path = Path(os.environ["BENCH_DB"])
    assert settings.bench_db_path == path, "module-level settings must use the test BENCH_DB"
    return build(path)


@pytest.fixture
def fake() -> FakeModels:
    return FakeModels()


@pytest.fixture
def engine(tmp_path, shop_db, fake) -> Engine:
    """An engine with its own empty database, talking to the fake model servers."""
    return Engine(make_settings(tmp_path, shop_db), Database(tmp_path / "apprentice.db"), fake.client())
