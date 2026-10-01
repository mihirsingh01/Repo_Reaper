# 5-Minute Scripted Live Demonstration

This script provides an exact, step-by-step walkthrough for the B.Tech final-year viva committee, including fallback procedures if external network or third-party APIs experience downtime.

---

## 1. Demo Overview & Timing

| Elapsed Time | Phase | Target Screen | Core Message to Examiners |
| :--- | :--- | :--- | :--- |
| **0:00 – 1:00** | Problem & Prompt Entry | `NewIdeaPage` | Founder describes idea in plain English; no technical jargon required. |
| **1:00 – 2:00** | Interactive Checklist | `ChecklistEditor` | LLM structures idea into editable must/nice features with domain keywords. |
| **2:00 – 3:00** | Matching & Progress | `ResultsPage` | Millisecond TF-IDF search + multi-agent background progress bar. |
| **3:00 – 4:00** | Best Match & Report | `ResultsPage` / Modal | Best Match Hero Card, viability score, and verified file citations. |
| **4:00 – 5:00** | Founder Brief Export | `FounderBriefPage` | Markdown / printable PDF summary handed directly to a freelance developer. |

---

## 2. Step-by-Step Script

### Minute 0:00 – 1:00: Founder Idea Entry
1. **Action**: Open the browser to `http://localhost:5173`. Log in as a founder (`demo@reporevive.dev` / `Founder123!`).
2. **Action**: Click **"New Idea"** in the navigation bar.
3. **Presenter Dialogue**:
   > *"Respected committee, early-stage founders know what business problem they want to solve, but lack the technical background to write a formal software requirements specification or search GitHub. In RepoRevive, the founder simply enters their idea in plain conversational English."*
4. **Action**: Paste the standard evaluation prompt into the large text area:
   ```text
   A lightweight collaborative kanban board for remote software teams. It needs real-time card synchronization across browser tabs, rich markdown card descriptions, and user authentication with email and password. A clean dark mode is a nice bonus.
   ```
5. **Action**: Point out the live character counter (`264 / 2000 chars`) and click **"Refine Idea with AI"**.

---

### Minute 1:00 – 2:00: Interactive Checklist Confirmation
1. **Screen**: The AI Refiner breaks the raw text into structured cards.
2. **Presenter Dialogue**:
   > *"The AI Refiner has parsed the pitch into concrete technical components: Real-time Kanban, User Authentication, Collaborative Sync, Markdown Notes, and Dark Mode. Notice that technical keywords like 'websockets', 'jwt', and 'bcrypt' are automatically generated. A non-technical founder can hover over tooltips to understand terms, reorder items, or toggle priority between 'Must-have' and 'Nice-to-have'."*
3. **Action**: Demonstrate interaction:
   - Toggle "Dark Mode" from "Must" to **"Nice-to-have"**.
   - Hover over the "Collaborative Sync" keyword tooltip showing `websockets`, `socket.io`, `sse`.
4. **Action**: Click **"Confirm & Find Repositories"**.

---

### Minute 2:00 – 3:00: Semantic Search & Background Agent Progress
1. **Screen**: Navigates to `ResultsPage`. Progress bar animates as background agents analyze top candidates.
2. **Presenter Dialogue**:
   > *"In under 50 milliseconds, our NLP engine performed Porter stemming, lemmatisation, and domain synonym expansion, querying our in-memory TF-IDF index. Notice the progress bar: while the founder watches, our eight autonomous agents are statically inspecting the top candidate repositories—fetching file trees, auditing manifests for CVEs, and testing against our strict anti-hallucination verifier."*

---

### Minute 3:00 – 4:00: Best Match Hero Card & 7-Tab Evidence Report
1. **Screen**: Results finish loading. The **Best Match Hero Card** highlights `octocat/kanban-lite`.
2. **Presenter Dialogue**:
   > *"RepoRevive has selected a single Best Match. Notice the summary: 'Already built: 4 of 5 features (80% coverage)', 'Bug Risk: Low', and an effort estimation of '15 to 30 developer hours'. Underneath, two alternative candidates are presented with clear trade-offs."*
3. **Action**: Click **"Deep-Dive Technical Report"**.
4. **Presenter Dialogue**:
   > *"Examiners often ask: 'How do you know the features are actually there without hallucination?' Let us inspect the Coverage tab. Notice that every single claim is backed by a verified file path, such as `src/components/Board.tsx:L14-L85`. If our Verifier Agent cannot locate the cited file in the actual repository tree, the claim is dropped immediately."*
5. **Action**: Click into the **"Bug Risk"** and **"Dependencies"** tabs, showing zero critical CVEs and static lint metrics.

---

### Minute 4:00 – 5:00: Founder Brief Export
1. **Action**: Close the report and click **"Generate Founder Brief"**.
2. **Screen**: Navigates to `FounderBriefPage`.
3. **Presenter Dialogue**:
   > *"Finally, a non-technical founder cannot hand a raw GitHub link to a freelance developer on Upwork or Fiverr without getting overcharged. RepoRevive generates a Founder Brief: a structured document that tells the freelancer exactly which repo to fork, which features are already built, what gaps must be written from scratch, and a realistic estimate of 20 to 35 hours of work."*
4. **Action**: Click **"Download Brief (.md)"** and show the downloaded file. Click **"Print / Save as PDF"** to trigger the styled print preview.
5. **Presenter Dialogue**:
   > *"This concludes our live demonstration. We are now ready for the committee's questions."*

---

## 3. Emergency Fallback Procedures

If external internet connectivity fails, GitHub rate limits are reached, or LLM APIs encounter an outage during the viva:

### Fallback A: Offline Mock Mode (`LLM_PROVIDER=mock`)
- RepoRevive features an offline mock LLM driver and deterministic fixture dataset (`scripts/ingest.ts`).
- To activate offline mode:
  1. Set `LLM_PROVIDER=mock` in `ai-service/.env`.
  2. The system executes all NLP vectorization, agent orchestration, verification, and scoring locally in under 150 ms with zero external internet dependencies.

### Fallback B: Pre-Seeded MongoDB Snapshot
- A pre-seeded database snapshot is included in `server/src/scripts/seed.ts`.
- Run `npm run seed` in `server/` to immediately populate full analyses for `octocat/kanban-lite` and candidate repositories.
- The UI will immediately load complete search and analysis results from cache with zero delay.
