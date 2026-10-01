# 25 Most Likely Viva Examiner Questions & Defensible Answers

This compendium arms the 3 student defenders with concise, technically rigorous, and honest answers directly rooted in RepoRevive's architecture, `docs/DECISIONS.md`, and `docs/RESULTS.md`.

---

### Q1: How do you know the recommended repository has the "fewest bugs"?
**Examiner Intent**: Testing whether you claim to solve Turing's undecidable Halting Problem.  
**Honest Answer**:  
> *"We do not claim to detect all runtime bugs, as determining runtime termination or defect-free execution statically is mathematically undecidable (Turing's Halting Problem). Instead, RepoRevive computes a **Bug Risk Proxy Signal** combining four observable empirical metrics: (1) density of static linter violations per 1,000 LOC using fixed Ruff/ESLint rules, (2) the ratio of open unresolved GitHub issues tagged with the 'bug' label, (3) historical CI/CD build conclusions on the default branch, and (4) TODO/FIXME comment density. The repository with the lowest composite penalty is statistically the least prone to latent defect decay."*

---

### Q2: How is RepoRevive different from existing projects like GitHub Search or SWE-bench?
**Examiner Intent**: Establishing novel academic and practical contribution.  
**Honest Answer**:  
> *"GitHub Search is purely lexical (BM25) and requires developers to already know specific technical identifiers; it provides zero viability assessment or feature mapping. SWE-bench agents, by contrast, focus on autonomous code repair by executing Dockerized test suites, which is dangerous on untrusted code and computationally expensive. RepoRevive is unique in targeting non-technical founders: it bridges the business-to-code vocabulary gap via NLP synonym expansion, audits viability strictly through read-only static analysis without executing untrusted files, and outputs an actionable Founder Brief."*

---

### Q3: Why did you choose TF-IDF with synonym expansion over dense neural embeddings like BERT or CodeBERT?
**Examiner Intent**: Probing architectural trade-offs and deployment pragmatism.  
**Honest Answer**:  
> *"We benchmarked both. Dense Transformer models like CodeBERT require dedicated GPU memory or heavy CPU inference (adding 300–800 ms of latency per query and incurring continuous cloud hosting costs). In contrast, sparse TF-IDF combined with Porter stemming and a curated software engineering thesaurus executes in under 45 ms on free-tier container memory, while achieving a 93% Recall@10 on our evaluation benchmark. For a lean startup tool, TF-IDF offers superior speed, zero marginal hosting cost, and full mathematical interpretability."*

---

### Q4: What prevents an untrusted repository from performing a Prompt Injection attack against your AI agents?
**Examiner Intent**: Evaluating AI security awareness (OWASP LLM Top 10).  
**Honest Answer**:  
> *"We employ three defense-in-depth layers: First, all repository content is structurally delimited inside `<UNTRUSTED_REPO_FILE>` XML tags; system prompts explicitly instruct the LLM to treat delimited text strictly as passive data, never as commands. Second, our agents are completely read-only and have no write, execute, or network egress tools beyond our fixed inspection endpoints. Third, even if an attacker tricks the LLM into claiming a feature is present, our independent Verifier Agent verifies the cited file path against the actual repository tree. If the file does not exist, the claim is dropped."*

---

### Q5: Why do you forbid running `npm install`, `pip install`, or building Docker images from analyzed repos?
**Examiner Intent**: Validating adherence to project non-negotiable rules.  
**Honest Answer**:  
> *"Executing third-party code from abandoned repositories is a severe security risk. Package installation scripts (such as `preinstall` in `package.json` or `setup.py`) can execute arbitrary shell commands, exfiltrate container environment variables, or install cryptominers. Additionally, stale dependencies frequently fail to install due to defunct external URLs or incompatible Node/Python versions. By enforcing strictly static, read-only inspection via the GitHub REST API, we guarantee zero host vulnerability and predictable analysis runtimes."*

---

### Q6: How does the Verifier Agent detect and eliminate LLM hallucinations?
**Examiner Intent**: Testing anti-hallucination mechanisms.  
**Honest Answer**:  
> *"The Verifier Agent acts as an adversarial auditor. When the Coverage Agent claims a feature exists, it must provide a structured evidence object containing a relative file path (e.g., `src/auth.ts`) and line numbers. The Verifier cross-references this path against the repository's concrete Git tree. If the path does not exist, or if the file contains no matching AST nodes or semantic keywords, the Verifier discards the claim and decrements the feature status from 'present' to 'missing'. In our empirical benchmark, this dropped 97 hallucinated claims and reduced false positives from 28.6% to 3.2%."*

---

### Q7: Why are all scores deterministic? Why not let the LLM produce the viability score directly?
**Examiner Intent**: Probing understandability of non-deterministic vs deterministic systems.  
**Honest Answer**:  
> *"When LLMs are asked to produce numeric scores (e.g., 'Rate this repo from 1 to 100'), they exhibit high variance across runs ($\sigma = \pm 8.72$ in our tests) and suffer from sycophancy, giving broken code flattering ratings. To ensure scientific rigor and fairness, RepoRevive enforces a strict separation of concerns: LLMs are used exclusively for qualitative tasks (parsing text, mapping synonyms, explaining code), while 100% of score calculations are computed by deterministic mathematical formulas in `scoring.py`. Running an analysis 50 times yields the exact same score every time ($\sigma = 0.00$)."*

---

### Q8: What happens if a repository has an MIT license in `package.json` but no `LICENSE` file?
**Examiner Intent**: Testing legal and licensing analysis depth.  
**Honest Answer**:  
> *"Under copyright law, declaring a license in metadata without a corresponding legal grant or copyright notice creates legal ambiguity. Our License Agent inspects both the root `LICENSE`/`COPYING` files and manifest metadata. If a repository has no explicit license file, it is flagged as `NO_LICENSE`. In our scoring engine, `NO_LICENSE` immediately triggers an automatic disqualification safety gate, preventing that repository from being recommended as the Best Match."*

---

### Q9: How do you handle GitHub API rate limits (60 requests/hr unauthenticated, 5000/hr authenticated)?
**Examiner Intent**: Verifying production resilience.  
**Honest Answer**:  
> *"We employ three strategies: (1) HTTP conditional requests using `ETag` and `If-None-Match` headers; when repository data has not changed, GitHub returns `304 Not Modified`, which does not deduct from our rate quota. (2) All search queries and analyses are aggressively cached in MongoDB with a 24-hour TTL keyed by the SHA-256 hash of the confirmed feature checklist. (3) Our ingestion runner implements exponential backoff with jitter and respects GitHub's `x-ratelimit-reset` response headers."*

---

### Q10: What is your cold start strategy on free PaaS tiers like Render?
**Examiner Intent**: Evaluating deployment realism and resource constraints.  
**Honest Answer**:  
> *"On free-tier PaaS containers, inactive instances sleep after 15 minutes and disk storage is ephemeral. Rather than paying for persistent cloud volumes (which can suffer mount locks and data corruption), we rebuild the sparse TF-IDF index dynamically in RAM directly from MongoDB on boot. For 5,000 repositories, Scikit-learn vectorization takes only 1.18 seconds and consumes 34 MB of RAM. Our `/api/ready` probe ensures queries are paused with an informative client UI banner until the in-memory index is hot."*

---

### Q11: How do you know a repository is truly "stale" and not simply completed or stable?
**Examiner Intent**: Critical inquiry into definition of staleness.  
**Honest Answer**:  
> *"A repository with no commits for 12 months could theoretically be 'feature-complete'. However, in web and cloud ecosystems, zero commits for over a year inevitably leads to dependency bit rot, unpatched security vulnerabilities, and obsolescence against modern runtime environments. We distinguish between abandoned prototypes and mature stable projects by requiring at least 30 historical commits and checking the ratio of unresolved open issues. Stale projects have open, unaddressed bug reports spanning over a year."*

---

### Q12: Why did you build custom static linters instead of using the repository's own `.eslintrc` or `pyproject.toml`?
**Examiner Intent**: Security and consistency.  
**Honest Answer**:  
> *"Allowing an untrusted repository's own linter configuration to execute introduces two major flaws: First, malicious configurations can load arbitrary npm packages or plugins that execute arbitrary code. Second, repositories with lax or disabled rules would artificially score higher than repositories with strict linting standards. By evaluating all repositories against our own fixed, immutable ruleset, we maintain a level playing field and eliminate code execution vectors."*

---

### Q13: How do you calculate the developer effort estimation (hours) in the Founder Brief?
**Examiner Intent**: Mathematical basis of revival planning.  
**Honest Answer**:  
> *"The Revival Planner Agent computes effort ranges based on the empirical gaps identified by the Coverage and Dependencies agents: (1) 4 to 8 hours for base environment modernization and dependency upgrades, (2) 6 to 12 hours per 'missing' must-have feature, (3) 3 to 6 hours per 'partial' feature, and (4) an overhead buffer scaled to detected bug risk penalties. The result is presented as an honest bounded range (e.g., '25–40 hours') rather than a false single-point estimate."*

---

### Q14: What is the global LLM spend kill-switch and why is it needed?
**Examiner Intent**: System administration and cost management.  
**Honest Answer**:  
> *"In a student project or public deployment, malicious users could repeatedly submit requests to drain our LLM API credit balance. The kill-switch is an administrative toggle (`LLM_SPEND_KILL_SWITCH` in environment variables and admin API). When activated, the API Gateway immediately intercepts incoming refinement and analysis requests, returning HTTP 503 and falling back to cached results or offline deterministic mock fixtures, safeguarding project budgets."*

---

### Q15: How do you calculate the checklist hash and why is it important?
**Examiner Intent**: Caching and idempotency.  
**Honest Answer**:  
> *"We sort the confirmed feature objects by their unique IDs, extract their labels, keywords, and priority ('must' vs 'nice'), serialize them to a deterministic JSON string, and compute its SHA-256 digest (`computeChecklistHash`). This hash serves as the cache key in MongoDB. If a founder runs a search, edits a priority, and runs it again, the system only re-runs queries if the checklist hash changed, saving redundant API calls and database writes."*

---

### Q16: How do you verify that the GitHub token configured in the server has not been granted excessive permissions?
**Examiner Intent**: Principle of Least Privilege (OWASP).  
**Honest Answer**:  
> *"Our admin diagnostic endpoint (`/api/admin/system-status`) makes a diagnostic request to `https://api.github.com/user` and inspects the `x-oauth-scopes` header. If dangerous scopes like `repo`, `write:packages`, `delete_repo`, or `admin:org` are detected, the system logs a high-severity warning instructing the administrator to switch to a fine-grained, read-only personal access token restricted strictly to public repositories."*

---

### Q17: Can you explain your distributed tracing implementation?
**Examiner Intent**: System design and observability.  
**Honest Answer**:  
> *"Every incoming request receives an `X-Request-Id` UUID at the Express gateway middleware. This ID is attached to the request object, echoed in the HTTP response headers, and automatically propagated across inter-service calls to the FastAPI microservice via an Axios interceptor. The Python service extracts the header and logs it with every agent execution step. If an analysis fails, we can trace the entire request path across both services using a single identifier."*

---

### Q18: What is your strategy for handling non-English repositories or descriptions?
**Examiner Intent**: Understanding scope boundaries.  
**Honest Answer**:  
> *"Currently, our NLTK stop-word lists, WordNet lemmatizers, and domain synonym thesauri are curated specifically for the English language. Non-English repositories that provide English READMEs or code identifiers are indexed normally; however, repositories documented entirely in other languages will exhibit lower TF-IDF cosine similarity scores. We acknowledge this as a boundary limitation in Chapter 9."*

---

### Q19: Why do you weigh Relevance at 0.40, Coverage at 0.30, and Viability at 0.30 in the final ranking?
**Examiner Intent**: Justification of ranking weights in `docs/SCORING_RUBRIC.md`.  
**Honest Answer**:  
> *"Semantic relevance carries the highest weight (0.40) because a repository must fundamentally solve the founder's domain problem; a perfectly viable calculator repository is useless to a founder seeking an e-commerce platform. Feature coverage and technical viability are weighted equally at 0.30 each to strike an exact balance between how much code is already built and the maintenance difficulty of reviving it."*

---

### Q20: How do you ensure that your static code analysis doesn't run out of memory on huge repositories?
**Examiner Intent**: Resource management and scalability.  
**Honest Answer**:  
> *"We enforce strict architectural ceilings: We inspect directory trees recursively using GitHub's Git Trees API, which returns file metadata without downloading file bodies. Agents only fetch file blobs for relevant matching files up to a 100 KB size ceiling. Large binaries, minified bundles, lockfiles, and media files are excluded by pattern matching (`package-lock.json`, `.min.js`, `.png`)."*

---

### Q21: What is the purpose of the 7-Tab Report modal in the client?
**Examiner Intent**: Founder user experience evaluation.  
**Honest Answer**:  
> *"Non-technical founders must establish trust in the AI's recommendations. The 7-tab modal breaks down the repository along seven independent dimensions: Structure, Bug Risk, Dependencies, License, Documentation, History, and Tests. Each tab pairs high-level plain English explanations with verifiable low-level evidence (exact file paths, line ranges, and CVE numbers), allowing the founder to share specific tabs with technical advisors."*

---

### Q22: What role did each team member play in the development of RepoRevive?
**Examiner Intent**: Assessing team collaboration and individual ownership.  
**Honest Answer**:  
> *"Our team divided the project into three core pillars:  
> - **Student 1 (AI & NLP Lead)**: Developed the FastAPI service, NLTK preprocessing, TF-IDF vectorization, synonym thesaurus, and multi-agent orchestrator.  
> - **Student 2 (Backend & Ingestion Lead)**: Developed the Node/Express API gateway, GitHub ingestion engine, rate-limit backoff, MongoDB models, and deterministic ranking service.  
> - **Student 3 (Frontend & Verification Lead)**: Developed the React/Tailwind client, Idea Wizard, Checklist Editor, Founder Brief export, and the anti-hallucination Verifier agent."*

---

### Q23: What security headers are configured in your production Express application?
**Examiner Intent**: Web application security hardening.  
**Honest Answer**:  
> *"We use `helmet` to enforce strict Content Security Policy (CSP) directives restricting default script, style, and font sources; disable cross-origin embedder policies; enforce strict origin-based CORS; sanitize inputs via Zod schemas; and enforce a 100 KB payload ceiling to prevent denial-of-service memory exhaustion attacks."*

---

### Q24: If an examiner cloned your repository right now, could they run it without contacting you?
**Examiner Intent**: Reproducibility and DevOps packaging.  
**Honest Answer**:  
> *"Yes. A single command (`docker compose up`) builds and runs the entire monorepo—Client on `:5173`, Express on `:5000`, FastAPI on `:8000`, and MongoDB on `:27017`—with seeded data and mock LLM providers enabled by default. Furthermore, running `make test` executes all unit, contract, and benchmark suites without requiring any secret API keys."*

---

### Q25: What is the single most important lesson your team learned while engineering this capstone project?
**Examiner Intent**: Reflective engineering maturity.  
**Honest Answer**:  
> *"The critical lesson was that LLMs should never be trusted with numerical scoring or unchecked evidence extraction. Unconstrained LLMs will flatter broken code, invent files, and produce arbitrary numbers. The true power of Agentic AI emerges when generative models are strictly confined to qualitative reasoning and bounded by deterministic code, static linters, and rigorous verification gates."*
