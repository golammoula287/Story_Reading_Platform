/** Resolve the server-only API target for both rewrites and server rendering. */
export function apiOrigin(env = process.env) {
  const hosted = env.RENDER === 'true' || env.VERCEL === '1' || Boolean(env.RAILWAY_ENVIRONMENT);
  const value = env.API_INTERNAL_URL?.trim();
  if (!value && hosted)
    throw new Error('Set API_INTERNAL_URL on the frontend service before building.');
  let url;
  try {
    url = new URL(value || 'http://127.0.0.1:4000');
  } catch {
    throw new Error('API_INTERNAL_URL must be an absolute HTTP(S) backend origin.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'API_INTERNAL_URL must contain only the backend origin, without credentials or /api paths.',
    );
  if (hosted && ['localhost', '127.0.0.1', '[::1]', '0.0.0.0'].includes(url.hostname))
    throw new Error('API_INTERNAL_URL must point to the separate backend service, not localhost.');
  if (env.RENDER_EXTERNAL_URL && url.origin === new URL(env.RENDER_EXTERNAL_URL).origin)
    throw new Error('API_INTERNAL_URL points to the frontend itself; use the backend service URL.');
  return url.origin;
}
