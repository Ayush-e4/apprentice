"""End to end over HTTP: the engine against tests/fake_server.py, the server CONTRIBUTING.md suggests for local runs."""

import asyncio

import httpx

from apprentice.config import Endpoint
from apprentice.db import Database
from apprentice.engine import Engine, Options

from . import fake_server
from .fakes import make_settings, messages


def _engine(tmp_path, shop_db) -> Engine:
    settings = make_settings(
        tmp_path,
        shop_db,
        student=[Endpoint("student", "http://fake/student/v1", "fake")],
        teacher=[Endpoint("teacher", "http://fake/teacher/v1", "fake")],
        judge=Endpoint("judge", "http://fake/judge", "fake"),
    )
    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=fake_server.app))
    return Engine(settings, Database(tmp_path / "apprentice.db"), client)


def _ask(engine: Engine, question: str, **opts):
    return asyncio.run(engine.handle(messages(question), Options(**opts)))


def test_easy_question_stays_with_the_student(tmp_path, shop_db):
    r = _ask(_engine(tmp_path, shop_db), "How many orders are there?", verifier="sql", judge="decision")
    assert r.served_by == "student"
    assert r.check_score == 0.9


def test_hard_question_escalates_then_is_learned(tmp_path, shop_db):
    engine = _engine(tmp_path, shop_db)
    first = _ask(engine, "A hard one: how many orders are there?", verifier="sql")
    assert (first.served_by, first.escalated) == ("teacher", True)
    assert engine.memory.size() == 1
