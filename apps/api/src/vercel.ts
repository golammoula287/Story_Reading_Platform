import express from 'express';
import mongoose from 'mongoose';
import { timingSafeEqual } from 'node:crypto';
import { createApp } from './app.js';
import { connect } from './db.js';
import { config } from './config.js';
import { runPublishingJobs } from './workers/jobs.js';

const app = express();
app.disable('x-powered-by');
let initialization: Promise<unknown> | undefined;
app.use(async (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try {
    await connect();
    initialization ??= Promise.all(Object.values(mongoose.models).map((model) => model.init()));
    await initialization;
    next();
  } catch {
    initialization = undefined;
    res
      .status(503)
      .json({ error: { code: 'UNAVAILABLE', message: 'Service temporarily unavailable.' } });
  }
});
app.all('/internal/publishing', async (req, res) => {
  const expected = Buffer.from(`Bearer ${config.CRON_SECRET}`);
  const received = Buffer.from(req.headers.authorization || '');
  if (
    !config.CRON_SECRET ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized.' } });
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  try {
    res.json(await runPublishingJobs());
  } catch {
    res
      .status(503)
      .json({ error: { code: 'JOB_FAILED', message: 'Publishing job failed; retry later.' } });
  }
});
app.use(createApp());
export default app;
