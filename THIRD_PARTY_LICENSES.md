# Third-Party Software & Licenses

RepoRevive incorporates open-source software libraries and frameworks. Below is the attribution, license type, and purpose of all major third-party dependencies used in the system.

---

## 1. Client (`client/`)

| Package | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| `react` | `^18.2.0` | MIT | Component-based UI library |
| `react-dom` | `^18.2.0` | MIT | DOM rendering engine for React |
| `react-router-dom` | `^6.22.0` | MIT | Client-side routing and navigation |
| `lucide-react` | `^0.344.0` | ISC | Accessible UI iconography |
| `axios` | `^1.6.7` | MIT | HTTP client for backend REST communication |
| `tailwindcss` | `^3.4.1` | MIT | Utility-first CSS styling engine |
| `vite` | `^5.1.0` | MIT | Modern frontend build tooling and dev server |
| `typescript` | `^5.3.3` | Apache-2.0 | Static type checking |

---

## 2. Server API Gateway (`server/`)

| Package | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| `express` | `^4.18.2` | MIT | HTTP application framework |
| `mongoose` | `^8.1.0` | MIT | Object Data Modeling (ODM) for MongoDB |
| `jsonwebtoken` | `^9.0.2` | MIT | Cryptographic JWT token signing and verification |
| `bcryptjs` | `^2.4.3` | MIT | Secure password hashing (salted bcrypt) |
| `cors` | `^2.8.5` | MIT | Cross-Origin Resource Sharing middleware |
| `helmet` | `^7.1.0` | MIT | HTTP security headers and CSP enforcement |
| `pino` | `^8.18.0` | MIT | High-performance structured JSON logging |
| `pino-http` | `^9.0.0` | MIT | HTTP request/response logging middleware |
| `zod` | `^3.22.4` | MIT | Schema declaration and input validation |
| `dotenv` | `^16.4.1` | BSD-2-Clause | Local environment variable management |
| `axios` | `^1.6.7` | MIT | Upstream AI service and GitHub HTTP calls |

---

## 3. AI & Analysis Microservice (`ai-service/`)

| Package | Version | License | Purpose |
| :--- | :--- | :--- | :--- |
| `fastapi` | `^0.109.0` | MIT | High-performance asynchronous Python web framework |
| `uvicorn` | `^0.27.0` | BSD-3-Clause | ASGI server implementation |
| `pydantic` | `^2.6.0` | MIT | Data parsing and validation using Python type hints |
| `pydantic-settings` | `^2.1.0` | MIT | Environment settings management |
| `scikit-learn` | `^1.4.0` | BSD-3-Clause | TF-IDF vectorization and sparse cosine similarity |
| `numpy` | `^1.26.3` | BSD-3-Clause | Numerical array computations |
| `nltk` | `^3.8.1` | Apache-2.0 | Natural Language Toolkit (tokenization, stopwords, stemming) |
| `anthropic` | `^0.18.0` | MIT | Anthropic Claude LLM SDK |
| `openai` | `^1.12.0` | Apache-2.0 | OpenAI API compatible SDK |
| `httpx` | `^0.26.0` | BSD-3-Clause | Asynchronous HTTP client for tools and external APIs |
| `pytest` | `^8.0.0` | MIT | Python test framework |
| `ruff` | `^0.2.0` | MIT / Apache-2.0 | High-speed Python linter for static code bug analysis |

---

## 4. Notice and Disclaimers

All third-party trademarks, service marks, and trade names are the property of their respective owners. RepoRevive does not modify or re-distribute third-party code packages outside standard package manager dependency installations.
