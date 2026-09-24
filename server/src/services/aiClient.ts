import axios, { AxiosInstance, AxiosError } from "axios";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { IFeature } from "../models/Idea.js";

export interface IdeaSpec {
  summary: string;
  targetUsers: string[];
  features: IFeature[];
}

export interface MatchResult {
  repoId: string;
  relevance: number;
  matchedTerms: string[];
}

export interface AnalysisPayload {
  facts: Record<string, any>;
  coverage: {
    score: number;
    features: Array<{
      featureId: string;
      label?: string;
      priority?: "must" | "nice";
      status: "present" | "partial" | "missing";
      evidence: Array<{
        type?: "file" | "api" | "url";
        ref?: string;
        path?: string;
        lineRange?: string;
        snippet?: string;
        verified?: boolean;
      }>;
      explanation?: string;
    }>;
  };
  bugRisk: {
    penalty: number;
    openBugs: number;
    lintErrorsPer1k: number;
    ciConclusion: string | null;
    todoPer1k: number;
  };
  subScores: {
    structure: number | null;
    bugRisk: number | null;
    deps: number | null;
    docs: number | null;
    license: number | null;
    history: number | null;
    tests: number | null;
  };
  viability: number;
  confidence: number;
  verdict: string;
  flags: string[];
  findings: Array<{
    agent: string;
    claim: string;
    severity: "info" | "low" | "medium" | "high" | "warning" | "critical";
    evidence: Array<{
      type?: "file" | "api" | "url";
      ref?: string;
      path?: string;
      lineRange?: string;
      snippet?: string;
      verified?: boolean;
    }>;
  }>;
  revivalPlan: {
    gaps: string[];
    steps: Array<{
      order?: number;
      title?: string;
      description?: string;
      effortHours?: number;
    } | string>;
    effortHours: { min: number; max: number };
    risks: string[];
  };
  founderBrief: string;
  trace: Array<{
    step: number;
    agent: string;
    tool?: string;
    argsSummary?: string;
    resultSummary?: string;
    tokensIn?: number;
    tokensOut?: number;
    latencyMs?: number;
  }>;
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = "AIServiceError";
  }
}

export class AIClient {
  private client: AxiosInstance;
  public mockMode: boolean;

  constructor(mockMode = env.NODE_ENV === "test" || process.env.AI_CLIENT_MOCK === "true") {
    this.mockMode = mockMode;
    this.client = axios.create({
      baseURL: env.AI_SERVICE_URL,
      timeout: 15000,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": env.AI_SERVICE_API_KEY,
      },
    });

    this.client.interceptors.request.use((config) => {
      if (!config.headers["X-Request-Id"]) {
        config.headers["X-Request-Id"] = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      }
      return config;
    });
  }

  private async requestWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 500): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const isRetryable =
        !status || (status >= 500 && status <= 599) || axiosErr.code === "ECONNABORTED";

      if (retries > 0 && isRetryable) {
        logger.warn(
          `AI service request failed (${axiosErr.message}). Retrying in ${delay}ms... (${retries} left)`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.requestWithRetry(fn, retries - 1, delay * 2);
      }

      throw new AIServiceError(
        axiosErr.response?.data && typeof axiosErr.response.data === "object"
          ? (axiosErr.response.data as any).detail || axiosErr.message
          : axiosErr.message,
        status,
        axiosErr
      );
    }
  }

  /**
   * Refines a raw English idea into a feature checklist.
   */
  async refineIdea(text: string): Promise<IdeaSpec> {
    if (this.mockMode) {
      return {
        summary: `Refined concept for: ${text.slice(0, 60)}...`,
        targetUsers: ["Early-stage founders", "Small business owners"],
        features: [
          {
            id: "f1",
            label: "User Authentication & Authorization",
            plainDescription: "Secure login, registration, and role checks.",
            keywords: ["auth", "jwt", "login", "session", "security"],
            priority: "must",
          },
          {
            id: "f2",
            label: "Core Data Tracking & CRUD",
            plainDescription: "Create, view, update and manage records.",
            keywords: ["tracking", "database", "crud", "models", "storage"],
            priority: "must",
          },
          {
            id: "f3",
            label: "Automated Notifications & Alerts",
            plainDescription: "Send alerts via email, webhooks, or messaging channels.",
            keywords: ["notifications", "alerts", "messaging", "webhook", "email"],
            priority: "nice",
          },
        ],
      };
    }

    return this.requestWithRetry(async () => {
      const res = await this.client.post<IdeaSpec>("/ideas/refine", { text });
      return res.data;
    });
  }

  /**
   * Performs NLP retrieval of repositories matching the expanded query.
   */
  async match(expandedQuery: string, topK = 20): Promise<MatchResult[]> {
    if (this.mockMode) {
      // Return empty array by default in unit tests; caller can provide repo IDs or seed repos
      return [];
    }

    return this.requestWithRetry(async () => {
      const res = await this.client.post<MatchResult[]>("/nlp/match", {
        query: expandedQuery,
        topK,
      });
      return res.data;
    });
  }

  /**
   * Runs the multi-agent analysis on a single repository.
   */
  async analyze(repo: any, features: IFeature[]): Promise<AnalysisPayload> {
    if (this.mockMode) {
      const hasLicense = repo.license?.spdx !== null && repo.license?.spdx !== "NO_LICENSE";
      const flags: string[] = [];
      if (!hasLicense) flags.push("NO_LICENSE");
      if (repo.archived) flags.push("ARCHIVED");

      return {
        facts: {
          language: repo.language || "TypeScript",
          stars: repo.stars || 45,
          defaultBranch: repo.defaultBranch || "main",
        },
        coverage: {
          score: 80,
          features: features.map((f, i) => ({
            featureId: f.id,
            status: i === 0 ? "present" : i === 1 ? "present" : "partial",
            evidence: [
              {
                type: "file",
                ref: "src/index.ts",
                snippet: "export const handler = ...",
              },
            ],
          })),
        },
        bugRisk: {
          penalty: 4,
          openBugs: repo.openBugIssues || 2,
          lintErrorsPer1k: 2.1,
          ciConclusion: repo.lastCiConclusion || "success",
          todoPer1k: 3.5,
        },
        subScores: {
          structure: 13,
          bugRisk: 16,
          deps: 12,
          docs: 8,
          license: hasLicense ? 15 : 0,
          history: 8,
          tests: 12,
        },
        viability: hasLicense ? 84 : 45,
        confidence: 0.9,
        verdict: hasLicense ? "Ready to build on" : "Borrow parts only",
        flags,
        findings: [
          {
            agent: "Coverage Checker",
            claim: "Core authentication and models detected in source code.",
            severity: "info",
            evidence: [{ type: "file", ref: "src/auth.ts", snippet: "export function verifyToken..." }],
          },
        ],
        revivalPlan: {
          gaps: ["Production notification provider not connected", "Dependencies need security audit"],
          steps: [
            "Upgrade package dependencies to LTS versions",
            "Implement missing alert service integrations",
            "Set up CI/CD pipeline",
          ],
          effortHours: { min: 20, max: 45 },
          risks: ["Repository has had no commits for >12 months; third-party APIs may have evolved"],
        },
        founderBrief: `# Founder Brief: ${repo.fullName}\n\n**Verdict**: ${
          hasLicense ? "Ready to build on" : "Borrow parts only"
        }\n\nThis repository implements the majority of requested features with verifiable file evidence. Hand this brief to a software contractor to initiate revival.`,
        trace: [
          {
            step: 1,
            agent: "Scout",
            tool: "github_tree",
            argsSummary: "path='src'",
            resultSummary: "Located 14 source files",
            tokensIn: 120,
            tokensOut: 80,
            latencyMs: 140,
          },
        ],
      };
    }

    return this.requestWithRetry(async () => {
      const res = await this.client.post<AnalysisPayload>("/agents/analyze", {
        repoFullName: repo.fullName,
        repo,
        features,
        repoContext: repo,
      });
      return res.data;
    });
  }

  /**
   * Rebuilds TF-IDF index in AI service from ingested repository corpus.
   */
  async buildIndex(corpus: Array<{ id: string; text: string }>): Promise<{ indexedCount: number; status: string }> {
    if (this.mockMode) {
      return { indexedCount: corpus.length, status: "ready" };
    }

    return this.requestWithRetry(async () => {
      const res = await this.client.post<{ indexedCount: number; status: string }>("/index/build", {
        repos: corpus,
      });
      return res.data;
    });
  }
}

export const aiClient = new AIClient();

