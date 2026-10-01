import pytest
from app.schemas.analysis import CoverageFeature, SubScores
from app.scoring import (
    compute_coverage_score,
    compute_structure_score,
    compute_bug_risk,
    compute_deps_score,
    compute_docs_score,
    compute_license_score,
    compute_history_score,
    compute_tests_score,
    compute_viability_and_confidence,
    compute_verdict,
    compute_blocking_flags,
    compute_final_ranking_score,
)


def test_coverage_score_weights_and_status():
    # Must=2, Nice=1.
    # Feature 1 (must, present): 2 * 1.0 = 2.0
    # Feature 2 (must, partial): 2 * 0.5 = 1.0
    # Feature 3 (nice, missing): 1 * 0.0 = 0.0
    # Total points = 3.0 / 5.0 = 60.0%
    features = [
        CoverageFeature(featureId="f1", label="Auth", priority="must", status="present"),
        CoverageFeature(featureId="f2", label="Billing", priority="must", status="partial"),
        CoverageFeature(featureId="f3", label="DarkMode", priority="nice", status="missing"),
    ]
    result = compute_coverage_score(features)
    assert result.score == 60.0
    assert len(result.features) == 3


def test_coverage_score_empty():
    result = compute_coverage_score([])
    assert result.score == 0.0


def test_structure_score():
    # All present, low stub ratio
    score = compute_structure_score(entry_points_found=True, has_standard_layout=True, stub_ratio=0.05)
    assert score == 15.0

    # No entry points, moderate stub ratio
    score_mid = compute_structure_score(entry_points_found=False, has_standard_layout=True, stub_ratio=0.15)
    assert score_mid == 4.0 + 1.5  # 5.5

    # High stub ratio
    score_low = compute_structure_score(entry_points_found=False, has_standard_layout=False, stub_ratio=0.40)
    assert score_low == 0.0


def test_bug_risk_score_and_penalty():
    # 0 bugs, 0 lint, success CI, 0 todo
    result, sub_score = compute_bug_risk(
        open_bugs=0, lint_errors_per_1k=0.0, ci_conclusion="success", todo_per_1k=0.0
    )
    assert result.penalty == 0.0
    assert sub_score == 20.0

    # Failing CI (5) + 3 bugs (3) + 20 lint (4) + 12 todo (2) = 14 penalty -> score 6.0
    res2, sub2 = compute_bug_risk(
        open_bugs=3, lint_errors_per_1k=20.0, ci_conclusion="failure", todo_per_1k=12.0
    )
    assert res2.penalty == 14.0
    assert sub2 == 6.0


def test_deps_score():
    # Clean dependencies
    score, flags = compute_deps_score(total_deps=10, outdated_deps=0, critical_vulns=0, high_vulns=0)
    assert score == 15.0
    assert flags == []

    # Critical vulnerability triggers 0 score and CRITICAL_VULN flag
    score_crit, flags_crit = compute_deps_score(total_deps=10, outdated_deps=1, critical_vulns=1, high_vulns=0)
    assert score_crit == 0.0
    assert "CRITICAL_VULN" in flags_crit

    # Outdated ratio and high vulnerability penalty
    score_out, _ = compute_deps_score(total_deps=10, outdated_deps=5, critical_vulns=0, high_vulns=1)
    # modern ratio = 0.5 -> 7.5 base - 3.0 high vuln = 4.5
    assert score_out == 4.5


def test_docs_score():
    score_full = compute_docs_score(
        has_readme=True,
        readme_length=2000,
        sections_found=["Installation", "Usage", "Architecture"],
    )
    assert score_full == 10.0

    score_empty = compute_docs_score(has_readme=False, readme_length=0, sections_found=[])
    assert score_empty == 0.0


def test_license_score():
    # Permissive
    score, flags = compute_license_score("MIT")
    assert score == 15.0
    assert flags == []

    # Weak copyleft
    score_weak, _ = compute_license_score("MPL-2.0")
    assert score_weak == 10.0

    # Strong copyleft
    score_strong, _ = compute_license_score("GPL-3.0")
    assert score_strong == 5.0

    # Missing / None
    score_none, flags_none = compute_license_score(None)
    assert score_none == 0.0
    assert "NO_LICENSE" in flags_none


def test_history_score():
    assert compute_history_score(commit_count=120, contributor_count=6) == 10.0
    assert compute_history_score(commit_count=35, contributor_count=1) == 4.0
    assert compute_history_score(commit_count=10, contributor_count=0) == 0.0


def test_tests_score():
    assert compute_tests_score(test_files_count=8, ci_conclusion="success") == 15.0
    assert compute_tests_score(test_files_count=2, ci_conclusion="failure") == 6.0
    assert compute_tests_score(test_files_count=0, ci_conclusion=None) == 0.0


def test_viability_renormalization_and_confidence():
    # Full known scores
    subs_full = SubScores(
        structure=15.0,
        bugRisk=20.0,
        deps=15.0,
        docs=10.0,
        license=15.0,
        history=10.0,
        tests=15.0,
    )
    viab, conf = compute_viability_and_confidence(subs_full)
    assert viab == 100.0
    assert conf == 1.0

    # Missing/unknown sub-scores: tests (15) and deps (15) are None -> 70 available max points
    # structure(15) + bugRisk(20) + docs(10) + license(15) + history(10) = 70.0
    subs_partial = SubScores(
        structure=15.0,
        bugRisk=20.0,
        deps=None,
        docs=10.0,
        license=15.0,
        history=10.0,
        tests=None,
    )
    viab_p, conf_p = compute_viability_and_confidence(subs_partial)
    assert viab_p == 100.0  # 70/70 = 100%
    assert conf_p == 0.70   # 70 / 100

    # All None
    subs_none = SubScores()
    viab_0, conf_0 = compute_viability_and_confidence(subs_none)
    assert viab_0 == 0.0
    assert conf_0 == 0.0


def test_verdict_categories():
    assert compute_verdict(80.0) == "Ready to build on"
    assert compute_verdict(65.0) == "Usable with work"
    assert compute_verdict(35.0) == "Borrow parts only"
    assert compute_verdict(15.0) == "Not worth it"


def test_blocking_flags():
    flags = compute_blocking_flags(
        license_spdx=None,
        archived=True,
        tree_file_count=0,
        critical_vulns=2,
    )
    assert "NO_LICENSE" in flags
    assert "ARCHIVED" in flags
    assert "EMPTY_REPO" in flags
    assert "CRITICAL_VULN" in flags


def test_final_ranking_score():
    # Final = 0.40 * Relevance + 0.30 * (Coverage/100) + 0.30 * (Viability/100)
    score = compute_final_ranking_score(relevance=0.8, coverage=90.0, viability=70.0)
    expected = (0.40 * 0.8) + (0.30 * 0.9) + (0.30 * 0.7)
    assert score == round(expected, 4)
