import json
from typing import Optional, Dict, Any, Type
from pydantic import BaseModel
from app.llm.provider import LLMProvider, LLMResponse, T


class MockProvider(LLMProvider):
    """
    Deterministic scripted LLM provider for unit tests and local mock mode.
    Guarantees zero network calls and 100% reproducible outputs.
    """

    def __init__(self, canned_responses: Optional[Dict[str, str]] = None):
        self.canned_responses = canned_responses or {}

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 2000,
    ) -> LLMResponse:
        # Check if custom response was registered
        for key, val in self.canned_responses.items():
            if key in prompt:
                return LLMResponse(
                    content=val,
                    tokens_in=len(prompt.split()),
                    tokens_out=len(val.split()),
                    latency_ms=25,
                    model="mock-scripted",
                )

        # Default scripted refinement response
        if "Idea Refiner" in (system_prompt or "") or "feature checklist" in prompt.lower():
            mock_json = {
                "summary": "Inventory management and automated WhatsApp alerts for small businesses.",
                "targetUsers": ["Small retail shop owners", "Independent grocers"],
                "features": [
                  {
                    "id": "f1",
                    "label": "Inventory & Stock Tracking",
                    "plainDescription": "View and update item quantities, prices, and SKU codes.",
                    "keywords": ["inventory", "stock", "sku", "warehouse"],
                    "priority": "must"
                  },
                  {
                    "id": "f2",
                    "label": "WhatsApp Low-Stock Alerts",
                    "plainDescription": "Send automated notifications when inventory falls below threshold.",
                    "keywords": ["whatsapp", "alerts", "notification", "messaging"],
                    "priority": "must"
                  },
                  {
                    "id": "f3",
                    "label": "Sales & Billing Receipts",
                    "plainDescription": "Generate receipts and log customer purchases.",
                    "keywords": ["sales", "receipt", "billing", "invoice"],
                    "priority": "nice"
                  }
                ],
                "clarifications": []
            }
            return LLMResponse(
                content=json.dumps(mock_json),
                tokens_in=120,
                tokens_out=180,
                latency_ms=30,
                model="mock-refiner",
            )

        # Default generic response
        return LLMResponse(
            content='{"status": "ok", "message": "Mock completion"}',
            tokens_in=50,
            tokens_out=20,
            latency_ms=15,
            model="mock-default",
        )
