import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolve from this module so API scripts work whether they are launched from
// the monorepo root, the API directory, or the production dist directory.
const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(apiRoot, '.env'), quiet: true });
// Railway assigns the externally routed port through PORT. Local development
// continues to use API_PORT so the two environments remain explicit.
const runtimeEnv: NodeJS.ProcessEnv = {
  ...process.env,
  API_PORT: process.env.API_PORT ?? process.env.PORT,
};
const defaultApiHost = runtimeEnv.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
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
