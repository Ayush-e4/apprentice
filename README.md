# Apprentice

**Small open models that learn from big open models, so you pay less over time.**

Apprentice is an OpenAI-compatible gateway. Every request goes to a small open-weight model (the *student*) first. When the student is unlikely to get it right, the request is escalated to a large open-weight model (the *teacher*). Teacher answers are stored in a memory that the student draws on for similar future requests, so the share of traffic the student can handle grows over time, and cost and latency fall.

Built at Hacktoberfest 2026 Mumbai for the MLH **Best Open-Source AI Project** challenge.

> 🚧 Work in progress.

## How it works

```
Your app ──► Apprentice gateway ──► Router ──┬─► Student (small open model, local)
                    │                        └─► Teacher (large open model, hosted)
                    ▼
              SQLite: traces · memory · eval runs
                    ▼
              Dashboard: share handled by student, accuracy, cost, latency
```

## Quick start

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt   # macOS/Linux: .venv/bin/pip
ollama pull qwen3:1.7b
cp .env.example .env                            # then add your teacher API key
uvicorn apprentice.gateway:app --port 8000
```

Open http://localhost:8000 for the dashboard. Point any OpenAI-SDK app at `http://localhost:8000/v1`.

Per-request options go in an `apprentice` object in the request body (or `X-Apprentice-*` headers):

| Option | Values | Default |
|---|---|---|
| `mode` | `cascade`, `student`, `teacher` | `cascade` |
| `memory` | use remembered teacher answers as examples | `true` |
| `learn` | store teacher answers in memory | `true` |
| `verifier` | `sql` (student SQL must run and return rows, otherwise escalate) | none |

Without a verifier, the cascade sends a request to the student only when memory holds a similar teacher answer.

## Benchmark

A synthetic sales database for six Mumbai grocery stores and 265 text-to-SQL questions from 16 templates, split into 185 training and 80 test questions. Answers are graded by running the generated SQL and comparing results with the gold query.

```bash
python -m bench.run_eval all      # baseline -> warm (fills memory) -> after
```

Test questions are never written to memory.

## Models used

| Role | Model | License |
|---|---|---|
| Student | Qwen3 (small) via Ollama | Apache-2.0 |
| Teacher | GLM-5.1 via Command Code Provider API | MIT |

Closed models are used only as optional routers or evaluation judges, never as the teacher.

## License

MIT. See [LICENSE](LICENSE).
