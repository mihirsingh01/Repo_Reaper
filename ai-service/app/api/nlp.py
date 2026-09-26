from typing import List
from fastapi import APIRouter, Depends, Header, HTTPException, status
from app.schemas.nlp import (
    BuildIndexRequest,
    BuildIndexResponse,
    MatchRequest,
    MatchItemResponse,
    PreprocessRequest,
    PreprocessResponse,
)
from app.nlp.index import repository_index
from app.nlp.matcher import nlp_matcher
from app.nlp.preprocess import tokenize, preprocess_text
from app.core.config import settings

router = APIRouter(tags=["NLP & Retrieval"])


def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key",
        )
    return x_api_key


@router.post("/index/build", response_model=BuildIndexResponse, dependencies=[Depends(verify_api_key)])
async def build_index_endpoint(req: BuildIndexRequest):
    """
    Builds and persists TF-IDF vector index from repository corpus.
    """
    docs = [item.model_dump() for item in req.repos]
    result = repository_index.build(docs)
    return BuildIndexResponse(**result)


@router.post("/nlp/match", response_model=List[MatchItemResponse], dependencies=[Depends(verify_api_key)])
async def match_endpoint(req: MatchRequest):
    """
    Matches expanded query against repository index with cosine similarity.
    """
    results = nlp_matcher.match(
        query=req.query,
        top_k=req.topK,
        candidate_ids=req.candidateIds,
    )
    return [MatchItemResponse(**r) for r in results]


@router.post("/nlp/preprocess", response_model=PreprocessResponse, dependencies=[Depends(verify_api_key)])
async def preprocess_endpoint(req: PreprocessRequest):
    """
    Utility endpoint: cleans, removes stopwords, and lemmatizes input text.
    """
    tokens = tokenize(
        req.text,
        remove_stopwords=req.removeStopwords,
        lemmatize=req.lemmatize,
    )
    preprocessed = " ".join(tokens)
    return PreprocessResponse(
        tokens=tokens,
        preprocessed=preprocessed,
        tokenCount=len(tokens),
    )
