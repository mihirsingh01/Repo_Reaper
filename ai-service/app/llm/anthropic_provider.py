import time
from typing import Optional
import httpx
from app.llm.provider import LLMProvider, LLMResponse
from app.core.config import settings


class AnthropicProvider(LLMProvider):
    """Provider for Anthropic Claude models via raw HTTPX."""

    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-5-sonnet-20240620"):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.model = model
        self.api_url = "https://api.anthropic.com/v1/messages"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        if not self.api_key:
            raise ValueError("Anthropic API key is not configured")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            payload["system"] = system_prompt

        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(self.api_url, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

        latency_ms = int((time.perf_counter() - start) * 1000)
        content = data["content"][0]["text"]
        usage = data.get("usage", {})

        return LLMResponse(
            content=content,
            tokens_in=usage.get("input_tokens", 0),
            tokens_out=usage.get("output_tokens", 0),
            latency_ms=latency_ms,
            model=self.model,
        )
