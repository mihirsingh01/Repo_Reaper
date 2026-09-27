"""
RepoRevive – Ecosystem Registry and OSV.dev Vulnerability Tools
Read-only queries to npm registry, PyPI, and OSV.dev.
"""

from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings
from app.tools.base import ToolResult, DEFAULT_TIMEOUT_SECONDS


async def registry_lookup(
    ecosystem: str,
    package_name: str,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """
    Looks up package metadata from npm or PyPI registry.
    Returns latest version, deprecation status, and published date.
    """
    eco = ecosystem.lower()
    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS)
        should_close = True

    try:
        if eco in ["npm", "javascript", "typescript", "node"]:
            url = f"{settings.NPM_REGISTRY_URL}/{package_name}"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                dist_tags = data.get("dist-tags", {})
                latest_ver = dist_tags.get("latest")
                versions = data.get("versions", {})
                latest_info = versions.get(latest_ver, {}) if latest_ver else {}
                deprecated = latest_info.get("deprecated") is not None
                return ToolResult(
                    success=True,
                    data={
                        "package": package_name,
                        "ecosystem": "npm",
                        "latestVersion": latest_ver,
                        "deprecated": deprecated,
                        "deprecationReason": latest_info.get("deprecated"),
                    },
                )
            elif resp.status_code == 404:
                return ToolResult(success=True, data={"package": package_name, "found": False})
            return ToolResult(success=False, error=f"npm registry error: {resp.status_code}")

        elif eco in ["pypi", "python"]:
            url = f"{settings.PYPI_REGISTRY_URL}/{package_name}/json"
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                info = data.get("info", {})
                latest_ver = info.get("version")
                # Check classifiers or yanked status
                yanked = info.get("yanked", False)
                return ToolResult(
                    success=True,
                    data={
                        "package": package_name,
                        "ecosystem": "pypi",
                        "latestVersion": latest_ver,
                        "deprecated": yanked,
                        "deprecationReason": info.get("yanked_reason"),
                    },
                )
            elif resp.status_code == 404:
                return ToolResult(success=True, data={"package": package_name, "found": False})
            return ToolResult(success=False, error=f"PyPI registry error: {resp.status_code}")
        else:
            return ToolResult(success=False, error=f"Unsupported ecosystem: {ecosystem}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()


async def osv_query(
    ecosystem: str,
    package_name: str,
    version: Optional[str] = None,
    client: Optional[httpx.AsyncClient] = None,
) -> ToolResult:
    """
    Queries OSV.dev database for known vulnerabilities (CVE/GHSA).
    Translates ecosystems (npm -> npm, python -> PyPI).
    """
    eco_map = {
        "npm": "npm",
        "node": "npm",
        "javascript": "npm",
        "pypi": "PyPI",
        "python": "PyPI",
        "go": "Go",
        "cargo": "crates.io",
        "crates.io": "crates.io",
    }
    target_eco = eco_map.get(ecosystem.lower(), ecosystem)

    payload: Dict[str, Any] = {
        "package": {
            "name": package_name,
            "ecosystem": target_eco,
        }
    }
    if version:
        # Strip semver prefixes like ^, ~, >=
        clean_version = version.lstrip("^~>=< ")
        payload["version"] = clean_version

    should_close = False
    if client is None:
        client = httpx.AsyncClient(timeout=DEFAULT_TIMEOUT_SECONDS)
        should_close = True

    try:
        url = f"{settings.OSV_API_URL}/query"
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            vulns = data.get("vulns", [])
            critical_count = 0
            high_count = 0

            summaries: List[Dict[str, Any]] = []
            for v in vulns:
                v_id = v.get("id")
                database_specific = v.get("database_specific", {})
                severity_str = database_specific.get("severity", "").upper()

                if "CRITICAL" in severity_str:
                    critical_count += 1
                elif "HIGH" in severity_str:
                    high_count += 1

                summaries.append({
                    "id": v_id,
                    "summary": v.get("summary", ""),
                    "severity": severity_str,
                })

            return ToolResult(
                success=True,
                data={
                    "package": package_name,
                    "vulnCount": len(vulns),
                    "criticalCount": critical_count,
                    "highCount": high_count,
                    "vulnerabilities": summaries[:10],
                },
            )
        return ToolResult(success=False, error=f"OSV query error {resp.status_code}: {resp.text}")
    except Exception as e:
        return ToolResult(success=False, error=str(e))
    finally:
        if should_close:
            await client.aclose()
