import json
from pathlib import Path
import pytest
from app.schemas.idea import FeatureSpec
from app.agents.orchestrator import Orchestrator


@pytest.mark.asyncio
async def test_golden_fixture_analysis():
    fixture_path = Path(__file__).parent / "fixtures" / "sample_repo.json"
    assert fixture_path.exists(), "Golden fixture file must exist"

    with open(fixture_path, "r", encoding="utf-8") as f:
        repo_data = json.load(f)

    checklist = [
        FeatureSpec(
            id="f1",
            label="Inventory SKU Tracking",
            plainDescription="Track product quantities by SKU",
            keywords=["inventory", "stock", "sku"],
            priority="must",
        ),
        FeatureSpec(
            id="f2",
            label="Secure JWT Authentication",
            plainDescription="Authenticate API calls using tokens",
            keywords=["jwt", "auth", "token"],
            priority="must",
        ),
        FeatureSpec(
            id="f3",
            label="Multi-tenant Billing",
            plainDescription="Stripe subscription billing per tenant",
            keywords=["billing", "stripe", "subscription"],
            priority="nice",
        ),
    ]

    orchestrator = Orchestrator()
    report = await orchestrator.analyze(
        repo_full_name=repo_data["fullName"],
        features=checklist,
        repo_context=repo_data,
    )

    # Assert status and core facts
    assert report.status == "done"
    assert report.repoFullName == "shoptrack/inventory-lite"
    assert report.facts.language == "JavaScript"
    assert report.facts.licenseSpdx == "MIT"
    assert report.facts.commitCount == 68

    # Assert coverage
    assert report.coverage is not None
    # f1 and f2 should be present, f3 missing
    f_map = {feat.featureId: feat for feat in report.coverage.features}
    assert f_map["f1"].status == "present"
    assert f_map["f2"].status == "present"
    assert f_map["f3"].status == "missing"

    # Score: (2 * 1.0 + 2 * 1.0 + 1 * 0.0) / 5.0 = 4.0 / 5.0 = 80.0%
    assert report.coverage.score == 80.0

    # Viability sub-scores
    assert report.subScores is not None
    assert report.subScores.license == 15.0  # MIT permissive
    assert report.subScores.structure > 0.0
    assert report.subScores.docs > 0.0
    assert report.subScores.history > 0.0
    assert report.subScores.tests > 0.0
    assert report.subScores.bugRisk > 0.0

    # Viability & Verdict
    assert report.viability is not None and report.viability > 50.0
    assert report.verdict in ["Ready to build on", "Usable with work"]

    # Revival plan and brief
    assert report.revivalPlan is not None
    assert len(report.revivalPlan.gaps) >= 1
    assert "Multi-tenant Billing" in report.revivalPlan.gaps[0]
    assert report.revivalPlan.effortHours["min"] > 0
    assert report.revivalPlan.effortHours["max"] > report.revivalPlan.effortHours["min"]

    assert report.founderBrief is not None
    assert "shoptrack/inventory-lite" in report.founderBrief
    assert "Executive Summary" in report.founderBrief

    # Trace telemetry
    assert len(report.trace) >= 5
    assert report.tokenUsage["totalTokens"] > 0
