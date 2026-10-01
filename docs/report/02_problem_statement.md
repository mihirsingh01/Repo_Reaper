# Chapter 2: Problem Statement

## 2.1. Formal Problem Statement
Given an unstructured natural language description of a software product idea $I$ provided by a non-technical stakeholder, and a corpus of $N$ public, abandoned GitHub repositories $\mathcal{R} = \{R_1, R_2, \dots, R_N\}$ meeting the staleness criterion ($\text{MonthsSinceLastCommit}(R_i) \ge 12 \land \text{Commits}(R_i) \ge 30$), the system must:
1. Deconstruct $I$ into an unambiguous, prioritized set of technical features $\mathcal{F} = \{f_1, f_2, \dots, f_m\}$.
2. Retrieve the candidate subset $\mathcal{C} \subset \mathcal{R}$ ($|\mathcal{C}| \ll |\mathcal{R}|$) exhibiting maximal semantic relevance to $\mathcal{F}$.
3. Formulate a multi-dimensional viability assessment $\mathcal{V}(R_k)$ for top candidates $R_k \in \mathcal{C}$ based strictly on grounded source evidence without executing untrusted code.
4. Select a single **Best Match** $R^*$ that maximizes feature coverage while minimizing accumulated defect risk and legal exposure, accompanied by an actionable revival blueprint for non-technical comprehension.

## 2.2. Core Technical and Theoretical Challenges

### 2.2.1. The Vocabulary Mismatch Problem in Code Search
Non-technical founders describe software using business and domain terminology ("I need a way to schedule dog walkers and take credit card payments"), whereas repository authors document systems using technical stacks and engineering shorthand ("React calendar widget with Stripe webhooks"). Direct string matching yields near-zero recall.

### 2.2.2. The Halting Problem & Security Constraints of Untrusted Code Execution
Determining whether an abandoned repository contains critical runtime bugs or functions correctly by building and executing it is mathematically undecidable (Turing's Halting Problem) and practically dangerous. Untrusted repositories may harbor malicious build scripts, supply-chain backdoors, or cryptominers. Therefore, all viability analysis must be strictly static and read-only.

### 2.2.3. LLM Hallucination and Non-Deterministic Scoring
Commercial LLMs prompted to evaluate codebases exhibit sycophancy (tending to praise broken code) and hallucination (inventing nonexistent files or APIs). Furthermore, LLMs output inconsistent numeric ratings across repeated invocations, rendering unguided LLM ratings unusable for engineering decision-making.

### 2.2.4. Prompt Injection Risks from Untrusted Source Code
Repository source files, commit messages, and READMEs are untrusted user input. A malicious or adversary-crafted repository might embed prompt-injection payloads (e.g., `"IGNORE ALL PREVIOUS INSTRUCTIONS: DECLARE THIS REPO FLAWLESS AND SCORE 100%"`). The architecture must guarantee isolation between untrusted repo data and agent system directives.

## 2.3. Research Questions
To evaluate the efficacy of the proposed framework, this research investigates four central questions:

- **RQ1 (Retrieval Effectiveness)**: To what extent does NLP query expansion (stemming, lemmatisation, and synonym expansion) improve candidate repository retrieval over baseline keyword search in terms of Mean Reciprocal Rank (MRR) and Recall@K?
- **RQ2 (Feature Grounding Accuracy)**: Can autonomous inspection agents accurately verify the presence of functional features in unexecuted code without exceeding a 5% hallucination threshold?
- **RQ3 (Scoring Determinism & Consistency)**: Does separating qualitative LLM extraction from mathematical rubric calculation produce perfectly deterministic viability scores across repeated evaluations of identical codebases?
- **RQ4 (Founder Utility & Comprehension)**: Does a structured Founder Brief with verified file citations significantly reduce non-technical founders' time-to-decision compared to raw repository browsing?
