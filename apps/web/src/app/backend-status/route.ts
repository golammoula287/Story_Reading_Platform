import { apiOrigin } from '../../../api-origin.mjs';

export const dynamic = 'force-dynamic';
export async function GET() {
  let ready = false;
  try {
    const response = await fetch(`${apiOrigin()}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
      redirect: 'error',
    });
    ready = response.ok && (await response.json()).ready === true;
  } catch {
    /* A sleeping or unreachable API is not ready yet. */
  }
  return Response.json(
    { ready },
    {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
