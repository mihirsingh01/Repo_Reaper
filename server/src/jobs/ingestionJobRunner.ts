import { IngestionJob, IIngestionJob } from "../models/IngestionJob.js";
import { Repository } from "../models/Repository.js";
import { repositoryDiscovery, ShardDefinition } from "../services/github/discovery.js";
import { repositoryVerifier } from "../services/github/verifier.js";
import { repositoryEnricher } from "../services/github/enricher.js";
import { aiClient } from "../services/aiClient.js";
import { logger } from "../utils/logger.js";

export interface IngestionOptions {
  language?: string;
  window?: string;
  maxRepos?: number;
  jobId?: string;
}

export class IngestionPipeline {
  private isRunning = false;

  /**
   * Execute full ingestion pipeline across sharded search space.
   */
  async run(options: IngestionOptions = {}): Promise<IIngestionJob> {
    if (this.isRunning) {
      throw new Error("Ingestion job is already running");
    }

    this.isRunning = true;

    let job: IIngestionJob;
    if (options.jobId) {
      job = (await IngestionJob.findById(options.jobId)) || (await this.createJob(options));
    } else {
      job = await this.createJob(options);
    }

    job.status = "running";
    job.startedAt = new Date();
    await job.save();

    logger.info(`Starting Ingestion Job ${job._id} (params: ${JSON.stringify(job.params)})`);

    try {
      const shards: ShardDefinition[] = options.language || options.window
        ? [{ language: options.language, window: options.window }]
        : repositoryDiscovery.generateShards();

      const maxRepos = options.maxRepos || 100;
      let totalKept = 0;

      for (const shard of shards) {
        if (totalKept >= maxRepos) break;

        logger.info(
          `Processing shard: language=${shard.language || "all"}, window=${shard.window || "default"}`
        );

        let page = 1;
        let hasMore = true;

        while (hasMore && totalKept < maxRepos) {
          const searchResult = await repositoryDiscovery.searchPage(shard, page, 30);
          hasMore = searchResult.hasMore;
          page++;

          for (const rawRepo of searchResult.items) {
            if (totalKept >= maxRepos) break;

            job.counts.seen++;

            // 1. Check for existing cached repo
            const existingRepo = await Repository.findOne({ githubId: rawRepo.githubId });
            if (existingRepo) {
              const monthsSinceLastCommit =
                (Date.now() - existingRepo.lastCommitAt.getTime()) / (1000 * 60 * 60 * 24 * 30);

              // If repo was already verified and stale, update fetchedAt and reuse
              if (monthsSinceLastCommit >= 12 && existingRepo.commitCount >= 30) {
                existingRepo.fetchedAt = new Date();
                await existingRepo.save();
                this.recordReason(job, "unchanged_cached");
                continue;
              }
            }

            // 2. Staleness Verification (checks default branch latest commit & commit count via Link header)
            const verification = await repositoryVerifier.verifyRepository(
              rawRepo.fullName,
              rawRepo.defaultBranch
            );

            if (!verification.passed) {
              job.counts.rejected++;
              this.recordReason(job, verification.reason || "staleness_failed");
              continue;
            }

            // 3. Enrichment (README validation, bug issues without PRs, CI conclusion)
            const enrichment = await repositoryEnricher.enrich(
              rawRepo.fullName,
              rawRepo.defaultBranch,
              rawRepo.license
            );

            if (!enrichment.passed || !enrichment.signals) {
              job.counts.rejected++;
              this.recordReason(job, enrichment.reason || "enrichment_failed");
              continue;
            }

            // 4. Upsert into MongoDB
            await Repository.findOneAndUpdate(
              { githubId: rawRepo.githubId },
              {
                githubId: rawRepo.githubId,
                fullName: rawRepo.fullName,
                url: rawRepo.url,
                description: rawRepo.description,
                topics: rawRepo.topics,
                language: rawRepo.language,
                license: {
                  spdx: enrichment.signals.licenseSpdx,
                  name: enrichment.signals.licenseName,
                },
                stars: rawRepo.stars,
                forks: rawRepo.forks,
                openIssues: rawRepo.openIssues,
                openBugIssues: enrichment.signals.openBugIssues,
                closedBugIssues: enrichment.signals.closedBugIssues,
                lastCiConclusion: enrichment.signals.lastCiConclusion,
                defaultBranch: rawRepo.defaultBranch,
                archived: rawRepo.archived,
                createdAt: rawRepo.createdAt,
                pushedAt: rawRepo.pushedAt,
                lastCommitAt: verification.lastCommitAt!,
                commitCount: verification.commitCount!,
                contributorCount: verification.contributorCount!,
                readmeText: enrichment.signals.readmeText,
                readmeHash: enrichment.signals.readmeHash,
                fetchedAt: new Date(),
              },
              { upsert: true, new: true }
            );

            job.counts.kept++;
            totalKept++;

            // Periodically save progress
            if (job.counts.seen % 5 === 0) {
              await job.save();
            }
          }
        }
      }

      job.status = "done";
      job.finishedAt = new Date();
      await job.save();

      // 5. Trigger TF-IDF Index Build on AI Service
      await this.syncIndex();

      logger.info(
        `Ingestion Job ${job._id} completed successfully. Kept: ${job.counts.kept}, Rejected: ${job.counts.rejected}`
      );
      return job;
    } catch (err: any) {
      logger.error(err, `Ingestion Job ${job._id} encountered fatal error`);
      job.status = "failed";
      job.error = err.message || "Unknown error during ingestion";
      job.finishedAt = new Date();
      await job.save();
      return job;
    } finally {
      this.isRunning = false;
    }
  }

  private async createJob(options: IngestionOptions): Promise<IIngestionJob> {
    return IngestionJob.create({
      status: "queued",
      params: {
        language: options.language,
        window: options.window,
      },
      counts: {
        seen: 0,
        kept: 0,
        rejected: 0,
        byReason: {},
      },
    });
  }

  private recordReason(job: IIngestionJob, reason: string): void {
    const counts = job.counts.byReason as Record<string, number>;
    counts[reason] = (counts[reason] || 0) + 1;
    job.markModified("counts.byReason");
  }

  /**
   * Rebuilds TF-IDF index across all stored repositories.
   */
  async syncIndex(): Promise<void> {
    try {
      const repos = await Repository.find({}, "fullName description topics readmeText").limit(500);
      const corpus = repos.map((r) => ({
        id: r._id.toString(),
        text: `${r.fullName} ${r.description} ${(r.topics || []).join(" ")} ${r.readmeText.slice(
          0,
          10000
        )}`,
      }));

      if (corpus.length > 0) {
        await aiClient.buildIndex(corpus);
        logger.info(`Rebuilt AI service index with ${corpus.length} repositories`);
      }
    } catch (err) {
      logger.warn(err, "Failed to rebuild AI index after ingestion");
    }
  }
}

export const ingestionPipeline = new IngestionPipeline();
