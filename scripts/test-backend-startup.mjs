import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
let health = 0,
  catalogueAfterReady = 0,
  posts = 0;
let ready = false;
const api = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health') {
    ready = ++health >= 3;
    res.statusCode = ready ? 200 : 503;
    return res.end(JSON.stringify({ ready }));
  }
  if (!ready) {
    res.statusCode = 503;
    return res.end('{}');
  }
  if (req.method === 'POST') {
    posts++;
    res.statusCode = 503;
    return res.end('{}');
  }
  if (req.url.startsWith('/api/v1/stories')) {
    catalogueAfterReady++;
    return res.end(JSON.stringify({ items: [], total: 0, pages: 0, page: 1 }));
  }
  if (req.url === '/api/v1/trending' || req.url === '/api/v1/taxonomy') return res.end('[]');
  if (req.url === '/api/v1/auth/providers') return res.end('{"google":false}');
  res.statusCode = 401;
  res.end('{"error":{"code":"AUTH_REQUIRED"}}');
});
api.listen(4000, '127.0.0.1');
await once(api, 'listening');
const web = spawn(
  process.execPath,
  ['../../node_modules/next/dist/bin/next', 'start', '-p', '3100'],
  { cwd: 'apps/web', windowsHide: true, stdio: 'inherit' },
);
let browser;
try {
  let online = false;
  for (let i = 0; i < 30; i++) {
    try {
      online = (await fetch('http://localhost:3100/sign-in')).ok;
    } catch {}
    if (online) break;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(online, 'test frontend started');
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3100/');
  await expect(page.getByRole('link', { name: 'Find your next read' })).toBeVisible();
  assert.equal(await page.locator('.backend-startup').count(), 0, 'no blocking startup overlay');
  await expect.poll(() => catalogueAfterReady, { timeout: 20000 }).toBeGreaterThan(0);
  assert.ok(health >= 3, 'frontend itself woke the backend');
  assert.ok(catalogueAfterReady > 0, 'server catalogue refreshed after readiness');
  await page.goto('http://localhost:3100/sign-in');
  await page.locator('.backend-startup').waitFor({ state: 'detached', timeout: 10000 });
  await page.getByLabel('Email address').fill('startup-test@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('invalid-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'temporarily unavailable' }).waitFor();
  await page.waitForTimeout(2500);
  assert.equal(posts, 1, 'a failed form submission must not be replayed');
  console.log('PASS: visible homepage without overlay, backend wake-up, catalogue recovery, and no repeated POST.');
} finally {
  await browser?.close();
  web.kill();
  api.closeAllConnections();
  await new Promise((resolve) => api.close(resolve));
}
