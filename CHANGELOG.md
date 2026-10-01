# Changelog

All notable changes to the **RepoRevive** project ("Agentic AI Framework for Stale Repository Viability Analysis") will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-05

### Added
- **Foundational Architecture & Scaffold (Prompt 1)**:
  - Monorepo directory structure: `client/` (React + Vite + Tailwind), `server/` (Node 20 + Express + Mongoose), `ai-service/` (Python 3.11 + FastAPI), `docs/`, `scripts/`.
  - Docker Compose configuration for local multi-service development with hot-reload and seeded mock states.
  - Core configuration schemas with Zod (Node) and Pydantic (Python).
- **Backend Core & Database Layer (Prompt 2)**:
  - Mongoose models: `User` (JWT auth, role-based access), `Idea` (raw text, refined checklist, hash), `Repository` (metadata, stale metrics), `Query` (search cache), `Analysis` (evidence, viability scores), `IngestionJob`.
  - Deterministic ranking engine (`server/src/services/ranking.ts`) weighting relevance (0.40), feature coverage (0.30), and viability (0.30) with licensing and vulnerability disqualification gates.
  - Job runner and background execution engine with queue status tracking.
- **GitHub Ingestion Engine (Prompt 3)**:
  - Rate-limit respecting ingestion pipeline with ETag conditional HTTP (`304 Not Modified`) headers and exponential backoff.
  - Sharded search queries across stars/commit dates to bypass GitHub's 1,000-search-result barrier.
  - Stale repository filtration criteria: $\ge 12$ months since last commit and $\ge 30$ historical commits.
- **Idea Refinement & NLP Matcher (Prompt 4)**:
  - Natural Language Processing pipeline: tokenisation, stop-word elimination, stemming, lemmatisation, synonym expansion, TF-IDF vectorization, and cosine similarity scoring.
  - Multi-provider LLM abstraction layer supporting Anthropic Claude, OpenAI-compatible endpoints, and a deterministic offline Mock provider.
  - Endpoints: `POST /ideas/refine`, `POST /nlp/match`, `POST /index/build`.
- **Multi-Agent Viability & Deterministic Scoring (Prompt 5)**:
  - Eight specialized read-only analysis agents: Scout, Structure, Coverage, Bug Risk, Dependencies, License, Revival Planner, and Verifier.
  - Anti-hallucination Verifier: inspects and drops any agent claim missing real file or line evidence; penalizes ungrounded statements.
  - Deterministic scoring engine adhering strictly to `docs/SCORING_RUBRIC.md`; LLMs only extract and synthesize, never generating score numbers directly.
  - Command-line evaluation tool (`scripts/analyze_cli.py`).
- **Founder-Centric Frontend (Prompt 6)**:
  - Modern web client designed for non-technical founders: plain language, interactive tooltips, progress bars, zero jargon.
  - 3-step Idea Wizard: raw idea input with live character counter & domain presets $\to$ interactive checklist editor $\to$ automated search.
  - Results view featuring Best Match Hero Card, Alternative comparisons, 7-tab deep dive report, and printable Founder Brief (.md and PDF print layout).
  - Admin observability and ingestion dashboard.
- **Empirical Evaluation & Benchmarks (Prompt 7)**:
  - Full research question benchmark suite: RQ1 (retrieval precision/recall), RQ2 (feature extraction accuracy), RQ3 (deterministic viability scoring), RQ4 (founder comprehension user study).
  - Comprehensive contract, security, and failure-mode test suites.
  - Automated smoke test suite and Makefile.
- **Hardening, Observability & Cloud Packaging (Prompt 8)**:
  - Multi-stage, non-root production Dockerfiles for client (unprivileged Nginx), server (node user), and ai-service (appuser).
  - Production configurations: `render.yaml` for server and ai-service; `client/vercel.json` for client.
  - End-to-end distributed tracing via `X-Request-Id` propagation.
  - Health (`/health`) and Readiness (`/ready`) probes with cold-start UX recovery.
  - Centralized metrics collector (`/api/metrics`) tracking latency, cache hits, GitHub limits, error rates.
  - Global LLM spend kill-switch and GitHub token scope auditor (restricts to public read-only).
  - Complete thesis skeleton (`docs/report/`), viva package (`docs/viva/`), Mermaid architecture diagrams (`docs/diagrams/`), and traceability matrix (`docs/TRACEABILITY_MATRIX.md`).

### Security
- Delimited prompts preventing prompt-injection attacks from untrusted repository content.
- Content Security Policy (CSP), strict CORS, body size ceilings (100 KB).
- Read-only GitHub API token enforcement; no code execution, building, or importing from analyzed repositories.
