import { build } from 'esbuild';
import { createServer } from 'node:http';
import { once } from 'node:events';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChapterNarrative } from './apps/web/src/components/in-chapter-ads';
const query = new URLSearchParams(location.search), mode = query.get('mode');
window.mounts = 0; window.disposals = 0;
const provider = { requiresConsent: true, mount(element, id, report) {
  window.mounts++;
  if(mode === 'throw') throw Error('provider failed');
  if(mode !== 'timeout') { if(mode === 'filled') element.textContent = 'Fixture advertisement'; report(mode); }
  else setTimeout(() => report('filled'), 12000);
  return () => { window.disposals++; };
}};
const text = Array.from({length:13}, (_, i) => 'Readable paragraph ' + i).join('\\n\\n');
createRoot(document.getElementById('root')).render(<ChapterNarrative text={text} chapterId="test-chapter" authorized={query.get('authorized') !== 'false'} provider={mode === 'disabled' ? null : provider} />);
`,
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  alias: { '@': path.resolve('apps/web/src') },
  bundle: true,
  write: false,
  outdir: '.local/ad-test-build',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = bundle.outputFiles.find((file) => file.path.endsWith('.js')).contents;
const css = bundle.outputFiles.find((file) => file.path.endsWith('.css')).contents;
const server = createServer((req, res) => {
  if (req.url === '/app.js') {
    res.setHeader('Content-Type', 'text/javascript');
    return res.end(js);
  }
  if (req.url === '/app.css') {
    res.setHeader('Content-Type', 'text/css');
    return res.end(css);
  }
  res.setHeader('Content-Type', 'text/html');
  res.end(
    '<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>',
  );
});
let browser;
try {
  server.listen(3112, '127.0.0.1');
  await once(server, 'listening');
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  for (const mode of ['disabled', 'filled', 'no-fill', 'blocked', 'throw', 'timeout']) {
    await page.goto(`http://127.0.0.1:3112/?mode=${mode}`);
    await expect(page.locator('[data-paragraph]')).toHaveCount(13);
    if (mode === 'disabled') {
      await expect(page.locator('.in-chapter-ad')).toHaveCount(0);
      continue;
    }
    await expect(page.locator('.in-chapter-ad')).toHaveCount(2);
    assert.equal(await page.evaluate(() => window.mounts), 0, 'no provider request before consent');
    await page.getByRole('button', { name: 'Allow ads for this chapter' }).first().click();
    const state = ['throw', 'timeout'].includes(mode) ? 'error' : mode;
    await expect(page.locator('.in-chapter-ad').first()).toHaveAttribute('data-ad-state', state, {
      timeout: 15000,
    });
    await expect(page.locator('[data-paragraph]').last()).toHaveText('Readable paragraph 12');
    if (mode === 'timeout') {
      await page.waitForTimeout(4500);
      await expect(page.locator('.in-chapter-ad').first()).toHaveAttribute(
        'data-ad-state',
        'error',
      );
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const lastAd = await page.locator('.in-chapter-ad').last().boundingBox();
    const lastText = await page.locator('[data-paragraph]').last().boundingBox();
    assert.ok(lastText.y >= lastAd.y + lastAd.height, 'ad must not overlap narrative');
  }
  await page.goto('http://127.0.0.1:3112/?mode=filled');
  await page.getByRole('button', { name: 'Not now' }).first().click();
  assert.equal(await page.evaluate(() => window.mounts), 0);
  await page.goto('http://127.0.0.1:3112/?mode=filled&authorized=false');
  await expect(page.locator('[data-paragraph]')).toHaveCount(13);
  await expect(page.locator('.in-chapter-ad')).toHaveCount(0);
  console.log(
    'PASS: consent/decline, filled/no-fill/blocked/exception/timeout, late callback, mobile layout and preview exclusion. Test adapter only; no live ads.',
  );
} finally {
  await browser?.close();
  server.close();
}
