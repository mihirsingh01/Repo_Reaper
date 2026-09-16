# RepoRevive – Security Architecture & Audit Report

## 1. Threat Model & Boundaries

RepoRevive operates on untrusted third-party public GitHub codebases. The system enforces strict architectural containment boundaries (ADR-001, ADR-011).

| Threat Vector | Mitigation Strategy | Verification Mechanism |
| :--- | :--- | :--- |
| **Remote Code Execution (RCE)** | Strict static and read-only analysis. Never run `npm install`, `pip install`, `make`, or execute arbitrary repo code. | `ADR-001`; absence of execution APIs; isolated container environments. |
| **Prompt Injection** | Treat candidate repo content (READMEs, code snippets) as untrusted data wrapped in `<<<START_UNTRUSTED_*>>>` delimiters with strict instructions to ignore embedded directives. Read-only tools prevent arbitrary state change. | `test_orchestrator_prompt_injection_defense` in `ai-service/tests/test_orchestrator.py`. |
| **NoSQL Injection** | Zod validation schemas strictly enforce string types and sanitize MongoDB filter inputs. MongoDB query operator objects (`$gt`, `$where`) are rejected at the API edge. | `server/tests/security.test.ts`. |
| **Authentication Bypass** | Signed stateless JWTs with Bearer authentication (`ADR-012`). Role-based access control gates administrative routes. | `server/tests/security.test.ts`. |
| **Secret Leaks** | `passwordHash` is configured with `select: false` in Mongoose; stripped from all API outputs. Secrets loaded via environment variables; never logged. | `server/tests/security.test.ts`. |
| **Denial of Service (DoS)** | Request body size limits (100 KB max), input length bounds (30–2,000 chars), GitHub rate-limit ETag caching, daily user analysis caps (15/day). | `server/tests/failure_modes.test.ts`. |

---

## 2. Automated Security Audit Results

### 2.1 Node.js Dependencies (`npm audit`)
- **Scope**: `server/package.json` and `client/package.json`
- **Result**: Zero High or Critical severity vulnerabilities in direct production dependencies.
- **Key Protected Packages**:
  - `bcrypt`: Password hashing (salt rounds: 10)
  - `jsonwebtoken`: Verified signature checking
  - `zod`: Request payload sanitization
  - `helmet`: HTTP security headers
  - `express-rate-limit`: Brute-force protection on `/api/auth/login`

### 2.2 Python Dependencies (`pip-audit`)
- **Scope**: `ai-service/requirements.txt`
- **Result**: Checked against PyPI advisory database.
- **Key Protected Packages**:
  - `fastapi` $\ge 0.111.0$ (Patched against Starlette multipart DoS)
  - `pydantic` $\ge 2.7.0$ (Rust-backed strict type parsing)
  - `httpx` $\ge 0.27.0$ (Safe HTTP connection pooling)
  - `scikit-learn` $\ge 1.5.0$ (Isolated local TF-IDF model generation)

---

## 3. Linter Isolation Boundary (Rule 2)
Static bug risk checks use fixed configurations (`ruff.toml` and `.eslintrc.json`) bundled with RepoRevive.
Configuration lookup is explicitly disabled (`--no-config`, `--no-eslintrc`). Repositories cannot execute arbitrary code via custom ESLint plugins or lifecycle scripts.
