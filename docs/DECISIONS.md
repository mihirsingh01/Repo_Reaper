# Architectural Decision Records (ADRs)

## ADR-001: Static and Read-Only Repository Analysis
- **Status**: Accepted
- **Context**: Analysing third-party abandoned code is hazardous. Building, installing, or executing arbitrary dependencies can expose the host to vulnerabilities or execution attacks.
- **Decision**: Perform purely static, read-only analysis using GitHub API inspection, AST parsing, and read-only registry lookups. Never clone and run arbitrary code.
- **Consequences**: Complete execution safety and predictable resource consumption.

## ADR-002: Deterministic Scoring via Code
- **Status**: Accepted
- **Context**: LLMs exhibit non-deterministic outputs and hallucinations when generating numerical ratings.
- **Decision**: All scores, viability ratings, and penalties must be calculated in deterministic code (`scoring.py`). The LLM plans, extracts facts, and writes explanations, but never outputs final scores.
- **Consequences**: 100% reproducible results for identical repository facts and features.

## ADR-003: Custom Orchestrator Instead of Heavy Frameworks
- **Status**: Accepted
- **Context**: Frameworks like LangChain or CrewAI introduce large dependency graphs, unpredictable prompt bloat, and rigid abstractions that are difficult to explain in an academic viva.
- **Decision**: Build a lightweight, custom Python orchestrator using httpx, Pydantic, and an explicit worker loop.
- **Consequences**: Full transparency, zero opaque magic, bounded token/step budgets, easily defended in viva.

## ADR-004: TF-IDF Baseline with Embeddings as Measured Upgrade
- **Status**: Accepted
- **Context**: Heavy vector databases introduce operational overhead, cold starts, and cost.
- **Decision**: Baseline retrieval uses classical TF-IDF with scikit-learn, NLTK stop-words, and cosine similarity. Dense embeddings can be benchmarked as an optional upgrade in RQ1.
- **Consequences**: Fast, zero-cost, reproducible search that runs locally in-memory or via joblib.

## ADR-005: MongoDB Document Database
- **Status**: Accepted
- **Context**: Ideas, checklists, findings, and analysis reports naturally map to hierarchical JSON documents with variable fields.
- **Decision**: Use MongoDB 7 (Mongoose ODM). Embed atomic, co-queried sub-documents (features, results, trace steps, findings) while referencing top-level entities (users, ideas, repos, queries, analyses).
- **Consequences**: Natural JSON serialization, atomic updates, and simple TTL indexing.

## ADR-006: Server Owns All Database Writes
- **Status**: Accepted
- **Context**: Direct DB writes from multiple services create race conditions and security vulnerabilities.
- **Decision**: Express API owns 100% of MongoDB writes. The FastAPI AI service is strictly stateless (except its local TF-IDF index file).
- **Consequences**: Centralized authentication, validation (Zod), and rate-limiting.

## ADR-007: Founder Confirms Refined Checklist
- **Status**: Accepted
- **Context**: Raw user ideas are often ambiguous, vague, or lack technical keywords.
- **Decision**: An interactive step where the AI Refiner proposes a must/nice checklist, which the founder must review, edit, and confirm before search begins.
- **Consequences**: High precision in search query expansion and unambiguous evaluation targets.

## ADR-008: "Fewest Bugs" Means Verifiable Bug Signals
- **Status**: Accepted
- **Context**: Proving code is free of bugs is theoretically impossible (Halting Problem).
- **Decision**: Redefine "fewest bugs" as fewest *verifiable bug signals*: open bug-labeled issues, lint errors under our fixed rules, failing last CI, and high TODO density.
- **Consequences**: Scientifically honest metric defendable in academic examination.

## ADR-009: Auto-Analyse Top 5 with Daily Cap
- **Status**: Accepted
- **Context**: Deep multi-agent analysis consumes LLM tokens and API calls.
- **Decision**: Ingest/search top 20 candidates, but automatically trigger deep analysis only for top 5, with a daily cap of 15 analyses per user.
- **Consequences**: Predictable costs and manageable wait times (< 4 minutes per batch).

## ADR-010: Polling over WebSockets / Server-Sent Events
- **Status**: Accepted
- **Context**: WebSockets require stateful connection tracking and proxy configurations.
- **Decision**: Use HTTP polling with exponential backoff on `GET /api/ideas/:id/results`.
- **Consequences**: Robust against network blips, highly cacheable, simple client implementation.

## ADR-011: Repo Content is Untrusted Data
- **Status**: Accepted
- **Context**: Analyzed repos could contain prompt-injection payloads in READMEs or code comments.
- **Decision**: Treat all repository text as untrusted. Wrap in distinct delimiters before prompt inclusion, and ensure agents have read-only tools so injections cannot trigger side-effects.
- **Consequences**: Immune to malicious instructions hijacking orchestration flow.

## ADR-012: JWT Bearer Header Authentication over HttpOnly Cookies
- **Status**: Accepted
- **Context**: Authentication tokens can be transmitted either via httpOnly cookies or Authorization Bearer headers.
- **Decision**: Use standard `Authorization: Bearer <token>` headers.
- **Consequences**: Simplifies client-server cross-origin calls (Vite dev server on 5173 to Express API on 5000), enables clean automated integration testing in Supertest without cookie jars, avoids CSRF attack vectors entirely, and is straightforward to defend in a viva examination.

