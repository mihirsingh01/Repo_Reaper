# RepoRevive – Human Annotation & Labeling Guide

This guide defines the standardized ground-truth annotation protocol for RepoRevive research evaluations (RQ1, RQ2, RQ3).
Annotators must evaluate samples independently to allow calculating inter-annotator agreement via **Cohen's Kappa ($\kappa$)**.

---

## 1. Retrieval Relevance Labeling (RQ1)
- **Scale**: Binary (1 = Relevant, 0 = Non-Relevant)
- **Definition**:
  - `1 (Relevant)`: The candidate repository builds a substantial portion of the core software concept or provides a directly reusable foundational architecture.
  - `0 (Non-Relevant)`: The repository is unrelated, merely mentions a generic keyword in passing, or solves a completely different business domain.

---

## 2. Feature Coverage Labeling (RQ2)
Annotators inspect the codebase to verify whether a confirmed checklist feature is implemented.

| Label | Criteria | Required Evidence |
| :--- | :--- | :--- |
| `present` | The feature is functionally implemented in code (API route, controller, schema, or UI component exists). | Concrete file path and line numbers containing operational code. |
| `partial` | Interface, schema, or stub defined, or only a subset of sub-capabilities is built. | File path with type definition, stub, or partial logic. |
| `missing` | No matching code, route, or logic exists in the repository. | No citation. |

---

## 3. Viability & Bug Risk Labeling (RQ3)
Senior engineers evaluate the repository on a 4-point viability scale:
- `4 (Ready to build on)`: Modern code, working entry point, clear layout, passing CI or test suite, minimal bug signals ($\ge 75$ points).
- `3 (Usable with work)`: Sound core architecture, but requires dependency updates or moderate bug fixing (50–74 points).
- `2 (Borrow parts only)`: Outdated architecture, high bug risk, or incomplete modules; best used for copy-pasting specific logic (25–49 points).
- `1 (Not worth it)`: Premature stubs, missing code, or excessive technical debt ($< 25$ points).

---

## 4. Inter-Annotator Agreement Formula
$$\kappa = \frac{p_o - p_e}{1 - p_e}$$
- $p_o$: Observed proportional agreement between two annotators.
- $p_e$: Hypothetical probability of chance agreement.
- Target: $\kappa \ge 0.70$ (Substantial Agreement).
