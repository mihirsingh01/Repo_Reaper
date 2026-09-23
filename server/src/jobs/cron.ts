import cron from "node-cron";
import { ingestionPipeline } from "./ingestionJobRunner.js";
import { logger } from "../utils/logger.js";

/**
 * Configurable background cron job for periodic repository ingestion.
 * Off by default per ADR-010 / Prompt 3 requirements.
 */
export function initIngestionCron(): void {
  const isEnabled = process.env.CRON_INGESTION_ENABLED === "true";
  const schedule = process.env.CRON_INGESTION_SCHEDULE || "0 2 * * *"; // Daily at 2:00 AM

  if (!isEnabled) {
    logger.info("Periodic GitHub ingestion cron is disabled by default.");
    return;
  }

  logger.info(`Initializing GitHub ingestion cron with schedule: "${schedule}"`);

  cron.schedule(schedule, async () => {
    logger.info("Executing scheduled GitHub repository ingestion...");
    try {
      await ingestionPipeline.run({ maxRepos: 100 });
      logger.info("Scheduled GitHub ingestion completed successfully.");
    } catch (err: any) {
      logger.error(err, "Scheduled GitHub ingestion encountered an error");
    }
  });
}
