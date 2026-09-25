import { test, expect } from '@playwright/test';
test('desktop and mobile discovery render real catalogue without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'A little escape. An entire world.' }),
  ).toBeVisible();
  await expect(page.locator('.story-card')).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: 'docs/screenshots/home-mobile.png', fullPage: true });
  await page.goto('/discover');
  await page.getByRole('textbox', { name: 'Search title or author keywords' }).fill('Monsoon');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.locator('.story-card')).toHaveCount(1);
  await expect(page.locator('.story-card h3')).toContainText('Letters from the Monsoon');
});
test('reader registers, saves a story, reads, bookmarks and resumes after a new login', async ({
  page,
}) => {
  const email = `reader-${Date.now()}@browser.example.test`,
    password = 'browser-test-password-148!';
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Browser Reader');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.goto('/stories/the-art-of-almost');
  await page.getByRole('button', { name: 'Save to library' }).click();
  await expect(page.getByRole('button', { name: 'In your library' })).toBeVisible();
  await page.getByRole('link', { name: 'Start reading' }).click();
  await expect(page.locator('.narrative')).toContainText('Sample 1 ends here.');
  await page.getByRole('button', { name: 'Bookmark', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bookmarked', exact: true })).toBeVisible();
  await page.locator('.narrative p').last().scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.locator('.library-card')).toContainText('The Art of Almost');
  await expect(page.getByRole('link', { name: 'Continue reading' })).toBeVisible();
  await page.getByRole('button', { name: 'Bookmarks', exact: true }).click();
  await expect(page.locator('.chapter-list')).toContainText('An unexpected beginning');
});
test('admin publishes a story and chapter; anonymous HTML and API keep full text private', async ({
  page,
  request,
}) => {
  const suffix = Date.now(),
    slug = `browser-story-${suffix}`,
    title = `Browser story ${suffix}`;
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Hello, Browser.' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/admin-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'New story' }).click();
  await page.getByLabel('Story title').fill(title);
  await page.getByLabel('URL slug').fill(slug);
  await page.getByLabel('Author name').fill('Browser Author');
  await page
    .getByLabel('Prologue / About the story')
    .fill('An original browser test introduction.');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save story' }).click();
  await expect(page).toHaveURL(/\/admin\/stories\/[a-f\d]{24}$/);
  const storyUrl = page.url();
  await page.getByRole('link', { name: 'Add chapter' }).click();
  await page.getByLabel('Chapter title').fill('A test beginning');
  await page.getByLabel('URL slug').fill('a-test-beginning');
  await page
    .getByLabel('Chapter text', { exact: true })
    .fill(
      'One two three four five six seven eight nine ten.\n\nThis is the private ending BROWSER_PRIVATE_END_831.',
    );
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('published');
  await page.getByRole('button', { name: 'Save chapter' }).click();
  await expect(page).toHaveURL(/\/admin\/chapters\/[a-f\d]{24}$/);
  const chapterId = page.url().split('/').pop();
  const html = await request.get(`/stories/${slug}/chapters/a-test-beginning`);
  expect(html.status()).toBe(200);
  expect(await html.text()).toContain('One two');
  expect(await html.text()).not.toContain('BROWSER_PRIVATE_END_831');
  const api = await request.get(`/api/v1/chapters/${chapterId}/content`);
  expect(api.status()).toBe(401);
  expect(await api.text()).not.toContain('BROWSER_PRIVATE_END_831');
  await page.goto(storyUrl);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete story and chapters' }).click();
  await expect(page).toHaveURL(/\/admin\/stories$/);
});
