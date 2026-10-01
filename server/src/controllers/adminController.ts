import { Request, Response } from "express";
import { z } from "zod";
import axios from "axios";
import mongoose from "mongoose";
import { IngestionJob } from "../models/IngestionJob.js";
import { Repository } from "../models/Repository.js";
import { Idea } from "../models/Idea.js";
import { Analysis } from "../models/Analysis.js";
import { User } from "../models/User.js";
import { ingestionPipeline } from "../jobs/ingestionJobRunner.js";
import { metrics } from "../utils/metrics.js";
import { env } from "../config/env.js";

export const triggerIngestSchema = z.object({
  language: z.string().optional(),
  window: z.string().optional(),
  maxRepos: z.number().int().positive().optional().default(50),
});

export const killSwitchSchema = z.object({
  active: z.boolean(),
});

/**
 * Trigger an asynchronous GitHub repository ingestion run.
 * POST /api/admin/ingest
 */
export async function triggerIngestion(req: Request, res: Response) {
  const { language, window, maxRepos } = req.body;

  const job = await IngestionJob.create({
    status: "queued",
    params: {
      language,
      window,
    },
    counts: {
      seen: 0,
      kept: 0,
      rejected: 0,
      byReason: {},
    },
  });

  // Execute ingestion asynchronously in background
  ingestionPipeline
    .run({
      jobId: job._id.toString(),
      language,
      window,
      maxRepos,
    })
    .catch((err) => {
      console.error(`Ingestion job ${job._id} failed:`, err);
    });

  return res.status(202).json({
    jobId: job._id,
    status: "queued",
    params: job.params,
    message: "Ingestion job started in background",
  });
}

/**
 * Get live status and counts of an ingestion job.
 * GET /api/admin/ingest/:jobId
 */
export async function getIngestionStatus(req: Request, res: Response) {
  const { jobId } = req.params;

  const job = await IngestionJob.findById(jobId);
  if (!job) {
    return res.status(404).json({ error: "Ingestion job not found" });
  }

  return res.json(job);
}

/**
 * Comprehensive System Status & Observability Panel data.
 * GET /api/admin/system-status
 */
export async function getSystemStatus(req: Request, res: Response) {
  // 1. Service health checks
  const mongoStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  let aiHealth: any = { status: "unreachable" };
  try {
    const aiRes = await axios.get(`${env.AI_SERVICE_URL}/health`, { timeout: 3000 });
    aiHealth = aiRes.data;
  } catch (err: any) {
    aiHealth = { status: "unreachable", error: err.message };
  }

  // 2. GitHub Token Scope & Rate Limit Audit
  let githubAudit = {
    configured: !!env.GITHUB_TOKEN,
    scopes: [] as string[],
    isReadOnly: true,
    warnings: [] as string[],
    rateLimitRemaining: null as number | null,
    rateLimitLimit: null as number | null,
  };

  if (env.GITHUB_TOKEN) {
    try {
      const ghRes = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
        timeout: 4000,
      });

      const rawScopes = (ghRes.headers["x-oauth-scopes"] || "") as string;
      const scopes = rawScopes
        ? rawScopes.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      githubAudit.scopes = scopes;

      // In RepoRevive, tokens MUST be read-only for security (OWASP / prompt-injection protection)
      const dangerousScopes = ["repo", "write:packages", "delete_repo", "admin:org", "admin:repo_hook"];
      const detectedDangerous = scopes.filter((s) => dangerousScopes.includes(s));

      if (detectedDangerous.length > 0) {
        githubAudit.isReadOnly = false;
        githubAudit.warnings.push(
          `Over-privileged token detected with write/admin scopes: ${detectedDangerous.join(", ")}. Use a fine-grained token with Public Repositories (read-only) scope.`
        );
      }

      const remaining = Number(ghRes.headers["x-ratelimit-remaining"]);
      const limit = Number(ghRes.headers["x-ratelimit-limit"]);
      if (!isNaN(remaining)) githubAudit.rateLimitRemaining = remaining;
      if (!isNaN(limit)) githubAudit.rateLimitLimit = limit;
      metrics.updateGitHubRateLimit(remaining, limit);
    } catch (err: any) {
      githubAudit.warnings.push(`Failed to audit GitHub token: ${err.message}`);
    }
  }

  // 3. Database document counts
  const [repoCount, staleRepoCount, ideaCount, analysisCount, userCount] = await Promise.all([
    Repository.countDocuments().catch(() => 0),
    Repository.countDocuments({ "staleMetrics.isStale": true }).catch(() => 0),
    Idea.countDocuments().catch(() => 0),
    Analysis.countDocuments().catch(() => 0),
    User.countDocuments().catch(() => 0),
  ]);

  return res.json({
    status: "ok",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      server: {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      },
      mongodb: {
        status: mongoStatus,
        counts: {
          repositories: repoCount,
          staleRepositories: staleRepoCount,
          ideas: ideaCount,
          analyses: analysisCount,
          users: userCount,
        },
      },
      aiService: aiHealth,
      githubToken: githubAudit,
    },
    metrics: metrics.getMetrics(),
    killSwitch: {
      active: metrics.isKillSwitchActive(),
    },
  });
}

/**
 * Update the global LLM spend kill-switch.
 * POST /api/admin/kill-switch
 */
export async function updateKillSwitch(req: Request, res: Response) {
  const { active } = req.body;
  metrics.setKillSwitch(active);

  return res.json({
    message: `LLM spend kill-switch has been ${active ? "ACTIVATED" : "DEACTIVATED"}`,
    active: metrics.isKillSwitchActive(),
    timestamp: new Date().toISOString(),
  });
}
