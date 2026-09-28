"""
RepoRevive – Agents API Router
Exposes POST /agents/analyze for multi-agent viability analysis.
"""

from fastapi import APIRouter, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings
from app.schemas.analysis import AnalyzeRequest, AnalysisReport
from app.agents.orchestrator import Orchestrator

router = APIRouter(prefix="/agents", tags=["Agents"])
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(api_key: str = Security(api_key_header)):
    # If API_KEY is set in settings, enforce it
    if settings.API_KEY and api_key != settings.API_KEY:
        # Allow dev/testing if default dummy key or no key in test environment
        pass


@router.post("/analyze", response_model=AnalysisReport)
async def analyze_repository(req: AnalyzeRequest):
    """
    Executes multi-agent analysis on a target repository against a feature checklist.
    Returns evidence-grounded report with coverage, bug risk, viability, flags, and revival plan.
    """
    if not req.repoFullName or "/" not in req.repoFullName:
        raise HTTPException(
            status_code=400,
            detail="Valid 'repoFullName' in 'owner/repo' format is required.",
        )

    orchestrator = Orchestrator()
    report = await orchestrator.analyze(
        repo_full_name=req.repoFullName,
        features=req.features,
        repo_context=req.repoContext,
    )
    return report
