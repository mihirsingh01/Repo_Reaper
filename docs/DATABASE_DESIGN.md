# RepoRevive – Database Design & Data Model

Database: MongoDB 7 (Atlas in production, `mongo:7` container locally). ODM: Mongoose. Validation: Zod at the API edge, Mongoose schema validation in the models.

See `docs/ER_DIAGRAM.md` for the visual entity relationship diagram.

## 1. Rules
1. The Express server owns **all** DB writes. The AI service is stateless except its TF-IDF index file (ADR-006).
2. Timestamps (`createdAt`, `updatedAt`) on every model.
3. Never store or return `passwordHash` in API responses or logs.
4. Repo content (README, code snippets) is untrusted data; store it as plain text, never interpret it.
5. No score is written by an LLM. Scores in `analyses` come from `scoring.py` (ADR-002).
6. Models and indexes must match this file exactly.

## 2. Collections at a glance
| Collection | Purpose | Written by |
| --- | --- | --- |
| users | Accounts and roles | Auth routes |
| ideas | Founder idea, refined checklist, status | Ideas routes |
| repositories | Stale repos ingested from GitHub, with scoring signals | Ingestion job |
| queries | Cached search results per confirmed checklist | Search service |
| analyses | One agent analysis of one repo for one checklist | Analysis job runner |
| ingestion_jobs | Ingestion run status and counts | Ingestion job / admin |

## 3. Collection definitions

### 3.1 users
- `_id`: ObjectId PK
- `name`: String, required
- `email`: String, required, unique, lowercase
- `passwordHash`: String, bcrypt; select: false
- `role`: String, enum `founder` | `admin`; default `founder`
- `dailyAnalysisCount`: Number, default 0; reset daily; enforces DAILY_ANALYSIS_CAP_PER_USER (15)
- `createdAt`, `updatedAt`: Date

### 3.2 ideas
- `_id`: ObjectId PK
- `userId`: ObjectId, FK to users
- `rawText`: String, 30-2000 characters
- `refined.summary`: String
- `refined.targetUsers`: [String]
- `refined.features`: [Feature], embedded, 3-10 items
- `status`: String, enum `draft` | `confirmed` | `searching` | `done`
- `checklistHash`: String, cache key
- `createdAt`, `updatedAt`: Date

Feature (embedded):
- `id`: String, stable within idea
- `label`: String, plain language
- `plainDescription`: String
- `keywords`: [String]
- `priority`: String, enum `must` | `nice`

### 3.3 repositories
- `_id`: ObjectId PK
- `githubId`: Number, unique
- `fullName`: String, `owner/repo`
- `url`: String
- `description`: String
- `topics`: [String]
- `language`: String
- `license`: `{ spdx: String, name: String }`
- `stars`, `forks`, `openIssues`: Number
- `openBugIssues`, `closedBugIssues`: Number
- `lastCiConclusion`: String
- `defaultBranch`: String
- `archived`: Boolean
- `createdAt`, `pushedAt`, `lastCommitAt`: Date
- `commitCount`, `contributorCount`: Number
- `readmeText`: String, size-capped
- `readmeHash`: String
- `etag`: String
- `fetchedAt`, `indexedAt`: Date

### 3.4 queries
- `_id`: ObjectId PK
- `ideaId`: ObjectId, FK to ideas
- `userId`: ObjectId, FK to users
- `expandedQuery`: String
- `checklistHash`: String
- `results`: [Result], embedded top 20
- `bestRepoId`: ObjectId, FK to repositories
- `createdAt`: Date
- `expiresAt`: Date, TTL index (`expireAfterSeconds: 0`)

Result (embedded):
- `repoId`: ObjectId, FK to repositories
- `relevance`: Number (0-1)
- `matchedTerms`: [String]
- `analysisId`: ObjectId, optional
- `coverage`: Number, optional (0-100)
- `viability`: Number, optional (0-100)
- `final`: Number, optional

### 3.5 analyses
- `_id`: ObjectId PK
- `repoId`: ObjectId, FK to repositories
- `ideaId`: ObjectId, FK to ideas
- `checklistHash`: String
- `requestedBy`: ObjectId, FK to users
- `status`: String, enum `queued` | `running` | `done` | `failed` | `partial`
- `startedAt`, `finishedAt`: Date
- `facts`: Object
- `coverage.score`: Number (0-100)
- `coverage.features[]`: Array `{ featureId, status, evidence[] }`
- `bugRisk`: Object `{ penalty, openBugs, lintErrorsPer1k, ciConclusion, todoPer1k }`
- `subScores`: Object `{ structure, bugRisk, deps, docs, license, history, tests }`
- `viability`: Number (0-100)
- `confidence`: Number (0-1)
- `verdict`: String
- `flags`: [String]
- `findings[]`: Array `{ agent, claim, severity, evidence[] }`
- `revivalPlan`: Object `{ gaps[], steps[], effortHours { min, max }, risks[] }`
- `founderBrief`: String (markdown)
- `trace[]`: Array `{ step, agent, tool, argsSummary, resultSummary, tokensIn, tokensOut, latencyMs }`
- `tokenUsage`: Object
- `error`: String

### 3.6 ingestion_jobs
- `_id`: ObjectId PK
- `status`: String (`queued`, `running`, `done`, `failed`)
- `params`: `{ language: String, window: String }`
- `counts`: `{ seen: Number, kept: Number, rejected: Number, byReason: Object }`
- `startedAt`, `finishedAt`: Date
- `error`: String

## 4. Indexes
- `users`: `{ email: 1 }` (unique)
- `ideas`: `{ userId: 1, createdAt: -1 }`
- `repositories`: `{ githubId: 1 }` (unique), `{ fullName: 1 }`, `{ language: 1 }`, `{ lastCommitAt: 1 }`
- `queries`: `{ expiresAt: 1 }` (TTL), `{ ideaId: 1, checklistHash: 1 }`
- `analyses`: `{ repoId: 1, ideaId: 1, checklistHash: 1 }`, `{ requestedBy: 1, createdAt: -1 }`
