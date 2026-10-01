# B.Tech Final Year Viva Defense: 10-Slide Presentation Outline

**Project Title**: RepoRevive: Agentic AI Framework for Stale Repository Viability Analysis  
**Degree**: Bachelor of Technology in Computer Science & Engineering  
**Presentation Duration**: 15 minutes (10 min presentation + 5 min demo) + 10 min Q&A  

---

### Slide 1: Title & Overview
- **Header**: RepoRevive: Agentic AI Framework for Stale Repository Viability Analysis
- **Subtitle**: Automated Discovery, Semantic Matching, and Static Viability Auditing of Dormant Open-Source Software
- **Presenters**: Team of 3 Undergraduate Students
- **Core Thesis**: *Over 80% of public GitHub repositories are abandoned yet contain thousands of hours of viable code. RepoRevive enables non-technical founders to discover, evaluate, and revive matching codebases safely without writing code or executing untrusted files.*

---

### Slide 2: The Problem: The Founder's Dilemma
- **Non-Technical Barrier**: Founders describe products in business terms; GitHub search requires code-level keywords.
- **Untrusted Execution Hazard**: Building and running abandoned repos risks malicious scripts and encounters Turing's Halting Problem.
- **LLM Hallucination Trap**: Generic LLMs hallucinate file paths, flatter broken code (sycophancy), and invent arbitrary scores.
- **The Stale Code Opportunity**: Codebases with $\ge 30$ commits and $> 12$ months of dormancy represent mature, free baselines.

---

### Slide 3: System Architecture
- **Three-Tier Decoupled Design**:
  - *Client*: React 18 + Vite + Tailwind CSS (plain-language founder UX).
  - *Gateway*: Node 20 / Express API (JWT auth, caching, rate limiting, MongoDB Atlas).
  - *AI Engine*: Python 3.11 / FastAPI (NLTK NLP, Scikit-learn TF-IDF, 8 read-only agents).
- **Security Boundary**: Zero code execution, immutable linter configs, strict prompt delimitation.

---

### Slide 4: NLP Information Retrieval Pipeline
- **Linguistic Preprocessing**: Tokenisation, domain stop-word filtering, Porter stemming, WordNet lemmatisation.
- **Synonym Expansion**: Domain thesaurus mapping business terms to engineering keywords (e.g., "invoicing" $\to$ "stripe", "billing", "pdf").
- **Sparse TF-IDF & Cosine Similarity**: Millisecond retrieval across 5,000 indexed repositories; avoids heavy GPU server costs.
- **Empirical IR Gain**: **Recall@10 increases from 52% to 93%** over raw GitHub search.

---

### Slide 5: Multi-Agent Analysis Framework
- **Eight Specialized Read-Only Agents**:
  1. *Scout*: Validates dormancy criteria ($\ge 12$ mo, $\ge 30$ commits).
  2. *Structure*: Analyzes tree depth, framework, and modularity.
  3. *Coverage*: Maps confirmed features to concrete source files.
  4. *Bug Risk*: Inspects lint error density, open bug issues, CI failure history, and TODO density.
  5. *Dependencies*: Audits package manifests and queries OSV.dev for CVEs.
  6. *License*: Identifies SPDX legal terms and flags copyleft restrictions.
  7. *Verifier*: Audits citations against file trees; drops phantom claims.
  8. *Revival Planner*: Compiles gap list, estimates hours, and drafts Founder Brief.

---

### Slide 6: Anti-Hallucination & Prompt Injection Hardening
- **The Verifier Agent**: Any agent claim asserting a feature exists without an actual file path in the Git tree is discarded.
  - *Result*: **Reduces hallucination false-positive rate from 28.6% to 3.2%**.
- **Prompt Injection Delimitation**: Repository content is isolated inside `<UNTRUSTED_REPO_FILE>` delimiters.
- **Token Scope Hardening**: System verifies GitHub tokens are strictly public read-only (`x-oauth-scopes`).

---

### Slide 7: Deterministic Scoring Engine
- **Core Principle**: LLMs extract and explain; mathematical formulas produce 100% of score numbers.
  - $\text{Coverage Score} = \left(\frac{\sum w_i \cdot s_i}{\sum w_i}\right) \times 100$ (Must=1.0, Nice=0.5).
  - $\text{Bug Risk Penalty} = \min(40.0, 2.0 N_{\text{bugs}} + 1.5 \frac{\text{Lint}}{\text{kLOC}} + 5.0 \mathbb{I}_{\text{fail}} + 0.5 \frac{\text{TODO}}{\text{kLOC}})$.
  - $\text{Viability Score} = \max(0.0, \min(100.0, \text{Base Health} - \text{Bug Penalty}))$.
  - $\text{Composite Rank} = 0.40 \cdot \text{Rel} + 0.30 \cdot \text{Cov} + 0.30 \cdot \text{Viab}$.
- **Safety Gates**: `NO_LICENSE` and `CRITICAL_VULN` immediately block the Best Match hero spot.

---

### Slide 8: Empirical Validation & Research Questions
- **RQ1 (Retrieval)**: Recall@10 = 0.930, MRR = 0.765 (41% boost over baseline).
- **RQ2 (Grounding)**: 96.8% precision with 97 hallucinated claims dropped.
- **RQ3 (Determinism)**: Standard deviation $\sigma = 0.00$ across 50 repeated evaluations (vs $\sigma = \pm 8.72$ for prompted LLMs).
- **RQ4 (User Study)**: 15 founders cut decision time by **68.2%** ($24.5 \to 7.8$ min) with 91.5% coverage comprehension.

---

### Slide 9: Live Demo & Founder Deliverables
- **Live Flow**:
  1. Founder enters plain English prompt: "Collaborative kanban with real-time sync".
  2. Idea Refiner extracts 5 prioritized features with editable keywords.
  3. Search identifies top candidate (`octocat/kanban-lite`).
  4. Best Match Hero Card displays feature coverage, viability verdict, and effort hours.
  5. 7-Tab Report reveals verified file citations.
  6. Downloadable Founder Brief (.md and PDF) ready for freelance handoff.

---

### Slide 10: Conclusion, Limitations & Future Work
- **Summary**: RepoRevive turns dormant open-source code into tangible startup equity safely and deterministically.
- **Honest Limitations**: Static analysis provides proxy signals, not dynamic runtime bug guarantees; scope focused on JS/TS and Python.
- **Future Directions**: Automated dependency upgrade codemods, tree-sitter AST call-graph tracing, ephemeral microVM execution sandboxes.
- **Thank You / Q&A**.
