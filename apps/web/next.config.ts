import type { NextConfig } from 'next';
import path from 'node:path';
import { apiOrigin } from './api-origin.mjs';
import { fileURLToPath } from 'node:url';

// Next.js automatically loads apps/web/.env.local and the appropriate
// environment-specific file. Only NEXT_PUBLIC_ values may reach the browser.
const backendOrigin = apiOrigin();
const webRoot = path.dirname(fileURLToPath(import.meta.url));
const nextConfig: NextConfig = {
  transpilePackages: ['@storyhaven/contracts'],
  poweredByHeader: false,
  webpack(config) {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@': path.join(webRoot, 'src'),
        '@storyhaven/contracts': path.join(webRoot, '../../packages/contracts/src/index.ts'),
      },
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};
export default nextConfig;
