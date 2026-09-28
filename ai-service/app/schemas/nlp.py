from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RepositoryCorpusItem(BaseModel):
    id: str = Field(description="MongoDB repository ObjectId string")
    text: str = Field(description="Full concatenated text: name + description + topics + README")
    name: Optional[str] = Field(default="", description="Repository full name for boosting")
    topics: Optional[List[str]] = Field(default_factory=list, description="Topics for boosting")


class BuildIndexRequest(BaseModel):
    repos: List[RepositoryCorpusItem] = Field(description="List of repository documents to index")


class BuildIndexResponse(BaseModel):
    indexedCount: int
    vocabSize: int
    builtAt: Optional[str] = None
    corpusHash: str
    status: str


class MatchRequest(BaseModel):
    query: str = Field(min_length=1, description="Expanded query string")
    topK: int = Field(default=20, ge=1, le=100, description="Max candidate repos to return")
    candidateIds: Optional[List[str]] = Field(default=None, description="Optional candidate filter")


class MatchItemResponse(BaseModel):
    repoId: str
    relevance: float = Field(ge=0.0, le=1.0, description="Normalized cosine similarity (never probability)")
    matchedTerms: List[str] = Field(default_factory=list, description="Top contributing tokens")
    expansionsUsed: List[Dict[str, Any]] = Field(default_factory=list)


class PreprocessRequest(BaseModel):
    text: str = Field(description="Raw text to preprocess")
    lemmatize: bool = Field(default=True)
    removeStopwords: bool = Field(default=True)


class PreprocessResponse(BaseModel):
    tokens: List[str]
    preprocessed: str
    tokenCount: int
