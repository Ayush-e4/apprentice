# Support demo: QuickBite help chat

Customer support is where Apprentice saves the most, because support questions repeat. "My order is late", "where is my food", "mera order abhi tak nahi aaya" are the same question. The support demo is a help chat for **QuickBite**, a made-up Mumbai food-delivery app. The first time a question comes in, the large *teacher* model answers it and Apprentice remembers the answer. When a paraphrase comes in later, the small local *student* answers it with that remembered answer as an example, at no cost per token.

QuickBite, its policies and its prices are fictional. They are not based on any real company.

## What it shows

Open <http://localhost:8000/support> while the gateway is running.

- **A chat window.** Ask questions or click one of the example chips. Every answer has a badge saying who answered (**student** or **teacher**), the reason (`no similar memory (best sim 0.46)` or `student passed: similar memory found (sim 0.84)`), the latency and the cost.
- **A live panel** for this demo's traffic: requests, the share answered by the student, total cost and memory size. One bar per request shows its cost (tall purple bars are teacher calls, flat green ones are the student), and a sparkline shows the student's share over the last 10 requests.
- **Simulate 30 customers.** Replays 30 questions: six needs (late order, missing item, cancelling, refund time, cash on delivery, contacting the delivery partner), each asked five ways, some in Hinglish. The first round goes to the teacher. After that, most questions are paraphrases of something already answered, so the student takes over and the cost bars flatten.
- **Reset demo** forgets this demo's traces and the memory they created. Other traces and memory (for example the SQL benchmark's) are kept.

Every answer is grounded in a short QuickBite help-center policy (`apprentice/support/knowledge.py`) that is sent as the system prompt.

## How it routes

Each question goes through the same engine as `/v1/chat/completions`, with `mode=cascade`, no verifier and `tag=support`. Without a verifier, cascade mode works like this:

1. Search memory for teacher answers to similar questions.
2. If the best one has similarity at least the threshold, the student answers with those answers as few-shot examples.
3. Otherwise the teacher answers, and its answer is stored in memory.

## Recommended settings

Paraphrases rarely share many words, so word-overlap similarity (the fallback when no embedding model is set) almost never matches them. Use embeddings, and a stricter threshold than the global default:

```
EMBED_BASE_URL=http://localhost:11434/v1
EMBED_MODEL=nomic-embed-text          # ollama pull nomic-embed-text
SUPPORT_MIN_SIM=0.72
```

`SUPPORT_MIN_SIM` applies to the support demo only. It overrides `MEMORY_MIN_SIM` for `/api/support/*`, so the SQL benchmark keeps its own threshold.

Measured on the 30 simulation questions (cosine similarity, 6 clusters of 5):

| | Same need (paraphrases) | Different needs | Student share in the 30-question replay | Matches to the wrong need |
|---|---|---|---|---|
| Word overlap | mean 0.30, min 0.00 | mean 0.15, max 0.65 | 3/30 at 0.55 | 1 |
| `nomic-embed-text`, threshold 0.55 | mean 0.71, min 0.44 | mean 0.50, max 0.81 | 25/30 | 16 |
| `nomic-embed-text`, threshold 0.65 | | | 21/30 | 3 |
| `nomic-embed-text`, threshold **0.72** | | | **18/30** | **1** |
| `nomic-embed-text`, threshold 0.80 | | | 9/30 | 1 |

With embeddings, the global default of 0.55 is too loose for support: all questions are about food orders, so different needs score around 0.5 and would be answered from the wrong memory. At 0.72, 18 of 30 questions are answered by the student and the six first-round questions all go to the teacher. The one wrong match is two Hinglish questions with the same sentence pattern ("delivery partner ko call kaise karu?" matched "order cancel kaise karu?"); `nomic-embed-text` is an English model and is weakest on Hinglish. Questions outside the six needs (allergies, login OTP, coupons) never matched at thresholds of 0.55 and above.

## Run it

With real models (see the README's quick start), add the settings above to `.env` and start the gateway:

```bash
ollama pull nomic-embed-text
uvicorn apprentice.gateway:app --port 8000
```

Without keys or a GPU, use the fake model server; its replies are canned, but the routing is real. PowerShell:

```powershell
uvicorn tests.fake_server:app --port 9000          # terminal 1

# terminal 2
$env:STUDENT_BASE_URL="http://localhost:9000/student/v1"; $env:STUDENT_MODEL="fake"
$env:TEACHER_BASE_URL="http://localhost:9000/teacher/v1"; $env:TEACHER_MODEL="fake"
$env:TEACHER_PRICE_IN="1"; $env:TEACHER_PRICE_OUT="2"
$env:EMBED_BASE_URL="http://localhost:11434/v1"; $env:EMBED_MODEL="nomic-embed-text"; $env:SUPPORT_MIN_SIM="0.72"
uvicorn apprentice.gateway:app --port 8000
```

Then open <http://localhost:8000/support>. You can also point the student at Ollama (`STUDENT_BASE_URL=http://localhost:11434/v1`, `STUDENT_MODEL=qwen3:1.7b`) and keep the fake teacher.

## 60-second walkthrough

1. **(0:00)** Open `/support`, click **Reset demo**. "This is QuickBite's help chat. Every answer is grounded in its help-center policy."
2. **(0:10)** Click *My order is late, where is it?* It shows a purple **teacher** badge: "no similar memory". "First time we see this question, so the big model answers, and Apprentice remembers the answer."
3. **(0:20)** Type *My order is delayed way past the estimated time, what's going on?* (similarity 0.78 to the first question). It shows a green **student** badge: "similar memory found (sim 0.7x)", $0. "Same need, different words. The small local model answers from memory, for free."
4. **(0:30)** Type *mera order abhi tak nahi aaya*. Depending on the phrasing it goes either way; point at the reason and the similarity score.
5. **(0:35)** Click **Simulate 30 customers**. Watch the badges turn green, the cost bars flatten, and the student share climb.
6. **(0:55)** Point at the panel: about 60% answered by the student, and the second half of the session costs a fraction of the first. Click **← Apprentice dashboard** to show the same traffic in the main dashboard.

## API

| Method and path | Purpose |
|---|---|
| `GET /support` | The demo page |
| `POST /api/support/ask` | Body `{"question": "..."}`. Returns `answer`, `served_by`, `escalated`, `reason`, `cost_usd`, `latency_ms`, `memory_hits`, `top_sim`, `trace_id` |
| `POST /api/support/simulate` | Replays the 30 built-in questions in order (body `{"limit": n}` for the first n). Returns per-question results plus `requests`, `by_student`, `student_share`, `cost_usd`, `errors` |
| `GET /api/support/questions` | The example chips and the simulation questions |
| `GET /api/support/stats` | Totals, memory size and timeline for `tag=support` traces |
| `POST /api/support/reset` | Deletes `tag=support` traces and the memory they created |

Memory is shared by everything that runs through the gateway, and memory search does not filter by tag. For a clean demo, use a separate `APPRENTICE_DB` (for example `APPRENTICE_DB=data/runtime/support.db`) or click **Reset demo** first.
