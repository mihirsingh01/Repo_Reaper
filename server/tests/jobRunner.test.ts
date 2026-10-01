import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { setupTestDb, clearTestDb, teardownTestDb } from "./setup.js";
import { JobRunner } from "../src/services/jobRunner.js";
import { Analysis } from "../src/models/Analysis.js";
import { Repository } from "../src/models/Repository.js";
import { Idea } from "../src/models/Idea.js";
import { User } from "../src/models/User.js";

describe("JobRunner Service – Unit & Integration Tests", () => {
  let user: any;
  let repo: any;
  let idea: any;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    user = await User.create({
      name: "Runner User",
      email: "runner@example.com",
      passwordHash: "hash",
    });

    const staleDate = new Date(Date.now() - 15 * 30 * 24 * 60 * 60 * 1000);
    repo = await Repository.create({
      githubId: 40001,
      fullName: "test/runner-repo",
      url: "https://github.com/test/runner-repo",
      description: "Test repository for job runner execution",
      language: "TypeScript",
      license: { spdx: "MIT", name: "MIT License" },
      stars: 50,
      lastCommitAt: staleDate,
      commitCount: 45,
      createdAt: staleDate,
      pushedAt: staleDate,
    });

    idea = await Idea.create({
      userId: user._id,
      rawText: "Valid idea description for runner test with sufficient length.",
      status: "confirmed",
      checklistHash: "hash-runner-test",
      refined: {
        summary: "Runner idea",
        targetUsers: ["Users"],
        features: [
          {
            id: "f1",
            label: "Feature A",
            plainDescription: "Description",
            keywords: ["test"],
            priority: "must",
          },
        ],
      },
    });
  });

  it("processes enqueued analysis job and transitions status: queued -> done/partial", async () => {
    const runner = new JobRunner(2);

    const analysis = await Analysis.create({
      repoId: repo._id,
      ideaId: idea._id,
      checklistHash: idea.checklistHash,
      requestedBy: user._id,
      status: "queued",
    });

    runner.enqueue(analysis._id.toString());

    // Wait briefly for in-process async worker to finish
    await new Promise((resolve) => setTimeout(resolve, 300));

    const updated = await Analysis.findById(analysis._id);
    expect(updated).not.toBeNull();
    expect(["done", "partial"]).toContain(updated?.status);
    expect(updated?.finishedAt).toBeDefined();
    expect(updated?.coverage.score).toBeGreaterThan(0);
    expect(updated?.subScores.license).toBe(15);
  });

  it("handles missing target gracefully: transitions to failed with error message", async () => {
    const runner = new JobRunner(2);
    const nonExistentRepoId = new User()._id; // Random ObjectId not in repositories

    const analysis = await Analysis.create({
      repoId: nonExistentRepoId,
      ideaId: idea._id,
      checklistHash: idea.checklistHash,
      requestedBy: user._id,
      status: "queued",
    });

    runner.enqueue(analysis._id.toString());

    await new Promise((resolve) => setTimeout(resolve, 300));

    const failed = await Analysis.findById(analysis._id);
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toContain("not found");
  });
});
