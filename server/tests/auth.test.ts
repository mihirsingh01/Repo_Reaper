import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { setupTestDb, clearTestDb, teardownTestDb } from "./setup.js";
import { User } from "../src/models/User.js";

describe("Auth Endpoints – Integration Tests", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new founder user and returns token without passwordHash", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Alice Founder",
        email: "alice@example.com",
        password: "SecretPassword123!",
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("alice@example.com");
      expect(res.body.user.name).toBe("Alice Founder");
      expect(res.body.user.role).toBe("founder");
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();

      // Verify stored in DB
      const dbUser = await User.findOne({ email: "alice@example.com" }).select(
        "+passwordHash"
      );
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).not.toBe("SecretPassword123!");
    });

    it("rejects duplicate email with 409 Conflict", async () => {
      await request(app).post("/api/auth/register").send({
        name: "First User",
        email: "duplicate@example.com",
        password: "SecretPassword123!",
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Second User",
        email: "duplicate@example.com",
        password: "AnotherPassword123!",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Email is already registered");
    });

    it("rejects password shorter than 8 characters", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Short Pass",
        email: "short@example.com",
        password: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation error");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        name: "Login User",
        email: "user@example.com",
        password: "ValidPassword123!",
      });
    });

    it("logs in with valid credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "user@example.com",
        password: "ValidPassword123!",
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("user@example.com");
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("prevents user enumeration: returns identical 401 error for bad password and non-existent user", async () => {
      // 1. Existing user with wrong password
      const badPassRes = await request(app).post("/api/auth/login").send({
        email: "user@example.com",
        password: "WrongPassword!",
      });

      // 2. Non-existent user
      const noUserRes = await request(app).post("/api/auth/login").send({
        email: "nonexistent@example.com",
        password: "ValidPassword123!",
      });

      expect(badPassRes.status).toBe(401);
      expect(noUserRes.status).toBe(401);
      expect(badPassRes.body.error).toBe("Invalid email or password");
      expect(noUserRes.body.error).toBe("Invalid email or password");
      expect(badPassRes.body.error).toEqual(noUserRes.body.error);
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns authenticated user profile when Bearer token is provided", async () => {
      const regRes = await request(app).post("/api/auth/register").send({
        name: "Me User",
        email: "me@example.com",
        password: "ValidPassword123!",
      });

      const token = regRes.body.token;

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("me@example.com");
      expect(res.body.user.dailyAnalysisCount).toBe(0);
    });

    it("rejects unauthorized request without token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Authentication required");
    });
  });
});
