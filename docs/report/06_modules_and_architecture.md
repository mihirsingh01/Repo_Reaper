# Chapter 6: Modules and Architecture

## 6.1. Architectural Overview
RepoRevive is structured as a modular, three-tier service-oriented architecture designed to separate concerns cleanly between user interface presentation, orchestration and data persistence, and specialized AI computation:

1. **Client Tier**: React 18 Single Page Application (SPA) optimized for non-technical founders.
2. **Gateway & Orchestration Tier**: Node.js/Express REST API managing authentication, rate limiting, MongoDB persistence, caching, and background job coordination.
3. **AI & Analysis Microservice**: High-performance FastAPI Python service encapsulating Scikit-learn NLP models, LLM provider drivers, agent tools, and deterministic scoring.
4. **Data Persistence Tier**: MongoDB Atlas managing relational-like document collections for users, ideas, repositories, queries, and deep analyses.

---

## 6.2. Module Breakdown

### 6.2.1. Frontend Modules (`client/src/`)
- **Authentication Context (`context/AuthContext.tsx`)**: Manages JWT lifecycle, local storage persistence, and role-based route guards (`founder` vs. `admin`).
- **Idea Wizard (`pages/NewIdeaPage.tsx`)**: Guides founders through a 3-step submission process, featuring live character counters and pre-configured domain presets.
- **Checklist Editor (`components/ChecklistEditor.tsx`)**: Allows non-technical users to review and edit AI-generated features, toggle must/nice priorities, and inspect keyword tooltips.
- **Results Dashboard (`pages/ResultsPage.tsx`)**: Implements real-time polling with progress visualization, rendering the Best Match Hero card, Alternative cards, and the candidate table.
- **Deep-Dive Report (`pages/RepoReportPage.tsx`)**: Interactive 7-tab modal presenting granular evidence across Structure, Bug Risk, Dependencies, License, Documentation, History, and Tests.
- **Founder Brief (`pages/FounderBriefPage.tsx`)**: Formatted executive summary ready for export as GitHub Flavored Markdown (`.md`) or printable PDF.

### 6.2.2. Backend Gateway Modules (`server/src/`)
- **Authentication Controller (`controllers/authController.ts`)**: Secure registration and login using salted bcrypt password hashing and signed JWT tokens.
- **Search Orchestrator (`controllers/searchController.ts`)**: Implements search orchestration, query caching via checklist hashing, and background job triggering.
- **GitHub Ingestion Engine (`jobs/ingestionJobRunner.ts`)**: Asynchronous worker that queries GitHub search API using ETag conditional caching, windowed sharding, and backoff handling.
- **Deterministic Ranking Service (`services/ranking.ts`)**: Implements the three-factor composite ranking formula and evaluates disqualification safety gates.
- **Observability & Metrics (`utils/metrics.ts`)**: Tracks request latencies, cache hit ratios, GitHub API quota usage, token expenditure, and error rates.

### 6.2.3. AI Microservice Modules (`ai-service/app/`)
- **NLP Preprocessing & Indexing (`nlp/preprocess.py`, `nlp/index.py`)**: Tokenisation, stop-word elimination, stemming, and Scikit-learn sparse TF-IDF index construction.
- **Query Builder & Matcher (`nlp/query_builder.py`, `nlp/matcher.py`)**: Assembles weighted query vectors with synonym expansion and executes cosine similarity ranking.
- **Read-Only Tools (`tools/`)**:
  - `GitHubFileTool`: Fetches directory trees and file blobs via raw GitHub API without cloning.
  - `RegistryTool`: Queries npm and PyPI for package metadata.
  - `OsvTool`: Interrogates OSV.dev for CVE records associated with dependency versions.
  - `StaticLintTool`: Executes fixed-rule linting (Ruff / ESLint) within an isolated runtime.
- **Multi-Agent Orchestrator (`agents/orchestrator.py`)**: Sequences the execution of Scout, Structure, Coverage, Bug Risk, Dependencies, License, Verifier, and Revival Planner agents.
- **Deterministic Scorer (`scoring.py`)**: Standalone module containing pure, reproducible mathematical implementations of the scoring rubric.
