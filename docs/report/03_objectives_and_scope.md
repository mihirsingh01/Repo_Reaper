# Chapter 3: Objectives and Scope

## 3.1. Project Objectives
The primary objective of this project is to conceptualize, engineer, and empirically validate an agentic AI framework for stale repository viability analysis. The concrete sub-objectives are:

1. **Idea Refinement & Feature Structuring**:
   Develop an automated refiner that converts an unstructured natural language product pitch into a structured, editable feature checklist categorized by priority (must-have vs. nice-to-have) and annotated with technical search keywords.
2. **Stale Repository Ingestion & Discovery**:
   Implement an automated ingestion engine capable of querying the GitHub REST API under strict rate-limit constraints to index public repositories meeting staleness criteria ($\ge 12$ months since last commit, $\ge 30$ commits).
3. **Semantic NLP Retrieval Engine**:
   Construct an information retrieval pipeline utilizing tokenisation, stop-word filtering, Porter stemming, lemmatisation, synonym expansion, and TF-IDF vectorization to retrieve the top candidate repositories using cosine similarity.
4. **Multi-Agent Static Viability Analysis**:
   Design an orchestrator coordinating eight specialized read-only agents (Scout, Structure, Coverage, Bug Risk, Dependencies, License, Revival Planner, and Verifier) to inspect source trees without executing code.
5. **Anti-Hallucination Fact Verification**:
   Incorporate an explicit verification mechanism that cross-references all agent claims against real file paths and drops any ungrounded assertions.
6. **Deterministic Scoring & Ranking**:
   Implement mathematical scoring algorithms adhering strictly to `docs/SCORING_RUBRIC.md` such that 100% of score numbers are computed deterministically.
7. **Founder-Centric Interface & Actionable Artifacts**:
   Deliver an accessible web dashboard for non-technical founders, culminating in a synthesized Founder Brief suitable for handing directly to freelance developers.

## 3.2. Scope and Boundaries

### 3.2.1. In-Scope Capabilities
- Ingestion of public GitHub repositories primarily authored in JavaScript, TypeScript, and Python.
- Static, read-only code analysis via GitHub tree and blob APIs.
- Dependency vulnerability checking against public CVE databases (OSV.dev).
- Fixed-rule static linting (Ruff for Python, ESLint for JS/TS) using standardized project rulesets.
- License compliance checking using SPDX identifiers.
- Production-ready cloud deployment across free/starter tiers (Render, Vercel, MongoDB Atlas).

### 3.2.2. Out-of-Scope Limitations
- **No Dynamic Code Execution**: The system will never run `npm install`, `pip install`, `make`, `docker build`, or execute unit tests from analyzed repositories.
- **No Automatic Code Fixing / PR Creation**: RepoRevive diagnoses and plans revival; it does not autonomously refactor or submit pull requests.
- **Language Coverage Limits**: Ingestion and static analysis focus on Python and JavaScript/TypeScript ecosystems. Compiled languages (C++, Rust, Go) are retrieved based on metadata but not statically linted.
- **Private Repository Analysis**: Only public GitHub repositories are indexed and analyzed.
