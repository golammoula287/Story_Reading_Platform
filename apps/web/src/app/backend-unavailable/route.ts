export const dynamic = 'force-dynamic';

function unavailable() {
  return Response.json(
    {
      error: {
        code: 'BACKEND_UNAVAILABLE',
        message: 'The service is not available yet. Please try again later.',
      },
    },
    { status: 503, headers: { 'Cache-Control': 'private, no-store' } },
  );
}

export {
  unavailable as GET,
  unavailable as POST,
  unavailable as PUT,
  unavailable as PATCH,
  unavailable as DELETE,
  unavailable as OPTIONS,
  unavailable as HEAD,
};
