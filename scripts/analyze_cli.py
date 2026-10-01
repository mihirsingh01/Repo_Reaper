#!/usr/bin/env python3
"""
RepoRevive – CLI Analysis Runner
Usage:
  python scripts/analyze_cli.py owner/repo --idea data/samples.json#3
  python scripts/analyze_cli.py owner/repo --raw "An app for booking tennis courts..."
"""

import sys
import os
import json
import argparse
import asyncio
from pathlib import Path

# Add ai-service to sys.path so we can import app modules directly
ROOT_DIR = Path(__file__).parent.parent.resolve()
AI_SERVICE_DIR = ROOT_DIR / "ai-service"
sys.path.insert(0, str(AI_SERVICE_DIR))

from app.schemas.idea import FeatureSpec
from app.ideas.refiner import IdeaRefiner
from app.llm.mock_provider import MockProvider
from app.agents.orchestrator import Orchestrator


def load_idea_from_samples(specifier: str) -> str:
    """Parses 'path/to/samples.json#3' or returns default raw idea."""
    if "#" in specifier:
        file_path, idx_str = specifier.split("#", 1)
        target_path = Path(file_path)
        if not target_path.is_absolute():
            target_path = ROOT_DIR / file_path

        if target_path.exists():
            with open(target_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                ideas = data.get("ideas", [])
                try:
                    idx = int(idx_str) - 1
                    if 0 <= idx < len(ideas):
                        return ideas[idx]["rawText"]
                except ValueError:
                    for item in ideas:
                        if item.get("id") == idx_str:
                            return item["rawText"]

    # Fallback default
    return "A modern real-time inventory and order management system with barcode scanning and low-stock alerts."


async def run_cli(repo_full_name: str, idea_text: str, print_brief: bool = False):
    print("=" * 75)
    print(f" RepoRevive – Agentic Viability Analysis")
    print(f" Target Repository: {repo_full_name}")
    print("=" * 75)

    print("\n[Stage A] Refining founder idea into technical checklist...")
    refiner = IdeaRefiner(provider=MockProvider())
    idea_spec = await refiner.refine(idea_text)
    print(f"  Summary: {idea_spec.summary}")
    print(f"  Features ({len(idea_spec.features)}):")
    for feat in idea_spec.features:
        print(f"    - [{feat.priority.upper()}] {feat.label} (keywords: {', '.join(feat.keywords)})")

    print("\n[Stage B] Running Multi-Agent Analysis Pipeline...")
    orchestrator = Orchestrator()
    report = await orchestrator.analyze(
        repo_full_name=repo_full_name,
        features=idea_spec.features,
    )

    print("\n" + "=" * 75)
    print(" ANALYSIS REPORT")
    print("=" * 75)
    print(f"Status:       {report.status.upper()}")
    if report.error:
        print(f"Error:        {report.error}")

    if report.facts:
        f = report.facts
        print(f"\nRepository Facts:")
        print(f"  Branch:       {f.defaultBranch} | Stars: {f.stars} | Files in Tree: {f.treeFileCount}")
        print(f"  Commits:      {f.commitCount} | Contributors: {f.contributorCount}")
        print(f"  Language:     {f.language} | License SPDX: {f.licenseSpdx or 'None'}")
        print(f"  Open Bugs:    {f.openBugIssues} | Last CI: {f.lastCiConclusion or 'None'}")

    if report.viability is not None:
        print(f"\nViability & Verdict:")
        print(f"  Viability Score:  {report.viability}/100")
        print(f"  Confidence:       {int((report.confidence or 0.0) * 100)}%")
        print(f"  Verdict:          '{report.verdict}'")
        if report.flags:
            print(f"  Flags:            {', '.join(report.flags)}")

    if report.coverage:
        print(f"\nFeature Coverage (Deterministic Score: {report.coverage.score}/100):")
        for cf in report.coverage.features:
            ev_str = f"({len(cf.evidence)} verified citations)" if cf.evidence else "(No evidence)"
            print(f"  [{cf.status.upper():<7}] {cf.label:<32} {ev_str}")
            for ev in cf.evidence[:1]:
                print(f"            └─ {ev.path}: \"{ev.snippet[:80]}...\"")

    if report.subScores:
        s = report.subScores
        print(f"\nViability Sub-Scores breakdown:")
        print(f"  Structure: {s.structure}/15 | Bug Risk: {s.bugRisk}/20 | Deps: {s.deps}/15")
        print(f"  Docs: {s.docs}/10 | License: {s.license}/15 | History: {s.history}/10 | Tests: {s.tests}/15")

    if report.revivalPlan:
        rp = report.revivalPlan
        print(f"\nRevival Roadmap & Effort:")
        print(f"  Estimated Effort: {rp.effortHours['min']} - {rp.effortHours['max']} hours")
        print(f"  Gaps Identified:  {len(rp.gaps)}")
        for step in rp.steps:
            print(f"    Step {step.order}: {step.title} (~{step.effortHours} hrs)")

    if report.trace:
        total_ms = sum(t.latencyMs for t in report.trace)
        print(f"\nTelemetry & Execution Trace:")
        print(f"  Total Steps:      {len(report.trace)}")
        print(f"  Total Latency:    {round(total_ms / 1000, 2)}s")
        print(f"  Token Usage:      {report.tokenUsage.get('totalTokens', 0)} tokens")

    if print_brief and report.founderBrief:
        print("\n" + "=" * 75)
        print(" FOUNDER TECHNICAL BRIEF (MARKDOWN)")
        print("=" * 75)
        print(report.founderBrief)

    print("=" * 75)


def main():
    parser = argparse.ArgumentParser(description="RepoRevive Multi-Agent Viability Analysis CLI")
    parser.add_argument("repo", help="Target repository in owner/repo format")
    parser.add_argument("--idea", default="data/samples.json#1", help="Sample idea selector (e.g. data/samples.json#3)")
    parser.add_argument("--raw", default=None, help="Raw idea text")
    parser.add_argument("--brief", action="store_true", help="Print full Markdown Founder Brief")

    args = parser.parse_args()

    idea_text = args.raw if args.raw else load_idea_from_samples(args.idea)
    asyncio.run(run_cli(args.repo, idea_text, print_brief=args.brief))


if __name__ == "__main__":
    main()
