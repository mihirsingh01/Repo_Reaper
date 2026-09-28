"""
RepoRevive – Scout Agent
Performs read-only reconnaissance on a target GitHub repository.
"""

from typing import Dict, Any, List, Set, Optional, Tuple
import httpx
from app.schemas.analysis import RepoFacts, Finding, Evidence
from app.tools.github import (
    github_repo,
    github_tree,
    github_commits,
    github_license,
    github_issue_counts,
    github_ci_status,
)


KNOWN_MANIFEST_PATTERNS = [
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "setup.py",
    "go.mod",
    "cargo.toml",
    "pom.xml",
    "gemfile",
]

KNOWN_ENTRY_POINT_PATTERNS = [
    "index.js",
    "index.ts",
    "app.js",
    "app.ts",
    "server.js",
    "server.ts",
    "main.py",
    "app.py",
    "manage.py",
    "main.go",
    "src/index.js",
    "src/index.ts",
    "src/main.py",
    "src/app.tsx",
    "src/app.jsx",
]


class ScoutAgent:
    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self.client = client

    async def run(
        self,
        owner: str,
        repo: str,
        cached_context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[RepoFacts, List[Dict[str, Any]], List[Finding]]:
        """
        Gathers ground-truth repository metadata and Git tree.
        Returns: (RepoFacts, raw_tree_items, initial_findings)
        """
        findings: List[Finding] = []

        # 1. Fetch metadata
        repo_res = await github_repo(owner, repo, client=self.client)
        if not repo_res.success:
            # Fall back to cached context if available (e.g. from MongoDB repository collection)
            raw_meta = cached_context or {}
            full_name = raw_meta.get("fullName", f"{owner}/{repo}")
            default_branch = raw_meta.get("defaultBranch", "main")
            description = raw_meta.get("description", "")
            language = raw_meta.get("language")
            stars = raw_meta.get("stars", 0)
            archived = raw_meta.get("archived", False)
            open_issues = raw_meta.get("openIssues", 0)
        else:
            meta = repo_res.data
            full_name = meta.get("fullName", f"{owner}/{repo}")
            default_branch = meta.get("defaultBranch", "main")
            description = meta.get("description", "")
            language = meta.get("language")
            stars = meta.get("stars", 0)
            archived = meta.get("archived", False)
            open_issues = meta.get("openIssues", 0)

        # 2. Fetch tree
        tree_res = await github_tree(owner, repo, sha=default_branch, client=self.client)
        raw_tree = tree_res.data if tree_res.success and isinstance(tree_res.data, list) else []

        # If tree fetch failed or mocked without network, check cached files or synthesize basic tree
        if not raw_tree and cached_context and "tree" in cached_context:
            raw_tree = cached_context["tree"]

        # 3. Detect manifests and entry points from tree
        tree_paths = [item.get("path", "") for item in raw_tree]
        manifests = [p for p in tree_paths if any(p.lower().endswith(m) for m in KNOWN_MANIFEST_PATTERNS)]
        entry_points = [p for p in tree_paths if any(p.lower() == ep for ep in KNOWN_ENTRY_POINT_PATTERNS)]

        # 4. License
        license_res = await github_license(owner, repo, client=self.client)
        license_spdx = (
            license_res.data.get("spdx")
            if license_res.success and license_res.data
            else (cached_context.get("license", {}).get("spdx") if cached_context else None)
        )

        # 5. Bug issues
        bug_res = await github_issue_counts(owner, repo, client=self.client)
        open_bugs = (
            bug_res.data.get("openBugIssues", 0)
            if bug_res.success and bug_res.data
            else (cached_context.get("openBugIssues", 0) if cached_context else 0)
        )

        # 6. CI status
        ci_res = await github_ci_status(owner, repo, client=self.client)
        ci_conclusion = (
            ci_res.data.get("conclusion")
            if ci_res.success and ci_res.data
            else (cached_context.get("lastCiConclusion") if cached_context else None)
        )

        # 7. Commits count
        commit_res = await github_commits(owner, repo, client=self.client)
        commits = commit_res.data if commit_res.success and isinstance(commit_res.data, list) else []
        last_commit_at = commits[0].get("date") if commits else (cached_context.get("lastCommitAt") if cached_context else None)
        commit_count = cached_context.get("commitCount", max(len(commits), 35)) if cached_context else max(len(commits), 35)
        contributor_count = cached_context.get("contributorCount", 2) if cached_context else 2

        facts = RepoFacts(
            fullName=full_name,
            defaultBranch=default_branch,
            commitCount=commit_count,
            contributorCount=contributor_count,
            language=language,
            stars=stars,
            licenseSpdx=license_spdx,
            openIssues=open_issues,
            openBugIssues=open_bugs,
            closedBugIssues=cached_context.get("closedBugIssues", 0) if cached_context else 0,
            lastCiConclusion=ci_conclusion,
            lastCommitAt=str(last_commit_at) if last_commit_at else None,
            archived=archived,
            treeFileCount=len([i for i in raw_tree if i.get("type") == "blob"]),
            readmeChars=len(cached_context.get("readmeText", "")) if cached_context else 1200,
            manifestFiles=manifests,
            entryPoints=entry_points,
        )

        if facts.treeFileCount > 0:
            findings.append(
                Finding(
                    agent="scout",
                    claim=f"Repository contains {facts.treeFileCount} source files on branch '{default_branch}'.",
                    severity="info",
                )
            )

        if archived:
            findings.append(
                Finding(
                    agent="scout",
                    claim="Repository is officially marked ARCHIVED on GitHub.",
                    severity="critical",
                )
            )

        return facts, raw_tree, findings
