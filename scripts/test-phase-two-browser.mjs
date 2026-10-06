import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, scryptSync, createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { chromium, expect as baseExpect } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 30000 });
const origin = 'http://localhost:3102';
const uri = 'mongodb://127.0.0.1:27018/storyhaven_phase_two_browser_test?replicaSet=storyhaven';
const connection = await mongoose
  .createConnection(uri, { serverSelectionTimeoutMS: 5000 })
  .asPromise();
const password = randomBytes(18).toString('hex'),
  salt = randomBytes(16).toString('hex');
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const storyId = new mongoose.Types.ObjectId(),
  chapterId = new mongoose.Types.ObjectId();
const readerId = new mongoose.Types.ObjectId(),
  adminId = new mongoose.Types.ObjectId();
const rewardSecret = randomBytes(32).toString('hex');
const premiumId = new mongoose.Types.ObjectId();
const children = [];
let browser;
const runtimeErrors = [];
async function trackedContext(options) {
  const context = await browser.newContext(options);
  context.on('page', (page) => {
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (entry) => {
      if (/Hydration failed|same key/.test(entry.text())) runtimeErrors.push(entry.text());
    });
  });
  return context;
}
function launch(args, cwd, extra) {
  const child = spawn(process.execPath, args, {
    cwd,
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VERCEL: '',
      MONGODB_URI: uri,
      WEB_ORIGIN: origin,
      API_PORT: '4102',
      API_HOST: '127.0.0.1',
      MEDIA_STORAGE: 'local',
      TEST_REWARD_SECRET: rewardSecret,
      API_INTERNAL_URL: 'http://127.0.0.1:4102',
      CANONICAL_WEB_ORIGIN: '',
      ...extra,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  child.stdout.on('data', (data) => {
    if (process.env.VERBOSE) process.stdout.write(data);
  });
  child.stderr.on('data', (data) => process.stderr.write(data));
  return child;
}
async function wait(url) {
  for (let i = 0; i < 120; i++) {
    if (children.some((child) => child.exitCode !== null))
      throw Error('A local test server exited before it was ready.');
    try {
      if ((await fetch(url, { signal: AbortSignal.timeout(3000) })).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error(`Server did not start: ${url}`);
}
async function login(page, email) {
  await page.goto(`${origin}/sign-in`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/, { timeout: 90000 });
}
try {
  await connection.dropDatabase();
  await connection.collection('users').insertMany([
    {
      _id: readerId,
      name: 'Browser Reader',
      email: 'reader@phase-two.test',
      passwordHash,
      status: 'active',
      role: 'reader',
    },
    {
      _id: adminId,
      name: 'Browser Admin',
      email: 'admin@phase-two.test',
      passwordHash,
      status: 'active',
      role: 'admin',
    },
  ]);
  await connection.collection('stories').insertOne({
    _id: storyId,
    title: 'A Long Reading Test',
    slug: 'phase-two-reading',
    authorName: 'Browser Author',
    prologue: 'A public introduction.',
    classification: 'clean',
    status: 'published',
    taxonomyIds: [],
    createdAt: new Date(),
  });
  await connection.collection('chapters').insertOne({
    _id: chapterId,
    storyId,
    title: 'The Long Chapter',
    slug: 'long-chapter',
    order: 1,
    status: 'published',
    accessType: 'free',
    preview: { mode: 'words', value: 5 },
  });
  await connection.collection('chaptercontents').insertOne({
    chapterId,
    body:
      Array.from(
        { length: 50 },
        (_, i) =>
          `Paragraph ${i}. ${'An original passage for checking reading settings and saved position. '.repeat(8)}`,
      ).join('\n\n') + '\n\nPRIVATE_PHASE_TWO_END',
  });
  launch(['--import', 'tsx', 'tests/fixtures/reward-api.mts'], '.');
  await wait('http://127.0.0.1:4102/health');
  await connection.collection('chapters').insertOne({
    _id: premiumId,
    storyId,
    title: 'Premium continuation',
    slug: 'premium',
    order: 2,
    status: 'published',
    accessType: 'premium',
    preview: { mode: 'words', value: 3 },
  });
  await connection
    .collection('chaptercontents')
    .insertOne({ chapterId: premiumId, body: 'A public opening.\n\nPRIVATE_PREMIUM_BROWSER_END' });
  launch(['../../node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', '3102'], 'apps/web');
  await wait(`${origin}/sign-in`);
  await wait(`${origin}/library`);
  await wait(`${origin}/admin/comments`);
  browser = await chromium.launch();
  const first = await trackedContext({ viewport: { width: 1440, height: 1000 } });
  const page = await first.newPage();
  const url = `${origin}/stories/phase-two-reading/chapters/long-chapter`;
  const html = await (await fetch(url)).text();
  assert.ok(!html.includes('PRIVATE_PHASE_TWO_END'));
  await login(page, 'reader@phase-two.test');
  await page.goto(url);
  await expect(page.locator('.reader-page:visible .narrative')).toContainText(
    'PRIVATE_PHASE_TWO_END',
    {
      timeout: 30000,
    },
  );
  await page.getByText('Reading settings', { exact: true }).click();
  const colors = {
    day: 'rgb(255, 255, 255)',
    night: 'rgb(25, 28, 36)',
    grey: 'rgb(225, 227, 230)',
    'off-white': 'rgb(255, 250, 240)',
  };
  for (const [theme, color] of Object.entries(colors)) {
    await page.getByRole('combobox', { name: /^Theme/ }).selectOption(theme);
    await expect(page.locator('.reading-surface:visible')).toHaveCSS('background-color', color);
  }
  await page.getByRole('combobox', { name: /^Theme/ }).selectOption('night');
  await page.getByRole('combobox', { name: /^Font/ }).selectOption('sans-serif');
  await page.getByRole('slider').fill('32');
  await expect(page.locator('.reader-page:visible .narrative')).toHaveCSS('font-size', '32px');
  await page.getByRole('button', { name: 'Save reading settings' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Reading settings saved' }),
  ).toBeVisible();
  await page.locator('.reader-page:visible #paragraph-20').scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () =>
        (await connection.collection('progresses').findOne({ userId: readerId }))?.blockAnchor,
      { timeout: 15000 },
    )
    .toBeGreaterThan(10);
  const saved = (await connection.collection('progresses').findOne({ userId: readerId }))
    .blockAnchor;
  await first.close();
  const second = await trackedContext({ viewport: { width: 390, height: 844 } });
  const mobile = await second.newPage();
  await login(mobile, 'reader@phase-two.test');
  await mobile.goto(url);
  await expect(mobile.locator('.reader-page:visible .narrative')).toContainText(
    'PRIVATE_PHASE_TWO_END',
  );
  await expect(mobile.locator('.reading-surface:visible')).toHaveAttribute('data-theme', 'night');
  await expect(mobile.locator('.reader-page:visible .narrative')).toHaveCSS('font-size', '32px');
  await expect(mobile.getByRole('button', { name: 'Resume position' })).toBeVisible();
  await mobile.getByRole('button', { name: 'Resume position' }).click();
  await expect
    .poll(
      () =>
        mobile
          .locator(`.reader-page:visible #paragraph-${saved}`)
          .evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
      { timeout: 5000 },
    )
    .toBeLessThan(100);
  assert.ok(
    await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'mobile reader must not overflow',
  );
  await mobile.screenshot({ path: 'docs/screenshots/phase-two-reader-mobile.png' });
  console.log(
    'PASS: four themes, fonts, long mobile chapter, fresh-browser account preferences/resume and anonymous HTML privacy.',
  );

  const commentText = '<img src=x onerror="window.commentExecuted=true"> A memorable chapter.';
  await mobile.getByLabel('Your comment', { exact: true }).fill(commentText);
  await mobile.getByRole('button', { name: 'Post comment', exact: true }).click();
  await expect(mobile.locator('.comment-body')).toHaveText(commentText);
  assert.equal(await mobile.locator('.chapter-comments img').count(), 0);
  assert.equal(await mobile.evaluate(() => window.commentExecuted), undefined);
  const studio = await trackedContext();
  const moderator = await studio.newPage();
  await login(moderator, 'admin@phase-two.test');
  await moderator.goto(origin + '/admin/comments');
  await expect(moderator.locator('.comment-body')).toHaveText(commentText);
  await moderator.getByRole('button', { name: 'Hide comment', exact: true }).click();
  await expect(moderator.getByText('No matching comments.')).toBeVisible();
  await mobile.getByRole('button', { name: 'Refresh comments' }).click();
  await expect(mobile.getByText('No comments yet. Start the discussion.')).toBeVisible();
  await moderator.getByRole('combobox', { name: /^Comment status/ }).selectOption('hidden');
  await moderator.getByRole('button', { name: 'Restore comment' }).click();
  await expect(moderator.getByText('No matching comments.')).toBeVisible();
  await mobile.getByRole('button', { name: 'Refresh comments' }).click();
  await expect(mobile.locator('.comment-body')).toHaveText(commentText);
  await mobile.getByRole('button', { name: 'Delete my comment' }).click();
  await expect(mobile.getByText('No comments yet. Start the discussion.')).toBeVisible();
  assert.equal(
    (await fetch('http://127.0.0.1:4102/api/v1/chapters/' + chapterId + '/comments')).status,
    401,
  );
  console.log(
    'PASS: escaped comments, administrator hide/restore, reader refresh/delete and anonymous denial.',
  );

  const premiumUrl = origin + '/stories/phase-two-reading/chapters/premium';
  await mobile.goto(premiumUrl);
  await expect(mobile.getByRole('button', { name: 'Unlock with a rewarded ad' })).toBeVisible();
  await expect(mobile.locator('.reader-page:visible .narrative')).not.toContainText(
    'PRIVATE_PREMIUM_BROWSER_END',
  );
  await mobile.getByRole('button', { name: 'Unlock with a rewarded ad' }).click();
  const launchLink = mobile.getByRole('link', { name: 'Open rewarded ad' });
  await expect(launchLink).toBeVisible();
  const rewardLaunch = new URL(await launchLink.getAttribute('href'));
  const callbackBody = JSON.stringify({
    sessionId: rewardLaunch.searchParams.get('sessionId'),
    nonce: rewardLaunch.searchParams.get('nonce'),
    transactionId: randomBytes(16).toString('hex'),
    completedAt: new Date().toISOString(),
  });
  const callbackUrl = 'http://127.0.0.1:4102/api/v1/ads/browser-fixture/callback';
  assert.equal(
    (
      await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: callbackBody,
      })
    ).status,
    401,
  );
  await expect(mobile.locator('.reader-page:visible .narrative')).not.toContainText(
    'PRIVATE_PREMIUM_BROWSER_END',
  );
  assert.equal(
    (
      await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fixture-Signature': createHmac('sha256', rewardSecret)
            .update(callbackBody)
            .digest('hex'),
        },
        body: callbackBody,
      })
    ).status,
    204,
  );
  await expect(mobile.locator('.reader-page:visible .narrative')).toContainText(
    'PRIVATE_PREMIUM_BROWSER_END',
    {
      timeout: 20000,
    },
  );
  const returning = await trackedContext();
  const returningPage = await returning.newPage();
  await login(returningPage, 'reader@phase-two.test');
  await returningPage.goto(premiumUrl);
  await expect(returningPage.locator('.reader-page:visible .narrative')).toContainText(
    'PRIVATE_PREMIUM_BROWSER_END',
  );
  assert.ok(!(await (await fetch(premiumUrl)).text()).includes('PRIVATE_PREMIUM_BROWSER_END'));
  assert.deepEqual(runtimeErrors, [], 'No hydration or browser runtime errors');
  console.log(
    'PASS: browser reward polling, unsigned callback rejection, signed fixture unlock, fresh-browser durable access and anonymous premium HTML privacy.',
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  for (const child of children.reverse()) child.kill();
  await connection.dropDatabase();
  await connection.close();
}
