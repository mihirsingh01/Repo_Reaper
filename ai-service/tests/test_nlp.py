import time
from pathlib import Path
from app.nlp.preprocess import preprocess_text, tokenize, clean_text
from app.nlp.synonyms import synonym_expander
from app.nlp.query_builder import query_builder
from app.nlp.index import RepositoryIndex
from app.nlp.matcher import NLPMatcher
from app.schemas.idea import IdeaSpec, FeatureSpec


def test_preprocess_strips_markdown_html_badges_and_stopwords():
    raw_markdown = """
    # Project Title [![Build Status](https://img.shields.io/badge.svg)](https://ci.org)
    <p align="center">A great tool</p>

    ```bash
    npm install my-package
    git clone https://github.com/org/repo.git
    ```

    Please read the README and LICENSE.md before running tests.
    Features: Automated inventory tracking and stock alerts.
    """

    cleaned = preprocess_text(raw_markdown)

    # Markdown, URLs, and code blocks must be stripped
    assert "https" not in cleaned
    assert "shields" not in cleaned
    assert "badge" not in cleaned
    assert "github" not in cleaned
    assert "install" not in cleaned
    assert "readme" not in cleaned
    assert "license" not in cleaned

    # Core meaningful tokens preserved
    assert "inventory" in cleaned
    assert "alert" in cleaned or "alerts" in cleaned


def test_synonym_expander_concept_mapping():
    tokens = ["login", "inventory", "payments"]
    expanded_tokens, fired = synonym_expander.expand(tokens)

    # Must contain original terms
    assert "login" in expanded_tokens
    assert "inventory" in expanded_tokens

    # Must contain technical expansions
    assert "jwt" in expanded_tokens or "oauth" in expanded_tokens
    assert "stock" in expanded_tokens or "warehouse" in expanded_tokens
    assert "stripe" in expanded_tokens or "checkout" in expanded_tokens

    # Verify fired report
    originals_fired = [f["original"] for f in fired]
    assert "login" in originals_fired
    assert "inventory" in originals_fired


def test_query_builder_weights_must_above_nice():
    spec = IdeaSpec(
        summary="A shop inventory app",
        targetUsers=["Merchants"],
        features=[
            FeatureSpec(
                id="f1",
                label="Inventory Tracking",
                plainDescription="Record stock counts",
                keywords=["sku", "quantity"],
                priority="must",
            ),
            FeatureSpec(
                id="f2",
                label="Dark Mode Theme",
                plainDescription="Cosmetic dark UI theme",
                keywords=["theme", "styling"],
                priority="nice",
            ),
        ],
    )

    query_str, _ = query_builder.build_query(spec)

    # Must-have terms must appear with higher frequency than nice-to-have terms
    must_count = query_str.count("inventory") + query_str.count("stock")
    nice_count = query_str.count("styling") + query_str.count("theme")
    assert must_count > nice_count


def test_retrieval_surfaces_jwt_repo_without_word_login(tmp_path: Path):
    """
    CRITICAL ACCEPTANCE CRITERIA TEST:
    A founder query 'customers can log in securely' MUST surface a JWT-auth
    repository that NEVER explicitly uses the word 'login'.
    """
    # 1. Setup custom index in temp directory
    index = RepositoryIndex()

    corpus = [
        {
            "id": "jwt-auth-repo",
            "name": "auth-core",
            "topics": ["security", "auth"],
            "text": "JSON Web Token authentication and session middleware for Node.js APIs with bcrypt password verification.",
            # Notice: The word "login" is NEVER present in this text!
        },
        {
            "id": "unrelated-weather-repo",
            "name": "weather-cli",
            "topics": ["weather", "cli"],
            "text": "Command line tool to query precipitation, radar forecasts, and atmospheric temperatures.",
        },
    ]

    index.build(corpus)
    matcher = NLPMatcher(index=index)

    # Query uses founder phrasing: "log in" / "login"
    query = "customers can log in securely"
    results = matcher.match(query, top_k=5)

    assert len(results) > 0
    # Top result MUST be the JWT auth repository!
    assert results[0]["repoId"] == "jwt-auth-repo"
    assert results[0]["relevance"] > 0.0

    # Ensure explainability: matchedTerms cites contributing tokens (e.g. auth, authentication, jwt)
    matched_terms = results[0]["matchedTerms"]
    assert len(matched_terms) > 0
    assert any(term in ["auth", "jwt", "authentication"] for term in matched_terms)


def test_index_save_and_load_roundtrip(tmp_path: Path):
    index = RepositoryIndex()
    corpus = [
        {"id": "repo-1", "name": "app-one", "topics": ["web"], "text": "A full stack web application."},
        {"id": "repo-2", "name": "app-two", "topics": ["api"], "text": "REST API service with database storage."},
    ]
    build_meta = index.build(corpus)

    assert build_meta["indexedCount"] == 2
    assert index.is_ready()

    # Re-initialize new index and load from disk
    loaded_index = RepositoryIndex()
    assert loaded_index.is_ready()
    assert loaded_index.doc_count == 2
    assert loaded_index.repo_ids == ["repo-1", "repo-2"]


def test_matcher_latency_and_edge_cases():
    index = RepositoryIndex()
    corpus = [
        {"id": f"repo-{i}", "name": f"project-{i}", "topics": ["tool"], "text": f"Utility #{i} for database processing."}
        for i in range(100)
    ]
    index.build(corpus)
    matcher = NLPMatcher(index=index)

    # Edge Case: empty query
    assert matcher.match("") == []
    assert matcher.match("    ") == []

    # Edge Case: out of vocabulary query
    assert matcher.match("zyxwvutsrqponmlkjihgfedcba") == []

    # Edge Case: candidateIds filter
    filtered = matcher.match("database processing", candidate_ids=["repo-5", "repo-12"])
    for r in filtered:
        assert r["repoId"] in ["repo-5", "repo-12"]

    # Latency check: matching 100 documents takes well under 300 ms
    start = time.perf_counter()
    results = matcher.match("database processing", top_k=10)
    duration_ms = (time.perf_counter() - start) * 1000

    assert len(results) > 0
    assert duration_ms < 300  # Acceptance criteria: latency < 300ms
