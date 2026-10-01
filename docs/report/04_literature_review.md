# Chapter 4: Literature Review

## 4.1. The Phenomenon of Abandoned Open-Source Repositories
The lifecycle and abandonment of open-source software (OSS) projects have been extensively documented in empirical software engineering literature. 

Coelho and Valente investigated why GitHub projects are abandoned by analyzing over 1,000 unmaintained repositories [CITATION NEEDED]. Their findings revealed that project abandonment is predominantly driven by maintainer-centric factors—such as lack of time, loss of interest, and project acquisition—rather than fatal software architecture flaws. This establishes the foundational premise of RepoRevive: many dormant repositories contain mature, functional code that retains substantial reuse value if accurately audited.

Kalliamvakou et al. explored the perils of mining GitHub data, highlighting that a vast majority of public repositories are toy projects, homework assignments, or forks with minimal commit history [CITATION NEEDED]. To mitigate these pitfalls, RepoRevive enforces rigorous filtering heuristics ($\ge 12$ months of inactivity and $\ge 30$ historical commits), ensuring that only substantial software artifacts are presented to founders.

## 4.2. Code Search and Semantic Retrieval
Traditional code search engines—including GitHub's native search API and Sourcegraph—rely predominantly on lexical indexing such as BM25 and inverted index keyword lookups [CITATION NEEDED]. While highly effective for technical queries containing exact class or method identifiers (e.g., `authenticateJwtToken`), lexical search fails severely when non-technical founders use natural language product specifications.

Recent advances in neural code search utilize dense embeddings (e.g., CodeBERT, StarCoder) [CITATION NEEDED]. However, dense embedding models are computationally prohibitive to run on resource-constrained or serverless environments. In contrast, classical information retrieval augmented with domain thesauri, stemming, and TF-IDF vectorization provides high retrieval accuracy at millisecond latencies without requiring dedicated GPU infrastructure [CITATION NEEDED].

## 4.3. Static Analysis and Automated Software Quality Assessment
Static software analysis inspects code without executing it, mitigating the undecidability of the Halting Problem and preventing arbitrary code execution risks. Standardized static analysis tools (e.g., ESLint for JavaScript and Ruff/Flake8 for Python) detect stylistic violations, syntax errors, and potential bugs [CITATION NEEDED]. 

In RepoRevive, static analysis is constrained to fixed, server-managed rule configurations. Analyzing untrusted repositories using their own checked-in configuration files presents an arbitrary code execution vector (e.g., malicious plugins in `.eslintrc.js`). By enforcing immutable server-side configs, RepoRevive maintains strict sandbox security.

## 4.4. LLMs and Multi-Agent Frameworks in Software Engineering
The introduction of Large Language Models has transformed software engineering automation. Benchmarks such as SWE-bench evaluate LLMs on end-to-end bug resolution [CITATION NEEDED]. Multi-agent architectures (e.g., ChatDev, MetaGPT) employ role-playing agents (e.g., Product Manager, Architect, Programmer) to decompose complex software tasks [CITATION NEEDED].

However, existing multi-agent systems suffer from hallucination and sycophancy when assessing software quality. In a critical evaluation of LLM code metrics, researchers demonstrated that generative models frequently produce fabricated code paths and inflate quality scores to satisfy the user prompt [CITATION NEEDED]. RepoRevive addresses this vulnerability through a two-tier hybrid architecture: agents perform qualitative decomposition and evidence extraction, while an independent Verifier agent audits citations and a deterministic scoring rubric computes all numeric ratings.

## 4.5. Comparative Analysis of Related Systems

| System / Tool | Target Audience | Code Execution Required? | Semantic Retrieval? | Anti-Hallucination Verification? | Output Type |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GitHub Search** | Developers | No | Pure Lexical (BM25) | N/A | Raw Repository List |
| **Sourcegraph** | Enterprise Devs | No | Lexical + Code AST | N/A | Code Snippets & Diff |
| **SWE-bench Agents** | Researchers | Yes (Docker Run) | Embeddings | Unit Test Execution | Git Patch (PR) |
| **RepoRevive** | Non-Tech Founders | **No (Static Only)** | **NLP + Synonym Expansion** | **Path & AST Grounding** | **Ranked Match & Founder Brief** |
