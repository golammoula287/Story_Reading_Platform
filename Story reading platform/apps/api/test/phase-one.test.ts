import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connect } from '../src/db.js';
import {
  Bookmark,
  Chapter,
  ChapterContent,
  Library,
  Progress,
  ReadEvent,
  Session,
  Story,
  Taxonomy,
  User,
} from '../src/models.js';
import { hashPassword, previewText } from '../src/lib.js';
import { runPublishingJobs } from '../src/workers/jobs.js';
import { config } from '../src/config.js';
import sharp from 'sharp';
const app = createApp(),
  admin = request.agent(app),
  reader = request.agent(app),
  stranger = request.agent(app);
const uri =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27018/storyhaven_test?replicaSet=storyhaven';
const headers = { Origin: config.WEB_ORIGIN, 'X-Requested-With': 'Storyhaven' };
const password = 'a-test-password-only-742!';
const privateMarker = 'HIDDEN_CHAPTER_END_9c17';
const body = `One two three four five six seven eight nine ten.\n\nThis paragraph remains behind the gate. ${privateMarker}`;
let storyId: string, chapterId: string, premiumId: string, readerId: string, taxonomyId: string;
const storyInput = {
  title: 'Test River',
  slug: 'test-river',
  authorName: 'Test Author',
  prologue: 'A public introduction.',
  status: 'published',
  classification: 'clean',
  taxonomyIds: [] as string[],
};
const chapterInput = {
  title: 'First chapter',
  slug: 'first-chapter',
  status: 'published',
  publishAt: null,
  accessType: 'free',
  freeAt: null,
  body,
  preview: { mode: 'words', value: 4 },
};
beforeAll(async () => {
  if (!new URL(uri).pathname.endsWith('_test'))
    throw new Error('Tests may only reset a database whose name ends with _test.');
  await connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  await User.create({
    email: 'admin@example.test',
    name: 'Test Administrator',
    passwordHash: await hashPassword(password),
    role: 'admin',
  });
  expect(
    (
      await admin
        .post('/api/v1/auth/login')
        .set(headers)
        .send({ email: 'admin@example.test', password })
    ).status,
  ).toBe(200);
  const signup = await reader
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ name: 'Test Reader', email: 'reader@example.test', password });
  expect(signup.status).toBe(201);
  readerId = signup.body.id;
  await stranger
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ name: 'Other Reader', email: 'other@example.test', password });
}, 30000);
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
describe('Phase 1: real MongoDB integration', () => {
  it('requires a trusted origin, enforces roles, hashes passwords and hides credentials', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@example.test', password })
      ).status,
    ).toBe(403);
    expect((await reader.get('/api/v1/admin/stories')).status).toBe(403);
    expect((await request(app).get('/api/v1/admin/stories')).status).toBe(401);
    const me = await reader.get('/api/v1/auth/me');
    expect(me.body.email).toBe('reader@example.test');
    expect(me.text).not.toContain('passwordHash');
    const stored = await User.findById(readerId).select('+passwordHash');
    expect(stored!.passwordHash).not.toBe(password);
  });
  it('creates editable taxonomy and a published story', async () => {
    const term = await admin
      .post('/api/v1/admin/taxonomy')
      .set(headers)
      .send({ name: 'Fantasy', slug: 'fantasy', facet: 'genre', parentId: null });
    expect(term.status).toBe(201);
    taxonomyId = term.body.id;
    const res = await admin
      .post('/api/v1/admin/stories')
      .set(headers)
      .send({ ...storyInput, taxonomyIds: [taxonomyId] });
    expect(res.status).toBe(201);
    storyId = res.body.id;
    expect(
      (
        await request(app).get(
          `/api/v1/stories?q=River&author=Test%20Author&taxonomy=${taxonomyId}`,
        )
      ).body.total,
    ).toBe(1);
    expect((await request(app).get('/api/v1/stories?q=absent')).body.total).toBe(0);
    expect((await admin.delete(`/api/v1/admin/taxonomy/${taxonomyId}`).set(headers)).status).toBe(
      409,
    );
  });
  it('saves chapter bodies separately, exposes only bounded previews and denies anonymous full content', async () => {
    const res = await admin
      .post(`/api/v1/admin/stories/${storyId}/chapters`)
      .set(headers)
      .send(chapterInput);
    expect(res.status).toBe(201);
    chapterId = res.body.id;
    expect(res.text).not.toContain(privateMarker);
    expect((await Chapter.findById(chapterId))!.toObject()).not.toHaveProperty('body');
    expect((await ChapterContent.findOne({ chapterId }))!.body).toContain(privateMarker);
    const preview = await request(app).get(`/api/v1/chapters/${chapterId}/preview`);
    expect(preview.body.text).toBe('One two three four');
    expect(preview.text).not.toContain(privateMarker);
    const full = await request(app).get(`/api/v1/chapters/${chapterId}/content`);
    expect(full.status).toBe(401);
    expect(full.text).not.toContain(privateMarker);
    expect((await request(app).get('/api/v1/stories/test-river')).text).not.toContain(
      privateMarker,
    );
    const authorized = await reader.get(`/api/v1/chapters/${chapterId}/content`);
    expect(authorized.body.body).toContain(privateMarker);
    expect(authorized.headers['cache-control']).toBe('private, no-store');
  });
  it('keeps drafts and future schedules private and rejects premium access', async () => {
    const draft = await admin
      .post(`/api/v1/admin/stories/${storyId}/chapters`)
      .set(headers)
      .send({ ...chapterInput, title: 'Draft chapter', slug: 'draft', status: 'draft' });
    expect(draft.status).toBe(201);
    expect((await reader.get(`/api/v1/chapters/${draft.body.id}/content`)).status).toBe(404);
    const future = await admin
      .post(`/api/v1/admin/stories/${storyId}/chapters`)
      .set(headers)
      .send({
        ...chapterInput,
        slug: 'future',
        status: 'scheduled',
        publishAt: new Date(Date.now() + 3600000).toISOString(),
      });
    expect(future.status).toBe(201);
    expect((await request(app).get(`/api/v1/chapters/${future.body.id}/preview`)).status).toBe(404);
    const locked = await admin
      .post(`/api/v1/admin/stories/${storyId}/chapters`)
      .set(headers)
      .send({ ...chapterInput, slug: 'premium', accessType: 'premium' });
    premiumId = locked.body.id;
    expect((await reader.get(`/api/v1/chapters/${premiumId}/content`)).status).toBe(403);
    expect((await reader.post(`/api/v1/chapters/${premiumId}/read`).set(headers)).status).toBe(403);
  });
  it('reorders atomically and rejects duplicate or foreign chapter lists', async () => {
    const chapters = await Chapter.find({ storyId }).sort({ order: -1 });
    const ids = chapters.map((c) => c.id);
    expect(
      (
        await admin
          .put(`/api/v1/admin/stories/${storyId}/chapters/reorder`)
          .set(headers)
          .send({ ids })
      ).status,
    ).toBe(204);
    expect((await Chapter.find({ storyId }).sort({ order: 1 })).map((c) => c.id)).toEqual(ids);
    expect(
      (
        await admin
          .put(`/api/v1/admin/stories/${storyId}/chapters/reorder`)
          .set(headers)
          .send({ ids: [chapterId, chapterId] })
      ).status,
    ).toBe(400);
  });
  it('persists library/bookmarks/progress and isolates accounts', async () => {
    expect((await reader.put(`/api/v1/me/library/${storyId}`).set(headers)).status).toBe(204);
    await reader.put(`/api/v1/me/library/${storyId}`).set(headers);
    expect(await Library.countDocuments({ userId: readerId })).toBe(1);
    expect(
      (await reader.put(`/api/v1/me/bookmarks/${chapterId}`).set(headers).send({ blockAnchor: 1 }))
        .status,
    ).toBe(204);
    expect(
      (
        await reader
          .put(`/api/v1/me/progress/${storyId}`)
          .set(headers)
          .send({ chapterId, blockAnchor: 1 })
      ).status,
    ).toBe(204);
    expect((await stranger.get('/api/v1/me/library')).body.total).toBe(0);
    await reader.post('/api/v1/auth/logout').set(headers);
    expect((await reader.get('/api/v1/me/library')).status).toBe(401);
    await reader
      .post('/api/v1/auth/login')
      .set(headers)
      .send({ email: 'reader@example.test', password });
    expect((await reader.get('/api/v1/me/library')).body.items[0].progress.chapterId).toBe(
      chapterId,
    );
    expect((await reader.get('/api/v1/me/bookmarks')).body.total).toBe(1);
    expect((await reader.get(`/api/v1/me/progress/${storyId}`)).body.blockAnchor).toBe(1);
  });
  it('computes real rolling trending and deduplicates repeated reads', async () => {
    await reader.post(`/api/v1/chapters/${chapterId}/read`).set(headers);
    await reader.post(`/api/v1/chapters/${chapterId}/read`).set(headers);
    expect(await ReadEvent.countDocuments({ userId: readerId, chapterId })).toBe(1);
    expect((await request(app).get('/api/v1/trending')).body[0].score).toBe(4);
  });
  it('catches up overdue jobs, tolerates reruns, and automatically frees chapters', async () => {
    const old = new Date(Date.now() - 60000);
    await Chapter.updateOne(
      { _id: premiumId },
      { status: 'scheduled', publishAt: old, freeAt: old },
    );
    expect((await reader.get(`/api/v1/chapters/${premiumId}/content`)).status).toBe(200);
    const result = await runPublishingJobs();
    expect(result.published).toBe(1);
    expect(result.freed).toBe(1);
    expect(await runPublishingJobs()).toEqual({ published: 0, freed: 0 });
  });
  it('updates previews immediately and never returns an entire short chapter', async () => {
    expect(previewText('একটি ছোট গল্প এখানে শেষ', 'words', 1000)).not.toContain('শেষ');
    expect(previewText('single', 'words', 1000)).toBe('');
    expect(
      (
        await admin
          .put(`/api/v1/admin/chapters/${chapterId}`)
          .set(headers)
          .send({ ...chapterInput, preview: { mode: 'words', value: 1 } })
      ).status,
    ).toBe(204);
    expect((await request(app).get(`/api/v1/chapters/${chapterId}/preview`)).body.text).toBe('One');
    expect(
      (
        await admin
          .put(`/api/v1/admin/chapters/${chapterId}`)
          .set(headers)
          .send({ ...chapterInput, preview: { mode: 'percentage', value: 100 } })
      ).status,
    ).toBe(400);
  });
  it('gates mature text at the backend and revokes access when a story is unpublished', async () => {
    await admin
      .put(`/api/v1/admin/stories/${storyId}`)
      .set(headers)
      .send({ ...storyInput, classification: 'mature' });
    expect((await request(app).get(`/api/v1/chapters/${chapterId}/preview`)).body.text).toBe('');
    expect((await reader.get(`/api/v1/chapters/${chapterId}/content`)).status).toBe(403);
    await reader.post('/api/v1/me/content-confirmation').set(headers).send({ confirmed: true });
    expect((await reader.get(`/api/v1/chapters/${chapterId}/content`)).status).toBe(200);
    await admin
      .put(`/api/v1/admin/stories/${storyId}`)
      .set(headers)
      .send({ ...storyInput, status: 'draft' });
    expect((await reader.get(`/api/v1/chapters/${chapterId}/content`)).status).toBe(404);
    expect((await request(app).get('/api/v1/trending')).body).toHaveLength(0);
    await admin.put(`/api/v1/admin/stories/${storyId}`).set(headers).send(storyInput);
  });
  it('validates decoded image uploads and crops to 600 by 900', async () => {
    const image = await sharp({
      create: { width: 200, height: 200, channels: 3, background: '#abcdef' },
    })
      .png()
      .toBuffer();
    const uploaded = await admin
      .post('/api/v1/admin/media')
      .set(headers)
      .attach('cover', image, 'cover.png');
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toMatchObject({ width: 600, height: 900 });
    const delivered = await request(app).get(`/api/v1/media/${uploaded.body.key}`);
    expect(delivered.status).toBe(200);
    const meta = await sharp(delivered.body).metadata();
    expect(meta.width).toBe(600);
    expect(meta.height).toBe(900);
    expect(
      (
        await admin
          .post('/api/v1/admin/media')
          .set(headers)
          .attach('cover', Buffer.from('<script>alert(1)</script>'), 'fake.png')
      ).status,
    ).toBe(400);
  });
  it('rejects invalid OAuth state and handles absent Google credentials safely', async () => {
    expect(
      (await request(app).get('/api/v1/auth/google/callback?state=forged&code=fake')).headers
        .location,
    ).toBe('/sign-in?error=google');
    if (!config.GOOGLE_CLIENT_ID)
      expect((await request(app).get('/api/v1/auth/google')).status).toBe(503);
  });
  it('exposes bounded admin activity and revokes suspended sessions', async () => {
    const activity = await admin.get(`/api/v1/admin/users/${readerId}/activity`);
    expect(activity.status).toBe(200);
    expect(activity.body.bookmarks).toHaveLength(1);
    expect(activity.text).not.toContain(privateMarker);
    expect(
      (
        await admin
          .patch(`/api/v1/admin/users/${readerId}`)
          .set(headers)
          .send({ status: 'suspended' })
      ).status,
    ).toBe(204);
    expect((await reader.get(`/api/v1/chapters/${chapterId}/content`)).status).toBe(401);
    expect(await Session.countDocuments({ userId: readerId })).toBe(0);
    expect(
      (
        await reader
          .post('/api/v1/auth/login')
          .set(headers)
          .send({ email: 'reader@example.test', password })
      ).status,
    ).toBe(401);
  });
  it('anonymizes deleted reader accounts and removes personal reading records', async () => {
    expect((await admin.delete(`/api/v1/admin/users/${readerId}`).set(headers)).status).toBe(204);
    const user = await User.findById(readerId).select('+passwordHash');
    expect(user!.status).toBe('deleted');
    expect(user!.email).not.toBe('reader@example.test');
    expect(user!.passwordHash).toBeUndefined();
    const counts = await Promise.all([
      Library.countDocuments({ userId: readerId }),
      Bookmark.countDocuments({ userId: readerId }),
      Progress.countDocuments({ userId: readerId }),
      ReadEvent.countDocuments({ userId: readerId }),
    ]);
    expect(counts).toEqual([0, 0, 0, 0]);
  });
  it('deletes chapter bodies and cascades story deletion', async () => {
    expect((await admin.delete(`/api/v1/admin/chapters/${premiumId}`).set(headers)).status).toBe(
      204,
    );
    expect(await ChapterContent.exists({ chapterId: premiumId })).toBeNull();
    expect((await admin.delete(`/api/v1/admin/stories/${storyId}`).set(headers)).status).toBe(204);
    expect(await Chapter.countDocuments({ storyId })).toBe(0);
    expect(await ChapterContent.countDocuments()).toBe(0);
  });
});
