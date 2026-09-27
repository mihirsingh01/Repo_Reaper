import json
import re
import time
from abc import ABC, abstractmethod
from typing import Type, TypeVar, Optional, Any, Dict
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


class LLMResponse(BaseModel):
    content: str
    tokens_in: int = 0
    tokens_out: int = 0
    latency_ms: int = 0
    model: str = "mock"


class LLMProvider(ABC):
    """Abstract interface for LLM backends."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        """Generate raw text completion."""
        pass

    async def generate_json(
        self,
        prompt: str,
        schema: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 2500,
    ) -> T:
        """
        Generate and parse JSON matching a Pydantic schema.
        Includes automatic 1-pass repair on malformed outputs.
        """
        json_instruction = (
            f"\n\nReturn ONLY a valid JSON object matching this schema:\n"
            f"{json.dumps(schema.model_json_schema(), indent=2)}\n"
            f"Do not include any explanations or conversational text outside the JSON."
        )

        full_prompt = prompt + json_instruction
        response = await self.generate(
            full_prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        # 1. Attempt initial parse
        try:
            parsed_data = self._extract_json(response.content)
            return schema.model_validate(parsed_data)
        except (ValueError, ValidationError) as initial_err:
            # 2. One-pass automatic repair prompt
            repair_prompt = (
                f"The following JSON output failed validation against the schema.\n"
                f"Validation error:\n{str(initial_err)}\n\n"
                f"Failed output:\n{response.content}\n\n"
                f"Fix the JSON syntax and field types. Return ONLY the corrected JSON object."
            )
            repair_response = await self.generate(
                repair_prompt,
                system_prompt="You are a JSON repair specialist. Output only valid JSON.",
                temperature=0.0,
            )

            try:
                repaired_data = self._extract_json(repair_response.content)
                return schema.model_validate(repaired_data)
            except Exception as repair_err:
                raise ValueError(
                    f"LLM JSON parsing and 1-pass repair failed: {repair_err}. Original error: {initial_err}"
                )

    def _extract_json(self, text: str) -> Dict[str, Any]:
        """Extracts JSON object from text or markdown code fences."""
        cleaned = text.strip()

        # Check for ```json ... ``` code fence
        fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
        if fence_match:
            return json.loads(fence_match.group(1))

        # Check for first { to last }
        brace_match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if brace_match:
            return json.loads(brace_match.group(1))

        return json.loads(cleaned)
