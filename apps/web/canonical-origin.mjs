/** Keep browser sessions and OAuth on the same origin trusted by the API. */
export function canonicalRedirects(env = process.env) {
  if (env.VERCEL !== '1') return [];
  const value =
    env.CANONICAL_WEB_ORIGIN?.trim() ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  if (!value) return [];
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'CANONICAL_WEB_ORIGIN must be an HTTPS frontend origin without a path or credentials.',
    );
  const hostPattern = url.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: '.*\\.vercel\\.app' }],
      missing: [{ type: 'host', value: hostPattern }],
      destination: `${url.origin}/:path*`,
      permanent: false,
    },
  ];
}
