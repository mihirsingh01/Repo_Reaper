import pytest
import httpx
from app.tools.github import (
    github_repo,
    github_tree,
    github_file,
    github_license,
    github_ci_status,
    search_in_tree,
)
from app.tools.registries import registry_lookup, osv_query
from app.tools.base import MAX_FILE_BYTES


@pytest.mark.asyncio
async def test_github_file_size_cap():
    async def mock_handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "size": MAX_FILE_BYTES + 500,
                "encoding": "utf-8",
                "content": "giant file...",
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        res = await github_file("test-owner", "test-repo", "large.bin", client=client)
        assert res.success is False
        assert "exceeds maximum allowed size" in res.error


@pytest.mark.asyncio
async def test_github_repo_success():
    async def mock_handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "full_name": "owner/awesome-repo",
                "default_branch": "main",
                "description": "An awesome repo",
                "language": "Python",
                "stargazers_count": 120,
                "forks_count": 25,
                "open_issues_count": 3,
                "archived": False,
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        res = await github_repo("owner", "awesome-repo", client=client)
        assert res.success is True
        assert res.data["fullName"] == "owner/awesome-repo"
        assert res.data["language"] == "Python"
        assert res.data["stars"] == 120


@pytest.mark.asyncio
async def test_search_in_tree():
    sample_tree = [
        {"path": "src/index.js", "type": "blob", "size": 120},
        {"path": "src/auth/jwt.js", "type": "blob", "size": 340},
        {"path": "tests/auth.test.js", "type": "blob", "size": 250},
        {"path": "package.json", "type": "blob", "size": 80},
    ]

    # Keyword search
    res = search_in_tree(sample_tree, "jwt")
    assert res.success is True
    assert len(res.data) == 1
    assert res.data[0]["path"] == "src/auth/jwt.js"

    # Glob search
    res_glob = search_in_tree(sample_tree, "tests/*")
    assert res_glob.success is True
    assert len(res_glob.data) == 1
    assert res_glob.data[0]["path"] == "tests/auth.test.js"


@pytest.mark.asyncio
async def test_osv_query_mock():
    async def mock_handler(request: httpx.Request):
        return httpx.Response(
            200,
            json={
                "vulns": [
                    {
                        "id": "GHSA-1234",
                        "summary": "Critical RCE",
                        "database_specific": {"severity": "CRITICAL"},
                    },
                    {
                        "id": "GHSA-5678",
                        "summary": "High ReDoS",
                        "database_specific": {"severity": "HIGH"},
                    },
                ]
            },
        )

    transport = httpx.MockTransport(mock_handler)
    async with httpx.AsyncClient(transport=transport) as client:
        res = await osv_query("npm", "lodash", "4.17.15", client=client)
        assert res.success is True
        assert res.data["vulnCount"] == 2
        assert res.data["criticalCount"] == 1
        assert res.data["highCount"] == 1
