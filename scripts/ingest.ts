import mongoose from "mongoose";
import dotenv from "dotenv";
import { env } from "../server/src/config/env.js";
import { ingestionPipeline } from "../server/src/jobs/ingestionJobRunner.js";

// Ensure environment variables are loaded
dotenv.config();

/**
 * GitHub Ingestion runner script.
 * Ingests stale GitHub repositories matching criteria (>= 12 months inactive, >= 30 commits).
 */
async function runIngest() {
  console.log("RepoRevive GitHub Ingestion Script Initialized.");
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  console.log(`Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri);

  const maxRepos = parseInt(process.env.MAX_REPOS || "50", 10);
  const language = process.env.INGEST_LANGUAGE;
  const window = process.env.INGEST_WINDOW;

  console.log(`Starting ingestion pipeline (maxRepos: ${maxRepos}${language ? `, language: ${language}` : ""})...`);

  try {
    const job = await ingestionPipeline.run({
      maxRepos,
      language,
      window,
    });

    console.log(`Ingestion completed successfully.`);
    console.log({
      jobId: job._id.toString(),
      status: job.status,
      seen: job.counts.seen,
      kept: job.counts.kept,
      rejected: job.counts.rejected,
      byReason: job.counts.byReason,
    });
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

runIngest().catch((err) => {
  console.error("Ingestion failed with error:", err);
  process.exit(1);
});
