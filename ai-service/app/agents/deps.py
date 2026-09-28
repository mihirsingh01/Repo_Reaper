"""
RepoRevive – Dependency Auditor Agent
Audits package manifests (package.json, requirements.txt, pyproject.toml) and queries OSV.dev.
"""

import json
import re
from typing import Dict, List, Tuple, Optional
import httpx
from app.schemas.analysis import Finding, Evidence, RepoFacts
from app.tools.github import github_file
from app.tools.registries import registry_lookup, osv_query
from app.scoring import compute_deps_score


class DependencyAuditor:
    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self.client = client

    def parse_manifest(self, path: str, content: str) -> List[Tuple[str, Optional[str], str]]:
        """
        Parses manifest file and extracts (package_name, version, ecosystem).
        """
        deps: List[Tuple[str, Optional[str], str]] = []
        path_lower = path.lower()

        if path_lower.endswith("package.json"):
            try:
                data = json.loads(content)
                for dep_dict in [data.get("dependencies", {}), data.get("devDependencies", {})]:
                    for pkg, ver in dep_dict.items():
                        deps.append((pkg, str(ver), "npm"))
            except Exception:
                pass

        elif path_lower.endswith("requirements.txt"):
            for line in content.splitlines():
                clean = line.strip().split("#")[0]
                if clean and not clean.startswith(("-", "http")):
                    match = re.match(r"^([a-zA-Z0-9_\-\.]+)(?:[=<>~!\^]+([a-zA-Z0-9_\-\.]+))?", clean)
                    if match:
                        pkg_name = match.group(1)
                        pkg_ver = match.group(2)
                        deps.append((pkg_name, pkg_ver, "pypi"))

        elif path_lower.endswith("pyproject.toml"):
            # Simple line match for dependencies
            for line in content.splitlines():
                if "=" in line and ('"' in line or "'" in line):
                    parts = line.split("=")
                    k = parts[0].strip()
                    v = parts[1].strip().strip('"\'')
                    if re.match(r"^[a-zA-Z0-9_\-\.]+$", k) and k not in ["name", "version", "description"]:
                        deps.append((k, v, "pypi"))

        return deps

    async def run(
        self,
        owner: str,
        repo: str,
        facts: RepoFacts,
        cached_files: Optional[Dict[str, str]] = None,
    ) -> Tuple[float, List[str], List[Finding]]:
        """
        Parses manifests, runs OSV queries, and computes deps sub-score and blocking flags.
        Returns: (subScore, flags, findings)
        """
        findings: List[Finding] = []
        manifest_files = facts.manifestFiles or []
        parsed_deps: List[Tuple[str, Optional[str], str]] = []

        fetched = dict(cached_files or {})

        for m_path in manifest_files:
            content = fetched.get(m_path)
            if not content:
                res = await github_file(owner, repo, m_path, client=self.client)
                if res.success and isinstance(res.data, str):
                    content = res.data
                    fetched[m_path] = content

            if content:
                deps = self.parse_manifest(m_path, content)
                parsed_deps.extend(deps)
                findings.append(
                    Finding(
                        agent="deps",
                        claim=f"Parsed {len(deps)} direct dependencies from manifest '{m_path}'.",
                        severity="info",
                        evidence=[Evidence(path=m_path, snippet=content[:150])],
                    )
                )

        total_deps = len(parsed_deps)
        outdated_count = 0
        critical_vulns = 0
        high_vulns = 0

        # Query top 15 dependencies against OSV.dev and registry
        sample_deps = parsed_deps[:15]
        for pkg, ver, eco in sample_deps:
            # Query OSV
            osv_res = await osv_query(ecosystem=eco, package_name=pkg, version=ver, client=self.client)
            if osv_res.success and osv_res.data:
                crit = osv_res.data.get("criticalCount", 0)
                high = osv_res.data.get("highCount", 0)
                critical_vulns += crit
                high_vulns += high

                if crit > 0:
                    findings.append(
                        Finding(
                            agent="deps",
                            claim=f"CRITICAL vulnerability detected in dependency '{pkg}' ({eco}).",
                            severity="critical",
                        )
                    )
                elif high > 0:
                    findings.append(
                        Finding(
                            agent="deps",
                            claim=f"High-severity security advisory detected in dependency '{pkg}'.",
                            severity="high",
                        )
                    )

            # Query Registry
            reg_res = await registry_lookup(ecosystem=eco, package_name=pkg, client=self.client)
            if reg_res.success and reg_res.data:
                if reg_res.data.get("deprecated"):
                    outdated_count += 1
                    reason = reg_res.data.get("deprecationReason") or "Marked deprecated"
                    findings.append(
                        Finding(
                            agent="deps",
                            claim=f"Dependency '{pkg}' is deprecated: {reason}.",
                            severity="medium",
                        )
                    )

        sub_score, flags = compute_deps_score(
            total_deps=total_deps,
            outdated_deps=outdated_count,
            critical_vulns=critical_vulns,
            high_vulns=high_vulns,
        )

        return sub_score, flags, findings
