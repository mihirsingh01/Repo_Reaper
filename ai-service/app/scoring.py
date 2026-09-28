"""
RepoRevive – Deterministic Scoring Engine
Source of truth: docs/SCORING_RUBRIC.md

Every score and penalty is computed deterministically in code.
LLMs extract facts, plan, and summarize; they NEVER generate numerical scores.
"""

from typing import List, Dict, Tuple, Optional, Set
from app.schemas.analysis import (
    CoverageFeature,
    CoverageResult,
    BugRiskResult,
    SubScores,
    RepoFacts,
)

SUB_SCORE_MAX_POINTS: Dict[str, float] = {
    "structure": 15.0,
    "bugRisk": 20.0,
    "deps": 15.0,
    "docs": 10.0,
    "license": 15.0,
    "history": 10.0,
    "tests": 15.0,
}

PERMISSIVE_LICENSES: Set[str] = {
    "mit",
    "apache-2.0",
    "bsd-2-clause",
    "bsd-3-clause",
    "isc",
    "unlicense",
    "cc0-1.0",
}

WEAK_COPYLEFT_LICENSES: Set[str] = {
    "lgpl-2.1",
    "lgpl-3.0",
    "mpl-2.0",
    "epl-2.0",
}

STRONG_COPYLEFT_LICENSES: Set[str] = {
    "gpl-2.0",
    "gpl-3.0",
    "agpl-3.0",
    "eupl-1.2",
}


def compute_coverage_score(features: List[CoverageFeature]) -> CoverageResult:
    """
    Computes deterministic feature coverage score (0.0 to 100.0).
    Must-have weight W_i = 2, Nice-to-have weight W_i = 1.
    Status points: present = 1.0, partial = 0.5, missing = 0.0.
    """
    if not features:
        return CoverageResult(score=0.0, features=[])

    total_weight = 0.0
    weighted_points = 0.0

    for feat in features:
        weight = 2.0 if feat.priority == "must" else 1.0
        total_weight += weight

        if feat.status == "present":
            points = 1.0
        elif feat.status == "partial":
            points = 0.5
        else:
            points = 0.0

        weighted_points += weight * points

    if total_weight == 0.0:
        score = 0.0
    else:
        score = round(100.0 * (weighted_points / total_weight), 2)

    return CoverageResult(score=score, features=features)


def compute_structure_score(
    entry_points_found: bool,
    has_standard_layout: bool,
    stub_ratio: float,
) -> float:
    """
    Evaluates repository structure (Max 15.0 points).
    - Entry points detected: +8 pts
    - Standard directory layout: +4 pts
    - Stub file ratio:
        < 0.10: +3.0 pts
        < 0.25: +1.5 pts
        >= 0.25: 0.0 pts
    """
    score = 0.0
    if entry_points_found:
        score += 8.0
    if has_standard_layout:
        score += 4.0

    if stub_ratio < 0.10:
        score += 3.0
    elif stub_ratio < 0.25:
        score += 1.5

    return min(15.0, max(0.0, round(score, 2)))


def compute_bug_risk(
    open_bugs: int,
    lint_errors_per_1k: float,
    ci_conclusion: Optional[str],
    todo_per_1k: float,
) -> Tuple[BugRiskResult, float]:
    """
    Evaluates bug risk penalty and sub-score (Max 20.0 points).
    Penalty calculation:
    - Open bug issues: min(5.0, open_bugs * 1.0)
    - Lint errors / 1k lines: min(6.0, lint_errors_per_1k * 0.2)
    - CI failure:
        failure/timed_out: 5.0
        cancelled: 2.0
        null/unknown: 1.0
        success: 0.0
    - TODO / FIXME per 1k lines:
        > 20: 4.0
        > 10: 2.0
        > 5: 1.0
        <= 5: 0.0
    Returns: (BugRiskResult, subScore)
    """
    penalties = 0.0

    # 1. Bug issues penalty (max 5.0)
    bug_penalty = min(5.0, max(0, open_bugs) * 1.0)
    penalties += bug_penalty

    # 2. Lint errors penalty (max 6.0)
    lint_penalty = min(6.0, max(0.0, lint_errors_per_1k) * 0.2)
    penalties += lint_penalty

    # 3. CI status penalty (max 5.0)
    if ci_conclusion in ["failure", "timed_out", "action_required"]:
        ci_penalty = 5.0
    elif ci_conclusion == "cancelled":
        ci_penalty = 2.0
    elif ci_conclusion == "success":
        ci_penalty = 0.0
    else:
        ci_penalty = 1.0
    penalties += ci_penalty

    # 4. TODO density penalty (max 4.0)
    if todo_per_1k > 20.0:
        todo_penalty = 4.0
    elif todo_per_1k > 10.0:
        todo_penalty = 2.0
    elif todo_per_1k > 5.0:
        todo_penalty = 1.0
    else:
        todo_penalty = 0.0
    penalties += todo_penalty

    total_penalty = min(20.0, round(penalties, 2))
    sub_score = round(max(0.0, 20.0 - total_penalty), 2)

    result = BugRiskResult(
        penalty=total_penalty,
        openBugs=open_bugs,
        lintErrorsPer1k=round(lint_errors_per_1k, 2),
        ciConclusion=ci_conclusion,
        todoPer1k=round(todo_per_1k, 2),
    )
    return result, sub_score


def compute_deps_score(
    total_deps: int,
    outdated_deps: int,
    critical_vulns: int,
    high_vulns: int,
) -> Tuple[float, List[str]]:
    """
    Evaluates dependency health (Max 15.0 points).
    Critical CVEs zero out the score and emit CRITICAL_VULN flag.
    High CVEs subtract 3 pts each.
    """
    flags: List[str] = []
    if critical_vulns > 0:
        flags.append("CRITICAL_VULN")
        return 0.0, flags

    if total_deps == 0:
        return 10.0, flags  # Standard default if no package manifest

    modern_ratio = max(0.0, 1.0 - (outdated_deps / max(1, total_deps)))
    base_score = 15.0 * modern_ratio
    high_penalty = high_vulns * 3.0
    final_score = max(0.0, base_score - high_penalty)
    return round(min(15.0, final_score), 2), flags


def compute_docs_score(
    has_readme: bool,
    readme_length: int,
    sections_found: List[str],
) -> float:
    """
    Evaluates repository documentation (Max 10.0 points).
    - Has README: +4.0 pts
    - Length >= 500: +2.0 pts, >= 1500: +3.0 pts
    - Setup / Installation section: +1.0 pt
    - Usage section: +1.0 pt
    - Architecture / API / Contributing section: +1.0 pt
    """
    if not has_readme:
        return 0.0

    score = 4.0
    if readme_length >= 1500:
        score += 3.0
    elif readme_length >= 500:
        score += 2.0

    sections_lower = [s.lower() for s in sections_found]
    if any(s in sections_lower for s in ["install", "installation", "setup"]):
        score += 1.0
    if any(s in sections_lower for s in ["usage", "getting started", "example", "quickstart"]):
        score += 1.0
    if any(s in sections_lower for s in ["architecture", "api", "contributing", "design"]):
        score += 1.0

    return min(10.0, round(score, 2))


def compute_license_score(license_spdx: Optional[str]) -> Tuple[float, List[str]]:
    """
    Evaluates license reusability (Max 15.0 points).
    Permissive = 15.0
    Weak copyleft = 10.0
    Strong copyleft = 5.0
    No license / unknown = 0.0 (emits NO_LICENSE flag)
    """
    flags: List[str] = []
    if not license_spdx:
        flags.append("NO_LICENSE")
        return 0.0, flags

    clean_spdx = license_spdx.strip().lower()
    if clean_spdx in ["noassertion", "none", "unknown", ""]:
        flags.append("NO_LICENSE")
        return 0.0, flags

    if clean_spdx in PERMISSIVE_LICENSES:
        return 15.0, flags
    elif clean_spdx in WEAK_COPYLEFT_LICENSES:
        return 10.0, flags
    elif clean_spdx in STRONG_COPYLEFT_LICENSES:
        return 5.0, flags
    else:
        # Recognized other open-source or custom license
        return 5.0, flags


def compute_history_score(commit_count: int, contributor_count: int) -> float:
    """
    Evaluates repository commit and community history (Max 10.0 points).
    Commit points:
        >= 100: 5.0
        >= 50: 4.0
        >= 30: 3.0
        < 30: 0.0
    Contributor points:
        >= 5: 5.0
        >= 2: 3.0
        == 1: 1.0
        == 0: 0.0
    """
    score = 0.0
    if commit_count >= 100:
        score += 5.0
    elif commit_count >= 50:
        score += 4.0
    elif commit_count >= 30:
        score += 3.0

    if contributor_count >= 5:
        score += 5.0
    elif contributor_count >= 2:
        score += 3.0
    elif contributor_count == 1:
        score += 1.0

    return min(10.0, round(score, 2))


def compute_tests_score(test_files_count: int, ci_conclusion: Optional[str]) -> float:
    """
    Evaluates testing health and CI (Max 15.0 points).
    - Test files count:
        >= 5: +8.0 pts
        1 to 4: +5.0 pts
        0: 0.0 pts
    - CI status:
        success: +7.0 pts
        unknown/cancelled: +4.0 pts
        failure: +1.0 pt (at least CI was configured)
        no CI: 0.0 pts
    """
    score = 0.0
    if test_files_count >= 5:
        score += 8.0
    elif test_files_count >= 1:
        score += 5.0

    if ci_conclusion == "success":
        score += 7.0
    elif ci_conclusion in ["cancelled", "timed_out"]:
        score += 4.0
    elif ci_conclusion == "failure":
        score += 1.0
    elif ci_conclusion is not None:
        score += 4.0

    return min(15.0, round(score, 2))


def compute_viability_and_confidence(sub_scores: SubScores) -> Tuple[float, float]:
    """
    Re-normalizes viability score over known sub-scores if any are None/unknown.
    Viability = 100 * (sum(known points) / sum(max available points))
    Confidence = sum(max available points) / 100.0
    """
    score_dict = sub_scores.model_dump()
    sum_known = 0.0
    sum_available = 0.0

    for cat, max_pts in SUB_SCORE_MAX_POINTS.items():
        val = score_dict.get(cat)
        if val is not None:
            sum_known += val
            sum_available += max_pts

    if sum_available == 0.0:
        return 0.0, 0.0

    viability = round(100.0 * (sum_known / sum_available), 2)
    confidence = round(sum_available / 100.0, 2)
    return viability, confidence


def compute_verdict(viability: float) -> str:
    """
    Deterministic verdict based on viability:
    >= 75: "Ready to build on"
    50 - 74: "Usable with work"
    25 - 49: "Borrow parts only"
    < 25: "Not worth it"
    """
    if viability >= 75.0:
        return "Ready to build on"
    elif viability >= 50.0:
        return "Usable with work"
    elif viability >= 25.0:
        return "Borrow parts only"
    else:
        return "Not worth it"


def compute_blocking_flags(
    license_spdx: Optional[str],
    archived: bool,
    tree_file_count: int,
    critical_vulns: int,
) -> List[str]:
    """
    Flags that disqualify a repo from being the "Best Match".
    - NO_LICENSE
    - ARCHIVED
    - EMPTY_REPO
    - CRITICAL_VULN
    """
    flags: List[str] = []
    if not license_spdx or license_spdx.strip().lower() in ["noassertion", "none", "unknown", ""]:
        flags.append("NO_LICENSE")
    if archived:
        flags.append("ARCHIVED")
    if tree_file_count == 0:
        flags.append("EMPTY_REPO")
    if critical_vulns > 0:
        flags.append("CRITICAL_VULN")
    return list(dict.fromkeys(flags))  # Deduplicate preserving order


def compute_final_ranking_score(
    relevance: float,
    coverage: float,
    viability: float,
) -> float:
    """
    Final = 0.40 * Relevance + 0.30 * (Coverage / 100) + 0.30 * (Viability / 100)
    """
    rel = max(0.0, min(1.0, relevance))
    cov = max(0.0, min(100.0, coverage)) / 100.0
    viab = max(0.0, min(100.0, viability)) / 100.0

    score = (0.40 * rel) + (0.30 * cov) + (0.30 * viab)
    return round(score, 4)
