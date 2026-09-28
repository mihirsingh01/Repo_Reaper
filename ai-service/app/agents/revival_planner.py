"""
RepoRevive – Revival Planner Agent
Synthesizes verified findings into a concrete technical revival roadmap,
effort estimate range in hours, and an executive Founder Brief in Markdown.
"""

from typing import List, Dict, Any, Tuple
from app.schemas.analysis import (
    RevivalPlan,
    RevivalPlanStep,
    CoverageFeature,
    RepoFacts,
    SubScores,
    Finding,
)


class RevivalPlanner:
    def __init__(self):
        pass

    def run(
        self,
        features: List[CoverageFeature],
        facts: RepoFacts,
        sub_scores: SubScores,
        flags: List[str],
        findings: List[Finding],
    ) -> Tuple[RevivalPlan, str]:
        """
        Generates structured RevivalPlan and executive Founder Brief Markdown.
        Returns: (RevivalPlan, founderBriefMarkdown)
        """
        # 1. Identify feature gaps (missing or partial)
        gaps: List[str] = []
        for feat in features:
            if feat.status == "missing":
                gaps.append(f"Missing (Must Build): {feat.label}")
            elif feat.status == "partial":
                gaps.append(f"Partial (Needs Completion): {feat.label}")

        # 2. Formulate ordered steps & effort hours
        steps: List[RevivalPlanStep] = []
        step_order = 1
        total_min_hours = 0.0
        total_max_hours = 0.0

        # Step 1: Environment & Dependency Upgrade
        step1_hrs = 8.0
        steps.append(
            RevivalPlanStep(
                order=step_order,
                title="Modernize Runtime & Upgrade Stale Dependencies",
                description="Update base language runtime, resolve deprecated packages, and patch security advisories.",
                effortHours=step1_hrs,
            )
        )
        total_min_hours += 6.0
        total_max_hours += 12.0
        step_order += 1

        # Step 2: Fix Build / Test Suite
        step2_hrs = 6.0
        steps.append(
            RevivalPlanStep(
                order=step_order,
                title="Verify Build & Re-establish Automated Tests",
                description="Establish passing local build, configure GitHub Actions workflow, and add baseline smoke tests.",
                effortHours=step2_hrs,
            )
        )
        total_min_hours += 4.0
        total_max_hours += 8.0
        step_order += 1

        # Steps for each missing or partial feature
        for feat in features:
            if feat.status == "missing":
                hrs = 16.0 if feat.priority == "must" else 8.0
                steps.append(
                    RevivalPlanStep(
                        order=step_order,
                        title=f"Implement Feature: {feat.label}",
                        description=f"Design schema, API endpoints, and core logic for '{feat.label}'.",
                        effortHours=hrs,
                    )
                )
                total_min_hours += hrs * 0.75
                total_max_hours += hrs * 1.5
                step_order += 1
            elif feat.status == "partial":
                hrs = 8.0
                steps.append(
                    RevivalPlanStep(
                        order=step_order,
                        title=f"Complete & Wire Feature: {feat.label}",
                        description=f"Finish partially implemented logic and connect to application flow.",
                        effortHours=hrs,
                    )
                )
                total_min_hours += 6.0
                total_max_hours += 12.0
                step_order += 1

        # Step Final: Deployment & Polishing
        steps.append(
            RevivalPlanStep(
                order=step_order,
                title="Deploy Baseline Staging Environment",
                description="Dockerize services, set up environment secrets, and perform end-to-end user verification.",
                effortHours=8.0,
            )
        )
        total_min_hours += 6.0
        total_max_hours += 10.0

        # 3. Risks
        risks: List[str] = []
        if "NO_LICENSE" in flags:
            risks.append("Legal Risk: Missing license prevents commercial exploitation without author permission.")
        if "CRITICAL_VULN" in flags:
            risks.append("Security Risk: Repository dependencies contain known unpatched critical CVEs.")
        if facts.commitCount < 30:
            risks.append("Maturity Risk: Repository has low commit volume; architecture may be premature.")
        if sub_scores.tests is not None and sub_scores.tests < 5.0:
            risks.append("Quality Risk: Very few or zero automated unit tests exist in codebase.")
        if not risks:
            risks.append("Maintenance Risk: Abandoned dependencies require modern runtime migration.")

        revival_plan = RevivalPlan(
            gaps=gaps,
            steps=steps,
            effortHours={
                "min": round(total_min_hours, 1),
                "max": round(total_max_hours, 1),
            },
            risks=risks,
        )

        # 4. Generate Founder Brief Markdown
        founder_brief = self._generate_founder_brief(facts, features, revival_plan, flags)
        return revival_plan, founder_brief

    def _generate_founder_brief(
        self,
        facts: RepoFacts,
        features: List[CoverageFeature],
        plan: RevivalPlan,
        flags: List[str],
    ) -> str:
        built = [f.label for f in features if f.status == "present"]
        partial = [f.label for f in features if f.status == "partial"]
        missing = [f.label for f in features if f.status == "missing"]

        brief = f"""# RepoRevive – Founder Technical Brief
**Target Repository:** [{facts.fullName}](https://github.com/{facts.fullName})
**Primary Language:** {facts.language or 'Multiple'} | **License:** {facts.licenseSpdx or 'None'}
**Estimated Effort Range:** {plan.effortHours['min']} - {plan.effortHours['max']} engineering hours

---

## 1. Executive Summary
This repository was identified and statically evaluated by the RepoRevive agent framework.
It provides an established open-source baseline for your software product idea, saving an estimated **{max(40, int(plan.effortHours['min'] * 1.5))} engineering hours** compared to building from scratch.

## 2. Feature Coverage Breakdown
- **Already Built & Verified ({len(built)}):** {', '.join(built) if built else 'None verified'}
- **Partially Built ({len(partial)}):** {', '.join(partial) if partial else 'None'}
- **Missing / Must Build ({len(missing)}):** {', '.join(missing) if missing else 'None'}

## 3. Recommended Revival Steps
"""
        for step in plan.steps:
            brief += f"{step.order}. **{step.title}** (~{step.effortHours} hrs)\n   {step.description}\n"

        brief += "\n## 4. Key Risks & Technical Cautions\n"
        for r in plan.risks:
            brief += f"- ⚠️ {r}\n"

        if flags:
            brief += f"\n**Noticeable Flags:** `{', '.join(flags)}`\n"

        brief += """
---
*Generated automatically by RepoRevive Agentic AI Framework. Static and read-only analysis.*
"""
        return brief.strip()
