import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this module so API scripts work whether they are launched from
// the monorepo root, the API directory, or the production dist directory.
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true });
const isRender = process.env.RENDER === 'true';
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
const isCloudContainer =
  isRender || isRailway || Boolean(process.env.FLY_APP_NAME) || Boolean(process.env.K_SERVICE);

// In cloud container platforms (Render, Railway, etc.), the host assigns PORT.
// For local development, API_PORT takes precedence.
const rawPort = isCloudContainer
  ? (process.env.PORT ?? process.env.API_PORT)
  : (process.env.API_PORT ?? process.env.PORT);

const rawHost = process.env.API_HOST ?? process.env.HOST;

// Cloud containers and production default to 0.0.0.0 so reverse proxies and port detectors can route traffic.
const defaultApiHost =
  process.env.NODE_ENV === 'production' || isCloudContainer || Boolean(process.env.PORT)
    ? '0.0.0.0'
    : '127.0.0.1';

let resolvedApiHost = rawHost ?? defaultApiHost;

// In cloud containers (like Render), binding to 127.0.0.1 or localhost prevents the platform's
// router and port scanner from detecting the service. Normalize loopback to 0.0.0.0.
if (isCloudContainer && (resolvedApiHost === '127.0.0.1' || resolvedApiHost === 'localhost')) {
  resolvedApiHost = '0.0.0.0';
}

const runtimeEnv: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: isCloudContainer ? 'production' : process.env.NODE_ENV,
  API_PORT: rawPort,
  API_HOST: resolvedApiHost,
};
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().default(defaultApiHost),
  MONGODB_URI: z
    .string()
    .startsWith('mongodb')
    .default('mongodb://127.0.0.1:27018/storyhaven?replicaSet=storyhaven'),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  MEDIA_DIR: z.string().default('../../.local/uploads'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.url().default('http://localhost:3000/api/v1/auth/google/callback'),
});
export const config = schema.parse(runtimeEnv);
if (config.NODE_ENV === 'production' && !config.WEB_ORIGIN.startsWith('https://'))
  throw new Error('Production requires HTTPS WEB_ORIGIN');
export const mediaDir = path.resolve(apiRoot, config.MEDIA_DIR);
