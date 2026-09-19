import { env } from "../config/env.js";

/**
 * Lightweight in-memory metrics store for RepoRevive production observability.
 */
class MetricsCollector {
  private totalRequests = 0;
  private totalErrors = 0; // 5xx errors
  private latencySamples: number[] = [];
  private maxSamples = 200;

  private searchQueries = 0;
  private cacheHits = 0;

  private gitHubRateLimitRemaining: number | null = null;
  private gitHubRateLimitTotal: number | null = null;
  private gitHubRateLimitReset: Date | null = null;

  private totalAnalyses = 0;
  private totalTokensUsed = 0;

  private killSwitchActive = env.LLM_SPEND_KILL_SWITCH;

  // Request & Error Tracking
  public recordRequest(statusCode: number, durationMs: number): void {
    this.totalRequests++;
    if (statusCode >= 500) {
      this.totalErrors++;
    }

    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > this.maxSamples) {
      this.latencySamples.shift();
    }
  }

  // Cache Tracking
  public recordSearch(isCacheHit: boolean): void {
    this.searchQueries++;
    if (isCacheHit) {
      this.cacheHits++;
    }
  }

  // GitHub Rate Limit Tracking
  public updateGitHubRateLimit(remaining: number, total: number, resetTimestamp?: number): void {
    this.gitHubRateLimitRemaining = remaining;
    this.gitHubRateLimitTotal = total;
    if (resetTimestamp) {
      this.gitHubRateLimitReset = new Date(resetTimestamp * 1000);
    }
  }

  // Analysis & Token Tracking
  public recordAnalysis(tokensIn = 0, tokensOut = 0): void {
    this.totalAnalyses++;
    this.totalTokensUsed += tokensIn + tokensOut;
  }

  // Kill Switch
  public setKillSwitch(active: boolean): void {
    this.killSwitchActive = active;
  }

  public isKillSwitchActive(): boolean {
    return this.killSwitchActive;
  }

  // Summary Metrics Export
  public getMetrics() {
    const avgLatency =
      this.latencySamples.length > 0
        ? Math.round(
            this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
          )
        : 0;

    const sortedLatency = [...this.latencySamples].sort((a, b) => a - b);
    const p95Latency =
      sortedLatency.length > 0
        ? sortedLatency[Math.floor(sortedLatency.length * 0.95)]
        : 0;

    const errorRate =
      this.totalRequests > 0
        ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
        : 0;

    const cacheHitRate =
      this.searchQueries > 0
        ? Number(((this.cacheHits / this.searchQueries) * 100).toFixed(2))
        : 0;

    return {
      uptimeSeconds: Math.floor(process.uptime()),
      requests: {
        total: this.totalRequests,
        errors: this.totalErrors,
        errorRatePercent: errorRate,
      },
      latency: {
        avgMs: avgLatency,
        p95Ms: p95Latency,
        samples: this.latencySamples.length,
      },
      cache: {
        totalQueries: this.searchQueries,
        hits: this.cacheHits,
        hitRatePercent: cacheHitRate,
      },
      github: {
        rateLimitRemaining: this.gitHubRateLimitRemaining,
        rateLimitTotal: this.gitHubRateLimitTotal,
        resetAt: this.gitHubRateLimitReset?.toISOString() || null,
      },
      analysis: {
        totalAnalyses: this.totalAnalyses,
        totalTokens: this.totalTokensUsed,
        avgTokensPerAnalysis:
          this.totalAnalyses > 0 ? Math.round(this.totalTokensUsed / this.totalAnalyses) : 0,
      },
      killSwitch: {
        active: this.killSwitchActive,
      },
      memory: {
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };
  }
}

export const metrics = new MetricsCollector();
