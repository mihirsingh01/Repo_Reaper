# RepoRevive – Academic Project Brief

## Project Title
**RepoRevive: Agentic AI Framework for Stale Repository Viability Analysis**  
*B.Tech Final Year Capstone Project*

---

## 1. Problem Statement
Every year, millions of open-source software repositories on GitHub are abandoned by their creators due to lack of time, career shifts, or loss of interest, despite containing valuable, production-tested architectures. Simultaneously, early-stage non-technical founders struggle to build initial software prototypes due to prohibitive agency costs and technical talent shortages.

While founders frequently attempt to search GitHub for existing solutions, keyword-based search fails to bridge plain-English product descriptions to technical codebase terminology. Furthermore, evaluating whether an abandoned repository is viable requires deep engineering diligence: auditing feature completeness, measuring verifiable bug risks, reviewing unmaintained dependencies, checking license commercial compatibility, and estimating modern revival effort. Non-technical founders lack the technical capability to perform this diligence safely.

---

## 2. Proposed Solution & System Overview
RepoRevive introduces an end-to-end agentic AI framework that bridges non-technical product ideas to viable stale codebases through a 2-stage pipeline:

1. **Stage A: Idea Refinement & Explainable NLP Retrieval**
   - Natural language software ideas are distilled into structured feature checklists (3–10 features) with plain descriptions, technical keywords, and `must`/`nice` priority weighting without hallucinating unstated business facts.
   - Founders review, customize, and confirm the checklist.
   - An expanded query using sublinear TF-IDF and curated synonym expansion matches against an index of verified stale repositories (>12 months inactive, $\ge 30$ commits), returning top candidates with explainable term overlaps (`matchedTerms`).

2. **Stage B: Multi-Agent Viability Analysis & Deterministic Scoring**
   - An asynchronous multi-agent pipeline deploys specialized read-only worker agents (Scout, Structure Analyst, Coverage Checker, Bug Risk Analyst, Dependency Auditor, License Checker).
   - An independent adversarial Verifier cross-references every cited file path and code snippet against ground-truth repository tree files, demoting ungrounded claims.
   - Pure deterministic formulas in `scoring.py` calculate 7 objective maintainability sub-scores, feature coverage %, and overall viability, ensuring 100% reproducible ratings.
   - A Revival Planner synthesizes feature gaps, ordered engineering steps, realistic contractor effort hours, and an executive Founder Brief ready to hand to a freelance developer.

---

## 3. Academic & Practical Contributions
1. **Safety Boundary**: Zero third-party code execution, building, importing, or dependency installation; all analysis is static and read-only via GitHub API and AST parsing.
2. **Deterministic Viability Calibration**: Eliminating LLM numerical hallucination by decoupling factual extraction (LLM) from mathematical scoring (deterministic code).
3. **Adversarial Verification Architecture**: Separating worker generation from independent ground-truth verification to eliminate sycophancy and ungrounded claims.
4. **Founder-First UX**: Explaining all metrics with plain words, contextual tooltips, and printable Founder Briefs without technical jargon.
