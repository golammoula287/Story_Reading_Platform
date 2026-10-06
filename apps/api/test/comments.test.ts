import { beforeAll, afterAll, expect, it } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connect } from '../src/db.js';
import { Comment, Chapter, Story, User, Unlock, Audit } from '../src/models.js';
import { config } from '../src/config.js';
import { hashPassword } from '../src/lib.js';
const app = createApp(),
  admin = request.agent(app);
const headers = { Origin: config.WEB_ORIGIN, 'X-Requested-With': 'Storyhaven' };
const password = 'comments-testing-password-183!';
let serial = 0;
beforeAll(async () => {
  await connect('mongodb://127.0.0.1:27018/storyhaven_comments_test?replicaSet=storyhaven');
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  await User.create({
    name: 'Admin',
    email: 'admin@comments.test',
    role: 'admin',
    passwordHash: await hashPassword(password),
  });
  expect(
    (
      await admin
        .post('/api/v1/auth/login')
        .set(headers)
        .send({ email: 'admin@comments.test', password })
    ).status,
  ).toBe(200);
}, 120000);
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}, 60000);
async function reader() {
  const agent = request.agent(app);
  const result = await agent
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ name: 'Comment Reader', email: `reader-${++serial}@comments.test`, password });
  expect(result.status).toBe(201);
  return { agent, id: result.body.id as string };
}
async function chapter(accessType = 'free', classification = 'clean', status = 'published') {
  const story = await Story.create({
    title: 'Discussion',
    slug: `discussion-${++serial}`,
    status: 'published',
    classification,
  });
  const row = await Chapter.create({
    storyId: story._id,
    title: 'Chapter',
    slug: 'chapter',
    order: 1,
    status,
    accessType,
  });
  return { row, story, url: `/api/v1/chapters/${row.id}/comments` };
}
it('uses full-chapter authorization for both reading and writing comments', async () => {
  const { agent, id } = await reader();
  const free = await chapter(),
    premium = await chapter('premium'),
    mature = await chapter('free', 'mature'),
    draft = await chapter('free', 'clean', 'draft');
  expect((await request(app).get(free.url)).status).toBe(401);
  expect((await request(app).post(free.url).set(headers).send({ body: 'Spoiler' })).status).toBe(
    401,
  );
  for (const [fixture, status] of [
    [premium, 403],
    [mature, 403],
    [draft, 404],
  ] as const) {
    expect((await agent.get(fixture.url)).status).toBe(status);
    expect((await agent.post(fixture.url).set(headers).send({ body: 'Spoiler' })).status).toBe(
      status,
    );
  }
  await Unlock.create({ userId: id, chapterId: premium.row._id, grantedAt: new Date() });
  expect((await agent.get(premium.url)).status).toBe(200);
  await Story.updateOne({ _id: premium.story._id }, { status: 'draft' });
  expect((await agent.get(premium.url)).status).toBe(404);
  await User.updateOne({ _id: id }, { status: 'suspended' });
  expect((await agent.get(free.url)).status).toBe(401);
});
it('stores bounded plain text, hides private account fields and enforces ownership and CSRF', async () => {
  const owner = await reader(),
    other = await reader(),
    fixture = await chapter();
  expect((await owner.agent.post(fixture.url).send({ body: 'Hello' })).status).toBe(403);
  for (const body of [
    { body: ' ' },
    { body: 'x'.repeat(2001) },
    { body: 'hello', userId: other.id },
  ])
    expect((await owner.agent.post(fixture.url).set(headers).send(body)).status).toBe(400);
  const result = await owner.agent
    .post(fixture.url)
    .set(headers)
    .send({ body: '<script>alert(1)</script> A plain-text comment' });
  expect(result.status).toBe(201);
  const list = await other.agent.get(fixture.url);
  expect(list.headers['cache-control']).toContain('private');
  expect(list.body.items[0].own).toBe(false);
  expect(list.text).not.toContain('@comments.test');
  expect(list.text).not.toContain('userId');
  expect((await other.agent.delete(`${fixture.url}/${result.body.id}`).set(headers)).status).toBe(
    404,
  );
  expect((await owner.agent.delete(`${fixture.url}/${result.body.id}`).set(headers)).status).toBe(
    204,
  );
  expect(await Comment.countDocuments({ _id: result.body.id })).toBe(0);
});
it('moderates immediately on subsequent reads, supports restoration and records an audit without comment text', async () => {
  const { agent } = await reader(),
    fixture = await chapter();
  const posted = await agent.post(fixture.url).set(headers).send({ body: 'Moderation marker' });
  const path = `/api/v1/admin/comments/${posted.body.id}`;
  expect((await agent.get('/api/v1/admin/comments')).status).toBe(403);
  expect((await agent.patch(path).set(headers).send({ status: 'hidden' })).status).toBe(403);
  expect((await admin.patch(path).send({ status: 'hidden' })).status).toBe(403);
  expect((await admin.patch(path).set(headers).send({ status: 'hidden' })).status).toBe(204);
  expect((await agent.get(fixture.url)).body.total).toBe(0);
  expect(
    (await admin.get('/api/v1/admin/comments?status=hidden')).body.items.some(
      (row: { id: string }) => row.id === posted.body.id,
    ),
  ).toBe(true);
  expect(await Audit.countDocuments({ action: 'comment.hidden', targetId: posted.body.id })).toBe(
    1,
  );
  expect((await admin.patch(path).set(headers).send({ status: 'visible' })).status).toBe(204);
  expect((await agent.get(fixture.url)).body.items[0].body).toBe('Moderation marker');
});
it('paginates and limits posting per account', async () => {
  const { agent, id } = await reader(),
    fixture = await chapter();
  await Comment.insertMany(
    Array.from({ length: 12 }, (_, i) => ({
      userId: id,
      chapterId: fixture.row._id,
      body: `Item ${i}`,
    })),
  );
  const first = await agent.get(`${fixture.url}?limit=5&page=1`),
    second = await agent.get(`${fixture.url}?limit=5&page=2`);
  expect(first.body.items).toHaveLength(5);
  expect(first.body.total).toBe(12);
  expect(
    first.body.items
      .map((row: { id: string }) => row.id)
      .some((id: string) => second.body.items.some((row: { id: string }) => row.id === id)),
  ).toBe(false);
  for (let i = 0; i < 5; i++)
    expect((await agent.post(fixture.url).set(headers).send({ body: 'A comment' })).status).toBe(
      201,
    );
  expect((await agent.post(fixture.url).set(headers).send({ body: 'One too many' })).status).toBe(
    429,
  );
});
it('includes comments in activity and cascades account, chapter and story deletion', async () => {
  const { id } = await reader();
  for (const target of ['chapter', 'story', 'user']) {
    const fixture = await chapter();
    const comment = await Comment.create({
      userId: id,
      chapterId: fixture.row._id,
      body: 'Cleanup marker',
    });
    const activity = await admin.get(`/api/v1/admin/users/${id}/activity`);
    expect(activity.body.commentsAvailable).toBe(true);
    expect(activity.body.comments.some((row: { _id: string }) => row._id === comment.id)).toBe(
      true,
    );
    const url =
      target === 'chapter'
        ? `/api/v1/admin/chapters/${fixture.row.id}`
        : target === 'story'
          ? `/api/v1/admin/stories/${fixture.story.id}`
          : `/api/v1/admin/users/${id}`;
    expect((await admin.delete(url).set(headers)).status).toBe(204);
    expect(await Comment.exists({ _id: comment._id })).toBeNull();
  }
});
