"""
RepoRevive – Agent Tool Registry
Exposes only allowed read-only tools to each specific worker agent role.
"""

from typing import Dict, Set, Callable, Any, Optional
from app.tools.github import (
    github_repo,
    github_tree,
    github_file,
    github_commits,
    github_license,
    github_issue_counts,
    github_ci_status,
    search_in_tree,
)
from app.tools.registries import registry_lookup, osv_query
from app.tools.static_lint import static_lint

ALL_TOOLS: Dict[str, Callable[..., Any]] = {
    "github_repo": github_repo,
    "github_tree": github_tree,
    "github_file": github_file,
    "github_commits": github_commits,
    "github_license": github_license,
    "github_issue_counts": github_issue_counts,
    "github_ci_status": github_ci_status,
    "search_in_tree": search_in_tree,
    "registry_lookup": registry_lookup,
    "osv_query": osv_query,
    "static_lint": static_lint,
}

# Explicit role-based permissions matrix
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "scout": {
        "github_repo",
        "github_tree",
        "github_commits",
        "github_license",
        "github_issue_counts",
        "github_ci_status",
    },
    "structure": {
        "search_in_tree",
        "github_file",
    },
    "coverage": {
        "search_in_tree",
        "github_file",
    },
    "bug_risk": {
        "github_issue_counts",
        "github_ci_status",
        "static_lint",
        "github_file",
    },
    "deps": {
        "github_file",
        "registry_lookup",
        "osv_query",
    },
    "license": {
        "github_license",
        "github_file",
    },
    "revival_planner": set(),
    "verifier": {
        "search_in_tree",
        "github_file",
    },
}


class ToolRegistry:
    def __init__(self, role: str):
        self.role = role.lower()
        self.allowed_tool_names = ROLE_PERMISSIONS.get(self.role, set())

    def get_tool(self, name: str) -> Optional[Callable[..., Any]]:
        if name not in self.allowed_tool_names:
            return None
        return ALL_TOOLS.get(name)

    def is_allowed(self, name: str) -> bool:
        return name in self.allowed_tool_names

    def list_allowed_tools(self) -> Set[str]:
        return set(self.allowed_tool_names)
