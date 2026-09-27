import { test, expect } from '@playwright/test';

test('frontend proxy preserves registration, session and login cookies', async ({
  page,
  request,
}) => {
  const email = `auth-${Date.now()}@browser.example.test`;
  const password = 'browser-auth-test-password-148!';
  const providers = await request.get('/api/v1/auth/providers');
  expect(providers.status()).toBe(200);
  const rejected = await request.post('/api/v1/auth/login', {
    headers: { Origin: 'https://untrusted.example', 'X-Requested-With': 'Storyhaven' },
    data: { email, password },
  });
  expect(rejected.status()).toBe(403);
  await page.goto('/sign-up');
  await page.getByLabel('Your name').fill('Auth Test Reader');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page).toHaveURL(/\/library$/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('/');
  expect((await page.request.get('/api/v1/auth/me')).status()).toBe(401);
  await page.goto('/sign-in');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/library$/);
  const me = await page.request.get('/api/v1/auth/me');
  expect(me.status()).toBe(200);
  expect((await me.json()).email).toBe(email);
});
