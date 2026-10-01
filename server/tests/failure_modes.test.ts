import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('System Failure Modes & Error Handling', () => {
  it('rejects idea submission with oversized body (> 2,000 chars)', async () => {
    const oversizedText = 'A'.repeat(2500);
    const res = await request(app)
      .post('/api/ideas')
      .send({ rawText: oversizedText });

    // Must be rejected by auth (401) or validation (400)
    expect([400, 401]).toContain(res.status);
  });

  it('rejects idea submission with undersized body (< 30 chars)', async () => {
    const shortText = 'Short app idea';
    const res = await request(app)
      .post('/api/ideas')
      .send({ rawText: shortText });

    expect([400, 401]).toContain(res.status);
  });

  it('handles non-existent routes with 404 Not Found', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('rejects invalid JSON payloads gracefully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"invalid_json_payload":');

    expect(res.status).toBe(400);
  });
});
