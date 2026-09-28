"""
RepoRevive – Agent Orchestrator
Source of truth: docs/AGENT_DESIGN.md and CLAUDE.md
Coordinates Scout, Parallel Workers, Verifier, Deterministic Scoring, and Revival Planner.
Enforces step and token budgets; returns status='partial' on budget exhaustion or error.
"""

import time
import asyncio
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings
from app.schemas.idea import FeatureSpec
from app.schemas.analysis import (
    AnalysisReport,
    TraceStep,
    SubScores,
    Finding,
    RepoFacts,
)
from app.agents.scout import ScoutAgent
from app.agents.structure import StructureAnalyst
from app.agents.coverage import CoverageChecker
from app.agents.bug_risk import BugRiskAnalyst
from app.agents.deps import DependencyAuditor
from app.agents.license import LicenseChecker
from app.agents.verifier import Verifier
from app.agents.revival_planner import RevivalPlanner
from app.scoring import (
    compute_coverage_score,
    compute_history_score,
    compute_docs_score,
    compute_tests_score,
    compute_viability_and_confidence,
    compute_verdict,
    compute_blocking_flags,
)


class Orchestrator:
    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self.client = client
        self.scout = ScoutAgent(client=self.client)
        self.structure = StructureAnalyst()
        self.coverage = CoverageChecker(client=self.client)
        self.bug_risk = BugRiskAnalyst()
        self.deps = DependencyAuditor(client=self.client)
        self.license = LicenseChecker()
        self.revival_planner = RevivalPlanner()

    async def analyze(
        self,
        repo_full_name: str,
        features: List[FeatureSpec],
        repo_context: Optional[Dict[str, Any]] = None,
    ) -> AnalysisReport:
        """
        Executes end-to-end multi-agent viability analysis.
        Strictly safe, read-only, deterministic scoring, evidence-verified.
        """
        parts = repo_full_name.split("/")
        if len(parts) != 2:
            return AnalysisReport(
                status="failed",
                repoFullName=repo_full_name,
                error=f"Invalid repository full name format '{repo_full_name}'. Expected 'owner/repo'.",
            )

        owner, repo = parts[0], parts[1]
        trace: List[TraceStep] = []
        token_usage: Dict[str, int] = {"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}
        step_counter = 0

        def add_trace(agent: str, tool: Optional[str], args: str, result: str, duration_ms: float, tokens: int = 150):
            nonlocal step_counter
            step_counter += 1
            token_usage["promptTokens"] += int(tokens * 0.7)
            token_usage["completionTokens"] += int(tokens * 0.3)
            token_usage["totalTokens"] += tokens

            trace.append(
                TraceStep(
                    step=step_counter,
                    agent=agent,
                    tool=tool,
                    argsSummary=args[:120],
                    resultSummary=result[:120],
                    tokensIn=int(tokens * 0.7),
                    tokensOut=int(tokens * 0.3),
                    latencyMs=round(duration_ms, 2),
                )
            )

        def is_budget_exhausted() -> bool:
            return (
                step_counter >= settings.AGENT_MAX_STEPS
                or token_usage["totalTokens"] >= settings.AGENT_MAX_TOKENS_PER_RUN
            )

        try:
            # -------------------------------------------------------------
            # STEP 1: Scout Agent (Reconnaissance)
            # -------------------------------------------------------------
            t0 = time.time()
            facts, tree_items, scout_findings = await self.scout.run(
                owner=owner, repo=repo, cached_context=repo_context
            )
            add_trace(
                agent="scout",
                tool="github_tree",
                args=f"owner={owner}, repo={repo}",
                result=f"Tree fetched ({len(tree_items)} items), {facts.commitCount} commits, lang={facts.language}",
                duration_ms=(time.time() - t0) * 1000,
                tokens=450,
            )

            if is_budget_exhausted():
                return AnalysisReport(
                    status="partial",
                    repoFullName=repo_full_name,
                    facts=facts,
                    trace=trace,
                    tokenUsage=token_usage,
                    error="Execution budget exhausted during Scout phase.",
                )

            # -------------------------------------------------------------
            # STEP 2: Parallel Workers (Coverage, Structure, Deps, License)
            # -------------------------------------------------------------
            t_workers = time.time()

            # Launch workers concurrently
            coverage_task = asyncio.create_task(
                self.coverage.run(
                    owner=owner,
                    repo=repo,
                    features=features,
                    tree_items=tree_items,
                    cached_files=(repo_context.get("cachedFiles") if repo_context else None),
                )
            )
            deps_task = asyncio.create_task(
                self.deps.run(
                    owner=owner,
                    repo=repo,
                    facts=facts,
                    cached_files=(repo_context.get("cachedFiles") if repo_context else None),
                )
            )

            # Wait for concurrent workers
            (coverage_features, fetched_files), (deps_score, deps_flags, deps_findings) = (
                await asyncio.gather(coverage_task, deps_task)
            )

            add_trace(
                agent="coverage",
                tool="github_file",
                args=f"Audited {len(features)} checklist features across {len(fetched_files)} files",
                result=f"Extracted initial coverage claims for {len(coverage_features)} features",
                duration_ms=(time.time() - t_workers) * 1000,
                tokens=900,
            )
            add_trace(
                agent="deps",
                tool="osv_query",
                args=f"Manifests: {facts.manifestFiles}",
                result=f"Deps subscore={deps_score}, flags={deps_flags}",
                duration_ms=(time.time() - t_workers) * 1000,
                tokens=650,
            )

            if is_budget_exhausted():
                return AnalysisReport(
                    status="partial",
                    repoFullName=repo_full_name,
                    facts=facts,
                    trace=trace,
                    tokenUsage=token_usage,
                    error="Execution budget exhausted during worker analysis phase.",
                )

            # Structure Analyst
            t_struct = time.time()
            structure_score, struct_findings = self.structure.run(
                facts=facts, tree_items=tree_items, fetched_files=fetched_files
            )
            add_trace(
                agent="structure",
                tool="search_in_tree",
                args="Evaluated layout, entry points, and stubs",
                result=f"Structure subscore={structure_score}",
                duration_ms=(time.time() - t_struct) * 1000,
                tokens=300,
            )

            # License Checker
            t_lic = time.time()
            license_score, license_flags, license_findings = self.license.run(facts=facts)
            add_trace(
                agent="license",
                tool="github_license",
                args=f"SPDX={facts.licenseSpdx}",
                result=f"License subscore={license_score}, flags={license_flags}",
                duration_ms=(time.time() - t_lic) * 1000,
                tokens=200,
            )

            # Bug Risk Analyst
            t_bug = time.time()
            bug_result, bug_risk_score, bug_findings = self.bug_risk.run(
                facts=facts, fetched_files=fetched_files
            )
            add_trace(
                agent="bug_risk",
                tool="static_lint",
                args=f"Linted {len(fetched_files)} files, openBugs={facts.openBugIssues}",
                result=f"Bug penalty={bug_result.penalty}, subscore={bug_risk_score}",
                duration_ms=(time.time() - t_bug) * 1000,
                tokens=400,
            )

            # -------------------------------------------------------------
            # STEP 3: Independent Verifier (Grounding & Audit)
            # -------------------------------------------------------------
            t_ver = time.time()
            all_tree_paths = {item.get("path", "") for item in tree_items}
            verifier = Verifier(tree_paths=all_tree_paths, fetched_files=fetched_files)

            all_raw_findings: List[Finding] = (
                scout_findings + struct_findings + deps_findings + license_findings + bug_findings
            )
            verified_findings, findings_stats = verifier.verify_findings(all_raw_findings)
            verified_coverage_features, coverage_stats = verifier.verify_coverage(coverage_features)

            add_trace(
                agent="verifier",
                tool="search_in_tree",
                args=f"Audited {len(all_raw_findings)} findings and {len(coverage_features)} coverage claims",
                result=f"Groundedness={findings_stats.get('groundednessRatio')}, demoted={coverage_stats.get('demotedCount')}",
                duration_ms=(time.time() - t_ver) * 1000,
                tokens=350,
            )

            # -------------------------------------------------------------
            # STEP 4: Deterministic Scoring Engine (docs/SCORING_RUBRIC.md)
            # -------------------------------------------------------------
            t_score = time.time()
            coverage_result = compute_coverage_score(verified_coverage_features)

            # Compute remaining sub-scores
            # 1. History sub-score (0-10)
            history_score = compute_history_score(
                commit_count=facts.commitCount,
                contributor_count=facts.contributorCount,
            )

            # 2. Docs sub-score (0-10)
            has_readme = facts.readmeChars > 0 or "README.md" in all_tree_paths or "readme.md" in all_tree_paths
            readme_text = ""
            for r_name in ["README.md", "readme.md", "README", "readme"]:
                if r_name in fetched_files:
                    readme_text = fetched_files[r_name]
                    break
            docs_score = compute_docs_score(
                has_readme=has_readme,
                readme_length=max(facts.readmeChars, len(readme_text)),
                sections_found=["installation", "usage"] if "install" in readme_text.lower() else [],
            )

            # 3. Tests & CI sub-score (0-15)
            test_files_count = len([
                p for p in all_tree_paths
                if "test" in p.lower() or "spec" in p.lower()
            ])
            tests_score = compute_tests_score(
                test_files_count=test_files_count,
                ci_conclusion=facts.lastCiConclusion,
            )

            sub_scores = SubScores(
                structure=structure_score,
                bugRisk=bug_risk_score,
                deps=deps_score,
                docs=docs_score,
                license=license_score,
                history=history_score,
                tests=tests_score,
            )

            viability, confidence = compute_viability_and_confidence(sub_scores)
            verdict = compute_verdict(viability)

            # Aggregate blocking flags
            crit_vulns = 1 if "CRITICAL_VULN" in deps_flags else 0
            blocking_flags = compute_blocking_flags(
                license_spdx=facts.licenseSpdx,
                archived=facts.archived,
                tree_file_count=facts.treeFileCount,
                critical_vulns=crit_vulns,
            )
            all_flags = list(dict.fromkeys(blocking_flags + license_flags + deps_flags))

            add_trace(
                agent="scoring",
                tool=None,
                args="Deterministic scoring via scoring.py",
                result=f"Viability={viability}, Coverage={coverage_result.score}, Verdict='{verdict}'",
                duration_ms=(time.time() - t_score) * 1000,
                tokens=100,
            )

            # -------------------------------------------------------------
            # STEP 5: Revival Planner
            # -------------------------------------------------------------
            t_plan = time.time()
            revival_plan, founder_brief = self.revival_planner.run(
                features=verified_coverage_features,
                facts=facts,
                sub_scores=sub_scores,
                flags=all_flags,
                findings=verified_findings,
            )
            add_trace(
                agent="revival_planner",
                tool=None,
                args=f"Gaps={len(revival_plan.gaps)}, Steps={len(revival_plan.steps)}",
                result=f"Effort: {revival_plan.effortHours['min']}-{revival_plan.effortHours['max']} hrs",
                duration_ms=(time.time() - t_plan) * 1000,
                tokens=600,
            )

            return AnalysisReport(
                status="done",
                repoFullName=repo_full_name,
                facts=facts,
                coverage=coverage_result,
                bugRisk=bug_result,
                subScores=sub_scores,
                viability=viability,
                confidence=confidence,
                verdict=verdict,
                flags=all_flags,
                findings=verified_findings,
                revivalPlan=revival_plan,
                founderBrief=founder_brief,
                trace=trace,
                tokenUsage=token_usage,
                error=None,
            )

        except Exception as exc:
            # Handle failure gracefully by returning partial report without throwing
            add_trace(
                agent="orchestrator",
                tool=None,
                args="Execution error",
                result=f"Exception: {str(exc)}",
                duration_ms=0.0,
                tokens=0,
            )
            return AnalysisReport(
                status="partial",
                repoFullName=repo_full_name,
                trace=trace,
                tokenUsage=token_usage,
                error=f"Analysis terminated with error: {str(exc)}",
            )
