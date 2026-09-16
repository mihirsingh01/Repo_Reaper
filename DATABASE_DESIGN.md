# RepoRevive – Database Design

Database: MongoDB 7 (Atlas in production, `mongo:7` container locally). ODM: Mongoose. Validation: Zod at the API edge, Mongoose schema validation in the models.

This file expands `docs/DATA_MODEL.md`. If they disagree, fix the docs first and ask before changing code. See `docs/ER_DIAGRAM.md` for the diagram.

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

| Field | Type | Notes |
| --- | --- | --- |
| _id | ObjectId | PK |
| name | String | required |
| email | String | required, **unique**, lowercase |
| passwordHash | String | bcrypt; `select: false` |
| role | String | enum `founder` \| `admin`; default `founder` |
| dailyAnalysisCount | Number | default 0; reset daily; enforces `DAILY_ANALYSIS_CAP_PER_USER` (15) |
| createdAt | Date | |

### 3.2 ideas

| Field | Type | Notes |
| --- | --- | --- |
| _id | ObjectId | PK |
| userId | ObjectId | FK to users |
| rawText | String | 30-2000 characters |
| refined.summary | String | from Idea Refiner |
| refined.targetUsers | [String] | |
| refined.features | [Feature] | embedded, 3-10 items |
| status | String | enum `draft` \| `confirmed` \| `searching` \| `done` |
| checklistHash | String | recomputed on every checklist edit; cache key |
| createdAt, updatedAt | Date | |

Feature (embedded):

| Field | Type | Notes |
| --- | --- | --- |
| id | String | stable within the idea |
| label | String | plain-language name |
| plainDescription | String | founder-friendly |
| keywords | [String] | technical terms |
| priority | String | enum `must` \| `nice` |

### 3.3 repositories

| Field | Type | Notes |
| --- | --- | --- |
| _id | ObjectId | PK |
| githubId | Number | **unique** |
| fullName | String | `owner/repo` |
| url | String | |
| description | String | |
| topics | [String] | |
| language | String | |
| license.spdx | String | null means no license (blocking flag) |
| license.name | String | |
| stars, forks, openIssues | Number | |
| openBugIssues, closedBugIssues | Number | issues labelled `bug`, pull requests excluded |
| lastCiConclusion | String | latest GitHub Actions run on default branch; null if none |
| defaultBranch | String | |
| archived | Boolean | |
| createdAt, pushedAt, lastCommitAt | Date | `lastCommitAt` is verified, not copied from `pushed_at` |
| commitCount, contributorCount | Number | |
| readmeText | String | decoded, size-capped |
| readmeHash | String | skip unchanged repos |
| etag | String | for If-None-Match |
| fetchedAt, indexedAt | Date | |

Admission rule: keep only if `lastCommitAt` older than `STALE_MONTHS` (12) and `commitCount >= MIN_COMMITS` (30), with a usable README.

### 3.4 queries

| Field | Type | Notes |
| --- | --- | --- |
| _id | ObjectId | PK |
| ideaId | ObjectId | FK to ideas |
| userId | ObjectId | FK to users |
| expandedQuery | String | built from feature labels and keywords |
| checklistHash | String | cache key |
| results | [Result] | embedded, top 20 |
| bestRepoId | ObjectId | FK to repositories; never a repo with a blocking flag |
| createdAt | Date | |
| expiresAt | Date | **TTL index**; `CACHE_TTL_HOURS` (24) |

Result (embedded):

| Field | Type | Notes |
| --- | --- | --- |
| repoId | ObjectId | FK to repositories |
| relevance | Number | 0-1 |
| matchedTerms | [String] | "why it matched" |
| analysisId | ObjectId | optional |
| coverage | Number | optional, 0-100 |
| viability | Number | optional, 0-100 |
| final | Number | optional |

### 3.5 analyses

| Field | Type | Notes |
| --- | --- | --- |
| _id | ObjectId | PK |
| repoId | ObjectId | FK to repositories |
| ideaId | ObjectId | FK to ideas |
| checklistHash | String | reuse if same repo + checklist and < 7 days old |
| requestedBy | ObjectId | FK to users |
| status | String | enum `queued` \| `running` \| `done` \| `failed` \| `partial` |
| startedAt, finishedAt | Date | |
| facts | Object | RepoFacts from Scout |
| coverage.score | Number | 0-100 |
| coverage.features[] | Array | `{ featureId, status (present/partial/missing), evidence[] }` |
| bugRisk | Object | `{ penalty, openBugs, lintErrorsPer1k, ciConclusion, todoPer1k }` |
| subScores | Object | `{ structure, bugRisk, deps, docs, license, history, tests }`; a failed worker is `null` (unknown) |
| viability | Number | 0-100, re-normalised if any sub-score unknown |
| confidence | Number | share of rubric points measured |
| verdict | String | Ready to build on / Usable with work / Borrow parts only / Not worth it |
| flags | [String] | blocking: `NO_LICENSE`, `ARCHIVED`, `EMPTY_REPO`, `CRITICAL_VULN`; warning: `CI_FAILING`, `UNPARSEABLE_MANIFEST` |
| findings[] | Array | `{ agent, claim, severity, evidence[] }` |
| revivalPlan | Object | `{ gaps[], steps[], effortHours { min, max }, risks[] }` |
| founderBrief | String | markdown |
| trace[] | Array | `{ step, agent, tool, argsSummary, resultSummary, tokensIn, tokensOut, latencyMs }` |
| tokenUsage | Object | totals |
| error | String | reason when `failed` or `partial` |

Evidence object: `{ type: file | api | url, ref, snippet (max 200 chars) }`.

### 3.6 ingestion_jobs

| Field | Type | Notes |
| --- | --- | --- |
| _id | ObjectId | PK |
| status | String | queued / running / done / failed |
| params.language, params.window | String | shard definition; makes runs resumable |
| counts.seen, counts.kept, counts.rejected | Number | updated live |
| counts.byReason | Object | rejection reasons, e.g. `too_recent`, `few_commits`, `short_readme` |
| startedAt, finishedAt | Date | |
| error | String | |

## 4. Indexes

| Collection | Index | Why |
| --- | --- | --- |
| users | `{ email: 1 }` unique | login, no duplicates |
| ideas | `{ userId: 1, createdAt: -1 }` | history page |
| repositories | `{ githubId: 1 }` unique | upsert |
| repositories | `{ fullName: 1 }` | lookup by name |
| repositories | `{ language: 1 }` | ingestion shards, filters |
| repositories | `{ lastCommitAt: 1 }` | staleness queries |
| queries | `{ expiresAt: 1 }` TTL, `expireAfterSeconds: 0` | auto-expire cache |
| queries | `{ ideaId: 1, checklistHash: 1 }` | cache lookup |
| analyses | `{ repoId: 1, ideaId: 1, checklistHash: 1 }` | reuse recent analysis |
| analyses | `{ requestedBy: 1, createdAt: -1 }` | daily cap and history |

## 5. Relationships

| From | To | Link |
| --- | --- | --- |
| ideas | users | `ideas.userId` |
| queries | ideas | `queries.ideaId` |
| queries | users | `queries.userId` |
| queries | repositories | `queries.results[].repoId`, `queries.bestRepoId` |
| analyses | repositories | `analyses.repoId` |
| analyses | ideas | `analyses.ideaId` |
| analyses | users | `analyses.requestedBy` |

## 6. Key operations and the data they touch

| Operation | Reads | Writes |
| --- | --- | --- |
| Submit idea | none | ideas (draft) |
| Confirm checklist | ideas | ideas (confirmed, new checklistHash) |
| Search | queries (cache), repositories | queries |
| Auto-analysis | analyses (reuse), repositories | analyses, users.dailyAnalysisCount |
| Results page | queries, analyses, repositories | queries.bestRepoId |
| Founder Brief | analyses.founderBrief | none |
| Ingestion | repositories (etag, readmeHash) | repositories, ingestion_jobs |

## 7. Example documents

Idea (confirmed):

```json
{
  "userId": "665f...a1",
  "rawText": "An app where small shop owners track stock and get low-stock alerts on WhatsApp.",
  "refined": {
    "summary": "Inventory tracking with low-stock alerts for small shops.",
    "targetUsers": ["small shop owners"],
    "features": [
      {
        "id": "f1",
        "label": "Track stock levels",
        "plainDescription": "See how many of each item you have.",
        "keywords": ["inventory", "stock", "sku"],
        "priority": "must"
      }
    ]
  },
  "status": "confirmed",
  "checklistHash": "9c1e...ab"
}
```

Analysis (partial, trimmed):

```json
{
  "status": "partial",
  "coverage": { "score": 72.5, "features": [
    { "featureId": "f1", "status": "present",
      "evidence": [{ "type": "file", "ref": "src/models/stock.js", "snippet": "const stockSchema = ..." }] }
  ]},
  "bugRisk": { "penalty": 6, "openBugs": 4, "lintErrorsPer1k": 3.2, "ciConclusion": "success", "todoPer1k": 4.1 },
  "subScores": { "structure": 12, "bugRisk": 14, "deps": null, "docs": 8, "license": 15, "history": 7, "tests": 9 },
  "viability": 71,
  "confidence": 0.85,
  "verdict": "Usable with work",
  "flags": ["CI_FAILING"],
  "error": "dependency auditor timed out"
}
```

## 8. Data lifecycle and size notes

- Search cache expires automatically via the TTL index. Analyses are kept for history and evaluation.
- `readmeText` is capped in size at ingestion. Raw GitHub snapshots for the evaluation set go to `data/raw/` (gitignored), not the DB.
- Free Atlas M0 has a 512 MB limit. Keep `trace` summaries short and snippets at 200 characters or fewer.
- The TF-IDF index is **not** in MongoDB; it is a joblib file in the AI service volume, rebuilt from `repositories` (text = name + description + topics + README).
