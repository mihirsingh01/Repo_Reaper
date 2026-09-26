from typing import List, Literal
from pydantic import BaseModel, Field


class FeatureSpec(BaseModel):
    id: str = Field(description="Unique feature id, e.g. f1, f2")
    label: str = Field(description="Plain-language name for founder review")
    plainDescription: str = Field(description="Founder-friendly explanation of the feature")
    keywords: List[str] = Field(default_factory=list, description="Technical keywords for repo retrieval")
    priority: Literal["must", "nice"] = Field(default="must", description="Priority level: must or nice")


class IdeaSpec(BaseModel):
    summary: str = Field(description="One-sentence distillation of the idea")
    targetUsers: List[str] = Field(default_factory=list, description="Target customer personas")
    features: List[FeatureSpec] = Field(description="List of 3 to 10 refined features")
    clarifications: List[str] = Field(
        default_factory=list,
        description="Clarifying questions if the prompt was vague or underspecified",
    )


class RefineIdeaRequest(BaseModel):
    text: str = Field(min_length=30, max_length=2000, description="Raw product idea text")
