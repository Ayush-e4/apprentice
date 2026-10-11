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

## Why we train our own

We measured the options on our SQL task before picking one:

| Judge | Result |
|---|---|
| Von, off the shelf | Average score 0.745 for correct queries vs 0.734 for wrong ones: it cannot tell them apart |
| Kev-0.8B, released weights | 45.7% accuracy on our 610 held-out examples, below the 58.7% you get by always answering "wrong" |
| GLM-5.2 as an LLM judge | Caught 30 of 30 wrong queries but accepted only 11 of 30 correct ones, about 10.6 s per check |
| Kev-0.8B, fine-tuned on our data | **Results pending** |

The LLM judge is safe (it doesn't let wrong answers through) but rejects most correct ones, which sends them to the teacher and costs money and time. So it is a backup. The default plan is a small decision model trained on this task.

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

**Pending.** When the run finishes we will add here: held-out accuracy before and after fine-tuning, the threshold we chose, and the benchmark row for "Cascade + memory + fine-tuned judge". No numbers are reported until then.
