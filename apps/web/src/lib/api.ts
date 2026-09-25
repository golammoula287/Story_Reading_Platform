export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const multipart = options.body instanceof FormData;
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
      'X-Requested-With': 'Storyhaven',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new HttpError(
      res.status,
      data.error?.code || 'REQUEST_FAILED',
      data.error?.message || 'Something went wrong. Please try again.',
    );
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export const json = (data: unknown) => JSON.stringify(data);
export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
export async function publicApi<T>(path: string): Promise<T> {
  const res = await fetch(
    `${process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000'}/api/v1${path}`,
    { cache: 'no-store', signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok)
    throw new HttpError(res.status, 'REQUEST_FAILED', 'The catalogue is temporarily unavailable.');
  return res.json();
}
