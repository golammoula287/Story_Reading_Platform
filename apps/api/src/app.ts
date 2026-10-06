import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { deploymentRateLimitStore } from './rate-limit-store.js';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { MediaAsset } from './models.js';
import path from 'node:path';
import { mediaDir } from './config.js';
import { rewardRoutes, acceptReward } from './modules/rewards.js';
import { configuredRewardProvider, type RewardProvider } from './modules/reward-provider.js';
import { ApiError } from './lib.js';
import { errorHandler } from './lib.js';
import { authenticate, authRouter, checkOrigin } from './modules/auth.js';
import { contentRouter } from './modules/content.js';
import { commentsRouter, adminCommentsRouter } from './modules/comments.js';
import { readerRouter } from './modules/reader.js';
import { adminRouter } from './modules/admin.js';
export function createApp({
  rewardProvider = configuredRewardProvider,
}: { rewardProvider?: RewardProvider | null } = {}) {
  const app = express();
  app.disable('x-powered-by');
  const isBehindProxy =
    process.env.RENDER === 'true' ||
    Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL) ||
    process.env.NODE_ENV === 'production';
  app.set('trust proxy', isBehindProxy ? 1 : 'loopback');
  app.use(helmet());
  app.use((_req, res, next) => {
    res.setHeader('X-Request-Id', randomUUID());
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.get('/health', (_req, res) =>
    res
      .status(mongoose.connection.readyState === 1 ? 200 : 503)
      .json({ ready: mongoose.connection.readyState === 1 }),
  );
  app.use(
    '/api/v1',
    rateLimit({
      windowMs: 60000,
      store: deploymentRateLimitStore('api'),
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a minute.' },
      },
    }),
  );
  if (rewardProvider) {
    if (!/^[a-z0-9-]+$/.test(rewardProvider.id)) throw Error('Invalid reward provider identifier');
    // Only the configured provider callback bypasses browser CSRF; authentication is its signature.
    app.post(
      '/api/v1/ads/' + rewardProvider.id + '/callback',
      express.raw({ type: '*/*', limit: '16kb' }),
      async (req, res) => {
        let proof;
        try {
          proof = await rewardProvider.verify(req.body, req.headers);
        } catch {
          throw new ApiError(401, 'INVALID_CALLBACK', 'Callback verification failed.');
        }
        await acceptReward(rewardProvider.id, proof);
        res.status(204).end();
      },
    );
  }
  app.use(express.json({ limit: '1mb' }), cookieParser(), checkOrigin, authenticate);
  app.get('/api/v1/media/:key', async (req, res, next) => {
    if (!/^[a-f\d-]+\.webp$/.test(req.params.key)) return res.status(404).end();
    const asset = await MediaAsset.findOne({ key: req.params.key }).lean();
    if (asset) return res.redirect(302, asset.url);
    res.sendFile(path.join(mediaDir, req.params.key), { dotfiles: 'allow' }, (err) => {
      if (err) {
        if ((err as { status?: number }).status === 404)
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cover not found.' } });
        else next(err);
      }
    });
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin/comments', adminCommentsRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/chapters/:chapterId/comments', commentsRouter);
  app.use('/api/v1/me', readerRouter);
  app.use('/api/v1', rewardRoutes(rewardProvider));
  app.use('/api/v1', contentRouter);
  app.use((_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }),
  );
  app.use(errorHandler);
  return app;
}
