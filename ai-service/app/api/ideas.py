from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.schemas.idea import IdeaSpec, RefineIdeaRequest
from app.ideas.refiner import idea_refiner
from app.core.config import settings

router = APIRouter(prefix="/ideas", tags=["Ideas"])


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
        )
    return x_api_key


@router.post("/refine", response_model=IdeaSpec, dependencies=[Depends(verify_api_key)])
async def refine_idea_endpoint(req: RefineIdeaRequest):
    """
    Refines raw founder product idea into structured IdeaSpec checklist.
    """
    return await idea_refiner.refine(req.text)
