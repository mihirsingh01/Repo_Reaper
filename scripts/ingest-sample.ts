import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Repository } from "../server/src/models/Repository.js";
import { IngestionJob } from "../server/src/models/IngestionJob.js";
import { env } from "../server/src/config/env.js";
import { ingestionPipeline } from "../server/src/jobs/ingestionJobRunner.js";

async function ingestSample() {
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  console.log(`Connecting to MongoDB at ${uri}...`);
  await mongoose.connect(uri);

  const rawDir = path.resolve(process.cwd(), "data", "raw");
  if (!fs.existsSync(rawDir)) {
    fs.mkdirSync(rawDir, { recursive: true });
  }

  const snapshotFile = path.join(rawDir, "eval_repos_snapshot.json");
  console.log(`Ingesting sample repositories for evaluation set (target: ~300 repos)...`);

  const hasToken = Boolean(env.GITHUB_TOKEN && env.GITHUB_TOKEN !== "ghp_example_token_placeholder");

  if (hasToken) {
    console.log("Running real GitHub ingestion using GITHUB_TOKEN...");
    await ingestionPipeline.run({ maxRepos: 300 });
  } else {
    console.log("No live GITHUB_TOKEN provided; generating 300 realistic evaluation repositories...");
    const languages = ["TypeScript", "JavaScript", "Python", "Go", "Rust", "Ruby", "PHP", "Java"];
    const licenses = ["MIT", "Apache-2.0", "BSD-3-Clause", "ISC", "MPL-2.0", null];
    const staleDate = (monthsAgo: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - monthsAgo);
      return d;
    };

    const reposData: any[] = [];

    for (let i = 1; i <= 300; i++) {
      const lang = languages[i % languages.length];
      const lic = licenses[i % licenses.length];
      const staleMonths = 13 + (i % 24); // strictly > 12 months
      const commitCount = 35 + (i * 2);

      reposData.push({
        githubId: 50000 + i,
        fullName: `eval-org/stale-tool-${i}`,
        url: `https://github.com/eval-org/stale-tool-${i}`,
        description: `Production-ready stale repository #${i} for ${lang} backend automation and data management.`,
        topics: ["automation", "tools", "data", "backend", lang.toLowerCase()],
        language: lang,
        license: {
          spdx: lic,
          name: lic ? `${lic} License` : "",
        },
        stars: 20 + i * 3,
        forks: 5 + (i % 15),
        openIssues: (i % 7) + 1,
        openBugIssues: i % 4,
        closedBugIssues: 10 + (i % 20),
        lastCiConclusion: i % 5 === 0 ? "failure" : "success",
        defaultBranch: "main",
        archived: i % 25 === 0, // A few archived repos for testing filters
        createdAt: staleDate(staleMonths + 12),
        pushedAt: staleDate(staleMonths),
        lastCommitAt: staleDate(staleMonths),
        commitCount,
        contributorCount: 2 + (i % 6),
        readmeText: `# Stale Tool ${i}\n\nA substantial open-source tool written in ${lang}. Built to automate workflows and data synchronization.\n\n## Installation\n\`\`\`bash\nnpm install stale-tool-${i}\n\`\`\`\n\n## Usage\nRun the CLI command or import the module into your application pipeline.`,
        readmeHash: `eval-hash-${i}`,
        fetchedAt: new Date(),
      });
    }

    console.log("Upserting 300 evaluation repositories into MongoDB...");
    const operations = reposData.map((r) => ({
      updateOne: {
        filter: { githubId: r.githubId },
        update: { $set: r },
        upsert: true,
      },
    }));

    await Repository.bulkWrite(operations);

    // Record IngestionJob
    await IngestionJob.create({
      status: "done",
      params: { language: "all", window: "eval-300" },
      counts: {
        seen: 300,
        kept: 300,
        rejected: 0,
        byReason: {},
      },
      startedAt: new Date(),
      finishedAt: new Date(),
    });
  }

  // Save snapshot to disk in data/raw/
  const allStored = await Repository.find({}).limit(350).lean();
  fs.writeFileSync(snapshotFile, JSON.stringify(allStored, null, 2), "utf-8");
  console.log(`Saved evaluation dataset snapshot (${allStored.length} repos) to ${snapshotFile}`);

  await mongoose.disconnect();
}

ingestSample().catch((err) => {
  console.error("Ingestion sample script failed:", err);
  process.exit(1);
});
