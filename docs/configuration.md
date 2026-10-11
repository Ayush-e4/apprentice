# Configuration

Apprentice reads its settings from a `.env` file in the repository root. Copy `.env.example` to `.env` and edit it; `.env` is ignored by git, so your keys stay on your machine.

## Endpoints

Every model role is an OpenAI-compatible endpoint described by the same set of variables, with a role prefix:

| Variable | Meaning |
|---|---|
| `<ROLE>_BASE_URL` | Base URL of the OpenAI-compatible API, for example `http://localhost:11434/v1` |
| `<ROLE>_MODEL` | Model name to send |
| `<ROLE>_API_KEY` | Sent as `Authorization: Bearer <key>` if set |
| `<ROLE>_PRICE_IN` | USD per 1M input tokens, used for cost numbers (default 0) |
| `<ROLE>_PRICE_OUT` | USD per 1M output tokens (default 0) |

A role is enabled only when both `BASE_URL` and `MODEL` are set.

| Prefix | Role | Notes |
|---|---|---|
| `STUDENT` | Small model tried first | `.env.example` points at Ollama with `qwen3:1.7b` |
| `STUDENT_FALLBACK` | Used if the student endpoint fails | For example a hosted small open model |
| `TEACHER` | Large model used when the student fails a check | `.env.example` points at Command Code's Provider API |
| `TEACHER_FALLBACK` | Used if the teacher endpoint fails | |
| `EMBED` | Embeddings for memory search (optional) | For example `nomic-embed-text` via Ollama |
| `JUDGE` | Decision judge for `judge=decision` (optional) | Any `/v1/systemone` server; see [judges.md](judges.md) |
| `LLM_JUDGE` | Chat model for `judge=llm` (optional) | Defaults to the first teacher endpoint |

A fallback is tried when the primary endpoint fails with a connection error, a timeout, or an HTTP error. If every endpoint for a role fails, the request returns HTTP 502, except that a failing student in `cascade` mode escalates to the teacher instead.

Without prices, Apprentice still works; costs simply show as $0. Take prices from your provider's pricing page.

## Other settings

| Variable | Default | Meaning |
|---|---|---|
| `STUDENT_NO_THINK` | `1` | `1` sends `reasoning_effort: "none"` to the student, which turns off Qwen3's hidden reasoning (Ollama ignores `/no_think`). Retried without it if the provider returns HTTP 400. |
| `MEMORY_K` | `3` | How many similar remembered answers to look up per request |
| `MEMORY_MIN_SIM` | `0.55` | Minimum similarity for a remembered answer to be used as an example |
| `JUDGE_THRESHOLD` | `0.8` | Decision-judge scores below this escalate |
| `LLM_JUDGE_THRESHOLD` | `0.5` | LLM-judge scores (yes = 1.0, no = 0.0) below this escalate |
| `REQUEST_TIMEOUT_S` | `120` | Timeout for student, teacher and LLM-judge calls, in seconds |
| `APPRENTICE_DB` | `data/runtime/apprentice.db` | SQLite file for traces, memory and benchmark runs |
| `BENCH_DB` | `data/runtime/shop.db` | The benchmark's shop database, also used by `verifier=sql` |

## Memory search

When `EMBED_*` is set and reachable, questions are compared by cosine similarity of their embeddings. Otherwise Apprentice falls back to word overlap (cosine similarity of word counts), which needs no extra model. The thresholds above apply to whichever is used, so if you switch between the two you may want to tune `MEMORY_MIN_SIM`.

## HTTP API

| Method and path | Purpose |
|---|---|
| `POST /v1/chat/completions` | OpenAI-compatible chat completions (no streaming) |
| `GET /v1/models` | Lists one model, `apprentice` |
| `GET /` | Dashboard |
| `GET /api/stats` | Totals, memory size, recent timeline, configured models |
| `GET /api/traces?limit=50` | Recent requests (up to 500) |
| `GET /api/evals` | Benchmark runs |
| `POST /api/reset` | Deletes stored data. Body `{"targets": ["traces", "memory", "evals"]}`; all three if omitted |
| `GET /api/bench/system-prompt` | The benchmark's system prompt |

The gateway has no authentication. Run it on your own machine or behind something that adds it; `POST /api/reset` deletes data.
