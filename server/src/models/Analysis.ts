import mongoose, { Schema, Document, Model } from "mongoose";

export type AnalysisStatus = "queued" | "running" | "done" | "failed" | "partial";

export interface IEvidence {
  type?: "file" | "api" | "url";
  ref?: string;
  path?: string;
  lineRange?: string;
  snippet?: string;
  verified?: boolean;
}

export interface ICoverageFeature {
  featureId: string;
  label?: string;
  priority?: "must" | "nice";
  status: "present" | "partial" | "missing";
  evidence: IEvidence[];
  explanation?: string;
}

export interface IFinding {
  agent: string;
  claim: string;
  severity: "info" | "low" | "medium" | "high" | "warning" | "critical";
  evidence: IEvidence[];
}

export interface ITraceStep {
  step: number;
  agent: string;
  tool?: string;
  argsSummary?: string;
  resultSummary?: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs?: number;
}

export interface ISubScores {
  structure: number | null;
  bugRisk: number | null;
  deps: number | null;
  docs: number | null;
  license: number | null;
  history: number | null;
  tests: number | null;
}

export interface IRevivalPlanStep {
  order?: number;
  title?: string;
  description?: string;
  effortHours?: number;
}

export interface IRevivalPlan {
  gaps: string[];
  steps: Array<IRevivalPlanStep | string>;
  effortHours: { min: number; max: number };
  risks: string[];
}

export interface IAnalysis extends Document {
  _id: mongoose.Types.ObjectId;
  repoId: mongoose.Types.ObjectId;
  ideaId: mongoose.Types.ObjectId;
  checklistHash: string;
  requestedBy: mongoose.Types.ObjectId;
  status: AnalysisStatus;
  startedAt?: Date;
  finishedAt?: Date;
  facts: Record<string, any>;
  coverage: {
    score: number;
    features: ICoverageFeature[];
  };
  bugRisk: {
    penalty: number;
    openBugs: number;
    lintErrorsPer1k: number;
    ciConclusion: string | null;
    todoPer1k: number;
  };
  subScores: ISubScores;
  viability: number;
  confidence: number;
  verdict: string;
  flags: string[];
  findings: IFinding[];
  revivalPlan: IRevivalPlan;
  founderBrief: string;
  trace: ITraceStep[];
  tokenUsage?: Record<string, any>;
  error?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IEvidence>(
  {
    type: { type: String, enum: ["file", "api", "url"] },
    ref: { type: String },
    path: { type: String },
    lineRange: { type: String },
    snippet: { type: String },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const CoverageFeatureSchema = new Schema<ICoverageFeature>(
  {
    featureId: { type: String, required: true },
    label: { type: String },
    priority: { type: String, enum: ["must", "nice"], default: "must" },
    status: { type: String, enum: ["present", "partial", "missing"], required: true },
    evidence: { type: [EvidenceSchema], default: [] },
    explanation: { type: String },
  },
  { _id: false }
);

const FindingSchema = new Schema<IFinding>(
  {
    agent: { type: String, required: true },
    claim: { type: String, required: true },
    severity: {
      type: String,
      enum: ["info", "low", "medium", "high", "warning", "critical"],
      default: "info",
    },
    evidence: { type: [EvidenceSchema], default: [] },
  },
  { _id: false }
);

const TraceStepSchema = new Schema<ITraceStep>(
  {
    step: { type: Number, required: true },
    agent: { type: String, required: true },
    tool: { type: String },
    argsSummary: { type: String },
    resultSummary: { type: String },
    tokensIn: { type: Number },
    tokensOut: { type: Number },
    latencyMs: { type: Number },
  },
  { _id: false }
);

const AnalysisSchema = new Schema<IAnalysis>(
  {
    repoId: { type: Schema.Types.ObjectId, ref: "Repository", required: true },
    ideaId: { type: Schema.Types.ObjectId, ref: "Idea", required: true },
    checklistHash: { type: String, required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["queued", "running", "done", "failed", "partial"],
      default: "queued",
      index: true,
    },
    startedAt: { type: Date },
    finishedAt: { type: Date },
    facts: { type: Schema.Types.Mixed, default: {} },
    coverage: {
      score: { type: Number, default: 0 },
      features: { type: [CoverageFeatureSchema], default: [] },
    },
    bugRisk: {
      penalty: { type: Number, default: 0 },
      openBugs: { type: Number, default: 0 },
      lintErrorsPer1k: { type: Number, default: 0 },
      ciConclusion: { type: String, default: null },
      todoPer1k: { type: Number, default: 0 },
    },
    subScores: {
      structure: { type: Number, default: null },
      bugRisk: { type: Number, default: null },
      deps: { type: Number, default: null },
      docs: { type: Number, default: null },
      license: { type: Number, default: null },
      history: { type: Number, default: null },
      tests: { type: Number, default: null },
    },
    viability: { type: Number, default: 0 },
    confidence: { type: Number, default: 1.0 },
    verdict: { type: String, default: "Not worth it" },
    flags: { type: [String], default: [] },
    findings: { type: [FindingSchema], default: [] },
    revivalPlan: {
      gaps: { type: [String], default: [] },
      steps: { type: [Schema.Types.Mixed], default: [] },
      effortHours: {
        min: { type: Number, default: 0 },
        max: { type: Number, default: 0 },
      },
      risks: { type: [String], default: [] },
    },
    founderBrief: { type: String, default: "" },
    trace: { type: [TraceStepSchema], default: [] },
    tokenUsage: { type: Schema.Types.Mixed, default: {} },
    error: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Compound index for analysis reuse (< 7 days)
AnalysisSchema.index({ repoId: 1, ideaId: 1, checklistHash: 1 });

// Index for daily quota calculations and user history
AnalysisSchema.index({ requestedBy: 1, createdAt: -1 });

export const Analysis: Model<IAnalysis> =
  mongoose.models.Analysis || mongoose.model<IAnalysis>("Analysis", AnalysisSchema);
