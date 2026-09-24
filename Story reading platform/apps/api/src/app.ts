import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import path from 'node:path';
import { mediaDir } from './config.js';
import { errorHandler } from './lib.js';
import { authenticate, authRouter, checkOrigin } from './modules/auth.js';
import { contentRouter } from './modules/content.js';
import { readerRouter } from './modules/reader.js';
import { adminRouter } from './modules/admin.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Loopback proxy only. Public API should remain bound to the private interface.
  app.set('trust proxy', 'loopback');
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
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: {
        error: { code: 'RATE_LIMIT', message: 'Too many requests. Please wait a minute.' },
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }), cookieParser(), checkOrigin, authenticate);
  app.get('/api/v1/media/:key', (req, res, next) => {
    if (!/^[a-f\d-]+\.webp$/.test(req.params.key)) return res.status(404).end();
    res.sendFile(path.join(mediaDir, req.params.key), { dotfiles: 'allow' }, (err) => {
      if (err) {
        if ((err as { status?: number }).status === 404)
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Cover not found.' } });
        else next(err);
      }
    });
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/v1/me', readerRouter);
  app.use('/api/v1', contentRouter);
  app.use((_req, res) =>
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }),
  );
  app.use(errorHandler);
  return app;
}
