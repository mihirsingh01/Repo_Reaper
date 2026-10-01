import axios, { AxiosInstance, AxiosResponse, AxiosRequestConfig } from "axios";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

export interface GitHubRateLimitState {
  remaining: number;
  resetTime: number; // epoch milliseconds
  searchRemaining: number;
  searchResetTime: number;
}

export interface CachedResponse<T = any> {
  etag?: string;
  data: T;
}

/**
 * In-memory ETag cache: URL -> { etag, data }
 * Reuses response on 304 Not Modified, conserving API rate limit points.
 */
const etagCache = new Map<string, CachedResponse>();

export class GitHubClient {
  private client: AxiosInstance;
  public rateLimitState: GitHubRateLimitState = {
    remaining: 5000,
    resetTime: Date.now() + 3600000,
    searchRemaining: 30,
    searchResetTime: Date.now() + 60000,
  };

  // Search API has a stricter rate limit: 30 requests/minute authenticated
  private lastSearchRequestTime = 0;
  private readonly SEARCH_MIN_INTERVAL_MS = 2100; // ~28 requests/minute max safe pacing

  constructor(token = env.GITHUB_TOKEN) {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoRevive-Ingestion-Bot/1.0",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    this.client = axios.create({
      baseURL: "https://api.github.com",
      timeout: 15000,
      headers,
    });
  }

  /**
   * Parse standard RFC 5988 Link header to extract page URLs.
   * e.g. <https://api.github.com/...?page=2>; rel="next", <https://api.github.com/...?page=50>; rel="last"
   */
  public parseLinkHeader(header?: string): { next?: string; last?: string; lastPage?: number } {
    if (!header) return {};

    const links: { next?: string; last?: string; lastPage?: number } = {};
    const parts = header.split(",");

    for (const part of parts) {
      const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (match) {
        const [, url, rel] = match;
        if (rel === "next") links.next = url;
        if (rel === "last") {
          links.last = url;
          const pageMatch = url.match(/[?&]page=(\d+)/);
          if (pageMatch) {
            links.lastPage = parseInt(pageMatch[1], 10);
          }
        }
      }
    }

    return links;
  }

  /**
   * Reads rate limit headers and pauses execution if threshold is reached.
   */
  private updateRateLimits(headers: Record<string, any>, isSearch = false): void {
    const remaining = headers["x-ratelimit-remaining"];
    const reset = headers["x-ratelimit-reset"];

    if (remaining !== undefined && reset !== undefined) {
      const count = parseInt(remaining, 10);
      const resetMs = parseInt(reset, 10) * 1000;

      if (isSearch) {
        this.rateLimitState.searchRemaining = count;
        this.rateLimitState.searchResetTime = resetMs;
      } else {
        this.rateLimitState.remaining = count;
        this.rateLimitState.resetTime = resetMs;
      }
    }
  }

  /**
   * Enforces polite pacing and pauses when rate limits approach exhaustion.
   */
  private async ensureRateLimitAllowance(isSearch = false): Promise<void> {
    const now = Date.now();

    if (isSearch) {
      const elapsed = now - this.lastSearchRequestTime;
      if (elapsed < this.SEARCH_MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, this.SEARCH_MIN_INTERVAL_MS - elapsed));
      }
      this.lastSearchRequestTime = Date.now();

      if (this.rateLimitState.searchRemaining <= 2) {
        const waitMs = Math.max(1000, this.rateLimitState.searchResetTime - Date.now() + 1000);
        logger.warn(`GitHub Search API rate limit low. Pausing for ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    } else {
      if (this.rateLimitState.remaining <= 5) {
        const waitMs = Math.max(1000, this.rateLimitState.resetTime - Date.now() + 1000);
        logger.warn(`GitHub Core API rate limit low. Pausing for ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }

  /**
   * Generic request execution with ETag caching, exponential backoff, and jitter.
   */
  public async request<T = any>(
    url: string,
    config: AxiosRequestConfig = {},
    isSearch = false,
    retries = 3,
    backoffMs = 1000
  ): Promise<{ data: T; status: number; headers: Record<string, any>; fromCache: boolean }> {
    await this.ensureRateLimitAllowance(isSearch);

    const cacheKey = `${config.method || "GET"}:${url}:${JSON.stringify(config.params || {})}`;
    const cached = etagCache.get(cacheKey);

    const requestHeaders: Record<string, string> = {
      ...(config.headers as Record<string, string>),
    };

    if (cached?.etag) {
      requestHeaders["If-None-Match"] = cached.etag;
    }

    try {
      const response: AxiosResponse<T> = await this.client.request({
        url,
        ...config,
        headers: requestHeaders,
        validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
      });

      this.updateRateLimits(response.headers, isSearch);

      // Handle 304 Not Modified
      if (response.status === 304 && cached) {
        return {
          data: cached.data,
          status: 304,
          headers: response.headers,
          fromCache: true,
        };
      }

      // Cache new ETag
      const newEtag = response.headers["etag"];
      if (newEtag && response.status === 200) {
        etagCache.set(cacheKey, { etag: newEtag, data: response.data });
      }

      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
        fromCache: false,
      };
    } catch (err: any) {
      const status = err.response?.status;
      const isRetryable =
        status === 403 ||
        status === 429 ||
        (status >= 500 && status <= 599) ||
        err.code === "ECONNABORTED";

      if (retries > 0 && isRetryable) {
        // Exponential backoff with jitter
        const jitter = Math.random() * 500;
        const delay = backoffMs + jitter;

        logger.warn(
          `GitHub API error (${status || err.message}) on ${url}. Retrying in ${Math.round(
            delay
          )}ms... (${retries} retries left)`
        );

        await new Promise((r) => setTimeout(r, delay));
        return this.request<T>(url, config, isSearch, retries - 1, backoffMs * 2);
      }

      // Redact token from any error message
      const sanitizedMessage = (err.message || "").replace(
        /Bearer\s+[a-zA-Z0-9_\-]+/g,
        "Bearer [REDACTED]"
      );
      throw new Error(`GitHub API request failed: ${sanitizedMessage} (${status || "Network"})`);
    }
  }
}

export const githubClient = new GitHubClient();
