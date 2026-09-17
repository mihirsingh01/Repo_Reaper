# RepoRevive – Agent Design Specification

## 1. Architectural Pattern
Custom Orchestrator-Worker pattern with tool-use and an independent Verifier (ADR-003). No heavy frameworks (LangChain/CrewAI).

## 2. Stage A: Idea Refiner Agent
- **Role**: Takes a founder's raw natural language software idea and distills it into a structured, technical feature checklist without hallucinating unmentioned business features.
- **Input**: `text` (30 - 2,000 characters).
- **Output Schema**: `IdeaSpec`:
  - `summary`: Concise 1-line distillation of the product concept.
  - `targetUsers`: Target user personas directly inferred from text.
  - `features`: Array of 3 to 10 features:
    - `id`: Unique feature identifier (`f1`, `f2`, ...).
    - `label`: Plain-language name for founder comprehension.
    - `plainDescription`: Clear description of what the feature does.
    - `keywords`: Technical search terms for NLP matching (e.g. `jwt`, `oauth`, `sku`, `webhook`).
    - `priority`: `must` (core value proposition) or `nice` (secondary/enhancement).
  - `clarifications`: Array of clarifying questions if the prompt is ambiguous or vague.

## 3. Stage B: Multi-Agent Analysis Pipeline (Top 5 Candidates)
- **Scout Agent**: Retrieves repository tree, default branch, commits, and core statistics.
- **Structure Analyst**: Maps entry points, frameworks, module organization, and calculates stub ratio.
- **Coverage Checker**: Compares verified source code against each checklist feature, citing concrete file paths and code snippets ($\le 200$ chars).
- **Bug Risk Analyst**: Audits bug-labeled GitHub issues, last CI conclusion, static lint errors under our fixed rules, and TODO/FIXME density.
- **Dependency Auditor**: Analyzes manifests (`package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`) for outdated packages and queries OSV.dev for known CVEs.
- **License Checker**: Identifies SPDX license, flags copyleft duties, and flags `NO_LICENSE`.
- **Revival Planner**: Synthesizes verified findings into gap list, actionable revival steps, min/max effort hours, and risks.
- **Verifier Agent**: Audits every claim against actual tool output logs. Drops unverified claims; a feature marked "present" without a valid file citation is demoted to "missing".
- **Deterministic Scoring**: Computed purely in `scoring.py` (ADR-002).
