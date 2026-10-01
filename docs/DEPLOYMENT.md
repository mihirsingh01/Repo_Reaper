# RepoRevive Deployment & Infrastructure Guide

This document details the production deployment, infrastructure architecture, environment configurations, and operational procedures for **RepoRevive**.

---

## 1. Production Architecture Overview

RepoRevive follows a decoupled, service-oriented architecture designed for cost-efficient deployment across free/starter cloud tiers:

```
                            +---------------------------------------+
                            |            Founder Browser            |
                            +---------------------------------------+
                                                |
                               HTTPS (TLS 1.3)  |  Static Assets
                                                v
                               +---------------------------------+
                               |       Vercel Edge Network       |
                               |    (React 18 + Vite Frontend)   |
                               +---------------------------------+
                                                |
                               API Requests     |  /api/*
                                                v
                               +---------------------------------+
                               |        Render Web Service       |
                               |   (Node 20 / Express Gateway)   |
                               +---------------------------------+
                                       |                 |
                   Internal HTTP w/    |                 | Mongoose
                   X-API-Key + ReqID   |                 | TLS SRV
                                       v                 v
                      +----------------------+   +-----------------------+
                      |  Render Web Service  |   |     MongoDB Atlas     |
                      |  (FastAPI AI Engine) |   |    (M0 Free Cluster)  |
                      +----------------------+   +-----------------------+
                                       |
                   Outbound Static     | Rate-limited, ETag cached
                   Inspection Requests v
                      +----------------------+
                      |    External APIs     |
                      |  GitHub / OSV / PyPI |
                      +----------------------+
```

---

## 2. Platform Selection & Justification

| Component | Target Platform | Tier | Technical & Economic Justification |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | Hobby (Free) | Global edge CDN, automated HTTPS, zero-config SPA routing (`vercel.json`), fast asset compilation. |
| **Express Gateway** | **Render** | Free Web Service | Dockerized runtime, automated git deployment, integrated SSL termination, native environment secret injection. |
| **FastAPI AI Service**| **Render** | Free Web Service | Isolated Python 3.11 container with pre-compiled C-extensions (NLTK, NumPy, Scikit-learn), internal service networking. |
| **Database** | **MongoDB Atlas**| M0 Sandbox (Free) | Managed multi-AZ replica set, automated backups, TLS encryption in transit & rest, SCRAM-SHA-256 authentication. |

---

## 3. Environment Variable Matrix

All secrets must be injected through platform environment managers. **Never commit `.env` files to source control.**

### 3.1. Express Server (`server/`)

| Variable | Description | Development Default | Staging | Production | Secret? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `development` | `staging` | `production` | No |
| `PORT` | Local listen port | `5000` | `5000` | `5000` | No |
| `MONGODB_URI` | MongoDB Atlas SRV URI | `mongodb://localhost:27017/reporevive` | `mongodb+srv://...` | `mongodb+srv://...` | **YES** |
| `JWT_SECRET` | Signing key for auth tokens | `reporevive-dev-jwt-secret...` | 64-char hex string | 64-char random hex | **YES** |
| `JWT_EXPIRES_IN`| Token validity period | `7d` | `7d` | `7d` | No |
| `CORS_ORIGIN` | Allowed client origin | `http://localhost:5173` | `https://staging.reporevive.vercel.app` | `https://reporevive.vercel.app` | No |
| `AI_SERVICE_URL` | Upstream FastAPI URL | `http://localhost:8000` | `https://reporevive-ai-staging.onrender.com` | `https://reporevive-ai.onrender.com` | No |
| `AI_SERVICE_API_KEY` | Shared internal API key | `reporevive-internal-ai-...`| 32-char secret token | 32-char random token | **YES** |
| `GITHUB_TOKEN` | Read-only GitHub PAT | None / Optional personal token | Read-only bot PAT | Read-only fine-grained PAT | **YES** |
| `DAILY_ANALYSIS_CAP_PER_USER` | Max analyses per user/day | `15` | `15` | `10` | No |
| `LLM_SPEND_KILL_SWITCH` | Global emergency spend halt | `false` | `false` | `false` (set `true` to halt) | No |
| `MAX_BODY_SIZE_KB` | HTTP payload ceiling | `100` | `100` | `100` | No |

### 3.2. FastAPI AI Service (`ai-service/`)

| Variable | Description | Development Default | Staging | Production | Secret? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `AI_HOST` | Network bind address | `0.0.0.0` | `0.0.0.0` | `0.0.0.0` | No |
| `AI_PORT` | Local listen port | `8000` | `8000` | `8000` | No |
| `API_KEY` | Service authentication key | `reporevive-internal-ai-...`| Matched to Server key | Matched to Server key | **YES** |
| `LLM_PROVIDER` | Active LLM inference driver | `mock` | `mock` or `anthropic` | `anthropic` or `openai_compatible` | No |
| `ANTHROPIC_API_KEY`| Anthropic Claude API Key | None | Optional | `sk-ant-api03-...` | **YES** |
| `OPENAI_API_KEY` | OpenAI API Key (fallback) | None | Optional | `sk-...` | **YES** |
| `GITHUB_TOKEN` | Read-only GitHub PAT | None | Read-only bot PAT | Read-only fine-grained PAT | **YES** |
| `LLM_SPEND_KILL_SWITCH` | Internal model spend circuit | `false` | `false` | `false` | No |
| `INDEX_DIR` | In-memory/local index cache | `./data/index` | `./data/index` | `/tmp/index` | No |

### 3.3. React Client (`client/`)

| Variable | Description | Development Default | Staging | Production | Secret? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Express API base endpoint | `http://localhost:5000/api` | `https://reporevive-server.onrender.com/api` | `https://reporevive-server.onrender.com/api` | No |

---

## 4. Cold Starts & The TF-IDF Index Strategy (Viva Defense)

### 4.1. Problem Statement
On free-tier PaaS environments (such as Render free web services), container instances spin down to zero after 15 minutes of inbound inactivity. Cold starts take between 45 and 90 seconds. Additionally, free instances provide **ephemeral filesystem storage**; any file saved to disk is wiped when the container sleeps or restarts.

### 4.2. Evaluated Architectural Options
1. **Option A: Persistent Cloud Volume (Render Disks)**
   - *Pros*: Index files (`tfidf_model.pkl`, `vocab.json`) remain saved across restarts.
   - *Cons*: Persistent disks cost $0.25/GB/month (incurring ongoing project fees), are restricted to single-container mounts (blocking horizontal autoscaling), and risk index corruption if an ingestion job crashes mid-write.
2. **Option B: Dynamic Boot Rebuild from MongoDB (Chosen Strategy)**
   - *Pros*:
     - **Zero Added Cost**: Functions entirely within free-tier container memory.
     - **Deterministic Consistency**: Eliminates stale or orphaned disk states; every container boots against the single authoritative source of truth in MongoDB.
     - **High Performance**: Vectorizing 5,000 repository feature texts (tokens, stop-words, stemmed lemmas) using Scikit-learn's sparse matrix operations takes **~1.2 seconds** and consumes under **35 MB of RAM**.
     - **Self-Healing**: If the index is empty, the server automatically issues a synchronous rebuild call upon the first search query or during readiness probe execution.

### 4.3. Cold Start Founder Experience
To prevent non-technical founders from experiencing silent timeout failures during cold starts:
1. The React client intercepts HTTP 503 and network timeout errors from the API.
2. If the health probe reports `status: "waking_up"`, the UI renders a warm animated banner:
   > *"RepoRevive is spinning up its secure analysis containers (approx. 45s on free tier). Please keep this tab open..."*
3. The client initiates exponential-backoff polling (2s, 4s, 8s) until `/api/ready` yields HTTP 200.

---

## 5. MongoDB Atlas Setup & Hardening

Follow these steps to deploy a production-grade, hardened MongoDB cluster:

1. **Cluster Provisioning**:
   - Create a free `M0 Sandbox` cluster in the cloud provider region closest to your Render services (e.g., AWS `us-east-1` or `us-west-2`).
2. **Least-Privilege Database User**:
   - Do NOT use the cluster administrator user.
   - Navigate to **Database Access** -> **Add New Database User**.
   - Authentication Method: **Password** (generate a 32-character random string).
   - Database User Privileges: Select **Built-in Role** -> **Read and write to any database** (or restrict explicitly to `reporevive`).
   - Restrict user permissions so this account cannot drop the cluster, manage users, or view Atlas billing.
3. **Network Access & IP Allow-Listing**:
   - Because Render free-tier containers use dynamic egress IP pools, configure an IP Access List entry with:
     - IP Address: `0.0.0.0/0` (with comment: `Render dynamic web services`).
   - *Defense-in-depth justification*: Because the IP range is open, security is enforced via:
     - Mandatory TLS 1.3 encryption for all wire communication (`mongodb+srv://...`).
     - Strong SCRAM-SHA-256 credential hashing.
     - IP allow-list can be restricted to Render outbound NAT IPs if upgraded to Render Team/Static Egress.
4. **Index Optimization**:
   Ensure MongoDB indexes are applied on startup (handled automatically by Mongoose models in `server/src/models/`):
   ```javascript
   db.repositories.createIndex({ "staleMetrics.isStale": 1, "githubMetrics.stars": -1 });
   db.repositories.createIndex({ "githubMetrics.primaryLanguage": 1 });
   db.analyses.createIndex({ repoId: 1, ideaId: 1 }, { unique: true });
   ```

---

## 6. Secret Rotation Procedures

In the event of a compromised secret or scheduled security rotation:

### 6.1. GitHub Personal Access Token (PAT)
1. Generate a new fine-grained GitHub PAT with **Read-only access to public repositories**.
2. Update `GITHUB_TOKEN` in Render dashboard for `reporevive-server` and `reporevive-ai-service`.
3. Trigger a manual redeploy.
4. Verify the new token by hitting `/api/admin/system-status` (check `gitHubRateLimit.remaining`).
5. Revoke the old PAT in the GitHub Developer Settings.

### 6.2. JWT Secret
1. Generating a new `JWT_SECRET` immediately invalidates all active founder browser sessions.
2. In Render dashboard, generate a new 64-character random string for `JWT_SECRET`.
3. Save and redeploy. Users will be prompted to re-login on their next authenticated action.

### 6.3. AI Service Internal API Key (`X-API-Key`)
1. Update `AI_SERVICE_API_KEY` in `reporevive-ai-service` and `reporevive-server` simultaneously in Render.
2. Trigger deployment. The services will boot with the new synchronized key.

---

## 7. Zero-Downtime Deployment Runbook

1. **Step 1**: Commit and push changes to `main` branch on GitHub.
2. **Step 2**: Render detects commit and initiates multi-stage Docker builds for `server` and `ai-service`.
3. **Step 3**: The container executes the `HEALTHCHECK` command (`/api/health` and `/health`).
4. **Step 4**: Render traffic router switches from old containers to new containers only after the health probe returns HTTP 200.
5. **Step 5**: Vercel automatically deploys the frontend and updates edge cache headers.
