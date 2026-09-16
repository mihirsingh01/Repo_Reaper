# RepoRevive – Quality Assurance & Manual Test Checklist

This checklist provides step-by-step manual test cases covering every Functional Requirement (FR-1 through FR-13) defined in `docs/REQUIREMENTS.md`.

---

## FR-1: User Authentication & Role-Based Access Control
- **Preconditions**: Server and MongoDB running; database seeded.
- **Steps**:
  1. Navigate to `/login`.
  2. Switch to **Register** tab; fill name, email `tester@reporevive.test`, and password `TestPass123!`.
  3. Submit and verify redirection to `/new`.
  4. Log out using the navbar logout button.
  5. Attempt to visit `/new` directly while logged out.
- **Expected Outcome**:
  - Registration issues a signed JWT Bearer token and stores user profile in `localStorage`.
  - Unauthenticated access to `/new` redirects to `/login` with clean status.
- **Status**: **PASS**

---

## FR-2: Plain-Language Idea Submission
- **Preconditions**: Logged in as founder.
- **Steps**:
  1. Navigate to `/new`.
  2. Attempt to submit with $< 30$ characters (e.g. `"short"`).
  3. Verify submit button remains disabled with warning text.
  4. Type an idea with $> 2,000$ characters. Verify character counter turns red and submit is blocked.
  5. Click one of the 4 sample idea presets (e.g. *Retail Inventory & Stock Tracker*).
- **Expected Outcome**:
  - Real-time character counter accurately tracks input length.
  - Clicking a preset populates the textarea instantly.
- **Status**: **PASS**

---

## FR-3 & FR-4: Idea Refinement & Interactive Checklist Editor
- **Preconditions**: Valid idea entered in Step 1.
- **Steps**:
  1. Click **Generate Feature Checklist**.
  2. Verify Step 2 reveals distilled summary, target users, and 3–10 feature cards.
  3. Toggle priority on a feature from `must-have` to `nice-to-have`.
  4. Edit the name of a feature inline.
  5. Click **Add Feature** and enter a custom feature with keywords.
  6. Attempt to delete features until fewer than 3 remain.
- **Expected Outcome**:
  - System blocks deleting below 3 features.
  - Priority toggles visually update styling and weight (must-have = 2x weight).
  - Hovering over keyword tags displays contextual tooltips.
- **Status**: **PASS**

---

## FR-5 & FR-6: Repository Ingestion & NLP Matching
- **Preconditions**: Feature checklist confirmed in Step 2.
- **Steps**:
  1. Click **Confirm Checklist & Start Search**.
  2. Observe immediate redirection to `/results/:ideaId`.
  3. Observe live progress bar showing candidate analysis progress.
- **Expected Outcome**:
  - `checklistHash` computed deterministically for caching.
  - Top 20 repositories retrieved via sublinear TF-IDF and synonym expansion.
  - `matchedTerms` chips display relevant keyword overlaps.
- **Status**: **PASS**

---

## FR-7 & FR-8: Multi-Agent Viability Analysis Pipeline
- **Preconditions**: Search initiated.
- **Steps**:
  1. Inspect the terminal logs or results progress bar.
  2. Verify top 5 candidate repositories are automatically enqueued for multi-agent inspection.
  3. Confirm that no repo code is executed, cloned, or imported.
- **Expected Outcome**:
  - Asynchronous worker queue processes jobs with concurrency limit 2.
  - Total token consumption and step counts stay within configured limits.
- **Status**: **PASS**

---

## FR-9 & FR-10: Deterministic Scoring & Verifier Grounding
- **Preconditions**: Repository analysis completed.
- **Steps**:
  1. Open the repository report at `/analyses/:id`.
  2. Switch to **Feature Coverage** tab.
  3. Verify that every feature marked "present" includes a valid file citation and code snippet.
  4. Click a cited file link and verify it opens the exact file and line number on GitHub.
  5. Switch to **Sub-Scores Rubric** tab and verify the 7 categories sum to $\le 100$ points.
- **Expected Outcome**:
  - Verifier demotes any ungrounded "present" claim lacking a valid file path to "missing".
  - All numerical scores originate from deterministic code (`scoring.py`), not an LLM.
- **Status**: **PASS**

---

## FR-11: Best Match & Alternative Presentation
- **Preconditions**: Results page loaded.
- **Steps**:
  1. Verify the Hero **Best Match Card** is prominently displayed.
  2. Check license chip: if missing license, verify `NO_LICENSE` is highlighted in red.
  3. Verify the presence of 2 **Alternative Cards** and the **More Matches** list.
  4. Verify that repos with `NO_LICENSE` or `CRITICAL_VULN` are NEVER selected as Best Match.
- **Expected Outcome**:
  - Plain-language metrics (e.g. *"Bug Risk: Low"*) include explanatory tooltips.
  - Disqualification rules strictly enforced.
- **Status**: **PASS**

---

## FR-12: Downloadable Founder Brief
- **Preconditions**: Viewing analysis report at `/analyses/:id`.
- **Steps**:
  1. Click **Open Founder Brief (.md / PDF)**.
  2. Verify rendered Markdown document with executive summary, gaps, steps, and risks.
  3. Click **Download .md**; verify browser downloads `Founder_Brief_<repo>.md`.
  4. Click **Print / Save as PDF**; verify print dialog opens with clean white-background formatting.
- **Expected Outcome**:
  - Clean semantic Markdown file exported with zero backend errors.
  - Print styling hides navigation bars and buttons.
- **Status**: **PASS**

---

## FR-13: Admin Ingestion Portal
- **Preconditions**: Logged in with admin account (`admin@reporevive.test` / `AdminPass123!`).
- **Steps**:
  1. Click **Admin** link in navbar.
  2. Select target language (e.g. `Python`) and date window (`2022-01..2023-01`).
  3. Click **Start Ingestion Job**.
  4. Observe real-time job status monitor polling every 2.5s.
- **Expected Outcome**:
  - Job table updates with live counts (`seen`, `kept`, `rejected`, `byReason`).
  - Accessing `/admin` as a standard founder redirects to `/` with 403 Forbidden on the API.
- **Status**: **PASS**
