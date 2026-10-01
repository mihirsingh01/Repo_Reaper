import { Response } from "express";
import { Idea } from "../models/Idea.js";
import { Query, IQueryResult } from "../models/Query.js";
import { Repository } from "../models/Repository.js";
import { Analysis } from "../models/Analysis.js";
import { User } from "../models/User.js";
import { aiClient } from "../services/aiClient.js";
import { rankCandidates, computeFinalScore } from "../services/ranking.js";
import { jobRunner } from "../services/jobRunner.js";
import { env } from "../config/env.js";
import { AuthenticatedRequest } from "../middleware/auth.js";

/**
 * Execute or retrieve cached repository search for a confirmed idea.
 */
export async function searchIdea(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const idea = await Idea.findById(id);
  if (!idea) {
    return res.status(404).json({ error: "Idea not found" });
  }

  if (!idea.userId.equals(user._id) && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (idea.status !== "confirmed" && idea.status !== "searching" && idea.status !== "done") {
    return res.status(400).json({
      error: "Idea checklist must be confirmed before search can be initiated",
    });
  }

  // 1. Cache Check: look for unexpired query with exact checklistHash
  const cachedQuery = await Query.findOne({
    ideaId: idea._id,
    checklistHash: idea.checklistHash,
    expiresAt: { $gt: new Date() },
  });

  if (cachedQuery) {
    return res.status(200).json({
      ideaId: idea._id,
      queryId: cachedQuery._id,
      cached: true,
      status: "done",
      message: "Search served from cache",
    });
  }

  // 2. Daily Analysis Cap Enforcement
  const dbUser = await User.findById(user._id);
  if ((dbUser?.dailyAnalysisCount || 0) >= env.DAILY_ANALYSIS_CAP_PER_USER) {
    return res.status(429).json({
      error: `Daily analysis quota (${env.DAILY_ANALYSIS_CAP_PER_USER}) exceeded. Please try again tomorrow.`,
    });
  }

  // 3. Build expanded query from confirmed features
  const terms = idea.refined.features.flatMap((f) => [
    f.label,
    ...(f.keywords || []),
  ]);
  const expandedQuery = Array.from(new Set(terms)).join(" ");

  // 4. Retrieve candidate repositories via AI service / TF-IDF
  let matches = await aiClient.match(expandedQuery, 20);

  // Fallback for mock mode or tests if AI service returns empty: query MongoDB
  if (!matches || matches.length === 0) {
    const repos = await Repository.find({}).limit(20);
    matches = repos.map((r, idx) => ({
      repoId: r._id.toString(),
      relevance: Math.max(0.5, 0.95 - idx * 0.02),
      matchedTerms: terms.slice(0, 3),
    }));
  }

  const queryResults: IQueryResult[] = matches.map((m) => ({
    repoId: m.repoId as any,
    relevance: m.relevance,
    matchedTerms: m.matchedTerms,
  }));

  const expiresAt = new Date(Date.now() + env.CACHE_TTL_HOURS * 60 * 60 * 1000);

  const query = await Query.create({
    ideaId: idea._id,
    userId: user._id,
    expandedQuery,
    checklistHash: idea.checklistHash,
    results: queryResults,
    expiresAt,
  });

  // 5. Queue Auto-Analysis for top AUTO_ANALYZE_TOP_K candidates
  const topK = Math.min(env.AUTO_ANALYZE_TOP_K, query.results.length);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  let queuedCount = 0;

  for (let i = 0; i < topK; i++) {
    const resultItem = query.results[i];
    const repoId = resultItem.repoId;

    // Check for reusable analysis (< 7 days old)
    const existing = await Analysis.findOne({
      repoId,
      ideaId: idea._id,
      checklistHash: idea.checklistHash,
      createdAt: { $gt: sevenDaysAgo },
      status: { $in: ["done", "partial"] },
    });

    if (existing) {
      resultItem.analysisId = existing._id;
      resultItem.coverage = existing.coverage?.score;
      resultItem.viability = existing.viability;
      resultItem.final = computeFinalScore(
        resultItem.relevance,
        resultItem.coverage,
        resultItem.viability
      );
    } else {
      // Check quota before scheduling new analysis
      if (
        (dbUser?.dailyAnalysisCount || 0) + queuedCount <
        env.DAILY_ANALYSIS_CAP_PER_USER
      ) {
        const newAnalysis = await Analysis.create({
          repoId,
          ideaId: idea._id,
          checklistHash: idea.checklistHash,
          requestedBy: user._id,
          status: "queued",
        });

        resultItem.analysisId = newAnalysis._id;
        jobRunner.enqueue(newAnalysis._id.toString());
        queuedCount++;
      }
    }
  }

  if (queuedCount > 0) {
    await User.findByIdAndUpdate(user._id, {
      $inc: { dailyAnalysisCount: queuedCount },
    });
  }

  await query.save();

  idea.status = "searching";
  await idea.save();

  return res.status(202).json({
    ideaId: idea._id,
    queryId: query._id,
    cached: false,
    status: "queued",
    queuedAnalyses: queuedCount,
  });
}

/**
 * Results polling endpoint: returns progress, ranked candidates, Best match, and alternatives.
 */
export async function getSearchResults(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const user = req.user!;

  const idea = await Idea.findById(id);
  if (!idea) {
    return res.status(404).json({ error: "Idea not found" });
  }

  if (!idea.userId.equals(user._id) && user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const query = await Query.findOne({ ideaId: idea._id })
    .sort({ createdAt: -1 })
    .populate("results.repoId");

  if (!query) {
    return res.status(404).json({ error: "No search results found for this idea" });
  }

  // Load and sync any completed analyses
  const analysisIds = query.results
    .map((r) => r.analysisId)
    .filter((aid): aid is any => Boolean(aid));

  const analyses = await Analysis.find({ _id: { $in: analysisIds } });
  const analysisMap = new Map(analyses.map((a) => [a._id.toString(), a]));

  let completedAnalyses = 0;
  let totalQueuedAnalyses = 0;

  const candidateInputs = query.results.map((r) => {
    const repo = r.repoId as any;
    const analysis = r.analysisId ? analysisMap.get(r.analysisId.toString()) : null;

    if (r.analysisId) {
      totalQueuedAnalyses++;
      if (analysis && (analysis.status === "done" || analysis.status === "partial" || analysis.status === "failed")) {
        completedAnalyses++;
      }
    }

    const coverage = analysis?.coverage?.score ?? r.coverage;
    const viability = analysis?.viability ?? r.viability;
    const flags = analysis?.flags ?? (repo?.license?.spdx === null ? ["NO_LICENSE"] : []);
    const bugRiskPenalty = analysis?.bugRisk?.penalty ?? 0;

    return {
      repoId: repo?._id?.toString() || r.repoId.toString(),
      fullName: repo?.fullName || "unknown",
      description: repo?.description,
      language: repo?.language,
      stars: repo?.stars,
      license: repo?.license,
      lastCommitAt: repo?.lastCommitAt,
      url: repo?.url,
      relevance: r.relevance,
      matchedTerms: r.matchedTerms,
      coverage,
      viability,
      flags,
      bugRiskPenalty,
      analysisId: r.analysisId,
      analysisStatus: analysis?.status || (r.analysisId ? "queued" : "not_requested"),
      final: computeFinalScore(r.relevance, coverage, viability),
    };
  });

  const rankedOutput = rankCandidates(candidateInputs);

  // Update query's bestRepoId if determined
  if (rankedOutput.bestMatch && (!query.bestRepoId || !query.bestRepoId.equals(rankedOutput.bestMatch.repoId))) {
    query.bestRepoId = rankedOutput.bestMatch.repoId as any;
    await query.save();
  }

  const isAllComplete =
    totalQueuedAnalyses > 0 && completedAnalyses >= totalQueuedAnalyses;

  if (isAllComplete && idea.status !== "done") {
    idea.status = "done";
    await idea.save();
  }

  return res.json({
    status: isAllComplete ? "done" : "running",
    progress: {
      completed: completedAnalyses,
      total: totalQueuedAnalyses,
      percent:
        totalQueuedAnalyses > 0
          ? Math.round((completedAnalyses / totalQueuedAnalyses) * 100)
          : 100,
    },
    queryId: query._id,
    bestMatch: rankedOutput.bestMatch,
    alternatives: rankedOutput.alternatives,
    ranked: rankedOutput.ranked,
  });
}
