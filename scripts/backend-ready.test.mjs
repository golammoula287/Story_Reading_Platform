import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBackendReadiness } from '../apps/web/src/lib/backend-ready.mjs';
const ready = () => Response.json({ ready: true });
test('wakes a sleeping backend and shares concurrent probes', async () => {
  let calls = 0;
  const check = createBackendReadiness({
    delayMs: 0,
    fetcher: async () => (++calls < 3 ? new Response('Starting', { status: 502 }) : ready()),
  });
  await Promise.all([check(), check(), check()]);
  assert.equal(calls, 3);
  await check();
  assert.equal(calls, 3);
});
test('rejects HTML loading pages and false readiness before accepting JSON', async () => {
  const responses = [
    new Response('<html>Loading</html>'),
    Response.json({ ready: false }),
    ready(),
  ];
  const check = createBackendReadiness({ delayMs: 0, fetcher: async () => responses.shift() });
  await check();
  assert.equal(responses.length, 0);
});
test('stops after bounded retries and allows a later user retry', async () => {
  let calls = 0;
  let available = false;
  const check = createBackendReadiness({
    attempts: 2,
    delayMs: 0,
    fetcher: async () => {
      calls++;
      if (!available) throw new Error('offline');
      return ready();
    },
  });
  await assert.rejects(check(), /temporarily unavailable/);
  assert.equal(calls, 2);
  available = true;
  await check();
  assert.equal(calls, 3);
});
test('checks again after freshness expires and sends only a readiness GET', async () => {
  let calls = 0;
  const check = createBackendReadiness({
    freshnessMs: 0,
    fetcher: async (url, options) => {
      assert.equal(url, '/backend-status');
      assert.equal(options.method, undefined);
      assert.equal(options.cache, 'no-store');
      calls++;
      return ready();
    },
  });
  await check();
  await check();
  assert.equal(calls, 2);
});

test('does not probe after the total startup deadline', async () => {
  const check = createBackendReadiness({
    maxWaitMs: 0,
    fetcher: async () => {
      assert.fail('deadline exceeded');
    },
  });
  await assert.rejects(check(), /temporarily unavailable/);
});
