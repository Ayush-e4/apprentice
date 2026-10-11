# Benchmark

Apprentice is built for traffic where users ask *similar* questions over time. The benchmark recreates that situation with text-to-SQL questions over a small sales database, and measures accuracy, the share of requests the student handles, cost, and latency before and after the student has learned from the teacher.

## The database

`bench/shopdb.py` builds a synthetic SQLite database for a chain of six grocery stores in Mumbai (Andheri West, Bandra Linking Road, Dadar TT, Thane Station, Powai Lake, Colaba Causeway). It is generated from a fixed random seed, so every build is identical.

| Table | Rows | Contents |
|---|---|---|
| `stores` | 6 | Store name and area |
| `products` | 20 | Five categories (Snacks, Beverages, Staples, Dairy, Personal Care), four products each, with prices |
| `customers` | 300 | Name, area (eight Mumbai areas), join date |
| `orders` | 3,000 | Store, customer, date (January to September 2026), payment method (UPI, Cash, Card) |
| `order_items` | 1 to 4 per order | Product, quantity, unit price |

The gateway builds the database on startup if it doesn't exist (`data/runtime/shop.db`). You can rebuild it with `python -m bench.shopdb`.

## The questions

`bench/questions.py` defines 16 question templates, each with a gold SQL query, for example:

- How many orders were placed at the {store} store?
- What was the total revenue of the {store} store in {month} 2026?
- Which product category earned the most revenue in {month} 2026?
- How many orders at the {store} store contained more than {n} items in total quantity?

Filling the templates with every store, month, area, product, category and payment method gives 265 questions with non-empty answers. Within each template, 30% of the questions (at least one) go to the test set: **185 train, 80 test**. The split uses a fixed seed and is written to `data/runtime/questions.json`.

Every request uses the same system prompt, which contains the schema and asks for one SQLite query inside a `sql` code block.

## Grading

An answer is graded by running it. `bench/run_eval.py` extracts the SQL from the reply, runs it read-only against the database, and compares its result with the gold query's result:

- Values are normalized first: floats are rounded to two decimals and numeric strings become integers. Row order is ignored.
- If the gold answer has a single column, a prediction that returns extra columns still counts when one of its columns matches (for example, a store name together with its revenue when only the name was asked for).
- SQL that fails to run is wrong.

## The phases

```bash
python -m bench.run_eval baseline   # test set: student only, teacher only, cascade (memory empty)
python -m bench.run_eval warm       # train set through the cascade; teacher answers fill memory
python -m bench.run_eval after      # test set: student + memory, cascade + memory (nothing learned)
python -m bench.run_eval all        # all three in order
```

Every run uses `verifier=sql`. Only the warm-up phase has `learn=true`, and it sends questions one at a time in a fixed order so later questions can use earlier teacher answers. **Test questions are never written to memory.**

Useful flags:

| Flag | Default | Meaning |
|---|---|---|
| `--url` | `http://localhost:8000` | Gateway to test |
| `--concurrency` | `2` | Parallel requests in phases that don't learn |
| `--limit N` | all | Use only the first N questions of each split (quick smoke test) |
| `--judge decision` or `--judge llm` | none | Add a judge to cascade runs |

Each run is stored in the `eval_runs` and `eval_results` tables and shows up on the dashboard. To start over, use "Reset all data" on the dashboard or `POST /api/reset`.

## Results

80 held-out questions. Student: Qwen3 1.7B via Ollama on a laptop GTX 1650. Teacher: GLM-5.2 via Command Code's Provider API. Memory search: `nomic-embed-text` embeddings via Ollama (`EMBED_BASE_URL=http://localhost:11434/v1`, `EMBED_MODEL=nomic-embed-text`, `MEMORY_MIN_SIM=0.55`); without `EMBED_*` it falls back to word overlap, which matches paraphrases less well. The first six rows use no judge. The last three use the fine-tuned Kev-0.8B judge (served from Colab, `JUDGE_THRESHOLD=0.8`) and start from an empty memory.

| Phase | Run | Accuracy | Handled by student | Cost | Median latency |
|---|---|---|---|---|---|
| Before | Student only | 25% | 100% | $0.0000 | 2.3 s |
| Before | Teacher only | 100% | 0% | $0.1261 | 5.3 s |
| Before | Cascade | 55% | 70% | $0.0451 | 2.5 s |
| Warm-up | Cascade, 185 questions | 78% | 97% | $0.0110 | 1.5 s |
| After | Student + memory | 84% | 100% | $0.0000 | 2.9 s |
| After | Cascade + memory | 84% | 100% | $0.0000 | 2.9 s |
| Warm-up | Cascade + judge, 185 questions | 97.3% | 85.4% | $0.0414 | 2.4 s |
| After | Student + memory (27 entries) | 96.3% | 100% | $0.0000 | 3.4 s |
| After | Cascade + memory + judge | 97.5% | 86.3% | $0.0165 | 3.1 s |

### What this shows

- The student alone gets a quarter of the questions right. The teacher gets all of them right, at a cost.
- The cascade without memory already sends 70% of requests to the student, but accuracy drops to 55%, because many wrong queries still run and return rows, so the SQL verifier lets them through.
- After the warm-up, a handful of teacher answers used as few-shot examples lift the student to 84% on unseen questions, and the teacher is not called at all.
- With the judge, wrong-but-runnable student answers are escalated during warm-up, so the teacher's corrections are remembered: memory grows from 6 to 27 entries and the student alone reaches 96.3%. The cascade with the judge reaches 97.5% while answering 86% of questions locally, at 13% of the teacher-only cost ($0.0165 vs $0.1261).

### Limits

- **In-distribution.** Test questions come from the same 16 templates as the training questions, with different parameters. This is the case Apprentice targets (repeated, similar requests), but it says nothing about unrelated questions.
- **Synthetic data.** The database is generated, small, and clean.
- **One run.** The numbers come from a single run of each phase. Expect some variation between runs and machines.
- **A small memory.** Memory held only 6 entries after the warm-up. Most warm-up answers passed the SQL check and were never escalated, so the teacher was asked only a few times. Some of those student answers were wrong (warm-up accuracy was 78%), which is the gap a judge is meant to close.

## The student's reasoning setting

Qwen3 produces a hidden reasoning trace before it answers unless told not to. Ollama's OpenAI-compatible API ignores Qwen3's `/no_think` switch, so `apprentice/providers.py` sends `reasoning_effort: "none"` instead (controlled by `STUDENT_NO_THINK=1`). On the GTX 1650 this took the student from about 800 to about 80 output tokens, and from 12.5 s to 1.4 s per answer. If a provider rejects the field with HTTP 400, the request is retried without it.
