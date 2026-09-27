import time
from typing import Optional
import httpx
from app.llm.provider import LLMProvider, LLMResponse
from app.core.config import settings


class OpenAICompatibleProvider(LLMProvider):
    """Generic provider for OpenAI-compatible endpoints (OpenAI, Gemini, Groq, Ollama)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: str = "gpt-4o-mini",
    ):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.model = model

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        endpoint = f"{self.base_url}/chat/completions"
        start = time.perf_counter()
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.post(endpoint, headers=headers, json=payload)
            res.raise_for_status()
            data = res.json()

        latency_ms = int((time.perf_counter() - start) * 1000)
        content = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})

        return LLMResponse(
            content=content,
            tokens_in=usage.get("prompt_tokens", 0),
            tokens_out=usage.get("completion_tokens", 0),
            latency_ms=latency_ms,
            model=self.model,
        )
