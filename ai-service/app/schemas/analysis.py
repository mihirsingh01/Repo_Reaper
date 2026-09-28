from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator, model_validator
from app.schemas.idea import FeatureSpec


class Evidence(BaseModel):
    path: str = Field(description="Relative file path in repository")
    lineRange: Optional[str] = Field(default=None, description="Line number range, e.g. '12-25'")
    snippet: str = Field(max_length=200, description="Short code/text snippet (<= 200 chars)")
    verified: bool = Field(default=False, description="Whether the verifier confirmed this citation exists")

    @field_validator("snippet")
    @classmethod
    def truncate_snippet(cls, v: str) -> str:
        if len(v) > 200:
            return v[:197] + "..."
        return v


class Finding(BaseModel):
    agent: str = Field(description="Agent producing finding: scout, structure, coverage, bug_risk, deps, license")
    claim: str = Field(description="Short human-readable summary of the finding")
    severity: Literal["info", "low", "medium", "high", "critical"] = Field(default="info")
    evidence: List[Evidence] = Field(default_factory=list, description="List of cited evidence items")


class CoverageFeature(BaseModel):
    featureId: str = Field(description="Stable ID matching FeatureSpec, e.g. f1")
    label: str = Field(description="Feature label in plain words")
    priority: Literal["must", "nice"] = Field(default="must")
    status: Literal["present", "partial", "missing"] = Field(default="missing")
    evidence: List[Evidence] = Field(default_factory=list)
    explanation: Optional[str] = Field(default=None, description="Plain English reasoning for status")


class CoverageResult(BaseModel):
    score: float = Field(ge=0.0, le=100.0, description="Deterministic coverage score 0-100")
    features: List[CoverageFeature] = Field(default_factory=list)


class BugRiskResult(BaseModel):
    penalty: float = Field(ge=0.0, le=20.0, description="Total penalty subtracted from bug risk sub-score")
    openBugs: int = Field(ge=0, default=0)
    lintErrorsPer1k: float = Field(ge=0.0, default=0.0)
    ciConclusion: Optional[str] = Field(default=None)
    todoPer1k: float = Field(ge=0.0, default=0.0)


class SubScores(BaseModel):
    structure: Optional[float] = Field(default=None, ge=0.0, le=15.0)
    bugRisk: Optional[float] = Field(default=None, ge=0.0, le=20.0)
    deps: Optional[float] = Field(default=None, ge=0.0, le=15.0)
    docs: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    license: Optional[float] = Field(default=None, ge=0.0, le=15.0)
    history: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    tests: Optional[float] = Field(default=None, ge=0.0, le=15.0)


class RevivalPlanStep(BaseModel):
    order: int
    title: str
    description: str
    effortHours: float = Field(ge=0.0)


class RevivalPlan(BaseModel):
    gaps: List[str] = Field(default_factory=list, description="Missing and partial features in founder words")
    steps: List[RevivalPlanStep] = Field(default_factory=list, description="Ordered technical steps to revive")
    effortHours: Dict[str, float] = Field(default_factory=lambda: {"min": 0.0, "max": 0.0})
    risks: List[str] = Field(default_factory=list, description="Key technical and integration risks")


class TraceStep(BaseModel):
    step: int
    agent: str
    tool: Optional[str] = None
    argsSummary: Optional[str] = None
    resultSummary: Optional[str] = None
    tokensIn: int = 0
    tokensOut: int = 0
    latencyMs: float = 0.0


class RepoFacts(BaseModel):
    fullName: str
    defaultBranch: str = "main"
    commitCount: int = 0
    contributorCount: int = 0
    language: Optional[str] = None
    stars: int = 0
    licenseSpdx: Optional[str] = None
    openIssues: int = 0
    openBugIssues: int = 0
    closedBugIssues: int = 0
    lastCiConclusion: Optional[str] = None
    lastCommitAt: Optional[str] = None
    archived: bool = False
    treeFileCount: int = 0
    readmeChars: int = 0
    manifestFiles: List[str] = Field(default_factory=list)
    entryPoints: List[str] = Field(default_factory=list)


class AnalysisReport(BaseModel):
    status: Literal["done", "partial", "failed"] = "done"
    repoFullName: str
    facts: Optional[RepoFacts] = None
    coverage: Optional[CoverageResult] = None
    bugRisk: Optional[BugRiskResult] = None
    subScores: Optional[SubScores] = None
    viability: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    verdict: Optional[str] = None
    flags: List[str] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    revivalPlan: Optional[RevivalPlan] = None
    founderBrief: Optional[str] = None
    trace: List[TraceStep] = Field(default_factory=list)
    tokenUsage: Dict[str, int] = Field(
        default_factory=lambda: {"promptTokens": 0, "completionTokens": 0, "totalTokens": 0}
    )
    error: Optional[str] = None


class AnalyzeRequest(BaseModel):
    repoFullName: Optional[str] = None
    repo: Optional[Dict[str, Any]] = None
    features: List[FeatureSpec]
    repoContext: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def resolve_repo_name(self):
        if not self.repoFullName:
            if self.repo and isinstance(self.repo, dict) and "fullName" in self.repo:
                self.repoFullName = self.repo["fullName"]
            elif self.repoContext and isinstance(self.repoContext, dict) and "fullName" in self.repoContext:
                self.repoFullName = self.repoContext["fullName"]

        if self.repo and not self.repoContext:
            self.repoContext = self.repo

        if not self.repoFullName:
            raise ValueError("Either 'repoFullName' or 'repo.fullName' must be provided.")
        return self
