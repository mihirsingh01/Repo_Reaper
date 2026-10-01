# Chapter 5: Methodology

## 5.1. Research and Engineering Framework
RepoRevive employs a rigorous, mixed-method engineering research methodology combining natural language processing, agentic static code analysis, and deterministic scoring. The pipeline progresses through four distinct phases:
1. **Idea Ingestion and Semantic Structuring**
2. **Corpus Ingestion and NLP Candidate Retrieval**
3. **Multi-Agent Static Code Analysis and Verification**
4. **Deterministic Multi-Criteria Ranking**

---

## 5.2. Phase 1: Idea Refinement and Feature Structuring
When a founder submits an unstructured idea description $T$, an LLM agent refines $T$ into a formal specification:
$$I = \langle S, U, \mathcal{F} \rangle$$
where $S$ is a 2-sentence non-technical summary, $U$ is a list of target user personas, and $\mathcal{F} = \{f_1, f_2, \dots, f_m\}$ is an ordered set of feature items. Each feature $f_i$ is modeled as a tuple:
$$f_i = \langle \text{id}_i, \text{label}_i, \text{desc}_i, \mathcal{K}_i, p_i \rangle$$
where $\mathcal{K}_i$ represents technical keywords, and $p_i \in \{\text{must}, \text{nice}\}$ denotes user-confirmed priority. Priority weights are assigned as:
$$w(p_i) = \begin{cases} 1.0 & \text{if } p_i = \text{must} \\ 0.5 & \text{if } p_i = \text{nice} \end{cases}$$

---

## 5.3. Phase 2: NLP Information Retrieval Pipeline

### 5.3.1. Text Preprocessing
Both repository metadata (name, description, topics, README excerpts) and query feature texts undergo systematic linguistic normalization:
1. **Case Normalization**: Conversion to lowercase.
2. **Tokenisation**: Alphanumeric regex splitting ($[a-zA-Z0-9]+$).
3. **Stop-Word Removal**: Filtering using NLTK's English stop-word lexicon supplemented with generic programming tokens (e.g., `github`, `repo`, `project`, `readme`).
4. **Stemming and Lemmatisation**: Word normalization via the Porter Stemmer and WordNet Lemmatiser.

### 5.3.2. Domain Synonym Expansion
To bridge the vocabulary mismatch, keywords are expanded via a curated software engineering thesaurus $\mathcal{T}$:
$$\mathcal{K}' = \mathcal{K} \cup \bigcup_{k \in \mathcal{K}} \mathcal{T}(k)$$
*(Example: "billing" $\to$ \{"billing", "invoice", "payment", "stripe", "subscription"\}).*

### 5.3.3. TF-IDF Vectorization and Cosine Similarity
Documents are mapped into a high-dimensional vector space using Term Frequency-Inverse Document Frequency (TF-IDF):
$$\text{TF}(t, d) = \frac{f_{t,d}}{\sum_{t' \in d} f_{t',d}}, \quad \text{IDF}(t, \mathcal{D}) = \ln\left(\frac{1 + |\mathcal{D}|}{1 + |\{d \in \mathcal{D} : t \in d\}|}\right) + 1$$
$$\text{TF-IDF}(t, d, \mathcal{D}) = \text{TF}(t, d) \times \text{IDF}(t, \mathcal{D})$$

Given query vector $\vec{q}$ and repository document vector $\vec{d}_r$, semantic relevance is calculated as:
$$\text{Relevance}(q, r) = \cos(\vec{q}, \vec{d}_r) = \frac{\vec{q} \cdot \vec{d}_r}{\|\vec{q}\| \|\vec{d}_r\|}$$

Candidates are ranked in descending order of $\text{Relevance}(q, r)$, with the top $K$ ($K=10$) selected for deep multi-agent analysis.

---

## 5.4. Phase 3: Multi-Agent Analysis and Verification

### 5.4.1. Specialized Inspection Agents
Eight autonomous agents execute in dependency order:
- **Scout**: Verifies dormancy ($\ge 12$ mo), commit history, and activity flags.
- **Structure**: Inspects tree depth, directory layout, framework detection, and lines of code (LOC).
- **Coverage**: Maps confirmed features to concrete source files, recording snippets and line numbers.
- **Bug Risk**: Computes bug density, open issues labeled "bug", CI conclusions, and TODO/FIXME comments.
- **Dependencies**: Parses manifests (`package.json`, `requirements.txt`), audits version obsolescence, and queries OSV.dev for CVEs.
- **License**: Classifies SPDX legal identifiers and commercial reusability.
- **Verifier**: Audits all claims against the repository tree; drops ungrounded statements.
- **Revival Planner**: Synthesizes missing gaps, estimates developer hours, and creates the Founder Brief.

### 5.4.2. Anti-Hallucination Grounding Rule
A claim $C$ asserting that a feature or vulnerability exists is marked valid if and only if:
$$\exists \text{ path } P \in \text{RepoTree} \quad \text{s.t.} \quad \text{EvidenceRef}(C) = P$$
Any claim referencing a nonexistent file is dropped by the Verifier Agent, preventing inflated coverage.

---

## 5.5. Phase 4: Deterministic Scoring Rubric

All metrics are computed via deterministic mathematical formulas per `docs/SCORING_RUBRIC.md`:

### 5.5.1. Feature Coverage Score
$$\text{Coverage}(R) = \left( \frac{\sum_{i=1}^m w(p_i) \cdot s(f_i)}{\sum_{i=1}^m w(p_i)} \right) \times 100$$
where $s(f_i) = 1.0$ (present), $0.5$ (partial), or $0.0$ (missing).

### 5.5.2. Bug Risk Penalty
$$\text{BugPenalty}(R) = \min\left(40.0, \, 2.0 \cdot N_{\text{bugs}} + 1.5 \cdot \frac{E_{\text{lint}}}{\text{kLOC}} + 5.0 \cdot \mathbb{I}_{\text{CI=fail}} + 0.5 \cdot \frac{N_{\text{TODO}}}{\text{kLOC}}\right)$$

### 5.5.3. Technical Viability Score
$$\text{BaseHealth}(R) = 0.20 S_{\text{struct}} + 0.20 S_{\text{deps}} + 0.20 S_{\text{lic}} + 0.15 S_{\text{docs}} + 0.10 S_{\text{hist}} + 0.15 S_{\text{tests}}$$
$$\text{Viability}(R) = \max\left(0.0, \, \min(100.0, \, \text{BaseHealth}(R) - \text{BugPenalty}(R))\right)$$

### 5.5.4. Composite Ranking & Disqualification
$$\text{RankScore}(R) = 0.40 \cdot \text{Relevance}(R) + 0.30 \cdot \frac{\text{Coverage}(R)}{100} + 0.30 \cdot \frac{\text{Viability}(R)}{100}$$

**Disqualification Safety Gates**:
A repository is disqualified from the **Best Match** hero position if:
$$\text{License}(R) = \text{"NO\_LICENSE"} \quad \lor \quad \text{HasCriticalCVE}(R) = \text{true}$$
Disqualified repositories are relegated to secondary alternative cards with explicit warning flags.
