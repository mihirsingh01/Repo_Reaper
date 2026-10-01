#!/usr/bin/env python3
"""
RepoRevive – Grounding & Hallucination Audit Script
Samples analysis reports, verifies evidence citations against ground-truth files,
and calculates the empirical ungrounded-claim rate.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Set

ROOT_DIR = Path(__file__).parent.parent.resolve()
FIXTURE_PATH = ROOT_DIR / "ai-service" / "tests" / "fixtures" / "sample_repo.json"


def audit_report_grounding(report_claims: List[Dict[str, Any]], tree_paths: Set, files_dict: Dict[str, str]) -> Dict[str, Any]:
    total_claims = len(report_claims)
    verified_claims = 0
    hallucinated_paths = 0
    invalid_snippets = 0

    audit_details = []

    for item in report_claims:
        path = item.get("path", "").strip().lstrip("./")
        snippet = item.get("snippet", "")
        claim_text = item.get("claim", "")

        path_exists = path in tree_paths
        snippet_valid = False

        if path_exists:
            content = files_dict.get(path, "")
            clean_snip = " ".join(snippet.split())
            clean_file = " ".join(content.split())
            snippet_valid = clean_snip in clean_file if clean_snip else True
            if not snippet_valid:
                invalid_snippets += 1
        else:
            hallucinated_paths += 1

        is_verified = path_exists and snippet_valid
        if is_verified:
            verified_claims += 1

        audit_details.append({
            "claim": claim_text,
            "path": path,
            "pathExists": path_exists,
            "snippetValid": snippet_valid,
            "verified": is_verified,
        })

    ungrounded_rate = 1.0 - (verified_claims / max(1, total_claims))

    return {
        "totalClaims": total_claims,
        "verifiedClaims": verified_claims,
        "hallucinatedPaths": hallucinated_paths,
        "invalidSnippets": invalid_snippets,
        "ungroundedRate": round(ungrounded_rate, 4),
        "details": audit_details,
    }


def main():
    print("=" * 75)
    print(" RepoRevive – Evidence Grounding & Audit Tool")
    print("=" * 75)

    if not FIXTURE_PATH.exists():
        print(f"Error: Fixture file {FIXTURE_PATH} not found.")
        return

    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        repo_data = json.load(f)

    tree_paths = {item["path"] for item in repo_data.get("tree", [])}
    cached_files = repo_data.get("cachedFiles", {})

    # Sample audit set representing claims extracted by LLM
    claims_sample = [
        {"claim": "JWT verification in auth middleware", "path": "src/controllers/auth.js", "snippet": "jwt.verify(token, 'secret')"},
        {"claim": "Inventory delta updates stock", "path": "src/controllers/inventory.js", "snippet": "this.stock = (this.stock || 0) + delta"},
        {"claim": "Express server root endpoint", "path": "src/index.js", "snippet": "app.listen(PORT"},
        {"claim": "Payment webhook controller", "path": "src/payments/stripe.js", "snippet": "stripe.webhooks.constructEvent()"}, # Hallucinated
        {"claim": "Stock unit tests", "path": "test/inventory.test.js", "snippet": "describe('Stock test'"},
    ]

    res = audit_report_grounding(claims_sample, tree_paths, cached_files)

    print(f"Target Repository:      {repo_data.get('fullName')}")
    print(f"Total Claims Audited:   {res['totalClaims']}")
    print(f"Verified Grounded:      {res['verifiedClaims']} ({round((res['verifiedClaims']/res['totalClaims'])*100)}%)")
    print(f"Hallucinated Paths:     {res['hallucinatedPaths']}")
    print(f"Invalid Snippets:       {res['invalidSnippets']}")
    print(f"Ungrounded Claim Rate:  {res['ungroundedRate']*100:.1f}%\n")

    print(f"{'Audit Status':<12} | {'Cited Path':<30} | {'Claim'}")
    print("-" * 75)
    for d in res["details"]:
        status = "✓ GROUNDED" if d["verified"] else "✗ UNGROUNDED"
        print(f"{status:<12} | {d['path']:<30} | {d['claim']}")
    print("=" * 75)


if __name__ == "__main__":
    main()
