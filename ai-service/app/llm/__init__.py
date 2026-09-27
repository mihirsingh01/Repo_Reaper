from app.llm.provider import LLMProvider, LLMResponse
from app.llm.mock_provider import MockProvider
from app.llm.anthropic_provider import AnthropicProvider
from app.llm.openai_provider import OpenAICompatibleProvider
from app.core.config import settings


def get_llm_provider(provider_type: str = settings.LLM_PROVIDER) -> LLMProvider:
    """Factory for selecting LLM provider based on environment setting."""
    p_type = provider_type.lower()
    if p_type == "anthropic":
        return AnthropicProvider()
    elif p_type == "openai_compatible" or p_type == "openai":
        return OpenAICompatibleProvider()
    else:
        return MockProvider()


__all__ = [
    "LLMProvider",
    "LLMResponse",
    "MockProvider",
    "AnthropicProvider",
    "OpenAICompatibleProvider",
    "get_llm_provider",
]
