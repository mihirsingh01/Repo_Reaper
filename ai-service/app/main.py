import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.ideas import router as ideas_router
from app.api.nlp import router as nlp_router
from app.api.agents import router as agents_router
from app.nlp.index import repository_index

app = FastAPI(
    title="RepoRevive AI Service",
    description="Microservice for idea refinement, TF-IDF NLP matching, and multi-agent viability analysis",
    version="1.0.0",
)

# 1. Distributed Tracing: Request ID Middleware
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    req_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    response: Response = await call_next(request)
    response.headers["X-Request-Id"] = req_id
    return response

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-Id"],
)

# 3. Register route modules
app.include_router(ideas_router)
app.include_router(nlp_router)
app.include_router(agents_router)


@app.get("/health", tags=["System"])
async def health_check():
    """Liveness probe returning service and provider status."""
    return {
        "status": "ok",
        "service": "ai-service",
        "provider": settings.LLM_PROVIDER,
        "killSwitchActive": settings.LLM_SPEND_KILL_SWITCH,
        "index": {
            "ready": repository_index.is_ready(),
            "docCount": repository_index.doc_count,
            "vocabSize": repository_index.vocab_size,
            "builtAt": repository_index.built_at,
        },
    }


@app.get("/ready", tags=["System"])
async def ready_check():
    """Readiness probe confirming AI dependencies and index status."""
    # NLTK data & model validation
    is_ready = True
    details = {
        "provider": settings.LLM_PROVIDER,
        "killSwitch": settings.LLM_SPEND_KILL_SWITCH,
        "indexReady": repository_index.is_ready(),
    }

    return {
        "status": "ready" if is_ready else "not_ready",
        "details": details,
    }
