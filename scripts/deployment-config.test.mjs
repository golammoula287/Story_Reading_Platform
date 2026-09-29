import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apiOrigin } from '../apps/web/api-origin.mjs';
import { canonicalRedirects } from '../apps/web/canonical-origin.mjs';

test('deployment aliases redirect to the production frontend without a canonical loop', () => {
  const [rule] = canonicalRedirects({
    VERCEL: '1',
    VERCEL_PROJECT_PRODUCTION_URL: 'web.vercel.app',
  });
  assert.equal(rule.destination, 'https://web.vercel.app/:path*');
  const redirects = (host) =>
    new RegExp(`^${rule.has[0].value}$`).test(host) &&
    !new RegExp(`^${rule.missing[0].value}$`).test(host);
  assert.equal(redirects('web-git-main-team.vercel.app'), true);
  assert.equal(redirects('web-hash-team.vercel.app'), true);
  assert.equal(redirects('web.vercel.app'), false);
  assert.equal(redirects('localhost'), false);
  assert.deepEqual(canonicalRedirects({}), []);
});

test('explicit staging origin overrides production and invalid origins are rejected', () => {
  assert.equal(
    canonicalRedirects({
      VERCEL: '1',
      VERCEL_PROJECT_PRODUCTION_URL: 'web.vercel.app',
      CANONICAL_WEB_ORIGIN: 'https://staging.example/',
    })[0].destination,
    'https://staging.example/:path*',
  );
  for (const value of [
    'http://web.example',
    'https://web.example/path',
    'https://user:secret@web.example',
  ])
    assert.throws(() => canonicalRedirects({ VERCEL: '1', CANONICAL_WEB_ORIGIN: value }));
});
test('local API default remains available', () =>
  assert.equal(apiOrigin({}), 'http://127.0.0.1:4000'));

test('Vercel frontend-first build permits absent or loopback targets but runtime stays strict', () => {
  for (const value of [
    '',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    'http://[::1]:4000',
    'http://0.0.0.0:4000',
  ]) {
    const env = { VERCEL: '1', API_INTERNAL_URL: value };
    assert.equal(apiOrigin(env, { allowUnconfigured: true }), null);
    assert.throws(() => apiOrigin(env));
  }
  assert.equal(
    apiOrigin(
      { VERCEL: '1', API_INTERNAL_URL: 'https://backend.example/' },
      { allowUnconfigured: true },
    ),
    'https://backend.example',
  );
  assert.throws(() =>
    apiOrigin(
      { VERCEL: '1', API_INTERNAL_URL: 'https://backend.example/api' },
      { allowUnconfigured: true },
    ),
  );
});
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
