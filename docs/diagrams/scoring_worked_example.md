# Deterministic Scoring: Step-by-Step Worked Example

This document provides an exact, reproducible numerical trace of RepoRevive's scoring engine adhering to `docs/SCORING_RUBRIC.md`.

---

## 1. Scenario Setup

A non-technical founder submits an idea: **"A lightweight collaborative kanban board with real-time sync, markdown notes, and user authentication."**

### 1.1. Founder's Confirmed Feature Checklist
| Feature ID | Label | Priority | Priority Weight ($w_i$) |
| :--- | :--- | :--- | :--- |
| `feat_1` | Real-time Kanban Board | Must-Have | 1.0 |
| `feat_2` | User Authentication (JWT) | Must-Have | 1.0 |
| `feat_3` | Collaborative Sync (WebSockets) | Must-Have | 1.0 |
| `feat_4` | Markdown Card Notes | Nice-to-Have | 0.5 |
| `feat_5` | Dark Mode Theme | Nice-to-Have | 0.5 |

**Total Maximum Feature Weight**:
$$W_{\text{total}} = 1.0 + 1.0 + 1.0 + 0.5 + 0.5 = 4.0$$

---

## 2. Candidate Evaluation: `octocat/kanban-lite`

- **GitHub Stats**: 450 stars, 82 forks, 140 total commits.
- **Last Commit**: 22 months ago (stale criterion met: $> 12$ months, $\ge 30$ commits).
- **SPDX License**: `MIT` (Permissive).
- **Primary Language**: TypeScript / Node.js.
- **NLP Relevance Score**: $0.820$ (Cosine similarity from TF-IDF vectorizer).

---

## 3. Step 1: Feature Coverage Computation

The **Coverage Agent** inspects the repository tree and fetches file contents. The **Verifier Agent** confirms line and file grounding:

| Feature ID | Verified Status | Status Multiplier ($s_i$) | File Evidence Ref |
| :--- | :--- | :--- | :--- |
| `feat_1` (Board) | **Present** | $1.0$ | `src/components/Board.tsx:L14-L85` |
| `feat_2` (Auth) | **Present** | $1.0$ | `src/middleware/auth.ts:L8-L42` |
| `feat_3` (WebSockets) | **Partial** | $0.5$ | Polling used instead of WS in `src/sync.ts` |
| `feat_4` (Markdown) | **Present** | $1.0$ | `src/utils/markdown.ts:L5-L25` |
| `feat_5` (Dark Mode) | **Missing** | $0.0$ | No theme toggle found in styles |

### Coverage Score Formula:
$$\text{Coverage Score} = \left(\frac{\sum_{i=1}^n w_i \times s_i}{\sum_{i=1}^n w_i}\right) \times 100$$

$$\text{Weighted Points Earned} = (1.0 \times 1.0) + (1.0 \times 1.0) + (1.0 \times 0.5) + (0.5 \times 1.0) + (0.5 \times 0.0)$$
$$\text{Weighted Points Earned} = 1.0 + 1.0 + 0.5 + 0.5 + 0.0 = 3.0$$

$$\text{Coverage Score} = \left(\frac{3.0}{4.0}\right) \times 100 = \mathbf{75.00\%}$$

---

## 4. Step 2: Bug Risk Penalty Computation

The **Bug Risk Agent** runs fixed linter configurations (Ruff / ESLint) on fetched source samples and inspects historical issues:

| Metric | Raw Observed Value | Penalty Threshold / Multiplier | Points Deducted |
| :--- | :--- | :--- | :--- |
| **Open Issues with "bug" label** | 3 open bugs | 2.0 pts per bug | $3 \times 2.0 = 6.0$ pts |
| **Static Lint Errors** | 12 errors in 2,500 LOC (4.8 per 1k LOC) | 1.5 pts per error/1k LOC | $4.8 \times 1.5 = 7.2$ pts |
| **Last CI Run Status** | `failure` | 5.0 pts fixed penalty | $5.0$ pts |
| **TODO / FIXME Density** | 8 TODOs in 2,500 LOC (3.2 per 1k LOC) | 0.5 pts per TODO/1k LOC | $3.2 \times 0.5 = 1.6$ pts |

### Raw Bug Penalty:
$$\text{Raw Penalty} = 6.0 + 7.2 + 5.0 + 1.6 = 19.8\text{ points}$$

$$\text{Bug Risk Penalty} = \min(40.0, 19.8) = \mathbf{19.80\text{ points}}$$

---

## 5. Step 3: Health Sub-scores Computation (0–100 Scale)

The specialized agents inspect repository structure, dependencies, license, documentation, commit history, and test suites:

| Sub-score Dimension | Evaluating Agent | Score | Observed Basis |
| :--- | :--- | :--- | :--- |
| **Structure ($S_{\text{struct}}$)** | Structure Agent | 85 | Clear `src/`, modular components, standard package layout. |
| **Dependencies ($S_{\text{deps}}$)** | Dependencies Agent | 65 | Outdated React 16; zero critical CVEs on OSV.dev. |
| **License ($S_{\text{lic}}$)** | License Agent | 100 | Permissive MIT license with valid LICENSE file. |
| **Documentation ($S_{\text{docs}}$)** | Scout Agent | 75 | Comprehensive README with setup steps and API docs. |
| **Commit History ($S_{\text{hist}}$)** | Scout Agent | 70 | 140 total commits across 18 active development months. |
| **Test Suite ($S_{\text{tests}}$)** | Structure Agent | 50 | Jest config found; unit tests present for auth only. |

### Baseline Technical Health:
$$\text{Base Health} = (0.20 \times 85) + (0.20 \times 65) + (0.20 \times 100) + (0.15 \times 75) + (0.10 \times 70) + (0.15 \times 50)$$
$$\text{Base Health} = 17.0 + 13.0 + 20.0 + 11.25 + 7.0 + 7.5 = \mathbf{75.75}$$

---

## 6. Step 4: Repository Viability Score

Viability represents overall technical revival feasibility after subtracting detected bug risks:

$$\text{Viability} = \max\left(0.0, \min\left(100.0, \text{Base Health} - \text{Bug Penalty}\right)\right)$$
$$\text{Viability} = \max\left(0.0, \min\left(100.0, 75.75 - 19.80\right)\right) = \mathbf{55.95\%}$$

### Verdict Determination:
Based on `SCORING_RUBRIC.md`:
- $\text{Viability} \ge 70$: `RECOMMENDED`
- $50 \le \text{Viability} < 70$: **`VIABLE_WITH_EFFORT`**
- $35 \le \text{Viability} < 50$: `HIGH_RISK`
- $\text{Viability} < 35$: `DO_NOT_RECOMMEND`

$$\mathbf{Verdict = \text{"VIABLE\_WITH\_EFFORT"}}$$

---

## 7. Step 5: Composite Ranking Score

The **Ranking Engine** (`server/src/services/ranking.ts`) weights NLP semantic relevance ($0.40$), feature coverage ($0.30$), and technical viability ($0.30$):

$$\text{Composite Rank} = (0.40 \times \text{Relevance}) + (0.30 \times \frac{\text{Coverage}}{100}) + (0.30 \times \frac{\text{Viability}}{100})$$
$$\text{Composite Rank} = (0.40 \times 0.820) + (0.30 \times 0.750) + (0.30 \times 0.5595)$$
$$\text{Composite Rank} = 0.3280 + 0.2250 + 0.16785 = \mathbf{0.72085}\quad (72.09\%)$$

---

## 8. Step 6: Disqualification Safety Gates

Before anointing `octocat/kanban-lite` as the **Best Match**:
1. **License Check**: License is `MIT` $\neq$ `NO_LICENSE` $\implies$ **PASSED**.
2. **Critical Vulnerability Check**: OSV.dev reported zero `CRITICAL` severity CVEs $\implies$ **PASSED**.
3. **Stale Threshold**: Months since last commit is $22 \ge 12$ $\implies$ **PASSED**.

**Final Result**: `octocat/kanban-lite` successfully qualifies as the **Best Match** candidate with a composite score of **72.1%**.
