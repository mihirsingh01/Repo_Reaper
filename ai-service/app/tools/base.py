"""
RepoRevive – Read-Only Tools Base
All tools are strictly static, read-only, timeout-bounded, size-capped, and host-allowlisted.
"""

from typing import Any, Dict, Optional, Set
from pydantic import BaseModel, Field
from urllib.parse import urlparse

# Strict host allowlist (ADR-001)
ALLOWLISTED_HOSTS: Set[str] = {
    "api.github.com",
    "registry.npmjs.org",
    "pypi.org",
    "api.osv.dev",
}

DEFAULT_TIMEOUT_SECONDS: float = 10.0
MAX_FILE_BYTES: int = 200 * 1024  # 200 KB


class ToolResult(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


def validate_host_allowlist(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.hostname in ALLOWLISTED_HOSTS
