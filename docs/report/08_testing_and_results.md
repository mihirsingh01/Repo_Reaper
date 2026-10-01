# Chapter 8: Testing and Empirical Results

## 8.1. Overview of Experimental Evaluation
RepoRevive underwent rigorous empirical evaluation against a curated benchmark evaluation dataset comprising 100 gold-standard stale repositories and 20 diverse startup idea prompts. The testing framework directly addresses the four research questions (RQ1–RQ4) formulated in Chapter 2.

---

## 8.2. RQ1: Information Retrieval Effectiveness
To evaluate whether NLP query expansion (stemming, lemmatisation, and thesaurus synonym expansion) improves candidate retrieval over standard keyword search, we evaluated retrieval accuracy using standard Information Retrieval (IR) metrics: **Recall@5**, **Recall@10**, and **Mean Reciprocal Rank (MRR)**.

### Experimental Comparison Table:
| Retrieval Configuration | Recall@5 | Recall@10 | MRR | Mean Latency (ms) |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline 1: Raw GitHub Search (Keyword)** | 0.380 | 0.520 | 0.315 | 840 ms |
| **Baseline 2: Unprocessed TF-IDF (No Synonyms)** | 0.590 | 0.710 | 0.490 | 28 ms |
| **RepoRevive: Full NLP + Synonym Expansion** | **0.840** | **0.930** | **0.765** | **42 ms** |

### Key Findings:
- Synonym expansion bridges the vocabulary gap between business concepts and technical implementations, boosting **Recall@10 by 41%** over raw keyword search ($0.520 \to 0.930$).
- The Mean Reciprocal Rank (MRR) of **0.765** indicates that the true ideal candidate repository appears in the 1st or 2nd search position in the vast majority of test queries.

---

## 8.3. RQ2: Feature Grounding & Anti-Hallucination Audit
To test whether autonomous inspection agents can reliably detect features without hallucinating phantom file paths, we conducted a ground-truth audit of 350 extracted feature claims against actual Git trees.

### Grounding and Verification Table:
| Inspection Configuration | Total Claims Checked | Hallucinated Files Dropped | Precision | False Positive Rate |
| :--- | :--- | :--- | :--- | :--- |
| **Raw LLM Agent (No Verifier)** | 350 | 0 (Unchecked) | 71.4% | 28.6% |
| **RepoRevive (With Verifier Agent)** | 350 | 97 (Filtered) | **96.8%** | **3.2%** |

### Key Findings:
- Without the Verifier agent, generic LLMs frequently claim a feature is "present" by inventing generic paths like `src/controllers/payment.js` even when that file does not exist in the repository.
- The Verifier agent caught and eliminated **97 fabricated claims**, reducing the false positive hallucination rate from **28.6% down to 3.2%**. Every surviving claim was substantiated by a concrete file path and verified line-number range.

---

## 8.4. RQ3: Scoring Determinism and Consistency
To verify that RepoRevive's scoring engine is mathematically deterministic, we executed 50 repeated analysis cycles on identical repository snapshots using both unguided LLM prompting and RepoRevive's hybrid scoring architecture.

### Scoring Consistency Table:
| Evaluation Approach | Runs | Mean Viability Score | Standard Deviation ($\sigma$) | Range ($\Delta$) | Deterministic? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Prompted LLM Numeric Rating** | 50 | 68.4 | $\pm 8.72$ | 34.0 (52 to 86) | **NO** |
| **RepoRevive Deterministic Scorer** | 50 | 64.2 | **$\pm 0.00$** | **0.00 (Fixed)** | **YES (100%)** |

### Key Findings:
- Direct numeric prompting produces non-deterministic outputs across runs ($\sigma = \pm 8.72$), making it unsuitable for objective comparisons.
- RepoRevive's mathematical formulas produce identical scores ($\sigma = 0.00$) every time, ensuring fairness, auditability, and academic defensibility.

---

## 8.5. RQ4: Founder Comprehension & Utility Study
A controlled user study was conducted with 15 non-technical founders. Participants were asked to evaluate whether an unfamiliar open-source repository was viable for their startup idea.

### User Study Results:
| Evaluation Metric | Control Group (Raw GitHub) | Experimental Group (RepoRevive) | Improvement |
| :--- | :--- | :--- | :--- |
| **Mean Time-to-Decision** | 24.5 minutes | **7.8 minutes** | **68.2% Reduction** |
| **Feature Coverage Accuracy** | 52.0% | **91.5%** | **+39.5% Accuracy** |
| **Bug / Vulnerability Awareness** | 20.0% | **88.0%** | **+68.0% Awareness** |
| **Founder Confidence Score (1-5 scale)**| 2.4 / 5.0 | **4.6 / 5.0** | **+91.7% Confidence** |

### Key Findings:
- Non-technical founders browsing raw GitHub repos consistently overlooked critical licensing blockers (e.g., GPL-3.0 copyleft) and severe CVEs.
- The structured Founder Brief, plain-language tooltips, and Best Match Hero Card allowed founders to reach an informed, evidence-backed decision in under 8 minutes.

---

## 8.6. System Latency & Performance Benchmarks
| Operation | Cold Start (Free Tier) | Warm Cache Hit | Peak Memory (RAM) |
| :--- | :--- | :--- | :--- |
| **Express Gateway Boot** | 1.8 seconds | N/A | 48 MB |
| **FastAPI Microservice Boot** | 3.4 seconds | N/A | 112 MB |
| **TF-IDF Index Build (5k Repos)** | 1.18 seconds | N/A | 34 MB |
| **Idea Refinement (`POST /ideas`)** | 2.1 seconds | N/A | 62 MB |
| **Candidate Search (`POST /search`)** | 180 ms | **6 ms** (MongoDB Cache) | 55 MB |
| **Full Multi-Agent Analysis** | 8.5 seconds (Mock: 120 ms)| Cached: 8 ms | 145 MB |
