import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { setupTestDb, clearTestDb, teardownTestDb } from "./setup.js";
import { User } from "../src/models/User.js";
import { Repository } from "../src/models/Repository.js";
import { Idea } from "../src/models/Idea.js";
import { Analysis } from "../src/models/Analysis.js";

describe("Search & Ranking End-to-End Flow – Integration Tests", () => {
  let token: string;
  let userId: string;
  let repo1: any;
  let repo2Unlicensed: any;
  let repo3: any;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // 1. Create authenticated user
    const regRes = await request(app).post("/api/auth/register").send({
      name: "Search Founder",
      email: "founder-search@example.com",
      password: "Password123!",
    });
    token = regRes.body.token;
    userId = regRes.body.user.id;

    // 2. Create sample repositories in test DB
    const staleDate = new Date(Date.now() - 15 * 30 * 24 * 60 * 60 * 1000);

    repo1 = await Repository.create({
      githubId: 30001,
      fullName: "test-org/licensed-great-repo",
      url: "https://github.com/test-org/licensed-great-repo",
      description: "Great repository with MIT license and good coverage.",
      topics: ["stock", "inventory"],
      language: "TypeScript",
      license: { spdx: "MIT", name: "MIT License" },
      stars: 100,
      lastCommitAt: staleDate,
      commitCount: 50,
      createdAt: staleDate,
      pushedAt: staleDate,
    });

    // Unlicensed repo with high stars but NO_LICENSE
    repo2Unlicensed = await Repository.create({
      githubId: 30002,
      fullName: "unlicensed-org/perfect-looking-repo",
      url: "https://github.com/unlicensed-org/perfect-looking-repo",
      description: "Perfect implementation but has no open source license.",
      topics: ["stock", "inventory"],
      language: "TypeScript",
      license: { spdx: null, name: "" }, // NO_LICENSE!
      stars: 500,
      lastCommitAt: staleDate,
      commitCount: 80,
      createdAt: staleDate,
      pushedAt: staleDate,
    });

    repo3 = await Repository.create({
      githubId: 30003,
      fullName: "test-org/alternative-repo",
      url: "https://github.com/test-org/alternative-repo",
      description: "Alternative repository with Apache license.",
      topics: ["stock", "inventory"],
      language: "JavaScript",
      license: { spdx: "Apache-2.0", name: "Apache License 2.0" },
      stars: 60,
      lastCommitAt: staleDate,
      commitCount: 40,
      createdAt: staleDate,
      pushedAt: staleDate,
    });
  });

  it("rejects search when idea is in draft status", async () => {
    const ideaRes = await request(app)
      .post("/api/ideas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rawText:
          "An inventory control app for independent retailers with low-stock warnings.",
      });

    const ideaId = ideaRes.body._id;

    const searchRes = await request(app)
      .post(`/api/ideas/${ideaId}/search`)
      .set("Authorization", `Bearer ${token}`);

    expect(searchRes.status).toBe(400);
    expect(searchRes.body.error).toContain("confirmed");
  });

  it("runs full search flow: confirms idea -> search (cache miss) -> repeat search (cache hit)", async () => {
    // 1. Submit idea
    const ideaRes = await request(app)
      .post("/api/ideas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rawText:
          "An inventory tracking system that connects to WhatsApp for real-time stock alerts.",
      });

    const ideaId = ideaRes.body._id;

    // 2. Confirm checklist
    const confirmRes = await request(app)
      .patch(`/api/ideas/${ideaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        status: "confirmed",
        features: [
          {
            id: "f1",
            label: "Track Stock",
            plainDescription: "Log stock counts.",
            keywords: ["stock", "inventory"],
            priority: "must",
          },
        ],
      });

    expect(confirmRes.body.status).toBe("confirmed");

    // 3. First search: Cache Miss -> queues analyses
    const searchRes1 = await request(app)
      .post(`/api/ideas/${ideaId}/search`)
      .set("Authorization", `Bearer ${token}`);

    expect(searchRes1.status).toBe(202);
    expect(searchRes1.body.cached).toBe(false);
    expect(searchRes1.body.status).toBe("queued");
    expect(searchRes1.body.queryId).toBeDefined();

    // 4. Verify user dailyAnalysisCount incremented
    const updatedUser = await User.findById(userId);
    expect(updatedUser?.dailyAnalysisCount).toBeGreaterThan(0);

    // 5. Repeat search: Cache Hit -> served from cache without AI call
    const searchRes2 = await request(app)
      .post(`/api/ideas/${ideaId}/search`)
      .set("Authorization", `Bearer ${token}`);

    expect(searchRes2.status).toBe(200);
    expect(searchRes2.body.cached).toBe(true);
    expect(searchRes2.body.message).toContain("cache");
    expect(searchRes2.body.queryId).toBe(searchRes1.body.queryId);
  });

  it("enforces daily analysis cap per user (DAILY_ANALYSIS_CAP_PER_USER)", async () => {
    // Set user daily analysis count to cap (15)
    await User.findByIdAndUpdate(userId, { dailyAnalysisCount: 15 });

    const idea = await Idea.create({
      userId,
      rawText:
        "Valid description for an idea to test daily quota enforcement on the server.",
      status: "confirmed",
      checklistHash: "valid-hash-12345",
      refined: {
        summary: "Quota test idea",
        targetUsers: ["Users"],
        features: [
          {
            id: "f1",
            label: "Feature",
            plainDescription: "Desc",
            keywords: [],
            priority: "must",
          },
        ],
      },
    });

    const searchRes = await request(app)
      .post(`/api/ideas/${idea._id}/search`)
      .set("Authorization", `Bearer ${token}`);

    expect(searchRes.status).toBe(429);
    expect(searchRes.body.error).toContain("Daily analysis quota");
  });

  it("results polling: returns ranked list, Best match, and ensures NO_LICENSE is never Best match", async () => {
    const idea = await Idea.create({
      userId,
      rawText:
        "Valid description for an idea to test search results polling and Best match selection.",
      status: "confirmed",
      checklistHash: "checklist-hash-polling",
      refined: {
        summary: "Results test idea",
        targetUsers: ["Users"],
        features: [
          {
            id: "f1",
            label: "Feature One",
            plainDescription: "Desc",
            keywords: ["stock"],
            priority: "must",
          },
        ],
      },
    });

    // Run search to seed Query
    await request(app)
      .post(`/api/ideas/${idea._id}/search`)
      .set("Authorization", `Bearer ${token}`);

    // Create completed analyses for repos
    // Repo 1: Licensed, viability = 85, coverage = 80
    await Analysis.create({
      repoId: repo1._id,
      ideaId: idea._id,
      checklistHash: idea.checklistHash,
      requestedBy: userId,
      status: "done",
      coverage: { score: 80, features: [] },
      subScores: {
        structure: 15,
        bugRisk: 15,
        deps: 10,
        docs: 10,
        license: 15,
        history: 10,
        tests: 10,
      },
      viability: 85,
      confidence: 1.0,
      verdict: "Ready to build on",
      flags: [],
      founderBrief: "# Founder Brief\nReady to build on.",
    });

    // Repo 2: Unlicensed with higher coverage = 95, viability = 90, but NO_LICENSE flag!
    await Analysis.create({
      repoId: repo2Unlicensed._id,
      ideaId: idea._id,
      checklistHash: idea.checklistHash,
      requestedBy: userId,
      status: "done",
      coverage: { score: 95, features: [] },
      subScores: {
        structure: 15,
        bugRisk: 20,
        deps: 15,
        docs: 10,
        license: 0,
        history: 10,
        tests: 15,
      },
      viability: 90,
      confidence: 1.0,
      verdict: "Borrow parts only",
      flags: ["NO_LICENSE"], // Disqualifier!
      founderBrief: "# Founder Brief\nMissing open source license.",
    });

    // Poll results
    const resultsRes = await request(app)
      .get(`/api/ideas/${idea._id}/results`)
      .set("Authorization", `Bearer ${token}`);

    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body.progress).toBeDefined();
    expect(resultsRes.body.ranked).toBeDefined();

    // Verify Best Match selection
    expect(resultsRes.body.bestMatch).not.toBeNull();
    // Repo 1 must be Best Match; repo 2 (NO_LICENSE) CANNOT be Best Match!
    expect(resultsRes.body.bestMatch.repoId).toBe(repo1._id.toString());
    expect(resultsRes.body.bestMatch.flags).not.toContain("NO_LICENSE");

    // Check founder brief retrieval
    const briefRes = await request(app)
      .get(`/api/ideas/${idea._id}/brief?repoId=${repo1._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(briefRes.status).toBe(200);
    expect(briefRes.text).toContain("Founder Brief");
  });
});
