# Apprentice: submission text (paste into the form)

**Repo:** https://github.com/Ayush-e4/apprentice (MIT)
**Trained judge:** https://github.com/Ayush-e4/apprentice/releases/tag/judge-v1

---

## Name
Apprentice

## Tagline (one line)
A small open model that learns on the job: it answers first on your laptop, a judge we trained checks it, and a big open model steps in only when needed and teaches it.

## Short description (2–3 sentences)
Apprentice is an OpenAI-compatible gateway that puts a small open-weight model (Qwen3 1.7B, running on a laptop) in front of a large one (GLM-5.2). Every answer is checked: the SQL must run, and a fine-tuned open judge (Kev-0.8B) must agree it answers the question. Otherwise the large model answers, and its answer becomes a lesson the small model reuses. On our benchmark the small model goes from 25% to 96% accuracy at zero cost, and the full system reaches 97.5% accuracy at 13% of the large model's cost.

## The problem
Every app that uses AI pays frontier-model prices on every request, even the easy, repetitive ones. Small open models are free and fast, but on their own they are wrong too often to trust.

## What it does
- **Drop-in gateway:** any OpenAI-SDK app switches by changing one URL.
- **Student first:** Qwen3 1.7B answers locally (GTX 1650 laptop, about 1.4 s per answer once its hidden reasoning is turned off).
- **Checked, not trusted:** a SQL verifier (runs read-only, must return rows), then a decision judge we fine-tuned ourselves, which catches answers that run but are wrong.
- **Teacher on demand:** GLM-5.2 (open weights, MIT) answers when a check fails.
- **Learns:** teacher answers go into memory (scoped per app) and come back as examples for similar questions.
- **Two demo apps:**
  - **Kirana Copilot:** a Mumbai shop owner asks about sales in English or Hinglish and gets the number or table.
  - **QuickBite support:** a fictional food-delivery help desk where repeated questions move from the teacher to the student.
- **MCP server:** Claude Desktop, Claude Code and Cursor can use Apprentice as a tool.
- **Never breaks silently:** a health check for every dependency; if the trained judge is down, the system falls back to GLM-5.2 as judge.

## Results (real runs, single runs, synthetic database; see docs/)
| | Accuracy | Answered locally | Cost (80 questions) |
|---|---|---|---|
| Student alone | 25% | 100% | $0 |
| Teacher alone (GLM-5.2) | 100% | 0% | $0.1261 |
| Student after learning (with our judge) | **96.3%** | 100% | **$0** |
| Full system: cascade + memory + judge | **97.5%** | 86% | $0.0165 (13%) |

- **Our trained judge** (Kev-0.8B fine-tuned on a free Colab T4 in about 15 minutes): held-out accuracy went from **45.7% to 99.3%**, with calibration error 0.004.
- **Support bot:** 30 simulated customers, **60% answered locally**, $0.025 in total.
- **Safety eval:** 36 of 37 hostile inputs (injection, writes, nonsense) handled safely, and the database was never changed. It found and fixed a real hole: SQLite's read-only mode still allowed `VACUUM INTO`/`ATTACH` to write files.
- **Honest limits:** on question types it never saw, the judge scores 76.8% and the student 32.8%. So we built **judge v2**: v1's data plus new question shapes, 374 real student mistakes from our logs, and Hinglish. On held-out sets neither judge trained on, it improved **unseen shapes from 74.3% to 78.0%** and **Hinglish from 94.7% to 98.7%**, and held 99.2% on seen ones. It's the judge running in the demo.

## How we built it
- **Backend:** FastAPI with SQLite (traces, memory, evals).
- **Models:** Ollama for the student, Command Code's OpenAI-compatible API for the teacher, and Kev (`/v1/systemone` protocol) for the judge, served from Colab over a Cloudflare tunnel.
- **Judge training data:** generated from our own benchmark, with labels from **actually running every query** against the gold answer (no guessed labels). Judge v2 adds real student mistakes from the logs plus Hinglish questions.
- **Front end:** a Next.js web app with motion animations and Magic UI components.
- **Engineering:** 200+ tests in CI, every file under 300 lines, contributor guide, issue and PR templates, and 25 reviewed PRs in one day.

## Challenges
- **Off-the-shelf judges failed.** Von scored right and wrong SQL the same, released Kev-0.8B got 45.7%, and GLM-5.2 as a judge rejected most correct answers. So we trained our own.
- **Qwen3 generated ~800 hidden reasoning tokens.** Ollama ignores `/no_think`; `reasoning_effort: none` cut the student from 12.5 s to 1.4 s.
- **The free Colab session timed out mid-run.** We added an automatic fallback judge, published the trained judge as a release, and wrote a one-cell script to restore it in minutes.
- **Memory leaked between apps.** We measured 263 cross-app question pairs that would match, then scoped memory by system prompt with a safe migration.

## What's next
- Real distillation: LoRA-train the student itself on the teacher's answers. GLM-5.2's MIT license allows it.
- Judge data from more schemas and more real mistakes, so it generalizes beyond our benchmark.
- Streaming responses, and verifiers for tasks beyond SQL.

## By the numbers (one day, from an empty repo at 11:48)
- **28 merged pull requests**, 64 commits on main, 43 green CI runs, all reviewed through PRs
- **~18,700 lines** added: 5,200 Python, 2,900 TypeScript, 1,200+ lines of docs
- **210 automated tests**, all passing; every source file under 300 lines
- **2 models trained today:** judge v1 (released) and judge v2 (2,418 examples, +4 pts on Hinglish, +3.7 pts on unseen shapes), now live
- **5,700 labelled judge examples**, every label verified by executing SQL
- **6 evaluation suites:** benchmark (265 questions), judge held-out, unseen question types, Hinglish, 37 adversarial inputs, 30-customer support simulation
- **1 real security hole found and fixed** (SQLite `VACUUM INTO`/`ATTACH` writes under "read-only")

## Built with
Python, FastAPI, SQLite, Ollama, Qwen3 1.7B (Apache-2.0), GLM-5.2 (MIT), Kev-0.8B (Apache-2.0), Google Colab (T4), Cloudflare Tunnel, nomic-embed-text, Next.js, TypeScript, Tailwind CSS, Motion, Magic UI, MCP, GitHub Actions.

## Open-source checklist (MLH Best Open-Source AI Project)
- Open-weight AI is the core (student, teacher and judge are all open-weight).
- Public GitHub repo with the MIT license.
- README names every model and links its license.
- Original implementation: gateway, routing, memory, verifiers, the judge training pipeline and both apps.
