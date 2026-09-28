"""
RepoRevive – Structure Analyst Agent
Evaluates repository architecture, entry points, layout, and stub file ratios.
"""

from typing import List, Dict, Any, Tuple
from app.schemas.analysis import Finding, Evidence, RepoFacts
from app.scoring import compute_structure_score


class StructureAnalyst:
    def __init__(self):
        pass

    def run(
        self,
        facts: RepoFacts,
        tree_items: List[Dict[str, Any]],
        fetched_files: Dict[str, str],
    ) -> Tuple[float, List[Finding]]:
        """
        Computes structure subscore (0-15) and structured findings with evidence.
        """
        findings: List[Finding] = []
        paths = [item.get("path", "") for item in tree_items]

        # 1. Entry points
        entry_points_found = len(facts.entryPoints) > 0
        if entry_points_found:
            first_ep = facts.entryPoints[0]
            findings.append(
                Finding(
                    agent="structure",
                    claim=f"Primary application entry point identified at '{first_ep}'.",
                    severity="info",
                    evidence=[Evidence(path=first_ep, snippet="Entry point detected in tree")],
                )
            )
        else:
            findings.append(
                Finding(
                    agent="structure",
                    claim="No standard top-level entry point (main.py, index.js, etc.) found in repo.",
                    severity="medium",
                )
            )

        # 2. Standard layout
        has_standard_layout = any(
            p.startswith(("src/", "lib/", "app/", "pkg/", "cmd/")) for p in paths
        )
        if has_standard_layout:
            findings.append(
                Finding(
                    agent="structure",
                    claim="Repository adopts standard modular directory conventions (src/lib/app).",
                    severity="info",
                )
            )

        # 3. Stub file ratio (files with < 50 bytes or empty)
        blobs = [item for item in tree_items if item.get("type") == "blob"]
        total_blobs = max(1, len(blobs))
        stub_blobs = [item for item in blobs if item.get("size", 1000) < 50]
        stub_ratio = len(stub_blobs) / total_blobs

        if stub_ratio > 0.25:
            findings.append(
                Finding(
                    agent="structure",
                    claim=f"High proportion ({round(stub_ratio * 100, 1)}%) of stub or empty placeholder files.",
                    severity="medium",
                )
            )

        score = compute_structure_score(
            entry_points_found=entry_points_found,
            has_standard_layout=has_standard_layout,
            stub_ratio=stub_ratio,
        )

        return score, findings
