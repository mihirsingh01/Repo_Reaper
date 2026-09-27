"""
RepoRevive – GitHub Read-Only Inspection Tools
Strictly static, read-only via GitHub REST API with timeouts and size limits.
"""

import base64
import fnmatch
from typing import Optional, List, Dict, Any
import httpx
from app.core.config import settings
from app.tools.base import ToolResult, DEFAULT_TIMEOUT_SECONDS, MAX_FILE_BYTES


def _get_headers() -> Dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "RepoRevive-Agent/1.0",
    }
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    return headers


async def github_repo(owner: str, repo: str, client: Optional[httpx.AsyncClient] = None) -> ToolResult:
    """Fetch repository metadata."""
    url = f"{settings.GITHUB_API_URL}/repos/{owner}/{repo}"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            return ToolResult(
                success=True,
                data={
                    "fullName": data.get("full_name"),
                    "defaultBranch": data.get("default_branch", "main"),
                    "description": data.get("description"),
                    "language": data.get("language"),
                    "stars": data.get("stargazers_count", 0),
                    "forks": data.get("forks_count", 0),
                    "openIssues": data.get("open_issues_count", 0),
                    "archived": data.get("archived", False),
                    "createdAt": data.get("created_at"),
                    "pushedAt": data.get("pushed_at"),
                },
            )
        return ToolResult(success=False, error=f"GitHub API error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def github_tree(
    owner: str,
    repo: str,
    sha: str = "HEAD",
    recursive: bool = True,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """
    Fetch repository Git tree.
    Handles truncation flag gracefully.
    """
    rec_param = "1" if recursive else "0"
    url = f"{settings.GITHUB_API_URL}/repos/{owner}/{repo}/git/trees/{sha}?recursive={rec_param}"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            raw_tree = data.get("tree", [])
            truncated = data.get("truncated", False)

            # Filter and project paths
            items = []
            for item in raw_tree:
                items.append({
                    "path": item.get("path"),
                    "type": item.get("type"),  # "blob" or "tree"
                    "size": item.get("size", 0),
                })

            return ToolResult(
                success=True,
                data=items,
                metadata={"truncated": truncated, "count": len(items)},
            )
        return ToolResult(success=False, error=f"GitHub API error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def github_file(
    owner: str,
    repo: str,
    path: str,
    ref: str = "HEAD",
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """
    Fetch single text file from repository.
    Enforces text only and <= 200 KB size limit.
    """
    url = f"{settings.GITHUB_API_URL}/repos/{owner}/{repo}/contents/{path}?ref={ref}"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                return ToolResult(success=False, error=f"Path '{path}' is a directory, not a file")

            size = data.get("size", 0)
            if size > MAX_FILE_BYTES:
                return ToolResult(
                    success=False,
                    error=f"File exceeds maximum allowed size ({size} > {MAX_FILE_BYTES} bytes)",
                )

            encoding = data.get("encoding")
            content_raw = data.get("content", "")
            if encoding == "base64":
                try:
                    decoded = base64.b64decode(content_raw).decode("utf-8", errors="replace")
                except Exception as b64_err:
                    return ToolResult(success=False, error=f"Base64 decoding failed: {b64_err}")
            else:
                decoded = content_raw

            return ToolResult(
                success=True,
                data=decoded,
                metadata={"path": path, "size": size, "sha": data.get("sha")},
            )
        return ToolResult(success=False, error=f"GitHub file fetch error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def github_commits(
    owner: str,
    repo: str,
    per_page: int = 30,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """Fetch recent commits and total count from Link header."""
    url = f"{settings.GITHUB_API_URL}/repos/{owner}/{repo}/commits?per_page={per_page}"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            commits_data = resp.json()
            commits = []
            for c in commits_data:
                commit_obj = c.get("commit", {})
                committer = commit_obj.get("committer", {})
                commits.append({
                    "sha": c.get("sha"),
                    "message": commit_obj.get("message", "")[:200],
                    "date": committer.get("date"),
                    "author": commit_obj.get("author", {}).get("name"),
                })
            return ToolResult(success=True, data=commits)
        return ToolResult(success=False, error=f"GitHub commits error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def github_license(
    owner: str,
    repo: str,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """Fetch repository license from GitHub license endpoint."""
    url = f"{settings.GITHUB_API_URL}/repos/{owner}/{repo}/license"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            license_info = data.get("license", {})
            return ToolResult(
                success=True,
                data={
                    "spdx": license_info.get("spdx_id"),
                    "name": license_info.get("name"),
                    "url": license_info.get("url"),
                },
            )
        elif resp.status_code == 404:
            return ToolResult(success=True, data={"spdx": None, "name": "None", "url": None})
        return ToolResult(success=False, error=f"GitHub license error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def github_issue_counts(
    owner: str,
    repo: str,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """Fetch open bug issues count."""
    url = f"{settings.GITHUB_API_URL}/search/issues?q=repo:{owner}/{repo}+is:issue+is:open+label:bug"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            bug_count = data.get("total_count", 0)
            return ToolResult(success=True, data={"openBugIssues": bug_count})
        return ToolResult(success=False, error=f"GitHub issues error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def github_ci_status(
    owner: str,
    repo: str,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """Fetch latest GitHub Actions workflow run conclusion."""
    url = f"{settings.GITHUB_API_URL}/repos/{owner}/{repo}/actions/runs?per_page=1"
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS, headers=_get_headers())
        should_close = True

    try:
        resp = await client.get(url)
        if resp.status_code == 200:
            data = resp.json()
            runs = data.get("workflow_runs", [])
            if runs:
                latest = runs[0]
                return ToolResult(
                    success=True,
                    data={
                        "conclusion": latest.get("conclusion"),
                        "status": latest.get("status"),
                        "updatedAt": latest.get("updated_at"),
                    },
                )
            return ToolResult(success=True, data={"conclusion": None, "status": "none"})
        elif resp.status_code == 404:
            return ToolResult(success=True, data={"conclusion": None, "status": "no_actions"})
        return ToolResult(success=False, error=f"GitHub actions error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


def search_in_tree(tree: List[Dict[str, Any]], pattern_or_keywords: str) -> ToolResult:
    """
    Pure in-memory search over the fetched tree items.
    Accepts glob pattern (e.g. '*.py', 'src/**', 'test*') or comma-separated keywords.
    """
    try:
        results = []
        queries = [q.strip().lower() for q in pattern_or_keywords.split(",") if q.strip()]

        for item in tree:
            path = item.get("path", "")
            path_lower = path.lower()

            match = False
            for q in queries:
                if any(char in q for char in ["*", "?", "["]):
                    if fnmatch.fnmatch(path_lower, q):
                        match = True
                        break
                else:
                    if q in path_lower:
                        match = True
                        break

            if match:
                results.append(item)

        return ToolResult(success=True, data=results, metadata={"count": len(results)})
    except Exception as e:
        return ToolResult(success=False, error=str(e))
