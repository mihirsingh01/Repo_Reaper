import pytest
from app.schemas.analysis import CoverageFeature, Finding, Evidence
from app.agents.verifier import Verifier


def test_verifier_demotes_unsupported_present_claim():
    tree_paths = {"src/index.js", "package.json", "README.md"}
    fetched_files = {
        "src/index.js": "const app = express();",
        "README.md": "# My Project\nRun npm start.",
    }

    verifier = Verifier(tree_paths=tree_paths, fetched_files=fetched_files)

    # Feature 1 has fake path not in tree -> MUST BE DEMOTED
    f1 = CoverageFeature(
        featureId="f1",
        label="Payment processing",
        priority="must",
        status="present",
        evidence=[Evidence(path="src/payments/stripe.js", snippet="stripe.charges.create()")],
    )

    # Feature 2 has valid path in tree and matching snippet -> KEPT
    f2 = CoverageFeature(
        featureId="f2",
        label="Web Server",
        priority="must",
        status="present",
        evidence=[Evidence(path="src/index.js", snippet="const app = express();")],
    )

    verified, stats = verifier.verify_coverage([f1, f2])

    assert stats["demotedCount"] == 1
    assert verified[0].status == "missing"
    assert "DEMOTED" in verified[0].explanation
    assert verified[1].status == "present"
    assert verified[1].evidence[0].verified is True


def test_verifier_groundedness_ratio():
    tree_paths = {"README.md"}
    fetched_files = {"README.md": "# Title"}

    verifier = Verifier(tree_paths=tree_paths, fetched_files=fetched_files)

    findings = [
        Finding(
            agent="scout",
            claim="Readme exists",
            severity="info",
            evidence=[Evidence(path="README.md", snippet="# Title")],
        ),
        Finding(
            agent="bug_risk",
            claim="Security exploit found",
            severity="critical",
            evidence=[Evidence(path="nonexistent/exploit.py", snippet="os.system()")],
        ),
    ]

    verified_findings, stats = verifier.verify_findings(findings)

    # Second finding should be downgraded because evidence was ungrounded
    assert verified_findings[1].severity == "low"
    assert verified_findings[1].evidence[0].verified is False
    assert stats["verifiedEvidence"] == 1.0
    assert stats["totalEvidence"] == 2.0
    assert stats["groundednessRatio"] == 0.5
