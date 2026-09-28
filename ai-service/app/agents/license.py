"""
RepoRevive – License Checker Agent
Audits repository license reusability and flags copyleft or missing licenses.
"""

from typing import List, Tuple, Optional
from app.schemas.analysis import Finding, Evidence, RepoFacts
from app.scoring import compute_license_score


class LicenseChecker:
    def __init__(self):
        pass

    def run(self, facts: RepoFacts) -> Tuple[float, List[str], List[Finding]]:
        """
        Computes license subscore (0-15), blocking flags, and plain English explanation.
        Returns: (subScore, flags, findings)
        """
        findings: List[Finding] = []
        spdx = facts.licenseSpdx

        score, flags = compute_license_score(spdx)

        if "NO_LICENSE" in flags:
            findings.append(
                Finding(
                    agent="license",
                    claim="No valid open-source license found. All rights reserved by default; commercial use is blocked.",
                    severity="critical",
                )
            )
        elif score == 15.0:
            findings.append(
                Finding(
                    agent="license",
                    claim=f"Permissive license '{spdx}' detected. Safe for commercial reuse and proprietary modification.",
                    severity="info",
                )
            )
        elif score == 10.0:
            findings.append(
                Finding(
                    agent="license",
                    claim=f"Weak copyleft license '{spdx}' detected. Modifications to library files must be published.",
                    severity="medium",
                )
            )
        else:
            findings.append(
                Finding(
                    agent="license",
                    claim=f"Strong copyleft license '{spdx}' detected. Derivative works must be licensed under the same copyleft terms.",
                    severity="high",
                )
            )

        return score, flags, findings
