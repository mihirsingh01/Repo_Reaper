# RepoRevive API Endpoint Map

Comprehensive map of all REST and internal HTTP endpoints across the **Express API Gateway** (`server/`) and **FastAPI AI Microservice** (`ai-service/`).

---

## 1. Express API Gateway (`http://localhost:5000/api`)

### 1.1. System & Observability
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Liveness probe; reports status of Server, MongoDB, and AI Service. |
| `GET` | `/api/ready` | Public | Readiness probe (returns 200 when MongoDB and AI service are ready, 503 during cold starts). |
| `GET` | `/api/metrics` | Public / Admin | Operational metrics: latency, error rate, search cache hits, tokens, memory. |

### 1.2. Authentication (`/api/auth`)
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new user (`email`, `password`, `name`). Returns JWT and User profile. |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials. Returns JWT token and User profile. |
| `GET` | `/api/auth/me` | Authenticated | Retrieve current user profile, daily analysis usage, and role. |

### 1.3. Ideas & Checklists (`/api/ideas`)
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ideas` | Authenticated | Submit plain-English idea (30–2000 chars); calls AI refiner; returns draft idea. |
| `GET` | `/api/ideas` | Authenticated | List all ideas submitted by current user (sorted newest first). |
| `GET` | `/api/ideas/:id` | Authenticated | Get single idea with confirmed features and checklist hash. |
| `PATCH` | `/api/ideas/:id` | Authenticated | Update idea status (`draft` $\to$ `confirmed`), summary, or feature priority. |

### 1.4. Search & Recommendations (`/api/ideas`)
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ideas/:id/search` | Authenticated | Execute candidate search for confirmed idea; checks cache; dispatches analyses. |
| `GET` | `/api/ideas/:id/results` | Authenticated | Polling endpoint for ranked search results, best match, and progress. |
| `GET` | `/api/ideas/:id/brief` | Authenticated | Get consolidated founder brief for top match of the idea. |

### 1.5. Deep Analyses (`/api/analyses`)
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/analyses/:id` | Authenticated | Fetch full 7-dimension analysis report, agent findings, evidence, and viability. |

### 1.6. Repositories (`/api/repositories`)
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/repositories` | Authenticated | Query ingested repositories with filters (`language`, `minStars`, `isStale`). |
| `GET` | `/api/repositories/:id` | Authenticated | Get detailed metadata and stale metrics for a single repository. |

### 1.7. Administration (`/api/admin`)
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/admin/ingest` | Admin | Trigger background GitHub ingestion run (`language`, `window`, `maxRepos`). |
| `GET` | `/api/admin/ingest/:jobId` | Admin | Get live status and counter statistics of an ingestion job. |
| `GET` | `/api/admin/system-status` | Admin | Comprehensive system status: token audit, rates, service health, DB counts. |
| `POST` | `/api/admin/kill-switch` | Admin | Activate or deactivate global LLM spend kill-switch (`{ active: boolean }`). |

---

## 2. FastAPI AI Microservice (`http://localhost:8000`)

Protected via internal header: `X-API-Key: <AI_SERVICE_API_KEY>` and traced via `X-Request-Id`.

### 2.1. System
| Method | Endpoint | Headers | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | None | Service liveness probe and index vector dimensions. |
| `GET` | `/ready` | None | Readiness probe verifying model weights and index load status. |

### 2.2. Idea Refiner (`/ideas`)
| Method | Endpoint | Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/ideas/refine` | `X-API-Key` | Deconstructs unstructured English text into structured feature checklist. |

### 2.3. NLP Matching & Indexing (`/nlp`)
| Method | Endpoint | Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/nlp/match` | `X-API-Key` | Computes cosine similarity between query feature vector and TF-IDF index. |
| `POST` | `/index/build` | `X-API-Key` | Builds or updates in-memory Scikit-learn sparse TF-IDF index from repository documents. |

### 2.4. Agent Orchestration (`/agents`)
| Method | Endpoint | Headers | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/agents/analyze` | `X-API-Key` | Dispatches 8 read-only agents, runs verifier, and outputs deterministic scores. |
