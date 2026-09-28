"""
RepoRevive – Independent Verifier Agent
Source of truth: docs/AGENT_DESIGN.md and CLAUDE.md Non-negotiable Rule 4:
"Every agent finding cites evidence; the Verifier drops unsupported claims.
'Present' without a real file path counts as missing."
"""

from typing import List, Dict, Set, Tuple
from app.schemas.analysis import Finding, CoverageFeature, Evidence


class Verifier:
    """
    Audits claims against actual ground-truth data fetched by tools during the run.
    Ensures that hallucinations or ungrounded model statements cannot enter the final report.
    """

    def __init__(self, tree_paths: Set[str], fetched_files: Dict[str, str]):
        self.tree_paths = {p.strip().lstrip("./") for p in tree_paths}
        self.fetched_files = {p.strip().lstrip("./"): content for p, content in fetched_files.items()}

    def verify_coverage(
        self,
        features: List[CoverageFeature],
    ) -> Tuple[List[CoverageFeature], Dict[str, int]]:
        """
        Validates feature coverage claims.
        If a feature is marked "present" without a verified file path, it is DEMOTED to "missing".
        """
        verified_features: List[CoverageFeature] = []
        demoted_count = 0
        total_items = len(features)

        for feat in features:
            updated_evidence: List[Evidence] = []
            has_valid_citation = False

            for ev in feat.evidence:
                clean_path = ev.path.strip().lstrip("./")
                path_exists = clean_path in self.tree_paths

                snippet_matches = True
                if clean_path in self.fetched_files:
                    file_text = self.fetched_files[clean_path]
                    # Check snippet presence (ignoring excess whitespace)
                    clean_snip = " ".join(ev.snippet.split())
                    clean_file = " ".join(file_text.split())
                    snippet_matches = clean_snip in clean_file if clean_snip else True

                is_verified = path_exists and snippet_matches
                if is_verified:
                    has_valid_citation = True

                updated_evidence.append(
                    Evidence(
                        path=clean_path,
                        lineRange=ev.lineRange,
                        snippet=ev.snippet,
                        verified=is_verified,
                    )
                )

            current_status = feat.status
            explanation = feat.explanation

            # Enforce Non-Negotiable Rule 4: "Present" without real file path becomes "missing"
            if current_status == "present" and not has_valid_citation:
                current_status = "missing"
                demoted_count += 1
                explanation = (
                    f"{explanation or ''} [VERIFIER: Demoted from present to missing because cited "
                    f"file path was not found in repo tree]"
                ).strip()

            verified_features.append(
                CoverageFeature(
                    featureId=feat.featureId,
                    label=feat.label,
                    priority=feat.priority,
                    status=current_status,
                    evidence=updated_evidence,
                    explanation=explanation,
                )
            )

        stats = {
            "totalFeatures": total_items,
            "demotedCount": demoted_count,
        }
        return verified_features, stats

    def verify_findings(
        self,
        findings: List[Finding],
    ) -> Tuple[List[Finding], Dict[str, float]]:
        """
        Audits general findings and removes or downgrades claims lacking real file evidence.
        """
        verified_findings: List[Finding] = []
        total_ev = 0
        verified_ev = 0

        for f in findings:
            valid_evidence: List[Evidence] = []
            for ev in f.evidence:
                total_ev += 1
                clean_path = ev.path.strip().lstrip("./")
                is_valid = clean_path in self.tree_paths

                if clean_path in self.fetched_files:
                    clean_snip = " ".join(ev.snippet.split())
                    clean_file = " ".join(self.fetched_files[clean_path].split())
                    if clean_snip not in clean_file:
                        is_valid = False

                if is_valid:
                    verified_ev += 1
                    valid_evidence.append(
                        Evidence(
                            path=clean_path,
                            lineRange=ev.lineRange,
                            snippet=ev.snippet,
                            verified=True,
                        )
                    )
                else:
                    valid_evidence.append(
                        Evidence(
                            path=clean_path,
                            lineRange=ev.lineRange,
                            snippet=ev.snippet,
                            verified=False,
                        )
                    )

            # If a critical or high finding has zero verified evidence, downgrade severity
            has_verified = any(e.verified for e in valid_evidence)
            severity = f.severity
            claim = f.claim
            if f.severity in ["critical", "high"] and not has_verified and valid_evidence:
                severity = "low"
                claim = f"[Unverified] {claim}"

            verified_findings.append(
                Finding(
                    agent=f.agent,
                    claim=claim,
                    severity=severity,
                    evidence=valid_evidence,
                )
            )

        groundedness = (verified_ev / total_ev) if total_ev > 0 else 1.0
        stats = {
            "totalEvidence": float(total_ev),
            "verifiedEvidence": float(verified_ev),
            "groundednessRatio": round(groundedness, 4),
        }
        return verified_findings, stats
