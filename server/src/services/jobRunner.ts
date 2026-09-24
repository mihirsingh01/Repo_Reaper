import { Analysis } from "../models/Analysis.js";
import { Repository } from "../models/Repository.js";
import { Idea } from "../models/Idea.js";
import { Query } from "../models/Query.js";
import { aiClient } from "./aiClient.js";
import { computeFinalScore, rankCandidates } from "./ranking.js";
import { logger } from "../utils/logger.js";

export class JobRunner {
  private queue: string[] = [];
  private runningCount = 0;
  private readonly concurrency: number;

  constructor(concurrency = 2) {
    this.concurrency = concurrency;
  }

  /**
   * Enqueue an analysis job by its MongoDB ObjectId string.
   */
  enqueue(analysisId: string): void {
    if (!this.queue.includes(analysisId)) {
      this.queue.push(analysisId);
      logger.info(`Enqueued analysis ${analysisId}. Queue depth: ${this.queue.length}`);
    }
    this.processNext();
  }

  /**
   * Process next jobs up to configured concurrency limit.
   */
  private async processNext(): Promise<void> {
    if (this.runningCount >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const analysisId = this.queue.shift();
    if (!analysisId) return;

    this.runningCount++;
    this.executeJob(analysisId).finally(() => {
      this.runningCount--;
      this.processNext();
    });
  }

  /**
   * Execute single analysis lifecycle:
   * queued -> running -> done | partial | failed
   */
  private async executeJob(analysisId: string): Promise<void> {
    logger.info(`Starting execution of analysis ${analysisId}`);
    try {
      const analysis = await Analysis.findById(analysisId);
      if (!analysis) {
        logger.error(`Analysis ${analysisId} not found`);
        return;
      }

      analysis.status = "running";
      analysis.startedAt = new Date();
      await analysis.save();

      const [repo, idea] = await Promise.all([
        Repository.findById(analysis.repoId),
        Idea.findById(analysis.ideaId),
      ]);

      if (!repo) {
        throw new Error(`Target repository ${analysis.repoId} not found`);
      }
      if (!idea) {
        throw new Error(`Target idea ${analysis.ideaId} not found`);
      }

      // Execute AI service analysis
      const result = await aiClient.analyze(repo, idea.refined.features);

      // Determine if result is partial (any subscore null/unknown or has warnings)
      const hasUnknownSubscores = Object.values(result.subScores).some((s) => s === null);
      const isPartial = hasUnknownSubscores || (result.flags && result.flags.length > 0);

      analysis.status = isPartial ? "partial" : "done";
      analysis.finishedAt = new Date();
      analysis.facts = result.facts;
      analysis.coverage = result.coverage;
      analysis.bugRisk = result.bugRisk;
      analysis.subScores = result.subScores;
      analysis.viability = result.viability;
      analysis.confidence = result.confidence;
      analysis.verdict = result.verdict;
      analysis.flags = result.flags;
      analysis.findings = result.findings;
      analysis.revivalPlan = result.revivalPlan;
      analysis.founderBrief = result.founderBrief;
      analysis.trace = result.trace;
      await analysis.save();

      // Update associated Query document
      await this.updateQueryResults(idea._id.toString(), repo._id.toString(), analysis);

      logger.info(
        `Completed analysis ${analysisId} for repo ${repo.fullName} with status ${analysis.status}`
      );
    } catch (err: any) {
      logger.error(err, `Error executing analysis ${analysisId}`);
      await Analysis.findByIdAndUpdate(analysisId, {
        status: "failed",
        error: err.message || "Analysis execution failed",
        finishedAt: new Date(),
      });
    }
  }

  /**
   * Update the latest query's embedded result with the analysis score.
   */
  private async updateQueryResults(
    ideaId: string,
    repoId: string,
    analysis: any
  ): Promise<void> {
    try {
      const query = await Query.findOne({ ideaId, checklistHash: analysis.checklistHash }).sort({
        createdAt: -1,
      });

      if (!query) return;

      const resultIndex = query.results.findIndex(
        (r) => r.repoId.toString() === repoId
      );

      if (resultIndex !== -1) {
        const item = query.results[resultIndex];
        item.analysisId = analysis._id;
        item.coverage = analysis.coverage?.score ?? 0;
        item.viability = analysis.viability ?? 0;
        item.final = computeFinalScore(item.relevance, item.coverage, item.viability);

        // Check if we can rank candidates and update bestRepoId
        const candidates = query.results.map((r) => ({
          repoId: r.repoId.toString(),
          relevance: r.relevance,
          coverage: r.coverage,
          viability: r.viability,
          final: r.final,
          flags: r.repoId.toString() === repoId ? analysis.flags : [],
        }));

        const rankedOutput = rankCandidates(candidates);
        if (rankedOutput.bestMatch) {
          query.bestRepoId = rankedOutput.bestMatch.repoId as any;
        }

        await query.save();
      }
    } catch (err) {
      logger.error(err, `Failed to update query results for idea ${ideaId}`);
    }
  }

  /**
   * Inspect current runner workload.
   */
  getStatus() {
    return {
      running: this.runningCount,
      queued: this.queue.length,
      concurrency: this.concurrency,
    };
  }
}

export const jobRunner = new JobRunner(2);
