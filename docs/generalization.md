# Generalization eval

The [benchmark](benchmark.md) draws its train and test questions from the same 16 templates, and the SQL judge's training and held-out data come from those templates too. That matches the traffic Apprentice is built for (similar questions over time), but it leaves an obvious question open: **does anything still work on question types the system has never seen?**

This eval answers it. It keeps the same database and the same system prompt, and asks questions in **new shapes** that appear nowhere in memory or in the judge's training data.

## What is unseen

`bench/unseen.py` defines 8 new templates, 58 questions in total:

| Template | Example | Questions | New SQL shape |
|---|---|---|---|
| `avg_units_per_order` | On average, how many units (total quantity) does a single order at the Dadar TT store contain? | 6 | Average of a per-order sum of quantities |
| `inactive_customers_month` | How many customers who joined before May 2026 placed no orders at all during May 2026? | 9 | Anti-join (`NOT IN`) with a date bound |
| `second_store_month` | Which store ranked second by revenue in March 2026? | 9 | Ranking with `OFFSET` |
| `product_growth` | Which product had the biggest increase in units sold from March to April 2026? | 6 | Month-over-month pivot (`CASE` inside `SUM`) |
| `weekend_revenue_store` | How much revenue did the Powai Lake store make on weekends (Saturdays and Sundays)? | 6 | Day-of-week filter (`strftime('%w')`) |
| `store_share_month` | What percentage (0 to 100) of all revenue in June 2026 came from the Colaba Causeway store? | 9 | Conditional sum over a total |
| `all_stores_customers` | How many customers from Kurla have placed orders at every one of the six stores? | 8 | Relational division (`HAVING COUNT(DISTINCT ...)`) |
| `price_range_category` | What is the price gap between the most and the least expensive product in the Dairy category? | 5 | Arithmetic on two aggregates |

Questions with an empty or NULL answer are skipped, and so are ranking questions whose answer ties with the next one (the gold answer would be arbitrary). Tests check that no unseen question equals or closely resembles (difflib ratio of 0.8 or more) any benchmark question.

The questions are committed to `data/unseen/questions.json`. Judge examples for them are committed to `data/unseen/judge.jsonl`: 419 examples (187 correct, 232 wrong), built with the same machinery as `bench/judge_data.py` (gold, rewrites, swaps within a template, literal and operator mutations) and **labelled by execution**.

## How to run it

```bash
python -m bench.unseen build      # regenerate both data files (optional, they are committed)
```

### The student

Start the gateway as usual, ideally after the benchmark's warm-up so memory holds the teacher's answers to the *seen* templates. Then:

```bash
python -m bench.unseen student --url http://localhost:8000                    # student + memory, cascade + memory
python -m bench.unseen student --url http://localhost:8000 --judge decision   # cascade uses the decision judge
python -m bench.unseen student --url http://localhost:8000 --limit 10         # quick check
```

Every request uses `memory=true`, `learn=false` and `verifier=sql`, so **unseen questions are never written to memory**. Results are stored as phase `unseen` in `eval_runs` and `eval_results` and show up on the dashboard. `--modes student,cascade,teacher` also adds a teacher-only run as a reference.

### The judge

Point `JUDGE_BASE_URL`, `JUDGE_MODEL` (and `JUDGE_API_KEY`, `JUDGE_THRESHOLD`) at the decision judge, then:

```bash
python -m bench.unseen judge            # all 419 examples, 4 at a time
python -m bench.unseen judge --n 50     # quick check
```

It prints accuracy, precision and recall (positive = "the query is correct"), the confusion matrix, the mean score for correct and wrong queries, and how many wrong queries scored at or above the threshold. The summary is saved to `data/unseen/judge_results.json`.

## Results

Real models: student Qwen3 1.7B on a laptop GTX 1650, teacher GLM-5.2, memory from the judge warm-up (27 entries, all from the seen templates), `nomic-embed-text` for memory search. Single runs.

Student and cascade, 58 unseen questions:

| Run | Accuracy | Handled by student | Cost | Median latency |
|---|---|---|---|---|
| Student + memory | **32.8%** | 100% | $0.0000 | 3.8 s |
| Cascade + memory + judge | *rerun pending* | | | |

The cascade + judge run is pending because the judge, then served from a free Colab session, disconnected partway through: only 5 of 58 requests were actually judged. We don't report that run.

On seen templates, the same student reaches 96.3% with memory. On unseen shapes it drops to 32.8%, close to its no-memory baseline (25%). Remembered answers for other question shapes barely help.

For comparison, the in-distribution test set reaches 96.3% (student + memory) and 97.5% (cascade + memory + judge); see [benchmark.md](benchmark.md#results).

Decision judge (Kev-0.8B, fine-tuned on the seen templates), 419 unseen examples:

| Metric | Value |
|---|---|
| Accuracy | **76.8%** (99.3% on seen templates) |
| Precision (correct) | 77.1% |
| Recall (correct) | 68.5% |
| Mean score: correct / wrong | 0.728 / 0.177 |
| Wrong queries scoring at or above the threshold | 38 of 232 (16%) |
| Correct queries scoring below the threshold | 59 of 187 (32%) |

All 419 examples were scored with 0 errors (`data/unseen/judge_results.json`, threshold 0.8).

**What this means.** The judge still separates right from wrong on question shapes it never saw (mean 0.73 vs 0.18), but much less sharply than on seen ones. About 1 in 6 wrong queries slip through. About a third of correct ones get sent to the teacher, which costs money but stays safe. The fix is more varied training data: new templates, real student mistakes and Hinglish phrasings. Rerun this eval after retraining to check whether it helped.

## Why it matters

- **Memory helps only when a similar question was seen.** On unseen shapes, memory search finds weaker matches, so the student is closer to its no-memory baseline. The cascade's job is then to notice and escalate.
- **The judge is the safety net.** A judge that only learned the seen templates could score any runnable query as correct. If it still separates right from wrong SQL here, its cascade decisions can be trusted beyond the benchmark's templates.
- **What it does not cover.** Same database, same schema, same system prompt. A different database or domain is still untested.
