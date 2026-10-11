"""In-process fakes for the model servers, so tests need no network, keys or Ollama.

Every request goes through an `httpx.MockTransport`. The host name picks the
role (student.test, teacher.test, judge.test, llmjudge.test), and each role
replies from a script:

  str          chat reply content (the same reply for every call)
  float        decision-judge score for /v1/systemone
  int          HTTP error status (e.g. 500), which the code sees as an outage
  list         one of the above per call, in order
"""

import asyncio
import json
from dataclasses import replace
from pathlib import Path

import httpx

from apprentice.config import Endpoint, Settings
from apprentice.engine import Engine, Options, Result

SYSTEM = "Reply with only the SQL query inside a ```sql code block."

STUDENT = Endpoint("student", "http://student.test/v1", "fake-student")
TEACHER = Endpoint("teacher", "http://teacher.test/v1", "fake-teacher", price_in=1.0, price_out=2.0)
JUDGE = Endpoint("judge", "http://judge.test", "fake-judge")
LLM_JUDGE = Endpoint("llm-judge", "http://llmjudge.test/v1", "fake-llm-judge")


def sql_reply(sql: str) -> str:
    return f"```sql\n{sql}\n```"


GOOD_SQL = sql_reply("SELECT COUNT(*) FROM orders")
BROKEN_SQL = sql_reply("SELECT * FROM no_such_table")
EMPTY_SQL = sql_reply("SELECT * FROM stores WHERE name = 'Nowhere'")


class FakeModels:
    def __init__(self, **replies):
        self.replies: dict = dict(replies)
        self.calls: list[tuple[str, dict]] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        role = request.url.host.split(".")[0]
        if request.method == "GET":  # model listing, used by the health check
            down = self.replies.get(f"{role}_health")
            if isinstance(down, int):
                return httpx.Response(down, json={"error": {"message": "scripted failure"}})
            return httpx.Response(200, json={"object": "list", "data": [{"id": f"fake-{role}"}]})
        body = json.loads(request.content)
        self.calls.append((role, body))
        if role not in self.replies:
            raise AssertionError(f"unexpected call to the {role} model")
        reply = self.replies[role]
        if isinstance(reply, list):
            reply = reply.pop(0)
        if isinstance(reply, int):
            return httpx.Response(reply, json={"error": {"message": "scripted failure"}})
        if request.url.path.endswith("/v1/systemone"):
            answers = {"correct": {"noul": reply}}
            return httpx.Response(200, json={"answers": answers, "usage": {"input_tokens": 50, "output_tokens": 1}})
        message = {"role": "assistant", "content": reply}
        usage = {"prompt_tokens": 10, "completion_tokens": 5}
        return httpx.Response(200, json={"choices": [{"message": message}], "usage": usage})

    def client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(transport=httpx.MockTransport(self.handler))

    def roles(self) -> list[str]:
        return [role for role, _ in self.calls]

    def bodies(self, role: str) -> list[dict]:
        return [body for r, body in self.calls if r == role]


def make_settings(tmp_path: Path, shop_db: Path, **overrides) -> Settings:
    base = Settings(
        student=[STUDENT],
        teacher=[TEACHER],
        embed=None,
        db_path=tmp_path / "apprentice.db",
        bench_db_path=shop_db,
        memory_k=3,
        memory_min_sim=0.55,
        student_no_think=True,
        timeout_s=5.0,
        judge=JUDGE,
        judge_threshold=0.8,
        llm_judge=LLM_JUDGE,
        llm_judge_threshold=0.5,
    )
    return replace(base, **overrides)


def messages(question: str) -> list[dict]:
    return [{"role": "system", "content": SYSTEM}, {"role": "user", "content": question}]


def ask(engine: Engine, question: str, **opts) -> Result:
    return asyncio.run(engine.handle(messages(question), Options(**opts)))
