"""
RepoRevive – Coverage Checker Agent
Audits target codebase against confirmed founder feature checklist.
Picks at most 40 files using tree and feature keywords; grounds all findings in real file citations.
"""

from typing import List, Dict, Any, Optional, Set, Tuple
import re
import httpx
from app.schemas.idea import FeatureSpec
from app.schemas.analysis import CoverageFeature, Evidence
from app.tools.github import github_file
from app.agents.defense import wrap_untrusted, detect_suspicious_patterns

MAX_FILES_TO_INSPECT = 40
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs", ".java",
    ".php", ".rb", ".c", ".cpp", ".cs", ".vue", ".svelte", ".json",
}


class CoverageChecker:
    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self.client = client

    def select_files_to_inspect(
        self,
        features: List[FeatureSpec],
        tree_items: List[Dict[str, Any]],
    ) -> List[str]:
        """
        Picks at most 40 files from the tree based on feature keywords and source extensions.
        """
        all_keywords: Set[str] = set()
        for f in features:
            for kw in f.keywords:
                all_keywords.add(kw.lower().strip())
            for word in f.label.lower().split():
                if len(word) > 3:
                    all_keywords.add(word.strip())

        scored_paths: List[Tuple[int, str]] = []
        for item in tree_items:
            path = item.get("path", "")
            if item.get("type") != "blob":
                continue

            ext = "." + path.split(".")[-1].lower() if "." in path else ""
            if ext not in CODE_EXTENSIONS:
                continue

            path_lower = path.lower()
            score = 0
            for kw in all_keywords:
                if kw in path_lower:
                    score += 2

            if score > 0:
                scored_paths.append((score, path))

        # Sort by relevance score descending
        scored_paths.sort(key=lambda x: x[0], reverse=True)
        selected = [p for _, p in scored_paths[:MAX_FILES_TO_INSPECT]]

        # If fewer than 5 files selected, add top entry points or root files
        if len(selected) < 5:
            for item in tree_items:
                path = item.get("path", "")
                ext = "." + path.split(".")[-1].lower() if "." in path else ""
                if ext in CODE_EXTENSIONS and path not in selected:
                    selected.append(path)
                    if len(selected) >= 10:
                        break

        return selected[:MAX_FILES_TO_INSPECT]

    async def run(
        self,
        owner: str,
        repo: str,
        features: List[FeatureSpec],
        tree_items: List[Dict[str, Any]],
        cached_files: Optional[Dict[str, str]] = None,
    ) -> Tuple[List[CoverageFeature], Dict[str, str]]:
        """
        Fetches relevant files, analyzes feature presence, and extracts concrete evidence citations.
        Returns: (List[CoverageFeature], fetched_files_dict)
        """
        selected_paths = self.select_files_to_inspect(features, tree_items)
        fetched_files: Dict[str, str] = dict(cached_files or {})

        # Fetch files not yet in cache
        for path in selected_paths:
            if path not in fetched_files:
                file_res = await github_file(owner, repo, path, client=self.client)
                if file_res.success and isinstance(file_res.data, str):
                    fetched_files[path] = file_res.data

        coverage_features: List[CoverageFeature] = []

        # Analyze each feature against fetched file contents
        for feat in features:
            search_terms = [kw.lower() for kw in feat.keywords] + [feat.label.lower()]
            found_evidence: List[Evidence] = []
            status = "missing"
            match_count = 0

            for path, content in fetched_files.items():
                # Defend against prompt injection inside untrusted file content
                injections = detect_suspicious_patterns(content)
                if injections:
                    # File contains hostile injection strings; do not obey them
                    pass

                content_lower = content.lower()
                lines = content.splitlines()

                for line_idx, line in enumerate(lines, start=1):
                    line_lower = line.lower()
                    for term in search_terms:
                        if term in line_lower:
                            snippet = line.strip()
                            if len(snippet) > 180:
                                snippet = snippet[:177] + "..."
                            found_evidence.append(
                                Evidence(
                                    path=path,
                                    lineRange=f"{line_idx}-{line_idx}",
                                    snippet=snippet,
                                    verified=False,  # Verifier will confirm
                                )
                            )
                            match_count += 1
                            break
                    if len(found_evidence) >= 3:
                        break
                if len(found_evidence) >= 3:
                    break

            if match_count >= 2:
                status = "present"
                explanation = f"Implemented across {len({e.path for e in found_evidence})} files with matched keywords."
            elif match_count == 1:
                status = "partial"
                explanation = f"Partial implementation or interface definitions found in '{found_evidence[0].path}'."
            else:
                status = "missing"
                explanation = "No matching modules, classes, or endpoints found in inspected repository files."

            coverage_features.append(
                CoverageFeature(
                    featureId=feat.id,
                    label=feat.label,
                    priority=feat.priority,
                    status=status,
                    evidence=found_evidence,
                    explanation=explanation,
                )
            )

        return coverage_features, fetched_files
