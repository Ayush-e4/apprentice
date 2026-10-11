"""The two answer judges: the yes/no LLM judge and the /v1/systemone decision judge."""

import asyncio
import json

import pytest

from apprentice.judges import SQL_STATEMENT, JudgeError, sql_state, systemone_check
from apprentice.llm_judge import judge_messages, llm_check, parse_verdict

from .fakes import JUDGE, LLM_JUDGE, FakeModels

STATE = sql_state("How many stores are there?", {"sql": "SELECT COUNT(*) FROM stores", "result_rows": [(6,)]})


@pytest.mark.parametrize(
    "reply, score",
    [
        ("yes", 1.0),
        ("Yes.", 1.0),
        ("no", 0.0),
        ("NO", 0.0),
        ("No, wait. Looking again, yes", 1.0),
        ("yes... actually no", 0.0),
        ("<think>The query might be wrong, so no? Let me check the rows.</think>\nyes", 1.0),
        ("<think>yes, it counts the stores</think> Final answer: no", 0.0),
    ],
    ids=["yes", "yes-punct", "no", "no-upper", "last-yes", "last-no", "think-then-yes", "think-then-no"],
)
def test_parse_verdict(reply, score):
    assert parse_verdict(reply) == score


@pytest.mark.parametrize("reply", ["", "maybe", "The answer is correct.", "yesterday", "nobody knows"])
def test_parse_verdict_neither(reply):
    assert parse_verdict(reply) is None


def test_judge_messages_carry_state_and_statement():
    msgs = judge_messages(STATE, SQL_STATEMENT)
    assert [m["role"] for m in msgs] == ["system", "user"]
    assert "SELECT COUNT(*) FROM stores" in msgs[1]["content"]
    assert SQL_STATEMENT in msgs[1]["content"]


def _llm(fake: FakeModels, threshold: float = 0.5):
    async def go():
        async with fake.client() as client:
            return await llm_check(client, LLM_JUDGE, threshold, STATE, SQL_STATEMENT)

    return asyncio.run(go())


def test_llm_check_yes_passes():
    v = _llm(FakeModels(llmjudge="yes"))
    assert (v.ok, v.score) == (True, 1.0)


def test_llm_check_no_fails():
    v = _llm(FakeModels(llmjudge="No."))
    assert (v.ok, v.score) == (False, 0.0)


def test_llm_check_strips_reasoning_before_parsing():
    # providers.chat removes <think> blocks, so a "yes" inside the reasoning doesn't count
    v = _llm(FakeModels(llmjudge="<think>yes yes yes</think>no"))
    assert v.score == 0.0


def test_llm_check_asks_without_thinking():
    fake = FakeModels(llmjudge="yes")
    _llm(fake)
    body = fake.bodies("llmjudge")[0]
    assert body["model"] == "fake-llm-judge"
    assert body["reasoning_effort"] == "none"


def test_llm_check_without_verdict_is_a_judge_error():
    with pytest.raises(JudgeError, match="no yes/no"):
        _llm(FakeModels(llmjudge="I am not sure."))


def test_llm_check_outage_is_a_judge_error():
    with pytest.raises(JudgeError):
        _llm(FakeModels(llmjudge=503))


def _decision(fake: FakeModels, threshold: float = 0.8):
    async def go():
        async with fake.client() as client:
            return await systemone_check(client, JUDGE, threshold, STATE, SQL_STATEMENT)

    return asyncio.run(go())


def test_systemone_check_scores_against_threshold():
    assert _decision(FakeModels(judge=0.93)).ok
    v = _decision(FakeModels(judge=0.42))
    assert (v.ok, v.score) == (False, 0.42)


def test_systemone_request_shape():
    fake = FakeModels(judge=0.9)
    _decision(fake)
    body = fake.bodies("judge")[0]
    assert body["model"] == "fake-judge"
    assert json.loads(body["state"])["question"] == "How many stores are there?"
    question = body["questions"]["correct"]
    assert question["type"] == "noul"
    assert question["instructions"] == SQL_STATEMENT


@pytest.mark.parametrize("reply", [500, "not a number"])
def test_systemone_failure_is_a_judge_error(reply):
    with pytest.raises(JudgeError):
        _decision(FakeModels(judge=reply))
