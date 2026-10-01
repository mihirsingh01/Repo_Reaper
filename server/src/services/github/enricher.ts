import crypto from "crypto";
import { GitHubClient, githubClient } from "./githubClient.js";

export interface EnrichedSignals {
  readmeText: string;
  readmeHash: string;
  licenseSpdx: string | null;
  licenseName: string;
  openBugIssues: number;
  closedBugIssues: number;
  lastCiConclusion: string | null;
}

export interface EnrichmentResult {
  passed: boolean;
  reason?: "short_or_missing_readme" | "api_error";
  signals?: EnrichedSignals;
}

export class RepositoryEnricher {
  private readonly MAX_README_BYTES = 64 * 1024; // 64 KB cap
  private readonly MIN_README_CHARS = 100; // Synopsis Ch. 4.4 requirement

  constructor(private client: GitHubClient = githubClient) {}

  /**
   * Fetches README, decodes from base64, caps size, and validates minimal length.
   */
  async fetchReadme(fullName: string): Promise<{ text: string; hash: string } | null> {
    try {
      const res = await this.client.request<{ content: string; encoding: string }>(
        `/repos/${fullName}/readme`
      );

      if (!res.data?.content) return null;

      let decoded = Buffer.from(res.data.content, "base64").toString("utf-8");

      // Cap size to avoid bloating MongoDB Atlas storage
      if (decoded.length > this.MAX_README_BYTES) {
        decoded = decoded.slice(0, this.MAX_README_BYTES);
      }

      const hash = crypto.createHash("sha256").update(decoded).digest("hex");
      return { text: decoded, hash };
    } catch {
      return null;
    }
  }

  /**
   * Queries GitHub issues labelled "bug", filtering out Pull Requests.
   * GitHub's /issues endpoint returns both issues and PRs; PRs contain a pull_request property.
   */
  async countBugIssues(fullName: string, state: "open" | "closed"): Promise<number> {
    try {
      const res = await this.client.request<any[]>(`/repos/${fullName}/issues`, {
        params: { labels: "bug", state, per_page: 100 },
      });

      if (!Array.isArray(res.data)) return 0;

      // Filter out pull requests
      const bugIssues = res.data.filter((item) => !item.pull_request);
      return bugIssues.length;
    } catch {
      return 0;
    }
  }

  /**
   * Fetches latest GitHub Actions workflow run conclusion on the default branch.
   */
  async fetchLastCiConclusion(fullName: string, defaultBranch = "main"): Promise<string | null> {
    try {
      const res = await this.client.request<{ workflow_runs?: any[] }>(
        `/repos/${fullName}/actions/runs`,
        {
          params: { branch: defaultBranch, per_page: 1 },
        }
      );

      const runs = res.data?.workflow_runs;
      if (Array.isArray(runs) && runs.length > 0) {
        return runs[0].conclusion || runs[0].status || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Enriches repository metadata with verifiable scoring signals.
   */
  async enrich(
    fullName: string,
    defaultBranch = "main",
    rawLicense?: { spdx_id?: string | null; name?: string }
  ): Promise<EnrichmentResult> {
    try {
      // 1. Fetch & Validate README
      const readme = await this.fetchReadme(fullName);
      if (!readme || readme.text.trim().length < this.MIN_README_CHARS) {
        return {
          passed: false,
          reason: "short_or_missing_readme",
        };
      }

      // 2. Fetch Bug Counts and CI in parallel
      const [openBugs, closedBugs, lastCi] = await Promise.all([
        this.countBugIssues(fullName, "open"),
        this.countBugIssues(fullName, "closed"),
        this.fetchLastCiConclusion(fullName, defaultBranch),
      ]);

      // Normalize license
      let spdx = rawLicense?.spdx_id || null;
      if (spdx === "NOASSERTION" || spdx === "NONE") {
        spdx = null;
      }

      return {
        passed: true,
        signals: {
          readmeText: readme.text,
          readmeHash: readme.hash,
          licenseSpdx: spdx,
          licenseName: rawLicense?.name || "",
          openBugIssues: openBugs,
          closedBugIssues: closedBugs,
          lastCiConclusion: lastCi,
        },
      };
    } catch {
      return { passed: false, reason: "api_error" };
    }
  }
}

export const repositoryEnricher = new RepositoryEnricher();
