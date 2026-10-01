import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { setupTestDb, clearTestDb, teardownTestDb } from "./setup.js";
import { User } from "../src/models/User.js";
import { Idea } from "../src/models/Idea.js";

describe("Ideas Endpoints – Integration Tests", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Register test user
    const regRes = await request(app).post("/api/auth/register").send({
      name: "Idea Founder",
      email: "founder-ideas@example.com",
      password: "Password123!",
    });

    token = regRes.body.token;
    userId = regRes.body.user.id;
  });

  describe("POST /api/ideas", () => {
    it("validates rawText must be between 30 and 2000 characters", async () => {
      // Too short (< 30 chars)
      const shortRes = await request(app)
        .post("/api/ideas")
        .set("Authorization", `Bearer ${token}`)
        .send({ rawText: "Too short idea." });

      expect(shortRes.status).toBe(400);
      expect(shortRes.body.error).toBe("Validation error");

      // Too long (> 2000 chars)
      const longRes = await request(app)
        .post("/api/ideas")
        .set("Authorization", `Bearer ${token}`)
        .send({ rawText: "a".repeat(2001) });

      expect(longRes.status).toBe(400);
    });

    it("creates an idea with status draft, refined features, and checklistHash", async () => {
      const validText =
        "A mobile application for independent pet owners to track vaccine dates, vet appointments, and pet medical records.";

      const res = await request(app)
        .post("/api/ideas")
        .set("Authorization", `Bearer ${token}`)
        .send({ rawText: validText });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("draft");
      expect(res.body.rawText).toBe(validText);
      expect(res.body.refined).toBeDefined();
      expect(res.body.refined.features.length).toBeGreaterThan(0);
      expect(res.body.checklistHash).toBeDefined();
    });
  });

  describe("PATCH /api/ideas/:id", () => {
    it("updates checklist features, sets status to confirmed, and recomputes checklistHash", async () => {
      const postRes = await request(app)
        .post("/api/ideas")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rawText:
            "A collaborative task management system with Kanban boards and automated email summaries.",
        });

      const ideaId = postRes.body._id;
      const initialHash = postRes.body.checklistHash;

      const updatedFeatures = [
        {
          id: "f1",
          label: "Custom Kanban Columns",
          plainDescription: "Configure drag-and-drop boards.",
          keywords: ["kanban", "board", "drag-and-drop"],
          priority: "must",
        },
        {
          id: "f2",
          label: "Automated Email Digest",
          plainDescription: "Daily digest sent at 9am.",
          keywords: ["digest", "email", "summary"],
          priority: "nice",
        },
      ];

      const patchRes = await request(app)
        .patch(`/api/ideas/${ideaId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          status: "confirmed",
          features: updatedFeatures,
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe("confirmed");
      expect(patchRes.body.refined.features).toHaveLength(2);
      expect(patchRes.body.checklistHash).not.toBe(initialHash);
      expect(patchRes.body.checklistHash.length).toBe(64); // SHA-256 hex length
    });
  });

  describe("GET /api/ideas", () => {
    it("returns list of ideas belonging to the authenticated founder", async () => {
      await request(app)
        .post("/api/ideas")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rawText: "First valid software idea for testing user history listing.",
        });

      await request(app)
        .post("/api/ideas")
        .set("Authorization", `Bearer ${token}`)
        .send({
          rawText: "Second valid software idea for testing user history listing.",
        });

      const res = await request(app)
        .get("/api/ideas")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });
  });
});
