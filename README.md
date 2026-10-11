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

## Models used

| Role | Model | License |
|---|---|---|
| Student | Qwen3 (small) via Ollama | Apache-2.0 |
| Teacher | GLM-5.1 via Command Code Provider API | MIT |

Closed models are used only as optional routers or evaluation judges, never as the teacher.

## License

MIT. See [LICENSE](LICENSE).
