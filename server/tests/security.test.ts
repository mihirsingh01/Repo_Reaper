import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';
import { setupTestDb, teardownTestDb } from './setup.js';

describe('Security & Threat Defense Tests', () => {
  let founderToken: string;

  beforeAll(async () => {
    await setupTestDb();
    // Register test founder
    const res = await request(app).post('/api/auth/register').send({
      name: 'Security Test Founder',
      email: `security_${Date.now()}@reporevive.test`,
      password: 'SecurePassword123!',
    });
    if (res.body.token) {
      founderToken = res.body.token;
    }
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('rejects unauthenticated requests to protected endpoints (401)', async () => {
    const res = await request(app).get('/api/ideas');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/unauthorized|missing|token|authentication/i);
  });

  it('blocks NoSQL injection payloads in authentication (400)', async () => {
    // Attempting query operator injection in place of plain string
    const res = await request(app).post('/api/auth/login').send({
      email: { $gt: '' },
      password: { $gt: '' },
    });

    // Zod must reject non-string input with 400 Bad Request
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('enforces role-based access control: regular founder cannot access admin endpoints (403)', async () => {
    if (!founderToken) return;

    const res = await request(app)
      .post('/api/admin/ingest')
      .set('Authorization', `Bearer ${founderToken}`)
      .send({ language: 'Python', window: '2022-01..2023-01' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/forbidden|admin|insufficient/i);
  });

  it('never leaks passwordHash in authentication responses', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'founder@reporevive.test',
      password: 'FounderPass123!',
    });

    if (res.status === 200) {
      expect(res.body.user).toBeDefined();
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    }
  });

  it('rejects malformed Bearer tokens', async () => {
    const res = await request(app)
      .get('/api/ideas')
      .set('Authorization', 'Bearer invalid.tampered.token');

    expect(res.status).toBe(401);
  });
});
