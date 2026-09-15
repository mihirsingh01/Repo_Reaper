# RepoRevive
> **Agentic AI Framework for Stale Repository Viability Analysis**  
> *B.Tech Final Year Capstone Project*

RepoRevive empowers non-technical founders to turn a plain-English software idea into a confirmed technical feature checklist, discover abandoned public GitHub repositories (>12 months inactive, $\ge 30$ commits) that match it, audit candidate codebases using read-only static AI agents, and receive one evidence-backed **Best Match**, a gap list, a revival plan, and an executive Founder Brief to hand to a freelance developer.

---

## 1. Core Principles & Non-Negotiable Rules

1. **Zero Execution Safety**: Never execute, build, install, or import third-party code from analyzed candidate repositories. Analysis is strictly static and read-only via GitHub API.
2. **Fixed Bug-Risk Linting**: Linting uses only OUR bundled, fixed configs (Ruff for Python, ESLint for JS/TS); candidate repository configs are explicitly ignored.
3. **Deterministic Scoring**: All scores, sub-scores, and penalties come from deterministic code in `scoring.py` adhering to `docs/SCORING_RUBRIC.md`. LLMs plan, extract, and explain; they **never** produce a number that is used.
4. **Independent Evidence Verification**: Every finding cites concrete evidence (file path, line range, snippet $\le 200$ chars). The independent Verifier drops unsupported claims; any feature marked "present" without a real file path is demoted to "missing".
5. **Untrusted Data Isolation**: Candidate repository content is treated as untrusted data wrapped in `<<<START_UNTRUSTED_*>>>` delimiters to eliminate prompt injection attacks.
6. **Commercial Safety**: License is prominently displayed on every match; `NO_LICENSE` and `CRITICAL_VULN` strictly disqualify a repository from being selected as the Best Match.

---

## 2. Founder UI Walkthrough

1. **Sign In / Registration (`/login`)**:
   - Access via founder credentials or seeded demo account (`founder@reporevive.test` / `FounderPass123!`).
2. **Step 1: Describe Idea (`/new`)**:
   - Type 30–2,000 characters in plain words, or select one of the 4 pre-configured presets (Inventory, Habit Tracker, Collaborative Whiteboard, URL Shortener).
   - Click **Generate Feature Checklist**.
3. **Step 2: Confirm Feature Checklist**:
   - The AI Refiner proposes 3–10 features with technical keywords without hallucinating unstated facts.
   - Interactive Checklist Editor allows renaming features, adding new ones, deleting, and toggling `must-have` (weighted 2x) vs `nice-to-have` (weighted 1x).
   - Click **Confirm Checklist & Start Search**.
4. **Step 3: Results & Live Polling (`/results/:id`)**:
   - Real-time progress bar monitors asynchronous multi-agent inspection across candidates.
   - **Hero Best Match Card**: Highlights feature coverage %, viability score, bug risk level, license safety chip (red warning if `NO_LICENSE`), and effort range.
   - **Alternative Candidates & More Matches**: Displays second/third choices and semantic keyword overlap chips (`why it matched`).
5. **Step 4: Deep Repository Report (`/analyses/:id`)**:
   - 7 in-depth inspection tabs:
     1. **Summary**: Overall verdict, scores, confidence level, and core facts.
     2. **Feature Coverage**: Present / partial / missing table with direct links to GitHub source lines and code snippets.
     3. **Bug Risk Signals**: Breakdown of open bug issues, CI status, static lint density, and TODO markers.
     4. **Sub-Scores Rubric**: Visual progress meters across 7 objective maintainability dimensions.
     5. **Dependencies**: Manifest inspection and OSV.dev vulnerability advisories.
     6. **Revival Roadmap**: Actionable engineering steps, estimated contractor hours, and technical risks.
     7. **Agent Trace**: Full telemetry timeline detailing every tool call, latency, and token consumption.
6. **Step 5: Executive Founder Brief (`/analyses/:id/brief`)**:
   - Read the structured Markdown brief.
   - Click **Download .md** or **Print / Save as PDF** to hand directly to a freelance engineer.

---

## 3. Architecture Topology

```
React + Vite + Tailwind (client, :5173)
       │
       ▼ (REST + Bearer JWT)
Node.js / Express API (server, :5000) ── owns all DB writes ──► MongoDB 7 (:27017)
       │
       ▼ (Internal REST, X-API-Key)
FastAPI AI Service (ai-service, :8000)
       ├── Idea Refiner (Stage A)
       ├── TF-IDF Synonym Indexer & Matcher (Stage A)
       └── Multi-Agent Framework & Verifier (Stage B)
```

---

## 4. Quickstart Guide

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB 7 (or running via Docker Compose)

### Running Services Locally

#### 1. Start Server & Seed Database
```powershell
cd server
npm install
npm run seed     # Seeds demo admin, founder, and 20 sample stale repos
npm run dev      # Starts Express API on http://localhost:5000
```

#### 2. Start AI Microservice
```powershell
cd ai-service
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Start React Client
```powershell
cd client
npm install
npm run dev      # Starts Vite dev server on http://localhost:5173
```

### Running Test Suites
```powershell
# Server Tests
npm test --prefix server

# AI Service Tests
cd ai-service && python -m pytest tests -v

# Client Tests
npm test --prefix client
```
