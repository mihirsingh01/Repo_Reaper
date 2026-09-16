# RepoRevive – ER Diagram

Source of truth: `docs/DATA_MODEL.md`.

Database: MongoDB 7. Six collections. Some entities below are **embedded sub-documents** (marked EMBEDDED), not separate collections.

## 1. Collection-level ER diagram

```mermaid
erDiagram
    USERS ||--o{ IDEAS : submits
    USERS ||--o{ QUERIES : runs
    USERS ||--o{ ANALYSES : requests
    IDEAS ||--o{ QUERIES : "searched by"
    IDEAS ||--o{ ANALYSES : "analysed for"
    REPOSITORIES ||--o{ ANALYSES : "is analysed in"
    REPOSITORIES ||--o{ QUERY_RESULTS : "appears in"
    QUERIES ||--|{ QUERY_RESULTS : "embeds top 20"
    IDEAS ||--|{ IDEA_FEATURES : "embeds checklist"
    ANALYSES ||--o{ FINDINGS : "embeds"
    ANALYSES ||--o{ TRACE_STEPS : "embeds"
    ANALYSES ||--o{ COVERAGE_FEATURES : "embeds"
    INGESTION_JOBS ||..o{ REPOSITORIES : "upserts (logical)"

    USERS {
        ObjectId _id PK
        string name
        string email UK
        string passwordHash
        string role "founder or admin"
        int dailyAnalysisCount
        date createdAt
    }

    IDEAS {
        ObjectId _id PK
        ObjectId userId FK
        string rawText "30-2000 chars"
        string summary
        string_array targetUsers
        string status "draft, confirmed, searching, done"
        string checklistHash
        date createdAt
        date updatedAt
    }

    IDEA_FEATURES {
        string id "EMBEDDED in IDEAS.refined.features"
        string label
        string plainDescription
        string_array keywords
        string priority "must or nice"
    }

    REPOSITORIES {
        ObjectId _id PK
        int githubId UK
        string fullName
        string url
        string description
        string_array topics
        string language
        string licenseSpdx
        string licenseName
        int stars
        int forks
        int openIssues
        int openBugIssues
        int closedBugIssues
        string lastCiConclusion
        string defaultBranch
        bool archived
        date createdAt
        date pushedAt
        date lastCommitAt
        int commitCount
        int contributorCount
        string readmeText
        string readmeHash
        string etag
        date fetchedAt
        date indexedAt
    }

    QUERIES {
        ObjectId _id PK
        ObjectId ideaId FK
        ObjectId userId FK
        string expandedQuery
        string checklistHash
        ObjectId bestRepoId FK
        date createdAt
        date expiresAt "TTL index"
    }

    QUERY_RESULTS {
        ObjectId repoId FK "EMBEDDED in QUERIES.results"
        float relevance
        string_array matchedTerms
        ObjectId analysisId FK "optional"
        float coverage "optional"
        float viability "optional"
        float final "optional"
    }

    ANALYSES {
        ObjectId _id PK
        ObjectId repoId FK
        ObjectId ideaId FK
        string checklistHash
        ObjectId requestedBy FK
        string status "queued, running, done, failed, partial"
        date startedAt
        date finishedAt
        object facts
        float coverageScore
        object bugRisk "penalty, openBugs, lintErrorsPer1k, ciConclusion, todoPer1k"
        object subScores "structure, bugRisk, deps, docs, license, history, tests"
        float viability
        float confidence
        string verdict
        string_array flags
        object revivalPlan "gaps, steps, effortHours, risks"
        string founderBrief "markdown"
        object tokenUsage
        string error
    }

    COVERAGE_FEATURES {
        string featureId "EMBEDDED in ANALYSES.coverage.features"
        string status "present, partial, missing"
        object_array evidence
    }

    FINDINGS {
        string agent "EMBEDDED in ANALYSES.findings"
        string claim
        string severity
        object_array evidence "type, ref, snippet <= 200 chars"
    }

    TRACE_STEPS {
        int step "EMBEDDED in ANALYSES.trace"
        string agent
        string tool
        string argsSummary
        string resultSummary
        int tokensIn
        int tokensOut
        int latencyMs
    }

    INGESTION_JOBS {
        ObjectId _id PK
        string status
        string paramsLanguage
        string paramsWindow
        int countsSeen
        int countsKept
        int countsRejected
        object byReason
        date startedAt
        date finishedAt
        string error
    }
```
