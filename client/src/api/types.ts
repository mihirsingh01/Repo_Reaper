export interface User {
  id: string;
  name: string;
  email: string;
  role: 'founder' | 'admin';
  dailyAnalysisCount?: number;
}

export interface Feature {
  id: string;
  label: string;
  plainDescription: string;
  keywords: string[];
  priority: 'must' | 'nice';
}

export interface IdeaRefined {
  summary: string;
  targetUsers: string[];
  features: Feature[];
  clarifications?: string[];
}

export interface Idea {
  _id: string;
  userId: string;
  rawText: string;
  refined?: IdeaRefined;
  status: 'draft' | 'confirmed' | 'searching' | 'done';
  checklistHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QueryResultItem {
  repoId: string;
  relevance: number;
  matchedTerms: string[];
  analysisId?: string;
  coverage?: number;
  viability?: number;
  final?: number;
  fullName?: string;
  description?: string;
  language?: string;
  stars?: number;
  license?: { spdx: string; name: string };
  lastCommitAt?: string;
}

export interface SearchResultsResponse {
  status: 'queued' | 'running' | 'done' | 'failed';
  cached?: boolean;
  progress: {
    completed: number;
    total: number;
  };
  bestMatch?: QueryResultItem | null;
  alternatives: QueryResultItem[];
  candidates: QueryResultItem[];
}

export interface EvidenceItem {
  path: string;
  lineRange?: string;
  snippet: string;
  verified?: boolean;
}

export interface FindingItem {
  agent: string;
  claim: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  evidence: EvidenceItem[];
}

export interface CoverageFeatureItem {
  featureId: string;
  label: string;
  priority: 'must' | 'nice';
  status: 'present' | 'partial' | 'missing';
  evidence: EvidenceItem[];
  explanation?: string;
}

export interface SubScoresItem {
  structure?: number;
  bugRisk?: number;
  deps?: number;
  docs?: number;
  license?: number;
  history?: number;
  tests?: number;
}

export interface BugRiskItem {
  penalty: number;
  openBugs: number;
  lintErrorsPer1k: number;
  ciConclusion?: string;
  todoPer1k: number;
}

export interface RevivalStepItem {
  order: number;
  title: string;
  description: string;
  effortHours: number;
}

export interface RevivalPlanItem {
  gaps: string[];
  steps: RevivalStepItem[];
  effortHours: {
    min: number;
    max: number;
  };
  risks: string[];
}

export interface TraceStepItem {
  step: number;
  agent: string;
  tool?: string;
  argsSummary?: string;
  resultSummary?: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export interface RepoFactsItem {
  fullName: string;
  defaultBranch: string;
  commitCount: number;
  contributorCount: number;
  language?: string;
  stars: number;
  licenseSpdx?: string;
  openIssues: number;
  openBugIssues: number;
  closedBugIssues: number;
  lastCiConclusion?: string;
  lastCommitAt?: string;
  archived: boolean;
  treeFileCount: number;
  readmeChars: number;
  manifestFiles: string[];
  entryPoints: string[];
}

export interface AnalysisDetail {
  _id: string;
  repoId: string;
  ideaId: string;
  checklistHash: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'partial';
  facts?: RepoFactsItem;
  coverage?: {
    score: number;
    features: CoverageFeatureItem[];
  };
  bugRisk?: BugRiskItem;
  subScores?: SubScoresItem;
  viability?: number;
  confidence?: number;
  verdict?: string;
  flags: string[];
  findings: FindingItem[];
  revivalPlan?: RevivalPlanItem;
  founderBrief?: string;
  trace: TraceStepItem[];
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface IngestionJobItem {
  _id: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  params: {
    language?: string;
    window?: string;
  };
  counts: {
    seen: number;
    kept: number;
    rejected: number;
    byReason: Record<string, number>;
  };
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}
