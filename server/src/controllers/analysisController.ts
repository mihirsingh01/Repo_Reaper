import { Response } from "express";
import { z } from "zod";
import { Analysis } from "../models/Analysis.js";
import { Idea } from "../models/Idea.js";
import { Repository } from "../models/Repository.js";
import { Query } from "../models/Query.js";
import { User } from "../models/User.js";
import { jobRunner } from "../services/jobRunner.js";
import { env } from "../config/env.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

export const triggerAnalysisSchema = z.object({
  ideaId: z.string().min(1, "ideaId is required"),
});

/**
 * Trigger an on-demand analysis for a repository against an idea.
 * POST /api/repositories/:id/analyze
 */
export async function triggerRepositoryAnalysis(
  req: AuthenticatedRequest,
  res: Response
) {
  const { id: repoId } = req.params;
  const { ideaId } = req.body;
  const user = req.user!;

  const [repo, idea, dbUser] = await Promise.all([
    Repository.findById(repoId),
    Idea.findById(ideaId),
    User.findById(user._id),
  ]);

  if (!repo) {
    return res.status(404).json({ error: "Repository not found" });
  }
  if (!idea) {
    return res.status(404).json({ error: "Idea not found" });
  }

  // Check quota
  if ((dbUser?.dailyAnalysisCount || 0) >= env.DAILY_ANALYSIS_CAP_PER_USER) {
    return res.status(429).json({
      error: `Daily analysis quota (${env.DAILY_ANALYSIS_CAP_PER_USER}) exceeded.`,
    });
  }

  // Check for reusable analysis (< 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const existing = await Analysis.findOne({
    repoId: repo._id,
    ideaId: idea._id,
    checklistHash: idea.checklistHash,
    createdAt: { $gt: sevenDaysAgo },
    status: { $in: ["done", "partial"] },
  });

  if (existing) {
    return res.json({
      analysisId: existing._id,
      status: existing.status,
      reused: true,
      message: "Reused recent analysis (< 7 days old)",
    });
  }

  const analysis = await Analysis.create({
    repoId: repo._id,
    ideaId: idea._id,
    checklistHash: idea.checklistHash,
    requestedBy: user._id,
    status: "queued",
  });

  await User.findByIdAndUpdate(user._id, { $inc: { dailyAnalysisCount: 1 } });
  jobRunner.enqueue(analysis._id.toString());

  return res.status(202).json({
    analysisId: analysis._id,
    status: "queued",
    reused: false,
  });
}

/**
 * Get detailed analysis by ID.
 * GET /api/analyses/:id
 */
export async function getAnalysisById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  const analysis = await Analysis.findById(id)
    .populate("repoId")
    .populate("ideaId");

  if (!analysis) {
    return res.status(404).json({ error: "Analysis not found" });
  }

  return res.json(analysis);
}

/**
 * Get Founder Brief markdown for a repository analysis.
 * GET /api/ideas/:id/brief?repoId=
 */
export async function getFounderBrief(req: AuthenticatedRequest, res: Response) {
  const { id: ideaId } = req.params;
  const repoId = req.query.repoId as string | undefined;

  let targetRepoId = repoId;

  // If repoId not provided in query, look up the Best match from the idea's query
  if (!targetRepoId) {
    const query = await Query.findOne({ ideaId }).sort({ createdAt: -1 });
    if (!query || !query.bestRepoId) {
      return res.status(404).json({
        error: "No Best match found for this idea. Please provide a specific repoId.",
      });
    }
    targetRepoId = query.bestRepoId.toString();
  }

  const analysis = await Analysis.findOne({
    ideaId,
    repoId: targetRepoId,
    status: { $in: ["done", "partial"] },
  }).sort({ createdAt: -1 });

  if (!analysis || !analysis.founderBrief) {
    return res.status(404).json({
      error: "Founder brief not available yet for this repository.",
    });
  }

  // Format as plain text markdown
  res.setHeader("Content-Type", "text/markdown");
  return res.send(analysis.founderBrief);
}
