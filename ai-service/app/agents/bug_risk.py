"""
RepoRevive – Bug Risk Analyst Agent
Audits verifiable bug signals: open bug issues, CI conclusion, static lint errors, and TODO density.
"""

from typing import Dict, List, Tuple
from app.schemas.analysis import BugRiskResult, Finding, Evidence, RepoFacts
from app.tools.static_lint import static_lint
from app.scoring import compute_bug_risk


class BugRiskAnalyst:
    def __init__(self):
        pass

    def run(
        self,
        facts: RepoFacts,
        fetched_files: Dict[str, str],
    ) -> Tuple[BugRiskResult, float, List[Finding]]:
        """
        Runs fixed-config static linter, counts TODO markers, and computes bug risk penalty and score.
        Returns: (BugRiskResult, subScore, findings)
        """
        findings: List[Finding] = []

        # 1. Run static lint on fetched code files
        lint_res = static_lint(fetched_files)
        lint_data = lint_res.data or {}
        lint_errors_per_1k = float(lint_data.get("errorsPer1k", 0.0))
        top_rules = lint_data.get("topRuleIds", [])

        if lint_errors_per_1k > 0:
            top_rule_str = ", ".join(top_rules[:3]) if top_rules else "Syntax/Style errors"
            findings.append(
                Finding(
                    agent="bug_risk",
                    claim=f"Static lint check detected {lint_errors_per_1k} errors/1k lines ({top_rule_str}).",
                    severity="medium" if lint_errors_per_1k > 15 else "low",
                )
            )

        # 2. Count TODO / FIXME comments
        total_lines = 0
        todo_count = 0
        todo_evidence: List[Evidence] = []

        for path, content in fetched_files.items():
            lines = content.splitlines()
            total_lines += max(1, len(lines))
            for idx, line in enumerate(lines, start=1):
                upper_line = line.upper()
                if "TODO" in upper_line or "FIXME" in upper_line or "HACK" in upper_line:
                    todo_count += 1
                    if len(todo_evidence) < 3:
                        todo_evidence.append(
                            Evidence(
                                path=path,
                                lineRange=f"{idx}-{idx}",
                                snippet=line.strip()[:180],
                            )
                        )

        todo_per_1k = round((todo_count / max(1, total_lines)) * 1000.0, 2)
        if todo_count > 0:
            findings.append(
                Finding(
                    agent="bug_risk",
                    claim=f"Detected {todo_count} TODO/FIXME markers ({todo_per_1k} per 1k lines).",
                    severity="low",
                    evidence=todo_evidence,
                )
            )

        # 3. Open bug issues
        if facts.openBugIssues > 0:
            findings.append(
                Finding(
                    agent="bug_risk",
                    claim=f"Repository has {facts.openBugIssues} open bug-labeled issues.",
                    severity="high" if facts.openBugIssues >= 5 else "medium",
                )
            )

        # 4. CI status
        if facts.lastCiConclusion in ["failure", "timed_out", "action_required"]:
            findings.append(
                Finding(
                    agent="bug_risk",
                    claim=f"Most recent automated CI workflow run resulted in '{facts.lastCiConclusion}'.",
                    severity="high",
                )
            )

        # 5. Compute deterministic bug risk score
        bug_result, sub_score = compute_bug_risk(
            open_bugs=facts.openBugIssues,
            lint_errors_per_1k=lint_errors_per_1k,
            ci_conclusion=facts.lastCiConclusion,
            todo_per_1k=todo_per_1k,
        )

        return bug_result, sub_score, findings
