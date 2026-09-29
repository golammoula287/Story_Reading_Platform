import { afterAll, beforeAll, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoRateLimitStore } from '../src/rate-limit-store.js';

beforeAll(async () => {
  // Deliberately local and separate from all application/other test databases.
  await mongoose.connect(
    'mongodb://127.0.0.1:27018/storyhaven_rate_limit_test?replicaSet=storyhaven',
    { serverSelectionTimeoutMS: 3000 },
  );
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});
afterAll(async () => {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
it('counts simultaneous requests across instances without lost increments', async () => {
  const first = new MongoRateLimitStore('auth');
  const second = new MongoRateLimitStore('auth');
  const results = await Promise.all(
    Array.from({ length: 25 }, (_, i) => (i % 2 ? first : second).increment('reader')),
  );
  expect(results.map((r) => r.totalHits).sort((a, b) => a - b)).toEqual(
    Array.from({ length: 25 }, (_, i) => i + 1),
  );
  expect((await new MongoRateLimitStore('auth').increment('reader')).totalHits).toBe(26);
  expect((await new MongoRateLimitStore('api').increment('reader')).totalHits).toBe(1);
});
it('resets expired counters before TTL cleanup and supports key reset', async () => {
  const store = new MongoRateLimitStore('expiry');
  await store.increment('reader');
  await mongoose.connection
    .collection('ratelimitcounters')
    .updateMany({ _id: { $regex: '^expiry:' } } as never, { $set: { resetTime: new Date(0) } });
  expect((await store.increment('reader')).totalHits).toBe(1);
  await store.decrement('reader');
  expect((await store.increment('reader')).totalHits).toBe(1);
  await store.resetKey('reader');
  expect((await store.increment('reader')).totalHits).toBe(1);
});
