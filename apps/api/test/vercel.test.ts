import { afterEach, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../src/config.js', () => ({
  config: {
    NODE_ENV: 'test',
    WEB_ORIGIN: 'http://localhost:3000',
    CRON_SECRET: 'test-cron-secret-only',
  },
  mediaDir: 'unused',
}));
vi.mock('../src/db.js', () => ({ connect: vi.fn(async () => {}) }));
vi.mock('../src/workers/jobs.js', () => ({
  runPublishingJobs: vi.fn(async () => ({ published: 1, freed: 2 })),
}));
vi.mock('mongoose', async (original) => {
  const module = await original<typeof import('mongoose')>();
  return { ...module, default: { ...module.default, models: {} } };
});
import app from '../src/vercel.js';
import { connect } from '../src/db.js';
import { runPublishingJobs } from '../src/workers/jobs.js';
afterEach(() => vi.clearAllMocks());
it('rejects missing/forged cron credentials and never runs jobs', async () => {
  for (const authorization of ['', 'Bearer forged', 'Bearer test-cron-secret-onlx']) {
    const result = await request(app)
      .get('/internal/publishing')
      .set('Authorization', authorization);
    expect(result.status).toBe(401);
    expect(result.headers['cache-control']).toContain('no-store');
  }
  expect(runPublishingJobs).not.toHaveBeenCalled();
});
it('runs the existing job service only for an authenticated GET', async () => {
  const result = await request(app)
    .get('/internal/publishing')
    .set('Authorization', 'Bearer test-cron-secret-only');
  expect(result.status).toBe(200);
  expect(result.body).toEqual({ published: 1, freed: 2 });
  expect(runPublishingJobs).toHaveBeenCalledOnce();
  expect(
    (
      await request(app)
        .post('/internal/publishing')
        .set('Authorization', 'Bearer test-cron-secret-only')
    ).status,
  ).toBe(405);
  expect(runPublishingJobs).toHaveBeenCalledOnce();
});
it('fails safely on database outage and retries on the next invocation', async () => {
  vi.mocked(connect).mockRejectedValueOnce(new Error('private database connection string'));
  const failed = await request(app).get('/api/v1/auth/providers');
  expect(failed.status).toBe(503);
  expect(failed.text).not.toContain('private database');
  expect((await request(app).get('/api/v1/auth/providers')).status).toBe(200);
});
it('retains anonymous chapter denial and origin checks through the serverless entry', async () => {
  const response = await request(app).get('/api/v1/chapters/aaaaaaaaaaaaaaaaaaaaaaaa/content');
  expect(response.status).toBe(401);
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(
    (
      await request(app)
        .post('/api/v1/auth/login')
        .set('Origin', 'https://untrusted.example')
        .send({})
    ).status,
  ).toBe(403);
});
it('returns a retryable failure without leaking job errors', async () => {
  vi.mocked(runPublishingJobs).mockRejectedValueOnce(new Error('private detail'));
  const result = await request(app)
    .get('/internal/publishing')
    .set('Authorization', 'Bearer test-cron-secret-only');
  expect(result.status).toBe(503);
  expect(result.text).not.toContain('private detail');
});
