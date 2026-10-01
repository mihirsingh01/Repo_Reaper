import { GitHubClient, githubClient } from "./githubClient.js";
import { env } from "../../config/env.js";

export interface VerificationResult {
  passed: boolean;
  reason?: "too_recent_commit" | "insufficient_commits" | "no_commits_found" | "api_error";
  lastCommitAt?: Date;
  commitCount?: number;
  contributorCount?: number;
}

export class RepositoryVerifier {
  constructor(private client: GitHubClient = githubClient) {}

  /**
   * Verifies that repository is genuinely stale (> STALE_MONTHS inactive)
   * and has substantial development history (>= MIN_COMMITS).
   *
   * Non-obvious choice for Viva:
   * We NEVER trust pushed_at because GitHub updates pushed_at on branch deletions,
   * tags, bot workflows, or README edits via UI. We explicitly query the default branch
   * commit history and parse Link headers to get verified commit dates and counts.
   */
  async verifyRepository(
    fullName: string,
    defaultBranch = "main",
    staleMonths = env.STALE_MONTHS,
    minCommits = env.MIN_COMMITS
  ): Promise<VerificationResult> {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - staleMonths);

    try {
      // 1. Fetch default-branch latest commit and total commit count via Link header
      const commitsRes = await this.client.request<any[]>(
        `/repos/${fullName}/commits`,
        {
          params: { sha: defaultBranch, per_page: 1 },
        }
      );

      const commits = commitsRes.data;
      if (!Array.isArray(commits) || commits.length === 0) {
        return { passed: false, reason: "no_commits_found" };
      }

      const latestCommit = commits[0];
      const commitDateStr =
        latestCommit.commit?.committer?.date || latestCommit.commit?.author?.date;

      if (!commitDateStr) {
        return { passed: false, reason: "no_commits_found" };
      }

      const lastCommitAt = new Date(commitDateStr);

      // Check staleness: must be strictly older than cutoffDate
      if (lastCommitAt > cutoffDate) {
        return {
          passed: false,
          reason: "too_recent_commit",
          lastCommitAt,
        };
      }

      // Link-header trick for exact commit count:
      // When per_page=1, the last page number in rel="last" represents total commit count!
      const linkHeader = commitsRes.headers["link"];
      const parsedLinks = this.client.parseLinkHeader(linkHeader);
      const commitCount = parsedLinks.lastPage ?? commits.length;

      if (commitCount < minCommits) {
        return {
          passed: false,
          reason: "insufficient_commits",
          lastCommitAt,
          commitCount,
        };
      }

      // 2. Fetch contributor count via Link header trick
      let contributorCount = 1;
      try {
        const contribRes = await this.client.request<any[]>(
          `/repos/${fullName}/contributors`,
          {
            params: { per_page: 1, anon: "true" },
          }
        );
        const contribLinks = this.client.parseLinkHeader(contribRes.headers["link"]);
        contributorCount = contribLinks.lastPage ?? (Array.isArray(contribRes.data) ? contribRes.data.length : 1);
      } catch {
        // Contributor count failure is non-fatal; default to 1
        contributorCount = 1;
      }

      return {
        passed: true,
        lastCommitAt,
        commitCount,
        contributorCount,
      };
    } catch {
      return { passed: false, reason: "api_error" };
    }
  }
}

export const repositoryVerifier = new RepositoryVerifier();
