"""Calls to OpenAI-compatible chat and embedding endpoints, with fallback."""

import re
import time
from dataclasses import dataclass

import httpx

from .config import Endpoint

_THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)


class ProviderError(Exception):
    pass


@dataclass
class Completion:
    endpoint: Endpoint
    content: str
    prompt_tokens: int
    completion_tokens: int
    latency_ms: float

    @property
    def cost(self) -> float:
        return self.endpoint.cost(self.prompt_tokens, self.completion_tokens)


def _headers(ep: Endpoint) -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if ep.api_key:
        headers["Authorization"] = f"Bearer {ep.api_key}"
    return headers


async def _post(client: httpx.AsyncClient, ep: Endpoint, payload: dict, timeout_s: float) -> dict:
    r = await client.post(f"{ep.base_url}/chat/completions", headers=_headers(ep), json=payload, timeout=timeout_s)
    r.raise_for_status()
    return r.json()


async def chat(
    client: httpx.AsyncClient,
    endpoints: list[Endpoint],
    messages: list[dict],
    *,
    temperature: float = 0.0,
    max_tokens: int = 1024,
    no_think: bool = False,
    timeout_s: float = 120.0,
) -> Completion:
    if not endpoints:
        raise ProviderError("no endpoint configured")
    errors = []
    for ep in endpoints:
        payload = {"model": ep.model, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
        if no_think:
            # Ollama's OpenAI-compatible API ignores Qwen3's "/no_think" switch but honours this.
            payload["reasoning_effort"] = "none"
        started = time.perf_counter()
        try:
            try:
                data = await _post(client, ep, payload, timeout_s)
            except httpx.HTTPStatusError as e:
                if "reasoning_effort" not in payload or e.response.status_code != 400:
                    raise
                payload.pop("reasoning_effort")  # provider doesn't support it; ask again without
                data = await _post(client, ep, payload, timeout_s)
            content = data["choices"][0]["message"].get("content") or ""
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            errors.append(f"{ep.name} ({ep.model}): {type(e).__name__}: {e}")
            continue
        usage = data.get("usage") or {}
        return Completion(
            endpoint=ep,
            content=_THINK_RE.sub("", content).strip(),
            prompt_tokens=int(usage.get("prompt_tokens") or 0),
            completion_tokens=int(usage.get("completion_tokens") or 0),
            latency_ms=(time.perf_counter() - started) * 1000,
        )
    raise ProviderError("; ".join(errors))


async def embed(
    client: httpx.AsyncClient, ep: Endpoint, texts: list[str], timeout_s: float = 30.0
) -> list[list[float]]:
    r = await client.post(
        f"{ep.base_url}/embeddings",
        headers=_headers(ep),
        json={"model": ep.model, "input": texts},
        timeout=timeout_s,
    )
    r.raise_for_status()
    return [item["embedding"] for item in r.json()["data"]]
