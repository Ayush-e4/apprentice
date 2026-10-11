"""The health check reports each dependency without sending any prompts."""

import pytest
from fastapi.testclient import TestClient

from apprentice import gateway
from apprentice.config import settings
from apprentice.engine import Engine


@pytest.fixture
def client(shop_db, fake):
    with TestClient(gateway.app) as c:
        gateway.app.state.engine = Engine(settings, gateway.db, fake.client())
        yield c


def test_all_up(client, fake):
    h = client.get("/api/health").json()
    assert h["ok"] is True
    assert {"student", "teacher", "judge", "database"} <= set(h["checks"])
    assert all(c["ok"] for c in h["checks"].values())
    assert h["checks"]["database"]["detail"] == "3000 orders"
    assert fake.calls == [], "only model listings, no chat or judge requests"


def test_teacher_down_fails_the_check(client, fake):
    fake.replies["teacher_health"] = 503
    h = client.get("/api/health").json()
    assert h["ok"] is False
    assert h["checks"]["teacher"]["ok"] is False
    assert h["checks"]["teacher"]["detail"] == "HTTP 503"


def test_judge_down_is_reported_but_optional(client, fake):
    fake.replies["judge_health"] = 401
    h = client.get("/api/health").json()
    assert h["ok"] is True, "the gateway still works without a judge"
    assert h["checks"]["judge"] == {**h["checks"]["judge"], "ok": False, "detail": "HTTP 401"}
