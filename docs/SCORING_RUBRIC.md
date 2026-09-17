# RepoRevive – Deterministic Scoring Rubric

## 1. Core Principle
All scores are calculated deterministically in code (`scoring.py`). The LLMs extract facts, plan, and summarize; they never generate numerical scores or ratings.

## 2. Feature Coverage Score (0 - 100)
Evaluates how much of the founder's confirmed checklist is already implemented in the repository.

### Feature Weights
- **Must-have feature**: Weight $W_i = 2$
- **Nice-to-have feature**: Weight $W_i = 1$

### Status Points
- `present`: $S_i = 1.0$ (Requires verifiable file path evidence validated by Verifier)
- `partial`: $S_i = 0.5$
- `missing`: $S_i = 0.0$

$$\text{Coverage Score} = 100 \times \frac{\sum_{i=1}^{N} (W_i \times S_i)}{\sum_{i=1}^{N} W_i}$$

## 3. Viability Score (0 - 100)
Composed of 7 objective sub-scores measuring repository health, maintainability, and reusability:

| Category | Max Points | Measurement Method |
| :--- | :--- | :--- |
| **Structure** | 15 | Detected entry points, standard project layout, low stub/placeholder file ratio |
| **Bug Risk** | 20 | 20 minus penalty based on open bugs, lint errors/1k lines, CI failure, and TODO/1k lines |
| **Dependency Health** | 15 | Fraction of modern dependencies, absence of known CVEs in OSV.dev |
| **Documentation** | 10 | Non-empty README with installation, usage, and architecture sections |
| **License** | 15 | Permissive (MIT, Apache-2.0, BSD) = 15; Weak Copyleft = 10; Strong Copyleft = 5; No license = 0 |
| **History** | 10 | Verified commit count ($\ge 30$), multiple contributors, active history before abandonment |
| **Tests & CI** | 15 | Presence of test files (`test/`, `spec/`), passing last CI workflow |

### Unknown Sub-score Re-normalization
If a worker fails or times out, its sub-score is marked `null` (`unknown`). The viability score is re-normalized based only on the measured points, and confidence is reduced:
$$\text{Viability} = 100 \times \frac{\sum \text{Known Points}}{\sum \text{Max Available Known Points}}$$
$$\text{Confidence} = \frac{\sum \text{Max Available Known Points}}{100}$$

## 4. Final Ranking Score
$$\text{Final} = 0.40 \times \text{Relevance} + 0.30 \times \left(\frac{\text{Coverage}}{100}\right) + 0.30 \times \left(\frac{\text{Viability}}{100}\right)$$

### Disqualification & Blocking Flags
A repository with any of the following flags can **never** be selected as the "Best Match":
- `NO_LICENSE`: Missing or unrecognizable license.
- `ARCHIVED`: Officially archived read-only on GitHub.
- `EMPTY_REPO`: Missing meaningful source code.
- `CRITICAL_VULN`: Unpatched critical vulnerability in dependencies.

### Tie-Breaking Rules
1. Lower Bug Risk penalty.
2. Newer `lastCommitAt` date.

## 5. Verdict Categories
- **$\ge 75$**: Ready to build on
- **$50 - 74$**: Usable with work
- **$25 - 49$**: Borrow parts only
- **$< 25$**: Not worth it
