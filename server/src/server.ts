import mongoose from "mongoose";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { initIngestionCron } from "./jobs/cron.js";

async function startServer() {
  try {
    logger.info(`Connecting to MongoDB at ${env.MONGODB_URI}...`);
    await mongoose.connect(env.MONGODB_URI);
    logger.info("MongoDB connected successfully.");

    app.listen(env.PORT, () => {
      logger.info(`RepoRevive Express server listening on http://localhost:${env.PORT}`);
      initIngestionCron();
    });
  } catch (err) {
    logger.error(err, "Failed to start server");
    process.exit(1);
  }
}

startServer();
