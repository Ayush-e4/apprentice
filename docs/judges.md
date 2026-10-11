# Judges

A verifier catches answers that are clearly broken. For SQL, `verifier=sql` rejects a query that fails to run or returns no rows. It cannot tell whether a query that runs is the *right* query: `SUM(oi.quantity)` instead of `SUM(oi.quantity * oi.unit_price)` runs fine and returns a wrong number.

A judge is the second check. In `cascade` mode it runs on student answers that passed the verifier, and a low score escalates the request to the teacher.

```json
{"apprentice": {"mode": "cascade", "verifier": "sql", "judge": "decision"}}
```

## What the judge sees

For a SQL answer (`verifier=sql`), the judge gets a JSON *state* with the question, the extracted query, and the first five rows it returns (or the SQL error):

```json
{
  "question": "How many orders were placed at the Dadar TT store?",
  "sql": "SELECT COUNT(*) FROM orders o JOIN stores s ON s.id = o.store_id WHERE s.name = 'Dadar TT'",
  "result_columns": ["COUNT(*)"],
  "result_rows": [[527]]
}
```

The same question with `s.name = 'Bandra Linking Road'` also runs and returns one row (535), so it passes the verifier, but it is wrong. Catching that is the judge's job. The judge is asked whether this statement is true: *"The SQL query correctly answers the user's question, and its result is the requested answer."*

For other answers (no verifier), the state holds the system instructions (first 4,000 characters), the question and the answer, and the statement is *"The assistant's answer correctly and completely answers the user's question."*

## Two kinds of judge

### `judge=decision`: a decision model

Any server that speaks the `/v1/systemone` decision protocol. Apprentice sends the state and one yes/no (Noul) question, and the server returns the probability that the statement is true. Answers scoring below `JUDGE_THRESHOLD` (default `0.8`) escalate.

Open-weight servers that speak the protocol:

- [Von](https://github.com/wfzyx/von) (Apache-2.0, runs on CPU). This is the default in `.env.example`:

  ```bash
  pip install von-sdk
  von serve --port 8020 --noul-decision raw   # raw = calibrated probabilities, needed for thresholds
  ```

- [Kev](https://github.com/jaredpalmer/kev) (Apache-2.0). This is the model we are fine-tuning (see below).

TypeSafe's hosted Jev speaks the same protocol. It is closed and optional.

Settings: `JUDGE_BASE_URL`, `JUDGE_MODEL`, `JUDGE_API_KEY`, `JUDGE_THRESHOLD`, `JUDGE_PRICE_IN`, `JUDGE_PRICE_OUT`.

### `judge=llm`: an LLM answering yes or no

Any OpenAI-compatible chat model gets the same state and statement and is asked to reply with one word. `yes` scores 1.0 and `no` scores 0.0; the last standalone yes/no in the reply wins. Scores below `LLM_JUDGE_THRESHOLD` (default `0.5`) escalate. Reasoning is turned off for this call, since a one-word verdict doesn't need it.

Set `LLM_JUDGE_BASE_URL`, `LLM_JUDGE_MODEL` and `LLM_JUDGE_API_KEY`, or leave them unset to use the first teacher endpoint.

### When a judge fails

If the judge is not configured, can't be reached, returns an error, or (for `judge=llm`) replies with neither "yes" nor "no", the student's answer is **let through**, and the trace's `reason` records why (for example `judge unavailable (...)`). A broken judge never blocks a request.

A decision judge served from a free GPU session (like the Colab notebook) can disappear when the session times out. With `JUDGE_FALLBACK=llm`, a request whose decision judge is unreachable asks the LLM judge instead, and the reason reads `judge unavailable (...); fallback llm judge 1.00`. The LLM judge is slower and stricter (on our 30 test pairs it caught 30 of 30 wrong queries but accepted only 11 of 30 correct ones), so during an outage more answers go to the teacher. That costs more but never lets more wrong answers through. If the fallback fails too, the answer is let through as above. `/api/health` and the dashboard's health dots show when the decision judge is down.

## Why we train our own

We measured the options on our SQL task before picking one:

| Judge | Result |
|---|---|
| Von, off the shelf | Average score 0.745 for correct queries vs 0.734 for wrong ones: it cannot tell them apart |
| Kev-0.8B, released weights | 45.7% accuracy on our 610 held-out examples, below the 58.7% you get by always answering "wrong" |
| GLM-5.2 as an LLM judge | Caught 30 of 30 wrong queries but accepted only 11 of 30 correct ones, about 10.6 s per check |
| Kev-0.8B, fine-tuned on our data | **99.3%** accuracy on the 610 held-out examples; on the same 30 pairs, accepted 30 of 30 correct and caught 29 of 30 wrong queries, about 0.4 s per check |

The LLM judge is safe (it doesn't let wrong answers through) but rejects most correct ones, which sends them to the teacher and costs money and time. So it is a backup. The default is the small decision model trained on this task.

## Training data

`bench/judge_data.py` builds labelled examples from the benchmark questions. For each question it collects:

- **gold**: the reference query;
- **rewrites**: the same query written differently (wrapped in a subquery, or with lowercase keywords);
- **swaps**: the gold query of another question from the same template;
- **mutations**: the gold query with one literal changed (another store, month, category...) or one operator changed (`SUM` to `AVG`, `DESC` to `ASC`, a dropped date filter...).

Labels are not guessed. Each query is run, and it is labelled correct exactly when its result matches the gold query's result (with the same grading as the benchmark), so a mutation that happens to give the same answer is labelled correct. Queries that fail or return nothing are skipped, because the SQL verifier rejects them before a judge would see them.

Train examples come from the 185 training questions and held-out examples from the 80 test questions, so no test SQL leaks into training:

| File | Examples | Correct | Wrong |
|---|---|---|---|
| `data/judge/train.jsonl` | 1,401 | 588 | 813 |
| `data/judge/heldout.jsonl` | 610 | 252 | 358 |

Regenerate them with `python -m bench.judge_data`.

## Fine-tuning Kev-0.8B on Colab

[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Ayush-e4/apprentice/blob/main/notebooks/train_sql_judge.ipynb)

`notebooks/train_sql_judge.ipynb` runs on a free Colab T4 GPU. Choose Runtime > Change runtime type > T4 GPU, then Runtime > Run all. It:

1. installs Kev from source;
2. downloads `train.jsonl` and `heldout.jsonl` from this repository's `main` branch;
3. scores the released Kev-0.8B on the held-out set;
4. fine-tunes from the released Kev-0.8B adapter (base model Qwen3.5-0.8B-Base, 2 epochs, learning rate 2e-5, fp32 because the T4 has no bf16);
5. scores the fine-tuned judge on the same held-out set and prints both reports side by side;
6. downloads the trained judge as `sql-judge.zip`;
7. optionally serves it from Colab on a temporary public HTTPS URL (a Cloudflare quick tunnel) protected by a generated API key.

To use the judge served from Colab, copy the printed values into `.env`:

```bash
JUDGE_BASE_URL=<printed URL>
JUDGE_API_KEY=<printed key>
JUDGE_MODEL=kev-sql-judge
```

Then restart the gateway and send `"judge": "decision"`, or run `python -m bench.run_eval all --judge decision`. The URL stops working when the Colab session ends.

## Fine-tuned judge results

One run of the notebook on a free Colab T4 (352 optimizer steps, about 15 minutes of training). Both models were scored by `kev.benchmark` on the 610 held-out examples (`data/judge/heldout.jsonl`), which come from test questions the judge never saw:

| Metric | Released Kev-0.8B | Fine-tuned Kev-0.8B |
|---|---|---|
| Accuracy | 45.7% | **99.3%** |
| Expected calibration error (lower is better) | 0.278 | **0.004** |
| Brier score (lower is better) | 0.607 | **0.011** |
| Share of decisions it can automate at ≤5% error | 5.6% | **100%** |
| Share of decisions it can automate at ≤1% error | 1.8% | **100%** |
| Confident errors (wrong with ≥0.9 probability) | 0.0% | 0.3% |

A second check, the 30 correct-vs-wrong pairs used to test every judge above (the wrong query is the gold query of another question from the same template, so it runs and returns a plausible number):

| | Fine-tuned Kev-0.8B (served from Colab) |
|---|---|
| Correct queries scored ≥ 0.8 | 30 of 30 (mean 0.992) |
| Wrong queries scored ≥ 0.8 | 1 of 30 (mean 0.045) |
| Correct scored above wrong | 30 of 30 pairs |
| Median latency per check, laptop to Colab over the tunnel | 0.41 s |

We use `JUDGE_THRESHOLD=0.8`.

**Limits.** The held-out examples use the same 16 question templates as training, with different stores, months and values. These numbers show the judge learned this benchmark's mistakes. They do not show it can judge arbitrary SQL. A new schema or new question shapes need new labelled data, which `bench/judge_data.py` shows how to generate.

## Judge v2 data

The fine-tuned judge has two measured weaknesses: it scores 76.8% on the [unseen question types](generalization.md) (99.3% on the seen ones), and it approved a wrong answer to a Hinglish question. `bench/judge_data_v2.py` builds training data for a v2 judge that starts from v1.

**Fair split of the unseen templates.** Four unseen templates go into training and four stay held out, so v1 and v2 are compared on question types neither trained on:

| Training | Held out |
|---|---|
| `price_range_category` (easy) | `weekend_revenue_store` (weekday filter) |
| `avg_units_per_order` (per-order subquery) | `second_store_month` (OFFSET ranking) |
| `inactive_customers_month` (anti-join) | `store_share_month` (percentage share) |
| `product_growth` (month-over-month pivot) | `all_stores_customers` (relational division) |

**Sources of training examples** (`data/judge_v2/train.jsonl`, shuffled with a fixed seed, every label from execution as in v1):

| Source | Examples | Correct | Wrong |
|---|---|---|---|
| v1 training data (`data/judge/train.jsonl`) | 1,401 | 588 | 813 |
| The 4 training unseen templates | 174 | 82 | 92 |
| Real student attempts from the gateway's `traces` table | 374 | 321 | 53 |
| Hinglish rewrites of 63 training questions (`bench/hinglish.py`) | 469 | 208 | 261 |
| **Total** | **2,418** | **1,199** | **1,219** |

Real attempts are kept only when the trace's question exactly matches a train-split question or a question from a training unseen template; SQL that fails or returns no rows is skipped, and each (question, SQL) pair is kept once. Of 1,092 traces, 423 matched (382 distinct pairs, 374 that run and return rows); the 563 traces of test-split questions and 64 of held-out unseen questions were left out. The Hinglish rewrites come from a hand-written phrasebook, one phrasing per template (for example *"March 2026 mein Powai Lake store ka total revenue kitna tha?"*), with the same gold, rewrites and mutations as the English question.

**Held-out files** (neither v1 nor v2 trains on them):

| File | Examples | Correct | Wrong |
|---|---|---|---|
| `data/judge/heldout.jsonl` (seen templates, test split) | 610 | 252 | 358 |
| `data/judge_v2/heldout_unseen.jsonl` (the 4 held-out unseen templates) | 245 | 105 | 140 |
| `data/judge_v2/heldout_hinglish.jsonl` (Hinglish versions of the 80 test questions) | 607 | 252 | 355 |

Rebuild with `python -m bench.judge_data_v2 build --traces <gateway database>` (opened read-only), and score any file against the judge set by `JUDGE_*` with `python -m bench.judge_data_v2 eval --file <jsonl>`.

[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/Ayush-e4/apprentice/blob/main/notebooks/train_sql_judge_v2.ipynb)

`notebooks/train_sql_judge_v2.ipynb` fine-tunes v2 from the released v1 judge (same base model, 2 epochs, learning rate 2e-5, fp32), scores v1 and v2 on the three held-out files, and can serve v2 on port 8010 next to a running v1.

One run on a free Colab T4 (606 steps), in the same session that was serving v1. Both judges were scored by `kev.benchmark` on the same three files, none of which either judge trained on:

| Held-out file | Examples | v1 accuracy (ECE) | v2 accuracy (ECE) |
|---|---|---|---|
| Seen templates (`data/judge/heldout.jsonl`) | 610 | 99.3% (0.004) | 99.2% (0.007) |
| Held-out unseen templates (`heldout_unseen.jsonl`) | 245 | 74.3% (0.242) | **78.0%** (0.208) |
| Hinglish (`heldout_hinglish.jsonl`) | 607 | 94.7% (0.040) | **98.7%** (0.010) |

v2 is better where v1 was weak: +3.7 points on question shapes neither judge saw (the 4 held-out unseen templates), and +4.0 points on Hinglish, with calibration error down 4×. On seen templates it holds steady (−0.2 points, inside run-to-run noise for 610 examples). It is the judge the demo gateway now uses (`JUDGE_MODEL=kev-sql-judge-v2`).

Unseen question shapes remain the hard case: 78% means about 1 in 5 judgements on a new shape is wrong. More templates, more schemas and more real student mistakes are the next lever.
