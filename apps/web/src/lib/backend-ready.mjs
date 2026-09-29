// Share one bounded readiness check across concurrent browser requests.
export function createBackendReadiness({
  fetcher = globalThis.fetch,
  attempts = 60,
  maxWaitMs = 120000,
  delayMs = 2000,
  timeoutMs = 9000,
  freshnessMs = 15000,
} = {}) {
  let pending;
  let readyUntil = 0;
  return function ensureReady() {
    if (Date.now() < readyUntil) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const deadline = Date.now() + maxWaitMs;
      for (let attempt = 0; attempt < attempts && Date.now() < deadline; attempt++) {
        try {
          const response = await fetcher('/backend-status', {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: AbortSignal.timeout(Math.max(1, Math.min(timeoutMs, deadline - Date.now()))),
          });
          if (response.ok && (await response.json()).ready === true) {
            readyUntil = Date.now() + freshnessMs;
            return;
          }
        } catch {
          /* Retry only the safe readiness probe, never a form submission. */
        }
        if (attempt + 1 < attempts)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, Math.min(delayMs, deadline - Date.now()))),
          );
      }
      throw new Error('The service is temporarily unavailable. Please try again shortly.');
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
export const ensureBackendReady = createBackendReadiness();
