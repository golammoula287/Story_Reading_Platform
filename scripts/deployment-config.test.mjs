import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiOrigin } from '../apps/web/api-origin.mjs';
test('local API default remains available', () =>
  assert.equal(apiOrigin({}), 'http://127.0.0.1:4000'));
test('normalizes deployment URL whitespace and trailing slash', () =>
  assert.equal(
    apiOrigin({ RENDER: 'true', API_INTERNAL_URL: ' https://backend.example/ ' }),
    'https://backend.example',
  ));
test('hosted builds reject missing and loopback targets', () => {
  for (const value of ['', 'http://localhost:4000', 'http://127.0.0.1:4000', 'http://[::1]:4000'])
    assert.throws(() => apiOrigin({ RENDER: 'true', API_INTERNAL_URL: value }));
});
test('rejects self-proxy loops and malformed targets', () => {
  assert.throws(() =>
    apiOrigin({
      API_INTERNAL_URL: 'https://web.example/',
      RENDER_EXTERNAL_URL: 'https://web.example',
    }),
  );
  for (const value of [
    'bad-url',
    'ftp://backend.example',
    'https://user:secret@backend.example',
    'https://backend.example/api',
    'https://backend.example?x=1',
  ])
    assert.throws(() => apiOrigin({ API_INTERNAL_URL: value }));
});
