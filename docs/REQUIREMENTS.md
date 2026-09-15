# RepoRevive – Requirements Specification

## 1. Functional Requirements (FR)

| ID | Title | Description | Implemented In |
| :--- | :--- | :--- | :--- |
| **FR-1** | User Authentication & Roles | Secure registration and login via JWT Bearer tokens; roles `founder` and `admin`. Daily analysis budget tracking per user. | `server/src/controllers/authController.ts`, `client/src/pages/LoginPage.tsx` |
| **FR-2** | Idea Submission | Plain-English idea input (30 - 2,000 characters). Prompt character counter and sample idea presets. | `server/src/controllers/ideaController.ts`, `client/src/pages/NewIdeaPage.tsx` |
| **FR-3** | Idea Refinement | AI Refiner extracts 3–10 features with plain descriptions, technical keywords, and `must`/`nice` priority without inventing business facts. | `ai-service/app/ideas/refiner.py` |
| **FR-4** | Checklist Confirmation | Interactive editor enabling founders to rename, add, delete, and toggle feature priorities before search initiation. | `client/src/components/ChecklistEditor.tsx` |
| **FR-5** | Stale Repository Ingestion | Ingests abandoned public GitHub repositories (>12 months inactive, $\ge 30$ commits, verified default branch, decoded README). | `server/src/services/github/` |
| **FR-6** | NLP Retrieval & Matching | Sublinear TF-IDF, synonym expansion, and cosine similarity ranking candidate repos with explainable `matchedTerms`. | `ai-service/app/nlp/` |
| **FR-7** | Automated Candidate Analysis | Asynchronous queue runner automatically triggers deep multi-agent analysis for top 5 candidates. | `server/src/services/jobRunner.ts` |
| **FR-8** | Multi-Agent Viability Audit | Parallel worker agents audit structure, feature coverage, bug risks, dependency health, license, and testing history. | `ai-service/app/agents/` |
| **FR-9** | Deterministic Scoring | 100% code-driven scoring adhering to `SCORING_RUBRIC.md`. Zero LLM involvement in numerical score generation. | `ai-service/app/scoring.py` |
| **FR-10** | Independent Evidence Verification | Verifier audits all claims against ground-truth tree paths and file contents; ungrounded "present" claims demoted to "missing". | `ai-service/app/agents/verifier.py` |
| **FR-11** | Best Match & Alternatives | Results UI highlights one Best Match, 2 alternatives, gap list, and candidate list with `NO_LICENSE` displayed in red. | `client/src/pages/ResultsPage.tsx` |
| **FR-12** | Founder Brief Export | Actionable Markdown brief detailing gaps, revival steps, hours, and risks. Supports `.md` download and PDF printing. | `client/src/pages/FounderBriefPage.tsx` |
| **FR-13** | Admin Ingestion Portal | Role-gated dashboard allowing admins to trigger language/date window ingestion shards and view live status. | `client/src/pages/AdminPage.tsx` |

---

## 2. Non-Functional Requirements (NFR)

### NFR-1: Safety & Zero Execution
- Third-party repository code MUST NEVER be built, imported, installed, or executed.
- Analysis is strictly static and read-only via GitHub REST API, file AST parsing, and registry metadata queries.

### NFR-2: Performance & Latency
- Retrieval over 1,000 indexed documents must execute with $p95 < 300\text{ ms}$.
- Multi-agent deep analysis of a candidate repository must complete within 90 seconds (under MockProvider: $< 2\text{ seconds}$).
- UI polling on search progress must use exponential backoff (2s to 6s) to minimize network overhead.

### NFR-3: Security & Untrusted Input
- All repository file content is treated as untrusted data wrapped in `<<<START_UNTRUSTED_*>>>` delimiters to mitigate prompt-injection attacks.
- Strict input validation via Zod on Express routes and Pydantic v2 on FastAPI routes.
- Rate-limiting enforced on authentication endpoints and GitHub REST API requests.

### NFR-4: Reproducibility & Calibration
- Identical repository facts and feature checklists MUST yield identical viability and coverage scores.
- Numerical scores come from deterministic formulas; LLMs only plan, extract facts, and generate natural language summaries.

### NFR-5: Test Coverage Gates
- Overall test coverage across services $\ge 70\%$.
- Test coverage on deterministic scoring (`scoring.py`) and NLP engine (`app/nlp/`) $\ge 90\%$.
