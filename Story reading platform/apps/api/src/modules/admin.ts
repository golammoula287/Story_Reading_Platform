import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { storySchema, chapterSchema, taxonomySchema, objectId } from '@storyhaven/contracts';
import {
  Audit,
  Bookmark,
  Chapter,
  ChapterContent,
  Library,
  Progress,
  ReadEvent,
  Session,
  Story,
  Taxonomy,
  Unlock,
  User,
} from '../models.js';
import { requireAdmin } from './auth.js';
import { chapterDto, storyDto } from './content.js';
import { ApiError, pagination, pageResult, tokens } from '../lib.js';
import { mediaDir } from '../config.js';
export const adminRouter = Router();
adminRouter.use(requireAdmin);
const audit = (actorId: string, action: string, targetId: string) =>
  Audit.create({ actorId, action, targetId });
async function existingStory(id: unknown) {
  const story = await Story.findById(objectId.parse(id));
  if (!story) throw new ApiError(404, 'NOT_FOUND', 'Story not found.');
  return story;
}
async function validateStory(data: z.infer<typeof storySchema>) {
  if (
    new Set(data.taxonomyIds).size !== data.taxonomyIds.length ||
    (await Taxonomy.countDocuments({ _id: { $in: data.taxonomyIds } })) !== data.taxonomyIds.length
  )
    throw new ApiError(400, 'TAXONOMY', 'Choose existing, distinct taxonomy values.');
  if (data.coverKey) {
    try {
      await access(path.join(mediaDir, data.coverKey));
    } catch {
      throw new ApiError(400, 'COVER', 'Please upload the cover first.');
    }
  }
  return { ...data, searchTokens: tokens(`${data.title} ${data.authorName}`) };
}
adminRouter.get('/overview', async (_req, res) => {
  const [stories, chapters, readers, drafts] = await Promise.all([
    Story.countDocuments(),
    Chapter.countDocuments(),
    User.countDocuments({ role: 'reader', status: { $ne: 'deleted' } }),
    Chapter.countDocuments({ status: 'draft' }),
  ]);
  res.json({ stories, chapters, readers, drafts });
});
adminRouter.get('/stories', async (req, res) => {
  const { page, limit, skip } = pagination(req);
  const [items, total] = await Promise.all([
    Story.find().sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Story.countDocuments(),
  ]);
  res.json(pageResult(items.map(storyDto), total, page, limit));
});
adminRouter.post('/stories', async (req, res) => {
  const data = await validateStory(storySchema.parse(req.body));
  const story = await Story.create(data);
  await audit(req.user!.id, 'story.create', story.id);
  res.status(201).json(storyDto(story));
});
adminRouter.get('/stories/:id', async (req, res) => {
  const story = await existingStory(req.params.id);
  const chapters = await Chapter.find({ storyId: story._id }).sort({ order: 1 });
  res.json({ story: storyDto(story), chapters: chapters.map(chapterDto) });
});
adminRouter.put('/stories/:id', async (req, res) => {
  const story = await existingStory(req.params.id);
  const data = await validateStory(storySchema.parse(req.body));
  story.set(data);
  await story.save();
  await audit(req.user!.id, 'story.update', story.id);
  res.json(storyDto(story));
});
adminRouter.delete('/stories/:id', async (req, res) => {
  const story = await existingStory(req.params.id);
  await mongoose.connection.transaction(async (session) => {
    await Story.deleteOne({ _id: story._id }).session(session);
    const chapters = await Chapter.find({ storyId: story._id }).session(session);
    const ids = chapters.map((c) => c._id);
    await ChapterContent.deleteMany({ chapterId: { $in: ids } }).session(session);
    await Chapter.deleteMany({ storyId: story._id }).session(session);
    await Bookmark.deleteMany({ chapterId: { $in: ids } }).session(session);
    await Unlock.deleteMany({ chapterId: { $in: ids } }).session(session);
    await Library.deleteMany({ storyId: story._id }).session(session);
    await Progress.deleteMany({ storyId: story._id }).session(session);
    await ReadEvent.deleteMany({ storyId: story._id }).session(session);
  });
  await audit(req.user!.id, 'story.delete', story.id);
  res.status(204).end();
});
adminRouter.post('/stories/:id/chapters', async (req, res) => {
  const story = await existingStory(req.params.id);
  const data = chapterSchema.parse(req.body);
  const { body, ...metadata } = data;
  let result: unknown;
  await mongoose.connection.transaction(async (session) => {
    // Serialize chapter list mutations on the parent to keep contiguous ordering.
    const lock = await Story.updateOne({ _id: story._id }, { $inc: { __v: 1 } }).session(session);
    if (!lock.matchedCount) throw new ApiError(404, 'NOT_FOUND', 'Story not found.');
    const last = await Chapter.findOne({ storyId: story._id }).sort({ order: -1 }).session(session);
    const [chapter] = await Chapter.create(
      [{ ...metadata, storyId: story._id, order: (last?.order ?? 0) + 1 }],
      { session },
    );
    await ChapterContent.create([{ chapterId: chapter._id, body }], { session });
    result = chapterDto(chapter);
  });
  await audit(req.user!.id, 'chapter.create', story.id);
  res.status(201).json(result);
});
adminRouter.put('/stories/:id/chapters/reorder', async (req, res) => {
  const story = await existingStory(req.params.id);
  const ids = z.array(objectId).max(5000).parse(req.body.ids);
  await mongoose.connection.transaction(async (session) => {
    const lock = await Story.updateOne({ _id: story._id }, { $inc: { __v: 1 } }).session(session);
    if (!lock.matchedCount) throw new ApiError(404, 'NOT_FOUND', 'Story not found.');
    const chapters = await Chapter.find({ storyId: story._id }).session(session);
    if (
      ids.length !== chapters.length ||
      new Set(ids).size !== ids.length ||
      chapters.some((c) => !ids.includes(c.id))
    )
      throw new ApiError(400, 'ORDER', 'Include each story chapter exactly once.');
    for (const [index, id] of ids.entries())
      await Chapter.updateOne({ _id: id }, { order: index + 1 }).session(session);
  });
  await audit(req.user!.id, 'chapter.reorder', story.id);
  res.status(204).end();
});
adminRouter.get('/chapters/:id', async (req, res) => {
  const chapter = await Chapter.findById(objectId.parse(req.params.id));
  if (!chapter) throw new ApiError(404, 'NOT_FOUND', 'Chapter not found.');
  const content = await ChapterContent.findOne({ chapterId: chapter._id });
  res.json({ ...chapterDto(chapter), accessType: chapter.accessType, body: content?.body ?? '' });
});
adminRouter.put('/chapters/:id', async (req, res) => {
  const id = objectId.parse(req.params.id),
    { body, ...data } = chapterSchema.parse(req.body);
  await mongoose.connection.transaction(async (session) => {
    const chapter = await Chapter.findByIdAndUpdate(
      id,
      { $set: data },
      { returnDocument: 'after', session },
    );
    if (!chapter) throw new ApiError(404, 'NOT_FOUND', 'Chapter not found.');
    await ChapterContent.updateOne({ chapterId: id }, { body }, { upsert: true, session });
  });
  await audit(req.user!.id, 'chapter.update', id);
  res.status(204).end();
});
adminRouter.delete('/chapters/:id', async (req, res) => {
  const chapter = await Chapter.findById(objectId.parse(req.params.id));
  if (!chapter) throw new ApiError(404, 'NOT_FOUND', 'Chapter not found.');
  await mongoose.connection.transaction(async (session) => {
    await Story.updateOne({ _id: chapter.storyId }, { $inc: { __v: 1 } }).session(session);
    await Chapter.deleteOne({ _id: chapter._id }).session(session);
    await ChapterContent.deleteOne({ chapterId: chapter._id }).session(session);
    await Bookmark.deleteMany({ chapterId: chapter._id }).session(session);
    await Progress.deleteMany({ chapterId: chapter._id }).session(session);
    await Unlock.deleteMany({ chapterId: chapter._id }).session(session);
    await ReadEvent.deleteMany({ chapterId: chapter._id }).session(session);
    const rest = await Chapter.find({ storyId: chapter.storyId })
      .sort({ order: 1 })
      .session(session);
    for (const [i, c] of rest.entries())
      await Chapter.updateOne({ _id: c._id }, { order: i + 1 }).session(session);
  });
  await audit(req.user!.id, 'chapter.delete', chapter.id);
  res.status(204).end();
});
async function taxonomyData(input: unknown, id?: string) {
  const data = taxonomySchema.parse(input);
  if (data.facet === 'subgenre') {
    if (!data.parentId || !(await Taxonomy.exists({ _id: data.parentId, facet: 'genre' })))
      throw new ApiError(400, 'PARENT', 'Subgenres need an existing parent genre.');
  } else if (data.parentId)
    throw new ApiError(400, 'PARENT', 'Only subgenres have a parent genre.');
  if (id && data.facet !== 'genre' && (await Taxonomy.exists({ parentId: id })))
    throw new ApiError(409, 'IN_USE', 'Move this genre’s subgenres before changing its facet.');
  return data;
}
adminRouter.post('/taxonomy', async (req, res) => {
  const row = await Taxonomy.create(await taxonomyData(req.body));
  await audit(req.user!.id, 'taxonomy.create', row.id);
  res.status(201).json({ id: row.id });
});
adminRouter.put('/taxonomy/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const data = await taxonomyData(req.body, id);
  if (!(await Taxonomy.findByIdAndUpdate(id, data)))
    throw new ApiError(404, 'NOT_FOUND', 'Taxonomy not found.');
  await audit(req.user!.id, 'taxonomy.update', id);
  res.status(204).end();
});
adminRouter.delete('/taxonomy/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  if ((await Story.exists({ taxonomyIds: id })) || (await Taxonomy.exists({ parentId: id })))
    throw new ApiError(409, 'IN_USE', 'Remove this value from stories and subgenres first.');
  await Taxonomy.deleteOne({ _id: id });
  await audit(req.user!.id, 'taxonomy.delete', id);
  res.status(204).end();
});
adminRouter.get('/users', async (req, res) => {
  const q = z
    .string()
    .max(100)
    .parse(req.query.q ?? '');
  const { page, limit, skip } = pagination(req);
  const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const filter = {
    status: { $ne: 'deleted' as const },
    $or: [{ name: pattern }, { email: pattern }],
  };
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json(
    pageResult(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
      total,
      page,
      limit,
    ),
  );
});
adminRouter.patch('/users/:id', async (req, res) => {
  const id = objectId.parse(req.params.id),
    { status } = z.object({ status: z.enum(['active', 'suspended']) }).parse(req.body);
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  if (user.role === 'admin' || user.status === 'deleted')
    throw new ApiError(403, 'PROTECTED_ACCOUNT', 'This account cannot be changed here.');
  user.status = status;
  await user.save();
  await Session.deleteMany({ userId: id });
  await audit(req.user!.id, `user.${status}`, id);
  res.status(204).end();
});
adminRouter.delete('/users/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found.');
  if (user.role === 'admin')
    throw new ApiError(403, 'PROTECTED_ACCOUNT', 'Administrator accounts cannot be deleted here.');
  await mongoose.connection.transaction(async (session) => {
    await User.updateOne(
      { _id: id },
      {
        $set: { status: 'deleted', name: 'Deleted reader', email: `deleted-${id}@invalid.local` },
        $unset: { passwordHash: '', googleSub: '', matureConfirmedAt: '' },
      },
    ).session(session);
    await Session.deleteMany({ userId: id }).session(session);
    await Library.deleteMany({ userId: id }).session(session);
    await Bookmark.deleteMany({ userId: id }).session(session);
    await Progress.deleteMany({ userId: id }).session(session);
    await ReadEvent.deleteMany({ userId: id }).session(session);
    await Unlock.deleteMany({ userId: id }).session(session);
  });
  await audit(req.user!.id, 'user.delete', id);
  res.status(204).end();
});
adminRouter.get('/users/:id/activity', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const [library, bookmarks, progress, reads] = await Promise.all([
    Library.find({ userId: id }).populate('storyId', 'title').sort({ updatedAt: -1 }).limit(50),
    Bookmark.find({ userId: id }).populate('chapterId', 'title').sort({ updatedAt: -1 }).limit(50),
    Progress.find({ userId: id })
      .populate('storyId', 'title')
      .populate('chapterId', 'title')
      .sort({ updatedAt: -1 })
      .limit(50),
    ReadEvent.find({ userId: id }).populate('chapterId', 'title').sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({ library, bookmarks, progress, reads, comments: [], commentsAvailable: false });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});
adminRouter.post('/media', upload.single('cover'), async (req, res) => {
  if (!req.file) throw new ApiError(400, 'UPLOAD', 'Choose a cover image.');
  let buffer: Buffer;
  try {
    const input = sharp(req.file.buffer, { limitInputPixels: 25000000 });
    const meta = await input.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format ?? '')) throw new Error('format');
    buffer = await input
      .rotate()
      .resize(600, 900, { fit: 'cover', position: 'attention' })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new ApiError(400, 'IMAGE', 'Use a valid JPEG, PNG or WebP image under 25 megapixels.');
  }
  await mkdir(mediaDir, { recursive: true });
  const key = `${randomUUID()}.webp`;
  await sharp(buffer).toFile(path.join(mediaDir, key));
  await audit(req.user!.id, 'cover.upload', key);
  res.status(201).json({ key, width: 600, height: 900 });
});
