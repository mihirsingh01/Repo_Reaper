import { GitHubClient, githubClient } from "./githubClient.js";
import { env } from "../../config/env.js";

export interface ShardDefinition {
  language?: string;
  window?: string; // e.g. "2022-01-01..2022-06-30"
}

export interface DiscoveredRepository {
  githubId: number;
  fullName: string;
  url: string;
  description: string;
  topics: string[];
  language: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  archived: boolean;
  createdAt: Date;
  pushedAt: Date;
  license?: { spdx_id?: string | null; name?: string };
}

export class RepositoryDiscovery {
  // Documented GitHub Search API Hard Cap
  public static readonly SEARCH_API_HARD_CAP = 1000;
  public static readonly DEFAULT_LANGUAGES = [
    "TypeScript",
    "JavaScript",
    "Python",
    "Go",
    "Rust",
  ];

  constructor(private client: GitHubClient = githubClient) {}

  /**
   * Builds GitHub search query string with required qualifiers:
   * archived:false, fork:false, pushed:<[cutoffDate], stars:>=10, optional language and date window.
   */
  public buildQuery(shard: ShardDefinition, minStars = 10, staleMonths = env.STALE_MONTHS): string {
    const qualifiers: string[] = ["fork:false", "archived:false", `stars:>=${minStars}`];

    if (shard.language) {
      qualifiers.push(`language:${shard.language}`);
    }

    if (shard.window) {
      qualifiers.push(`pushed:${shard.window}`);
    } else {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - staleMonths);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      qualifiers.push(`pushed:<${cutoffStr}`);
    }

    return qualifiers.join(" ");
  }

  /**
   * Generate shard combinations of language x date windows.
   */
  public generateShards(
    languages = RepositoryDiscovery.DEFAULT_LANGUAGES,
    windows = [
      "2023-01-01..2023-06-30",
      "2022-07-01..2022-12-31",
      "2022-01-01..2022-06-30",
      "2021-01-01..2021-12-31",
      "2020-01-01..2020-12-31",
    ]
  ): ShardDefinition[] {
    const shards: ShardDefinition[] = [];
    for (const language of languages) {
      for (const window of windows) {
        shards.push({ language, window });
      }
    }
    return shards;
  }

  /**
   * Search one page of repositories for a given shard.
   */
  async searchPage(
    shard: ShardDefinition,
    page = 1,
    perPage = 30
  ): Promise<{
    items: DiscoveredRepository[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const q = this.buildQuery(shard);

    const res = await this.client.request<{
      total_count: number;
      incomplete_results: boolean;
      items: any[];
    }>(
      "/search/repositories",
      {
        params: {
          q,
          sort: "stars",
          order: "desc",
          page,
          per_page: Math.min(100, perPage),
        },
      },
      true // isSearch = true triggers stricter rate pacing
    );

    const totalCount = res.data?.total_count || 0;
    const rawItems = res.data?.items || [];

    const items: DiscoveredRepository[] = rawItems.map((r) => ({
      githubId: r.id,
      fullName: r.full_name,
      url: r.html_url,
      description: r.description || "",
      topics: r.topics || [],
      language: r.language || shard.language || "Unknown",
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      openIssues: r.open_issues_count || 0,
      defaultBranch: r.default_branch || "main",
      archived: r.archived || false,
      createdAt: new Date(r.created_at),
      pushedAt: new Date(r.pushed_at),
      license: r.license,
    }));

    // Respect documented 1,000 result limit
    const maxFetchable = Math.min(totalCount, RepositoryDiscovery.SEARCH_API_HARD_CAP);
    const hasMore = page * perPage < maxFetchable;

    return {
      items,
      totalCount,
      hasMore,
    };
  }
}

export const repositoryDiscovery = new RepositoryDiscovery();
