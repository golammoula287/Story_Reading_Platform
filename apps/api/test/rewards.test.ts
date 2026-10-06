import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createApp } from '../src/app.js';
import { connect } from '../src/db.js';
import {
  User,
  Story,
  Chapter,
  ChapterContent,
  RewardSession,
  RewardEvent,
  Unlock,
  UnlockToken,
} from '../src/models.js';
import { config } from '../src/config.js';
import type { RewardProvider, VerifiedReward } from '../src/modules/reward-provider.js';
const secret = randomBytes(32);
const headers = { Origin: config.WEB_ORIGIN, 'X-Requested-With': 'Storyhaven' };
const bindings = new Map<string, { nonce: string }>();
const provider: RewardProvider = {
  id: 'test-provider',
  async prepare(input) {
    bindings.set(input.sessionId, input);
    return { url: 'https://example.invalid/test-ad' };
  },
  async verify(raw, headers) {
    const expected = createHmac('sha256', secret).update(raw).digest();
    const signature = Buffer.from(String(headers['x-test-signature'] ?? ''), 'hex');
    if (signature.length !== expected.length || !timingSafeEqual(signature, expected))
      throw Error('Invalid signature');
    const result = JSON.parse(raw.toString());
    return { ...result, completedAt: new Date(result.completedAt) };
  },
};
const app = createApp({ rewardProvider: provider });
let serial = 0;
beforeAll(async () => {
  await connect('mongodb://127.0.0.1:27018/storyhaven_rewards_test?replicaSet=storyhaven');
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}, 120000);
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 60000);
async function fixture(application = app) {
  const reader = request.agent(application);
  const email = `rewards-${++serial}@example.test`,
    password = 'reward-tests-only-193!';
  const registered = await reader
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ name: 'Reward Reader', email, password });
  expect(registered.status).toBe(201);
  const story = await Story.create({
    title: 'Reward Story',
    slug: `reward-story-${serial}`,
    status: 'published',
    classification: 'clean',
  });
  const chapter = await Chapter.create({
    storyId: story._id,
    title: 'Premium chapter',
    slug: 'premium',
    order: 1,
    status: 'published',
    accessType: 'premium',
  });
  await ChapterContent.create({
    chapterId: chapter._id,
    body: 'PUBLIC OPENING.\n\nSECRET_REWARD_END',
  });
  const base = `/api/v1/chapters/${chapter.id}`;
  return { reader, userId: registered.body.id as string, story, chapter, base, email, password };
}
async function start(f: Awaited<ReturnType<typeof fixture>>) {
  const result = await f.reader.post(`${f.base}/reward-sessions`).set(headers).send({});
  expect(result.status).toBe(201);
  return {
    sessionId: result.body.id,
    nonce: bindings.get(result.body.id)!.nonce,
    transactionId: randomBytes(16).toString('hex'),
    completedAt: new Date(),
  };
}
function callback(proof: VerifiedReward, signed = true) {
  const body = JSON.stringify(proof);
  return request(app)
    .post('/api/v1/ads/test-provider/callback')
    .set('Content-Type', 'application/json')
    .set(
      'X-Test-Signature',
      signed ? createHmac('sha256', secret).update(body).digest('hex') : 'invalid',
    )
    .send(body);
}
it('defaults to disabled rewards and cannot unlock from browser completion or fabricated callbacks', async () => {
  const disabled = createApp();
  const f = await fixture(disabled);
  expect((await f.reader.get('/api/v1/rewards/availability')).body.available).toBe(false);
  expect((await f.reader.post(`${f.base}/reward-sessions`).set(headers).send({})).status).toBe(503);
  expect(
    (await f.reader.post(`${f.base}/reward-sessions`).set(headers).send({ completed: true }))
      .status,
  ).toBe(400);
  expect(
    (
      await f.reader
        .post('/api/v1/ads/test-provider/callback')
        .set(headers)
        .send({ completed: true })
    ).status,
  ).toBe(404);
  expect((await f.reader.get(`${f.base}/content`)).status).toBe(403);
  expect(await Unlock.countDocuments({ userId: f.userId })).toBe(0);
});
it('verifies signed callbacks, rejects tampering, deduplicates concurrent delivery and restores access after a fresh login', async () => {
  const f = await fixture(),
    proof = await start(f);
  expect((await callback(proof, false)).status).toBe(401);
  expect((await callback({ ...proof, nonce: 'x'.repeat(43) })).status).toBe(409);
  expect((await f.reader.get(`${f.base}/content`)).status).toBe(403);
  const duplicates = await Promise.all([callback(proof), callback(proof), callback(proof)]);
  expect(duplicates.map((result) => result.status)).toEqual([204, 204, 204]);
  expect(await Unlock.countDocuments({ userId: f.userId, chapterId: f.chapter._id })).toBe(1);
  expect(await RewardEvent.countDocuments({ sessionId: proof.sessionId })).toBe(1);
  expect((await callback({ ...proof, transactionId: 'different-transaction' })).status).toBe(409);
  const fresh = request.agent(app);
  expect(
    (
      await fresh
        .post('/api/v1/auth/login')
        .set(headers)
        .send({ email: f.email, password: f.password })
    ).status,
  ).toBe(200);
  const content = await fresh.get(`${f.base}/content`);
  expect(content.status).toBe(200);
  expect(content.text).toContain('SECRET_REWARD_END');
  expect(content.headers['cache-control']).toContain('private, no-store');
  expect((await request(app).get(`${f.base}/content`)).status).toBe(401);
});
it('rejects transaction reuse across sessions, and protects reward status and cancellation ownership', async () => {
  const f = await fixture(),
    other = await fixture(),
    proof = await start(f),
    second = await start(other);
  expect((await other.reader.get(`/api/v1/reward-sessions/${proof.sessionId}`)).status).toBe(404);
  expect(
    (await other.reader.delete(`/api/v1/reward-sessions/${proof.sessionId}`).set(headers)).status,
  ).toBe(404);
  expect((await callback(proof)).status).toBe(204);
  expect((await callback({ ...second, transactionId: proof.transactionId })).status).toBe(409);
  expect((await other.reader.get(`${other.base}/content`)).status).toBe(403);
});
it('rolls back the whole grant on storage failure and accepts a retry', async () => {
  const f = await fixture(),
    proof = await start(f);
  const failure = vi.spyOn(Unlock, 'updateOne').mockImplementationOnce(() => {
    throw Error('simulated storage failure');
  });
  expect((await callback(proof)).status).toBe(500);
  failure.mockRestore();
  expect(await RewardEvent.countDocuments({ sessionId: proof.sessionId })).toBe(0);
  expect((await RewardSession.findById(proof.sessionId))!.status).toBe('pending');
  expect((await callback(proof)).status).toBe(204);
});
it('handles cancellation, expired completion and bounded delayed callbacks without browser proof', async () => {
  const f = await fixture(),
    cancelled = await start(f);
  expect(
    (await f.reader.delete(`/api/v1/reward-sessions/${cancelled.sessionId}`).set(headers)).status,
  ).toBe(204);
  expect((await callback(cancelled)).status).toBe(409);
  const delayed = await start(f),
    now = Date.now();
  await RewardSession.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(delayed.sessionId) },
    { $set: { createdAt: new Date(now - 12 * 60000), expiresAt: new Date(now - 60000) } },
  );
  expect((await f.reader.get(`/api/v1/reward-sessions/${delayed.sessionId}`)).body.status).toBe(
    'expired',
  );
  expect((await callback(delayed)).status).toBe(409);
  expect((await callback({ ...delayed, completedAt: new Date(now - 2 * 60000) })).status).toBe(204);
  const other = await fixture(),
    stale = await start(other);
  await RewardSession.collection.updateOne(
    { _id: new mongoose.Types.ObjectId(stale.sessionId) },
    { $set: { createdAt: new Date(now - 20 * 60000), expiresAt: new Date(now - 6 * 60000) } },
  );
  expect((await callback({ ...stale, completedAt: new Date(now - 7 * 60000) })).status).toBe(409);
});
it('rechecks publication, age confirmation and suspended accounts at callback time', async () => {
  for (const change of ['unpublished', 'mature', 'suspended']) {
    const f = await fixture(),
      proof = await start(f);
    if (change === 'unpublished')
      await Chapter.updateOne({ _id: f.chapter._id }, { status: 'draft' });
    if (change === 'mature')
      await Story.updateOne({ _id: f.story._id }, { classification: 'mature' });
    if (change === 'suspended') await User.updateOne({ _id: f.userId }, { status: 'suspended' });
    expect((await callback(proof)).status).toBe(409);
    expect(await Unlock.countDocuments({ userId: f.userId })).toBe(0);
  }
});
it('binds short-lived tokens to accounts/chapters and still checks durable entitlement', async () => {
  const f = await fixture(),
    other = await fixture();
  expect((await f.reader.post(`${f.base}/unlock-token`).set(headers).send({})).status).toBe(403);
  await callback(await start(f));
  await Unlock.create({ userId: other.userId, chapterId: f.chapter._id, grantedAt: new Date() });
  const issued = await f.reader.post(`${f.base}/unlock-token`).set(headers).send({});
  expect(issued.status).toBe(200);
  expect(
    (await f.reader.get(`${f.base}/content`).set('X-Unlock-Token', issued.body.token)).status,
  ).toBe(200);
  expect(
    (await other.reader.get(`${f.base}/content`).set('X-Unlock-Token', issued.body.token)).status,
  ).toBe(403);
  await UnlockToken.updateMany({ userId: f.userId }, { expiresAt: new Date(0) });
  expect(
    (await f.reader.get(`${f.base}/content`).set('X-Unlock-Token', issued.body.token)).status,
  ).toBe(403);
  const fresh = await f.reader.post(`${f.base}/unlock-token`).set(headers).send({});
  await Unlock.deleteMany({ userId: f.userId });
  expect(
    (await f.reader.get(`${f.base}/content`).set('X-Unlock-Token', fresh.body.token)).status,
  ).toBe(403);
});
it('records provider no-fill as failed and grants nothing', async () => {
  const prepare = vi.spyOn(provider, 'prepare').mockRejectedValueOnce(Error('no inventory'));
  const f = await fixture();
  expect((await f.reader.post(`${f.base}/reward-sessions`).set(headers).send({})).status).toBe(503);
  prepare.mockRestore();
  expect((await RewardSession.findOne({ userId: f.userId }))!.status).toBe('failed');
  expect(await Unlock.countDocuments({ userId: f.userId })).toBe(0);
});
