# Chapter 7: Implementation

## 7.1. Technology Stack Implementation
The physical implementation of RepoRevive utilizes modern, battle-tested software engineering technologies across all layers:

- **Frontend**: TypeScript, React 18, Vite 5, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: TypeScript, Node.js 20 LTS, Express 4, Mongoose 8, Pino Logger, Zod.
- **AI Microservice**: Python 3.11, FastAPI, Pydantic v2, Scikit-learn 1.4, NLTK 3.8, Ruff, ESLint 8.
- **Database**: MongoDB Atlas 7.0 (Replica Set with SCRAM-SHA-256 authentication).
- **Containerization**: Multi-stage, unprivileged Docker containers (`nginx-unprivileged`, `node:20-alpine`, `python:3.11-slim`).

---

## 7.2. Critical Implementation Details

### 7.2.1. Distributed Tracing via Request ID Propagation
To maintain full observability across asynchronous job execution and microservice boundaries, RepoRevive enforces end-to-end distributed tracing:
1. When an incoming HTTP request hits the Express API Gateway, a middleware inspects the `X-Request-Id` header. If absent, a cryptographically secure UUID (`crypto.randomUUID()`) is generated.
2. The request ID is attached to the request context (`req.id`), reflected in the response header (`res.setHeader('X-Request-Id', req.id)`), and logged with every structured Pino entry.
3. Outgoing HTTP requests to the FastAPI microservice automatically inject `X-Request-Id` via an Axios interceptor.
4. FastAPI's logging middleware captures the ID and includes it in all agent trace outputs.

### 7.2.2. Prompt Injection Defense & Untrusted Code Delimitation
A fundamental vulnerability in LLM-assisted software analysis is prompt injection embedded in repository files (e.g., in `README.md` or code comments). RepoRevive implements a strict defense-in-depth sanitization protocol:
1. **Structural Delimitation**: Untrusted repository content is never concatenated directly into system prompt instructions. It is explicitly wrapped in XML-style structural tags (`<UNTRUSTED_REPO_FILE path="...">...</UNTRUSTED_REPO_FILE>`).
2. **Explicit LLM Meta-Instructions**: System prompts instruct the LLM to treat all text within untrusted delimiters as raw passive data to be parsed, never as commands or overrides.
3. **Deterministic Scorer Gate**: Even if an LLM is deceived into claiming that a missing feature is present, the **Verifier Agent** audits the claim against the repository's concrete directory tree. If the cited file path does not exist, the claim is dropped.

### 7.2.3. GitHub Rate-Limit Management & ETag Caching
The standard unauthenticated GitHub REST API enforces a strict rate limit of 60 requests/hour, while authenticated personal tokens permit 5,000 requests/hour. To maximize throughput and prevent rate exhaustion:
1. **ETag Conditional HTTP (`304 Not Modified`)**: All repository metadata and tree responses store their HTTP `ETag` in MongoDB. Subsequent queries pass `If-None-Match`. When the repository is unchanged, GitHub returns HTTP 304 with zero deduction from the rate-limit quota.
2. **Exponential Backoff**: If an HTTP 403 / 429 response is encountered, the client pauses execution according to the `x-ratelimit-reset` header, applying randomized exponential jitter before retrying.
3. **Windowed Star Sharding**: Because GitHub's search API truncates search results at 1,000 repositories, the ingestion runner splits ingestion into discrete star and date ranges (e.g., `stars:50..200 pushed:<2023-01-01`), guaranteeing complete corpus coverage.

### 7.2.4. Ephemeral Cold Start & Index Rebuilding
Deploying to free cloud tiers (Render) presents an ephemeral disk challenge: saved index files are deleted when inactive containers sleep. Instead of paying for persistent volumes or risking mount race conditions, RepoRevive rebuilds the TF-IDF matrix directly into container RAM upon startup:
- On cold boot, the AI microservice initializes an empty index.
- Upon receiving a search request or readiness probe (`/ready`), the indexer queries MongoDB for active repository feature documents.
- Scikit-learn fits the TF-IDF matrix for 5,000 repositories in **1.18 seconds**, utilizing under **35 MB of RAM**.
- The readiness probe returns HTTP 200 once vectorization completes, eliminating disk corruption risks completely.
