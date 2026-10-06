import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connect } from '../src/db.js';
import { User } from '../src/models.js';
import { config } from '../src/config.js';
const app = createApp();
const uri = 'mongodb://127.0.0.1:27018/storyhaven_preferences_test?replicaSet=storyhaven';
const headers = { Origin: config.WEB_ORIGIN, 'X-Requested-With': 'Storyhaven' };
const credentials = { email: 'preferences@example.test', password: 'preferences-test-763!' };
beforeAll(async () => {
  await connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}, 120000);
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 60000);
it('persists preferences across login, isolates accounts and rejects unauthorized or invalid writes', async () => {
  const reader = request.agent(app),
    other = request.agent(app),
    fresh = request.agent(app);
  expect(
    (
      await reader
        .post('/api/v1/auth/register')
        .set(headers)
        .send({ ...credentials, name: 'Preference Reader' })
    ).status,
  ).toBe(201);
  expect(
    (
      await other
        .post('/api/v1/auth/register')
        .set(headers)
        .send({ ...credentials, email: 'other-preferences@example.test', name: 'Other Reader' })
    ).status,
  ).toBe(201);
  const defaults = { theme: 'off-white', fontFamily: 'serif', fontSize: 20 };
  expect((await reader.get('/api/v1/me/preferences')).body).toEqual(defaults);
  const preferences = { theme: 'night', fontFamily: 'sans-serif', fontSize: 26 };
  expect((await reader.put('/api/v1/me/preferences').set(headers).send(preferences)).status).toBe(
    200,
  );
  expect((await fresh.post('/api/v1/auth/login').set(headers).send(credentials)).status).toBe(200);
  const restored = await fresh.get('/api/v1/me/preferences');
  expect(restored.body).toEqual(preferences);
  expect(restored.headers['cache-control']).toContain('no-store');
  expect((await other.get('/api/v1/me/preferences')).body).toEqual(defaults);
  expect((await request(app).get('/api/v1/me/preferences')).status).toBe(401);
  expect(
    (await request(app).put('/api/v1/me/preferences').set(headers).send(preferences)).status,
  ).toBe(401);
  expect((await reader.put('/api/v1/me/preferences').send(preferences)).status).toBe(403);
  for (const invalid of [
    { ...preferences, fontSize: 100 },
    { ...preferences, theme: 'unknown' },
    { ...preferences, userId: 'another-account' },
  ]) {
    expect((await reader.put('/api/v1/me/preferences').set(headers).send(invalid)).status).toBe(
      400,
    );
  }
  expect((await fresh.get('/api/v1/me/preferences')).body).toEqual(preferences);
  await User.updateOne({ email: credentials.email }, { status: 'suspended' });
  expect((await fresh.put('/api/v1/me/preferences').set(headers).send(defaults)).status).toBe(401);
});
