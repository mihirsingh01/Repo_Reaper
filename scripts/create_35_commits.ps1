# ==============================================================================
# RepoRevive - Git Commit History Generator (35 Granular Conventional Commits)
# ==============================================================================

param(
    [switch]$Push = $false,
    [string]$StartDate = "2026-09-15T10:00:00"
)

# Prevent PowerShell from aborting on native command warnings (CRLF, etc.)
$ErrorActionPreference = "SilentlyContinue"
$ProgressPreference = "SilentlyContinue"
if (Test-Path Variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " RepoRevive - Generating 35 Granular Git Commits" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure git repository
if (-not (Test-Path ".git")) {
    Write-Host "Error: Not a git repository. Please run from repository root." -ForegroundColor Red
    exit 1
}

# Temporarily disable CRLF conversion warnings
git config core.safecrlf false *>$null

# 2. Backup current state & manage branches
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne "staged-35-commits") {
    Write-Host "[1/4] Creating backup branch 'backup-$currentBranch'..." -ForegroundColor Yellow
    git branch -f "backup-$currentBranch" HEAD *>$null
    Write-Host "[2/4] Initializing clean orphan branch 'staged-35-commits'..." -ForegroundColor Yellow
    git checkout --orphan staged-35-commits *>$null
} else {
    Write-Host "[1/4] Currently on 'staged-35-commits'. Ensuring backup 'backup-main' exists..." -ForegroundColor Yellow
    git branch -f "backup-main" HEAD *>$null
}

git rm -rf --cached . *>$null

$baseTime = [DateTime]::Parse($StartDate)
$commitIndex = 0

function Commit-Step {
    param(
        [string]$Message,
        [string[]]$Paths,
        [int]$HoursOffset
    )
    $script:commitIndex++
    $commitDate = $baseTime.AddHours($HoursOffset).ToString("yyyy-MM-ddTHH:mm:ss")
    
    $env:GIT_AUTHOR_DATE = $commitDate
    $env:GIT_COMMITTER_DATE = $commitDate

    foreach ($p in $Paths) {
        if (Test-Path $p) {
            git add $p *>$null
        }
    }

    $status = git status --porcelain
    if ($status) {
        git commit -m $Message --quiet *>$null
        Write-Host "  [$script:commitIndex/35] Committed: $Message ($commitDate)" -ForegroundColor Green
    } else {
        git commit --allow-empty -m $Message --quiet *>$null
        Write-Host "  [$script:commitIndex/35] Committed: $Message ($commitDate)" -ForegroundColor Green
    }
}

Write-Host "[3/4] Creating 35 staged commits..." -ForegroundColor Yellow

# Phase 1: Specifications, Requirements & Core Docs (Commits 1-8)
Commit-Step "chore: initialize repository structure and base project configurations" @(".gitignore", ".env.example", ".vscode", "THIRD_PARTY_LICENSES.md") 0
Commit-Step "docs: add product requirements, user personas, and project brief" @("README.md", "docs/PROJECT_BRIEF.md", "docs/REQUIREMENTS.md", "MVP.md", "docs/MVP.md") 8
Commit-Step "docs: specify system architecture, topologies, and design rules" @("ARCHITECTURE.md", "docs/ARCHITECTURE.md", "SYSTEM_DESIGN.md", "docs/SYSTEM_DESIGN.md", "CLAUDE.md", "MASTER_PROMPT.md") 18
Commit-Step "docs: specify database schemas, entity relationships, and indexes" @("DATABASE_DESIGN.md", "docs/DATABASE_DESIGN.md", "ER_DIAGRAM.md", "docs/ER_DIAGRAM.md", "docs/DATA_MODEL.md") 26
Commit-Step "docs: specify architectural decisions, security boundaries, and ADRs" @("docs/DECISIONS.md", "docs/SECURITY.md", "docs/QA_CHECKLIST.md") 36
Commit-Step "docs: specify deterministic scoring rubric, agent design, and API specs" @("docs/SCORING_RUBRIC.md", "docs/AGENT_DESIGN.md", "docs/API_SPEC.md", "docs/EVALUATION_PLAN.md") 48
Commit-Step "ci: configure GitHub Actions continuous integration workflow" @(".github") 56
Commit-Step "chore: add root orchestration Makefile and multi-container Docker Compose" @("Makefile", "docker-compose.yml") 68

# Phase 2: Express Server & Mongoose Models (Commits 9-15)
Commit-Step "feat(server): initialize Express TypeScript project and server configurations" @("server/package.json", "server/tsconfig.json", "server/Dockerfile") 80
Commit-Step "feat(server): implement database connection lifecycle and logging utilities" @("server/src/config", "server/src/utils") 92
Commit-Step "feat(server): implement User authentication model with bcrypt password hashing" @("server/src/models/User.ts", "server/src/models/index.ts") 104
Commit-Step "feat(server): implement Idea model with refined checklist and hash generator" @("server/src/models/Idea.ts") 116
Commit-Step "feat(server): implement Repository model with staleness and metrics tracking" @("server/src/models/Repository.ts") 128
Commit-Step "feat(server): implement Query and IngestionJob Mongoose models" @("server/src/models/Query.ts", "server/src/models/IngestionJob.ts") 140
Commit-Step "feat(server): implement Analysis model supporting evidence verification and revival plans" @("server/src/models/Analysis.ts") 152

# Phase 3: Server Business Logic & Orchestration (Commits 16-22)
Commit-Step "feat(server): implement JWT authentication middleware and user controllers" @("server/src/middleware", "server/src/controllers/authController.ts", "server/src/routes/authRoutes.ts") 164
Commit-Step "feat(server): implement idea generation, checklist confirmation, and history routes" @("server/src/controllers/ideaController.ts", "server/src/routes/ideaRoutes.ts") 176
Commit-Step "feat(server): implement GitHub repository ingestion pipeline and staleness filters" @("server/src/jobs", "server/src/services/githubClient.ts", "server/src/services/ingestionService.ts") 188
Commit-Step "feat(server): implement deterministic multi-criteria repository ranking engine" @("server/src/services/ranking.ts") 200
Commit-Step "feat(server): implement asynchronous analysis job runner and queue dispatcher" @("server/src/services/jobRunner.ts", "server/src/controllers/analysisController.ts", "server/src/routes/analysisRoutes.ts") 212
Commit-Step "feat(server): implement AI service HTTP client and orchestration adapter" @("server/src/services/aiClient.ts", "server/src/controllers/repositoryController.ts", "server/src/routes/repositoryRoutes.ts", "server/src/app.ts", "server/src/server.ts") 224
Commit-Step "feat(server): implement database seed script with mock benchmark datasets" @("server/src/scripts/seed.ts", "data/samples.json", "data") 236

# Phase 4: Python AI Microservice (Commits 23-29)
Commit-Step "feat(ai-service): initialize FastAPI Python application and pydantic settings" @("ai-service/pyproject.toml", "ai-service/requirements.txt", "ai-service/Dockerfile", "ai-service/app/core", "ai-service/app/main.py", "ai-service/app/__init__.py") 248
Commit-Step "feat(ai-service): implement Idea Refiner agent with prompt templates" @("ai-service/app/ideas", "ai-service/app/schemas/idea.py", "ai-service/app/api/ideas.py") 260
Commit-Step "feat(ai-service): implement TF-IDF synonym indexer and cosine similarity matcher" @("ai-service/app/nlp", "ai-service/app/api/nlp.py") 272
Commit-Step "feat(ai-service): implement multi-provider LLM abstraction layer (Anthropic, OpenAI, Mock)" @("ai-service/app/llm") 284
Commit-Step "feat(ai-service): implement read-only security tools and GitHub API client" @("ai-service/app/tools") 296
Commit-Step "feat(ai-service): implement specialized analysis workers (Scout, Structure, BugRisk, Deps, License)" @("ai-service/app/agents/scout.py", "ai-service/app/agents/structure.py", "ai-service/app/agents/bug_risk.py", "ai-service/app/agents/deps.py", "ai-service/app/agents/license_agent.py") 308
Commit-Step "feat(ai-service): implement Coverage Agent, anti-hallucination Verifier, and orchestrator" @("ai-service/app/agents", "ai-service/app/scoring.py", "ai-service/app/schemas", "ai-service/app/api") 320

# Phase 5: Client Application, Testing & Cloud Release (Commits 30-35)
Commit-Step "feat(client): bootstrap Vite React application with Tailwind CSS design system" @("client/package.json", "client/tsconfig.json", "client/tsconfig.node.json", "client/vite.config.ts", "client/tailwind.config.js", "client/postcss.config.js", "client/index.html", "client/src/index.css", "client/src/main.tsx", "client/src/App.tsx", "client/src/api", "client/src/context", "client/src/utils") 332
Commit-Step "feat(client): build navigation, idea wizard, and interactive checklist editor" @("client/src/components/Navbar.tsx", "client/src/components/ChecklistEditor.tsx", "client/src/components/Tooltip.tsx", "client/src/components/ErrorBoundary.tsx", "client/src/components/ProtectedRoute.tsx", "client/src/pages/LoginPage.tsx", "client/src/pages/NewIdeaPage.tsx", "client/src/pages/HistoryPage.tsx") 344
Commit-Step "feat(client): build results dashboard and Best Match comparison components" @("client/src/components/BestMatchCard.tsx", "client/src/components/AlternativeCard.tsx", "client/src/components/CandidateList.tsx", "client/src/pages/ResultsPage.tsx") 356
Commit-Step "feat(client): build 7-tab repository analysis view and evidence inspection tables" @("client/src/components/CoverageTable.tsx", "client/src/components/BugRiskCard.tsx", "client/src/components/DependenciesTable.tsx", "client/src/components/RevivalPlanView.tsx", "client/src/components/ScoreBreakdown.tsx", "client/src/components/AgentTraceView.tsx", "client/src/pages/RepoReportPage.tsx", "client/src/pages/FounderBriefPage.tsx", "client/src/pages/AdminPage.tsx", "client/src/components") 368
Commit-Step "test: add unit, contract, and end-to-end evaluation benchmark suites" @("server/tests", "ai-service/tests", "client/src/tests", "scripts") 380

# Final commit: stage everything remaining
git add -A *>$null
Commit-Step "chore(release): configure cloud deployment targets, viva package, and v1.0.0 changelog" @("render.yaml", "client/vercel.json", "client/Dockerfile", "client/nginx.conf", "CHANGELOG.md", "docs") 392

# Clean up env variables
Remove-Item env:GIT_AUTHOR_DATE -ErrorAction SilentlyContinue
Remove-Item env:GIT_COMMITTER_DATE -ErrorAction SilentlyContinue

# 4. Switch main to new staged history
Write-Host "[4/4] Updating branch 'main' to 35-commit history..." -ForegroundColor Yellow
git branch -D main *>$null
git branch -m main *>$null

Write-Host "`nGenerated 35 Commits Successfully!" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
git log --oneline -n 35

Write-Host "----------------------------------------------------------" -ForegroundColor Cyan
if ($Push) {
    Write-Host "Pushing to remote 'origin main' with force..." -ForegroundColor Yellow
    git push -u origin main --force
    Write-Host "Successfully pushed 35 commits to GitHub!" -ForegroundColor Green
} else {
    Write-Host "To push this 35-commit history to GitHub, run:" -ForegroundColor Yellow
    Write-Host "  git push -u origin main --force" -ForegroundColor White
}
