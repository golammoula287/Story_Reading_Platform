import mongoose from 'mongoose';
import { randomBytes, scryptSync } from 'node:crypto';
export default async function setup() {
  const uri =
    process.env.E2E_MONGODB_URI || 'mongodb://127.0.0.1:27018/storyhaven?replicaSet=storyhaven';
  if (!['localhost', '127.0.0.1'].includes(new URL(uri).hostname))
    throw new Error('Browser verification is restricted to a local development database.');
  const connection = await mongoose.createConnection(uri).asPromise();
  async function cleanStories() {
    const stories = await connection
      .collection('stories')
      .find({ authorName: 'Browser Author', slug: { $regex: '^browser-story-[0-9]+$' } })
      .toArray();
    const storyIds = stories.map((s) => s._id);
    const chapters = await connection
      .collection('chapters')
      .find({ storyId: { $in: storyIds } })
      .toArray();
    await connection
      .collection('chaptercontents')
      .deleteMany({ chapterId: { $in: chapters.map((c) => c._id) } });
    await connection.collection('chapters').deleteMany({ storyId: { $in: storyIds } });
    await connection.collection('stories').deleteMany({ _id: { $in: storyIds } });
  }
  await cleanStories();
  const password = randomBytes(24).toString('base64url'),
    salt = randomBytes(16).toString('hex');
  const email = `admin-${Date.now()}@browser.example.test`;
  const inserted = await connection
    .collection('users')
    .insertOne({
      email,
      name: 'Browser Administrator',
      passwordHash: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
      role: 'admin',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  process.env.E2E_ADMIN_EMAIL = email;
  process.env.E2E_ADMIN_PASSWORD = password;
  return async () => {
    await cleanStories();
    const users = await connection
      .collection('users')
      .find({ email: { $regex: '@browser\\.example\\.test$' } })
      .toArray();
    const ids = users.map((u) => u._id);
    for (const name of [
      'sessions',
      'libraries',
      'bookmarks',
      'progresses',
      'readevents',
      'unlocks',
    ])
      await connection.collection(name).deleteMany({ userId: { $in: ids } });
    await connection.collection('audits').deleteMany({ actorId: inserted.insertedId });
    await connection.collection('users').deleteMany({ _id: { $in: ids } });
    await connection.close();
  };
}
