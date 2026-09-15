# RepoRevive – MVP Definition

Derived from `docs/REQUIREMENTS.md`, `docs/PROJECT_BRIEF.md` and `docs/TASKS.md`.

## 1. MVP goal
One founder can go from a plain-words idea to a verified **Best match** repository, with proof, in one sitting:
> Idea -> confirmed feature checklist -> search of stale repos -> top 5 analysed with evidence -> Best match + 2 alternatives + gap list + Founder Brief.

## 2. Target user
Non-technical founders with an idea and no tech team. Admin is a secondary role, used only to run ingestion.

## 3. MVP scope (must ship)
1. Register, login (JWT), roles founder and admin
2. Submit idea (30-2000 chars)
3. Idea Refiner returns summary, target users, must/nice checklist
4. Founder edits and confirms the checklist
5. Ingestion of stale repos (inactive 12+ months, >= 30 commits, README, license, bug-label counts, last CI result)
6. TF-IDF + cosine search, top 20 with "why it matched" terms
7. Auto-analysis of top 5 (daily cap per user)
8. Analysis: feature coverage with file evidence, bug risk, viability sub-scores, verdict, flags, license, revival plan
9. Results page: Best match, 2 alternatives, gap list, plain-language explanations
10. Founder Brief: markdown download and printable page
11. License and GitHub link on every result
12. Idea and search history; repeated search served from cache
13. Admin triggers ingestion and sees job status

## 4. MVP rules that cannot be cut
1. Static, read-only analysis. No third-party code is executed, built, installed or imported.
2. All scores come from deterministic code per `docs/SCORING_RUBRIC.md`. LLMs never output a number that is used.
3. Every finding carries evidence; the Verifier drops unsupported claims. A "present" feature without a real file path counts as missing.
4. Blocking flags (`NO_LICENSE`, `ARCHIVED`, `EMPTY_REPO`, `CRITICAL_VULN`) can never be the Best match.
5. Repo content is untrusted data (prompt-injection defence).
6. Secrets only via env vars; GitHub rate limits respected (ETag, backoff, cache).
7. All tests pass with `LLM_PROVIDER=mock`; `docker compose up --build` starts everything.

## 5. Ranking formula
`final = 0.40 x relevance + 0.30 x coverage/100 + 0.30 x viability/100`.
Best match = highest final with no blocking flag. Ties go to the lower bug-risk penalty, then the newer last commit.
