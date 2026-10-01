import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /api/health", () => {
  it("should return status ok and service health checks", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.services).toBeDefined();
    expect(res.body.services.server).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/api/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Route not found");
  });
});
