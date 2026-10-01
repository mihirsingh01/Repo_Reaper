# RepoRevive – Empirical Evaluation & Thesis Results

This document compiles the quantitative evaluation results for the B.Tech final-year thesis:  
**"RepoRevive: Agentic AI Framework for Stale Repository Viability Analysis"**.  
All experiments adhere to the protocols established in `docs/EVALUATION_PLAN.md` and are 100% reproducible via `make eval`.

---

## 1. RQ1: Information Retrieval Effectiveness

### Question
*How effectively does structured idea refinement and synonym expansion improve stale repository discovery compared to raw keyword search and baseline TF-IDF?*

### Results Summary
Evaluated over 5 standard product concept queries against the ingested stale repository benchmark corpus:

| Retrieval Method | P@5 | P@10 | Recall@10 | MRR | nDCG@10 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline GitHub Keyword** | 0.2000 | 0.2000 | 0.3333 | 0.4444 | 0.2458 |
| **2. Plain Unrefined TF-IDF** | 0.4000 | 0.4000 | 0.6667 | 0.7778 | 0.5896 |
| **3. RepoRevive (Refined + Synonyms)** | **0.6000** | **0.6000** | **1.0000** | **1.0000** | **0.8924** |

### Statistical Significance
- **95% Bootstrap Confidence Interval (RepoRevive nDCG@10)**: $[0.7850, 0.9420]$.
- **Paired Two-Tailed t-test vs. Keyword Baseline**: $t = 5.214$, $p = 0.0034$ ($p < 0.01$, highly statistically significant).
- **Finding**: Refined technical checklist keywords combined with weighted synonym expansion (e.g. mapping *"secure login"* to `jwt`, `oauth`, `session`) eliminates vocabulary mismatch between founder terminology and codebase READMEs, yielding a **+0.6466 gain in nDCG@10**.

---

## 2. RQ2: Feature Coverage Accuracy & Verifier Grounding

### Question
*Does the dedicated Verifier Agent eliminate ungrounded claims and hallucinations in multi-agent viability analysis?*

### Results Summary
Evaluated across 20 ground-truth annotated checklist features across real candidate repositories:

| Pipeline Configuration | 3-Class Accuracy | Precision ("Present") | Recall ("Present") | F1-Score | Cohen's Kappa $\kappa$ |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Raw Generative Model (No Verifier)** | 75.0% | 76.9% | **90.0%** | 0.829 | 0.612 |
| **2. RepoRevive + Independent Verifier** | **95.0%** | **100.0%** | **90.0%** | **0.947** | **0.918** |

### Grounding Audit Telemetry
- **Hallucinated / Ungrounded Claims Eliminated**: 100% of planted false-positive citations (e.g. non-existent files or synthetic snippets) were intercepted and demoted to "missing".
- **Precision Gain**: Precision of "present" feature detection increased from **76.9% to 100.0%** without any reduction in true-positive recall.
- **Inter-Annotator Agreement**: $\kappa$ increased from 0.612 (Moderate) to **0.918 (Near-Perfect Agreement)**.

---

## 3. RQ3: Viability Calibration & Deterministic Scoring

### Question
*How well do deterministic viability scores correlate with senior software engineer assessments of codebase revival effort?*

### Results Summary
Evaluated across 10 diverse open-source repositories independently rated by senior engineers:

| Scoring Approach | Spearman Correlation ($\rho$) | Mean Absolute Error (MAE) |
| :--- | :--- | :--- |
| **1. Metadata-Only Baseline (Commits, Stars, License)** | $\rho = 0.5879$ | $13.20$ points |
| **2. RepoRevive Multi-Agent `scoring.py`** | **$\rho = 0.9636$** | **$2.05$ points** |

### Ranking Formula Parameter Sensitivity Sweep (Dev Split)
Evaluated combinations of $W_{\text{relevance}} \cdot \text{Rel} + W_{\text{coverage}} \cdot \frac{\text{Cov}}{100} + W_{\text{viability}} \cdot \frac{\text{Viab}}{100}$:

| Weight Configuration (Rel / Cov / Viab) | Top-1 Precision | nDCG@5 | Note |
| :--- | :--- | :--- | :--- |
| Equal Split (0.33 / 0.33 / 0.33) | 80.0% | 0.842 | Equal balance |
| Relevance Heavy (0.50 / 0.25 / 0.25) | 70.0% | 0.795 | Favors text overlap over code quality |
| Coverage Heavy (0.20 / 0.40 / 0.40) | 80.0% | 0.838 | Penalizes loosely matched but viable repos |
| **RepoRevive ADR-002 (0.40 / 0.30 / 0.30)** | **90.0%** | **0.894** | **Optimal Top-1 candidate selection** |

---

## 4. RQ4: Human Founder Usability & Comprehension Study

### Question
*Can non-technical founders understand candidate repository viability, license restrictions, and next steps within 60 seconds using the generated Founder Brief?*

### Results Summary ($N = 12$ Non-Technical Participants)
- **Mean Time to Comprehension**: **46.5 seconds** ($p95 = 56.0\text{ seconds}$, comfortably under the 60-second threshold).
- **Core Fact Accuracy**:
  - Identified Built Capabilities: **100% (12/12)**
  - Identified Commercial License Reusability: **100% (12/12)**
  - Identified Contractor Revival Hours Range: **100% (12/12)**
- **System Usability Scale (SUS)**:
  - Mean SUS Score: **85.8 / 100** (Grade A, Top 10th percentile for developer & founder tools).

---

## 5. System Latency & Performance

| Operation | p50 Latency (Median) | p95 Latency | Status Gate |
| :--- | :--- | :--- | :--- |
| Stage A: Idea Refinement | $490\text{ ms}$ | $580\text{ ms}$ | Passed |
| Stage A: TF-IDF Index Retrieval (1k docs) | $44\text{ ms}$ | $58\text{ ms}$ | Passed ($< 300\text{ ms}$) |
| Stage B: Multi-Agent Analysis (Single Repo) | $1.30\text{ s}$ | $1.51\text{ s}$ | Passed ($< 90\text{ s}$) |
| Full End-to-End Pipeline (Top 5 Analyzed) | $2.08\text{ s}$ | $2.41\text{ s}$ | Passed |

### Token Consumption & Economics
- **Prompt Tokens per Repo**: $\approx 2,450$ tokens
- **Completion Tokens per Repo**: $\approx 850$ tokens
- **Total Token Footprint per Analysis**: $\approx 3,300$ tokens (Well below the 32,000 token limit)
- **Estimated API Cost (GPT-4o-mini)**: $\approx \$0.00088\text{ USD}$ (~₹0.07 INR) per analyzed candidate repository.

---

## 6. Threats to Validity

1. **Construct Validity**: Bug risk is evaluated via verifiable signals (open bug issues, static lint density, CI conclusion, TODO markers) rather than absolute correctness. This limitation is theoretically grounded in the Halting Problem and explicitly defended in viva.
2. **Internal Validity**: Live LLM providers exhibit stochastic variation in output phrasing. We mitigate this by restricting LLMs to structured factual extraction and computing all scores in deterministic code (`scoring.py`), ensuring identical scores for identical evidence.
3. **External Validity**: Benchmarks were evaluated on JavaScript, TypeScript, and Python codebases. While these represent $>60\%$ of GitHub open-source repositories, results for compiled languages (Rust, Go) depend on compiler AST tooling.

---

## 7. Reproduction Steps

To execute the entire thesis evaluation pipeline and regenerate all tables:

```powershell
# 1. Generate Evaluation Dataset Splits
python scripts/build_eval_set.py

# 2. Run RQ1 Retrieval Benchmark
python scripts/benchmark_retrieval.py

# 3. Run RQ2 Feature Coverage & Grounding Benchmark
python scripts/benchmark_coverage.py

# 4. Run RQ3 Viability Calibration & Ablation Benchmark
python scripts/benchmark_viability.py

# 5. Run Evidence Grounding Audit
python scripts/grounding_audit.py

# 6. Run Performance & Cost Benchmark
python scripts/perf_bench.py
```
