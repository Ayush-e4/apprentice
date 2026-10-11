"""A stand-in model server, for running the gateway with no models, API keys or GPU.

    uvicorn tests.fake_server:app --port 9000

Then start the gateway with
    STUDENT_BASE_URL=http://localhost:9000/student/v1   STUDENT_MODEL=fake
    TEACHER_BASE_URL=http://localhost:9000/teacher/v1   TEACHER_MODEL=fake
    JUDGE_BASE_URL=http://localhost:9000/judge          JUDGE_MODEL=fake

Replies are canned so routing is easy to see: the student writes SQL that fails
the sql verifier whenever the question contains the word "hard", and the
teacher always writes SQL that runs. The decision judge scores everything 0.9.
For the QuickBite support demo (/support), both reply with a short canned text.
"""

from fastapi import FastAPI, Request

app = FastAPI(title="Apprentice fake models")

GOOD = "```sql\nSELECT COUNT(*) FROM orders\n```"
BROKEN = "```sql\nSELECT * FROM no_such_table\n```"


def _question(body: dict) -> str:
    users = [m.get("content") for m in body.get("messages", []) if m.get("role") == "user"]
    return str(users[-1]) if users else ""


def _support(body: dict, who: str) -> str | None:
    """Canned replies for the QuickBite support demo, recognised by its system prompt."""
    system = " ".join(str(m.get("content")) for m in body.get("messages", []) if m.get("role") == "system")
    if "QuickBite" not in system:
        return None
    return f"({who}) Thanks for reaching out about: {_question(body)} Please see Help in the QuickBite app."


def _completion(model: str, content: str) -> dict:
    return {
        "object": "chat.completion",
        "model": model,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 20, "completion_tokens": 10},
    }


@app.post("/student/v1/chat/completions")
async def student(request: Request) -> dict:
    body = await request.json()
    sql = BROKEN if "hard" in _question(body).lower() else GOOD
    return _completion(body.get("model", "fake"), _support(body, "fake student") or sql)


@app.post("/teacher/v1/chat/completions")
async def teacher(request: Request) -> dict:
    body = await request.json()
    return _completion(body.get("model", "fake"), _support(body, "fake teacher") or GOOD)


@app.post("/judge/v1/systemone")
async def judge() -> dict:
    return {"answers": {"correct": {"noul": 0.9}}, "usage": {"input_tokens": 0, "output_tokens": 0}}
