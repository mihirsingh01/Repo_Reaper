from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    AI_HOST: str = "0.0.0.0"
    AI_PORT: int = 8000
    API_KEY: str = "reporevive-internal-ai-service-key-change-me"
    LLM_PROVIDER: str = "mock"
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    GITHUB_TOKEN: Optional[str] = None
    GITHUB_API_URL: str = "https://api.github.com"
    NPM_REGISTRY_URL: str = "https://registry.npmjs.org"
    PYPI_REGISTRY_URL: str = "https://pypi.org/pypi"
    OSV_API_URL: str = "https://api.osv.dev/v1"
    AGENT_MAX_STEPS: int = 25
    AGENT_MAX_TOKENS_PER_RUN: int = 32000
    INDEX_DIR: str = "./data/index"
    LLM_SPEND_KILL_SWITCH: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
