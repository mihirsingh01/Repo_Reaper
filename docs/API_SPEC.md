# RepoRevive – API Specification Contract

## 1. Express API Server (Public / Client Facing, :5000)

### 1.1 Authentication & User Management
- `POST /api/auth/register`
  - Body: `{ name: string, email: string, password: string }`
  - Returns: `{ user: { id, name, email, role }, token: string }`
- `POST /api/auth/login`
  - Body: `{ email: string, password: string }`
  - Returns: `{ user: { id, name, email, role }, token: string }`
- `GET /api/auth/me`
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ user: { id, name, email, role, dailyAnalysisCount } }`

### 1.2 Ideas & Checklists
- `POST /api/ideas`
  - Body: `{ rawText: string }` (30 - 2000 characters)
  - Action: Proxies to AI service `POST /ideas/refine`, stores idea as status `draft`.
  - Returns: `{ ideaId: string, refined: { summary, targetUsers, features: [...] }, status: "draft" }`
- `GET /api/ideas/:id`
  - Returns: Full idea document including refined features.
- `PATCH /api/ideas/:id`
  - Body: `{ status: "confirmed", features: [...] }`
  - Action: Updates checklist, calculates immutable `checklistHash`.
  - Returns: `{ success: true, checklistHash: string, status: "confirmed" }`

### 1.3 Search & Analysis
- `POST /api/ideas/:id/search`
  - Action: Checks cache by `checklistHash`. If miss, calls AI service `POST /nlp/match` to retrieve top 20, queues top 5 for multi-agent analysis.
  - Returns: `202 Accepted` `{ ideaId, queryId, status: "queued", cached: boolean }`
- `GET /api/ideas/:id/results`
  - Polling endpoint.
  - Returns: `{ status: "running" | "done", progress: { completed: number, total: number }, bestMatch: {...}, alternatives: [...], candidates: [...] }`
- `GET /api/analyses/:id`
  - Returns: Detailed analysis report including facts, sub-scores, bug risks, findings with citations, and revival plan.
- `GET /api/analyses/:id/brief`
  - Returns: Downloadable Markdown Founder Brief.

### 1.4 Admin & System
- `POST /api/admin/ingest`
  - Role required: `admin`
  - Body: `{ language?: string, window?: string }`
  - Returns: `{ jobId: string, status: "queued" }`
- `GET /api/admin/ingest/:id`
  - Returns: Status of ingestion run with counts (`seen`, `kept`, `rejected`).
- `GET /api/health`
  - Returns: `{ status: "ok", services: { api: "ok", mongo: "ok", aiService: "ok" } }`

---

## 2. FastAPI AI Service (Internal, :8000)
Protected by Header `X-API-Key: <AI_SERVICE_API_KEY>`.

- `GET /health`
  - Public health check. Returns `{ status: "ok", service: "ai-service" }`.
- `POST /ideas/refine`
  - Body: `{ text: string }`
  - Returns: `IdeaSpec` (`summary`, `targetUsers`, `features: [{ id, label, plainDescription, keywords, priority }]`)
- `POST /index/build`
  - Body: `{ repos: [{ id, text }] }`
  - Action: Rebuilds local TF-IDF vectorizer and persists to `.joblib`.
  - Returns: `{ indexedCount: number, status: "ready" }`
- `POST /nlp/match`
  - Body: `{ query: string, topK: number }`
  - Returns: `[{ repoId: string, relevance: number, matchedTerms: string[] }]`
- `POST /agents/analyze`
  - Body: `{ repoFullName: string, features: FeatureSpec[], repoContext?: object }`
  - Action: Executes Scout, Parallel Workers, Verifier, Deterministic Scoring, and Revival Planner.
  - Returns: `AnalysisReport` (`{ status, repoFullName, facts, coverage, bugRisk, subScores, viability, confidence, verdict, flags, findings, revivalPlan, founderBrief, trace, tokenUsage }`)
