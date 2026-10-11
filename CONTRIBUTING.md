# Contributing to Apprentice

Thanks for helping out. This guide covers setting up, running the tests, running the gateway, and getting a change merged.

## Setup

You need Python 3.12 or newer and git.

```bash
git clone https://github.com/Ayush-e4/apprentice.git
cd apprentice
python -m venv .venv
.venv\Scripts\pip install -r requirements-dev.txt     # macOS/Linux: .venv/bin/pip
```

`requirements-dev.txt` installs the app's dependencies plus `pytest` and `ruff`. The commands below assume the venv is active (`.venv\Scripts\activate`, or `source .venv/bin/activate`).

## Running the tests

```bash
python -m pytest -q        # the whole suite; runs in a few seconds
ruff check .               # lint
```

Both run in CI on every pull request, and both must pass before a PR can merge.

The tests need no network, no API keys and no Ollama:

- **Model servers are faked in-process.** `tests/fakes.py` has `FakeModels`, an `httpx.MockTransport` handler that the engine's `httpx.AsyncClient` uses. The host name picks the role (`student.test`, `teacher.test`, `judge.test`, `llmjudge.test`), and each role replies from a script: a string is a chat reply, a float is a decision-judge score, an int is an HTTP error, and a list gives one reply per call.
- **Databases are temporary.** `tests/conftest.py` points `APPRENTICE_DB` and `BENCH_DB` at a temp directory and builds the shop database there once per run with `bench.shopdb.build(path)`. It also sets every model variable to a fake host, so a real `.env` on your machine is never used by tests.

A routing test reads like this:

```python
def test_cascade_student_fails_the_sql_check_and_escalates(engine, fake):
    fake.replies.update(student=BROKEN_SQL, teacher=GOOD_SQL)
    r = ask(engine, QUESTION, verifier="sql")
    assert fake.roles() == ["student", "teacher"]
    assert r.served_by == "teacher"
```

| File | What it covers |
|---|---|
| `tests/test_verifiers.py` | `extract_sql`, `verify_sql`, `preview_sql` |
| `tests/test_matches.py` | benchmark grading (`bench.run_eval.matches`) |
| `tests/test_judges.py` | `parse_verdict`, the LLM judge, the `/v1/systemone` decision judge |
| `tests/test_engine.py` | routing in every mode, escalation, judges, learning into memory |
| `tests/test_gateway.py` | the HTTP API through FastAPI's `TestClient` |
| `tests/test_bench.py` | the shop database and the labels in `bench.judge_data` |
| `tests/test_fake_server.py` | the engine end to end against `tests/fake_server.py` |

## Running the gateway

All configuration comes from environment variables. `.env.example` lists them all. Copy it to `.env`, or set them in your shell; variables set in the shell override `.env`.

### With fake models (no keys, no GPU)

`tests/fake_server.py` is a small OpenAI-compatible server with canned replies. The student writes SQL that fails the `sql` verifier whenever the question contains the word "hard". The teacher always writes SQL that runs, and the decision judge scores everything 0.9. That makes routing easy to see on the dashboard.

PowerShell:

```powershell
uvicorn tests.fake_server:app --port 9000          # terminal 1

# terminal 2
$env:STUDENT_BASE_URL="http://localhost:9000/student/v1"; $env:STUDENT_MODEL="fake"
$env:TEACHER_BASE_URL="http://localhost:9000/teacher/v1"; $env:TEACHER_MODEL="fake"
$env:JUDGE_BASE_URL="http://localhost:9000/judge";        $env:JUDGE_MODEL="fake"
uvicorn apprentice.gateway:app --port 8000
```

macOS/Linux:

```bash
uvicorn tests.fake_server:app --port 9000 &
STUDENT_BASE_URL=http://localhost:9000/student/v1 STUDENT_MODEL=fake \
TEACHER_BASE_URL=http://localhost:9000/teacher/v1 TEACHER_MODEL=fake \
JUDGE_BASE_URL=http://localhost:9000/judge JUDGE_MODEL=fake \
uvicorn apprentice.gateway:app --port 8000
```

Then send a request and open http://localhost:8000 for the dashboard:

```bash
curl http://localhost:8000/v1/chat/completions -H "Content-Type: application/json" -d '{
  "model": "apprentice",
  "messages": [{"role": "user", "content": "A hard one: how many orders are there?"}],
  "apprentice": {"verifier": "sql", "judge": "decision"}
}'
```

The first request escalates to the teacher. Ask "How many orders are there?" next, and the student answers with the teacher's reply as a few-shot example.

### With real models

1. Install [Ollama](https://ollama.com) and pull the student: `ollama pull qwen3:1.7b`.
2. `cp .env.example .env` and fill in `TEACHER_API_KEY` (or point `TEACHER_BASE_URL` at any OpenAI-compatible endpoint).
3. Optional: run a decision judge (see the README) for `judge=decision`. `judge=llm` uses the teacher's endpoint by default.
4. `uvicorn apprentice.gateway:app --port 8000`

Runtime data (traces, memory, the shop database) goes to `data/runtime/`, which git ignores. Delete it to start fresh.

To run the benchmark against a running gateway: `python -m bench.run_eval all` (add `--limit 10` for a quick run).

## Workflow

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Branch from `main` with a descriptive name: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
3. Keep each PR to one change. Add or update tests for any behaviour you change.
4. Run `python -m pytest -q` and `ruff check .` locally.
5. Open a pull request to `main` and fill in the template. CI must be green before merge.
6. Never commit `.env`, API keys, or files from `data/runtime/`.

## Rules and style

- **Every file stays under 300 lines.** This applies to code, tests and docs alike. When a file grows past that, split it by responsibility: a new module, or a new test file.
- **Small modules with one job each.** The `apprentice/` package is a good model: `providers.py` talks to models, `verifiers.py` checks answers, `memory.py` stores and searches, `engine.py` routes.
- **Type hints** on function signatures, and dataclasses for structured values (`Endpoint`, `Completion`, `Verdict`, `Result`).
- **Match the existing style:** a short module docstring saying what the file is for, plain functions over classes where possible, comments only where the *why* isn't obvious, and 120-character lines.
- **Configuration through environment variables**, read in `apprentice/config.py`. Document every new variable in `.env.example`.
- **Fail soft on optional services.** If an embedding endpoint or judge is down, the request still gets an answer, and the trace says what happened.

## Adding a verifier

A verifier is a cheap check that catches clearly broken answers. It decides whether the student's answer can be returned without asking the teacher.

1. Add a function to `apprentice/verifiers.py` that returns `(ok, reason)`:

   ```python
   def verify_json(text: str) -> tuple[bool, str]:
       try:
           json.loads(text)
       except ValueError as e:
           return False, f"invalid JSON: {e}"
       return True, "valid JSON"
   ```

2. Register it in `Engine._verify` in `apprentice/engine.py`. That one method serves both the cascade check and the filter that keeps failed teacher answers out of memory.
3. Add unit tests to `tests/test_verifiers.py`. Add a routing test to `tests/test_engine.py` where the student fails your check and escalates, and one where it passes.
4. Document the new `verifier` value in the README's options table.

## Adding a judge

A judge runs after the verifier passes and scores whether the answer is actually correct. Scores below the threshold escalate to the teacher.

1. Write `async def my_check(client, ep, threshold, state, statement) -> Verdict` in its own module (see `apprentice/llm_judge.py` for a short example). Raise `JudgeError` on any failure. The engine then lets the answer through and records why in the trace.
2. Add the endpoint and threshold to `Settings` in `apprentice/config.py`, and the variables to `.env.example`.
3. Add the name to `JUDGES` in `apprentice/engine.py` and dispatch to your check in `Engine._judge`.
4. Test it with `FakeModels`. Give your judge a host such as `http://myjudge.test` and script its replies. Cover a passing score, a failing score that escalates, and a failure that lets the answer through.
5. Show it in `/api/stats` (`config` block in `apprentice/gateway.py`) and document it in the README.

## Reporting bugs and asking for features

Use the issue templates on GitHub. For bugs, include the request you sent, the `apprentice` block of the response (or the trace from `/api/traces`), and your OS and Python version. Never paste API keys.

## License

By contributing, you agree that your contributions are licensed under the MIT License (see [LICENSE](LICENSE)).
