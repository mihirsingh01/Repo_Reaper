# RepoRevive – Research & Evaluation Plan

## Research Questions (B.Tech Final Year Capstone)

### RQ1: Retrieval Effectiveness
- **Question**: How effectively does structured idea refinement and synonym expansion improve stale repository discovery compared to raw keyword search and baseline TF-IDF?
- **Hypothesis**: Idea refinement with synonym expansion significantly improves Recall@10 and nDCG@10 on natural language software descriptions by bridging founder terminology to technical codebase vocabulary.
- **Metrics**: Precision@5, Precision@10, Recall@10, Mean Reciprocal Rank (MRR), and Normalized Discounted Cumulative Gain (nDCG@10).
- **Benchmark Script**: `scripts/benchmark_retrieval.py` evaluates 3 models over a labelled query-repository dataset:
  1. Baseline GitHub keyword search
  2. Plain TF-IDF on raw text
  3. RepoRevive Refined TF-IDF with weighted synonym expansion

### RQ2: Agent Verification & Grounding
- **Question**: Does the dedicated Verifier Agent eliminate ungrounded claims and hallucinations in multi-agent viability analysis?
- **Metrics**: Unsupported claim reduction rate, file existence precision, evidence snippet validity.

### RQ3: Deterministic Scoring Calibration
- **Question**: How well do deterministic viability scores correlate with human senior engineer assessments of codebase revival effort?
- **Metrics**: Spearman's rank correlation coefficient $\rho$, Mean Absolute Error (MAE) in effort estimation.

### RQ4: Non-Technical Founder Usability
- **Question**: Can non-technical founders understand repository trade-offs, license restrictions, and next steps within 60 seconds using the generated Founder Brief?
- **Metrics**: Task completion time, comprehension quiz score, System Usability Scale (SUS).
