import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { setupTestDb, clearTestDb, teardownTestDb } from "./setup.js";
import { GitHubClient } from "../src/services/github/githubClient.js";
import { RepositoryVerifier } from "../src/services/github/verifier.js";
import { RepositoryEnricher } from "../src/services/github/enricher.js";
import { RepositoryDiscovery } from "../src/services/github/discovery.js";
import { IngestionJob } from "../src/models/IngestionJob.js";

describe("GitHub Ingestion Pipeline – Tests with Mocked Fixtures", () => {
  let adminToken: string;
  let founderToken: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Register admin user
    const adminRes = await request(app).post("/api/auth/register").send({
      name: "Admin",
      email: "admin-ingest@example.com",
      password: "Password123!",
      role: "admin",
    });
    adminToken = adminRes.body.token;

    // Register founder user
    const founderRes = await request(app).post("/api/auth/register").send({
      name: "Founder",
      email: "founder-ingest@example.com",
      password: "Password123!",
      role: "founder",
    });
    founderToken = founderRes.body.token;
  });

  describe("1. GitHub Client & Link Header Pagination", () => {
    it("parses RFC 5988 Link headers to extract last page commit counts", () => {
      const client = new GitHubClient();
      const linkHeader =
        '<https://api.github.com/repositories/123/commits?page=2>; rel="next", <https://api.github.com/repositories/123/commits?page=142>; rel="last"';

      const parsed = client.parseLinkHeader(linkHeader);
      expect(parsed.next).toBe("https://api.github.com/repositories/123/commits?page=2");
      expect(parsed.last).toBe("https://api.github.com/repositories/123/commits?page=142");
      expect(parsed.lastPage).toBe(142);
    });

    it("returns empty object when Link header is missing", () => {
      const client = new GitHubClient();
      expect(client.parseLinkHeader(undefined)).toEqual({});
      expect(client.parseLinkHeader("")).toEqual({});
    });
  });

  describe("2. Staleness Verification Logic", () => {
    it("rejects repo with recent commit even if pushed_at looked stale", async () => {
      // Mock GitHubClient to return a recent commit date (yesterday)
      const mockClient = new GitHubClient();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      vi.spyOn(mockClient, "request").mockResolvedValueOnce({
        status: 200,
        headers: { link: '<url?page=60>; rel="last"' },
        data: [{ commit: { committer: { date: yesterday } } }],
        fromCache: false,
      });

      const verifier = new RepositoryVerifier(mockClient);
      const result = await verifier.verifyRepository("owner/active-repo", "main");

      expect(result.passed).toBe(false);
      expect(result.reason).toBe("too_recent_commit");
    });

    it("accepts repo with stale commit (>12 months) and sufficient commits (>=30)", async () => {
      const mockClient = new GitHubClient();
      const fourteenMonthsAgo = new Date(
        Date.now() - 14 * 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      vi.spyOn(mockClient, "request")
        .mockResolvedValueOnce({
          // Commits request
          status: 200,
          headers: { link: '<url?page=45>; rel="last"' },
          data: [{ commit: { committer: { date: fourteenMonthsAgo } } }],
          fromCache: false,
        })
        .mockResolvedValueOnce({
          // Contributors request
          status: 200,
          headers: { link: '<url?page=3>; rel="last"' },
          data: [{ login: "contributor1" }],
          fromCache: false,
        });

      const verifier = new RepositoryVerifier(mockClient);
      const result = await verifier.verifyRepository("owner/stale-good-repo", "main");

      expect(result.passed).toBe(true);
      expect(result.commitCount).toBe(45);
      expect(result.contributorCount).toBe(3);
      expect(result.lastCommitAt).toBeDefined();
    });

    it("rejects repo with insufficient commits (<30)", async () => {
      const mockClient = new GitHubClient();
      const staleDate = new Date(Date.now() - 15 * 30 * 24 * 60 * 60 * 1000).toISOString();

      vi.spyOn(mockClient, "request").mockResolvedValueOnce({
        status: 200,
        headers: { link: '<url?page=12>; rel="last"' }, // Only 12 commits!
        data: [{ commit: { committer: { date: staleDate } } }],
        fromCache: false,
      });

      const verifier = new RepositoryVerifier(mockClient);
      const result = await verifier.verifyRepository("owner/toy-repo", "main");

      expect(result.passed).toBe(false);
      expect(result.reason).toBe("insufficient_commits");
      expect(result.commitCount).toBe(12);
    });
  });

  describe("3. Enrichment & Bug Issue Counting (Filtering Pull Requests)", () => {
    it("filters out pull requests when counting bug issues", async () => {
      const mockClient = new GitHubClient();

      // Return 3 items: 2 real issues and 1 pull request
      vi.spyOn(mockClient, "request").mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: [
          { id: 1, title: "Crash on startup" }, // Issue
          { id: 2, title: "Fix crash on startup", pull_request: {} }, // Pull Request!
          { id: 3, title: "Memory leak in worker" }, // Issue
        ],
        fromCache: false,
      });

      const enricher = new RepositoryEnricher(mockClient);
      const count = await enricher.countBugIssues("owner/buggy-repo", "open");

      // Pull request #2 must be excluded!
      expect(count).toBe(2);
    });

    it("rejects repository with short or missing README (< 100 characters)", async () => {
      const mockClient = new GitHubClient();

      vi.spyOn(mockClient, "request").mockResolvedValueOnce({
        status: 200,
        headers: {},
        data: {
          content: Buffer.from("# Tiny\nToo short.").toString("base64"),
          encoding: "base64",
        },
        fromCache: false,
      });

      const enricher = new RepositoryEnricher(mockClient);
      const result = await enricher.enrich("owner/no-readme", "main");

      expect(result.passed).toBe(false);
      expect(result.reason).toBe("short_or_missing_readme");
    });

    it("enriches valid repository with base64 decoded README, bug counts, and CI conclusion", async () => {
      const mockClient = new GitHubClient();
      const fullReadmeText =
        "# Substantial Stale Repository\n\nThis is a production-tested tool designed for automated inventory and retail alerting. It includes full CLI support and docker-compose configurations.";

      vi.spyOn(mockClient, "request")
        // 1. Readme
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          data: {
            content: Buffer.from(fullReadmeText).toString("base64"),
            encoding: "base64",
          },
          fromCache: false,
        })
        // 2. Open bugs
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          data: [{ id: 101, title: "Bug 1" }],
          fromCache: false,
        })
        // 3. Closed bugs
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          data: [{ id: 102, title: "Fixed bug 2" }],
          fromCache: false,
        })
        // 4. CI Actions
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          data: { workflow_runs: [{ conclusion: "success" }] },
          fromCache: false,
        });

      const enricher = new RepositoryEnricher(mockClient);
      const result = await enricher.enrich("owner/good-repo", "main", {
        spdx_id: "MIT",
        name: "MIT License",
      });

      expect(result.passed).toBe(true);
      expect(result.signals).toBeDefined();
      expect(result.signals?.readmeText).toBe(fullReadmeText);
      expect(result.signals?.licenseSpdx).toBe("MIT");
      expect(result.signals?.openBugIssues).toBe(1);
      expect(result.signals?.closedBugIssues).toBe(1);
      expect(result.signals?.lastCiConclusion).toBe("success");
    });
  });

  describe("4. Discovery & Sharding", () => {
    it("builds query with qualifiers: fork:false archived:false stars:>=10 and date window", () => {
      const discovery = new RepositoryDiscovery();
      const q = discovery.buildQuery(
        { language: "TypeScript", window: "2022-01-01..2022-06-30" },
        10
      );

      expect(q).toContain("fork:false");
      expect(q).toContain("archived:false");
      expect(q).toContain("stars:>=10");
      expect(q).toContain("language:TypeScript");
      expect(q).toContain("pushed:2022-01-01..2022-06-30");
    });
  });

  describe("5. Admin Ingestion Endpoints & Role Guard", () => {
    it("rejects non-admin users with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/admin/ingest")
        .set("Authorization", `Bearer ${founderToken}`)
        .send({ language: "Python" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Insufficient permissions");
    });

    it("allows admin to trigger ingestion run and returns 202 with jobId", async () => {
      const res = await request(app)
        .post("/api/admin/ingest")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          language: "TypeScript",
          window: "2022-01-01..2022-06-30",
          maxRepos: 10,
        });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.status).toBe("queued");

      // Verify job is stored in DB
      const job = await IngestionJob.findById(res.body.jobId);
      expect(job).not.toBeNull();
      expect(job?.params.language).toBe("TypeScript");
    });

    it("allows admin to inspect live job status and counts", async () => {
      const job = await IngestionJob.create({
        status: "running",
        params: { language: "Go" },
        counts: {
          seen: 15,
          kept: 4,
          rejected: 11,
          byReason: { too_recent_commit: 8, insufficient_commits: 3 },
        },
      });

      const res = await request(app)
        .get(`/api/admin/ingest/${job._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("running");
      expect(res.body.counts.seen).toBe(15);
      expect(res.body.counts.kept).toBe(4);
      expect(res.body.counts.byReason.too_recent_commit).toBe(8);
    });
  });
});
