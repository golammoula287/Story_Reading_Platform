import { Router } from 'express';
import { z } from 'zod';
import { objectId, progressSchema } from '@storyhaven/contracts';
import { Bookmark, Chapter, Library, Progress, Story, User } from '../models.js';
import { requireUser } from './auth.js';
import { chapterAccess, chapterDto, publishedStory, storyDto, visibleChapter } from './content.js';
import { ApiError, pagination, pageResult } from '../lib.js';
export const readerRouter = Router();
readerRouter.use(requireUser);
readerRouter.get('/library', async (req, res) => {
  const { page, limit, skip } = pagination(req);
  const entries = await Library.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  const stories = await Story.find({
    _id: { $in: entries.map((e) => e.storyId) },
    status: 'published',
  });
  const byId = new Map(stories.map((s) => [s.id, s]));
  const visible = entries.filter((e) => byId.has(String(e.storyId)));
  const items = await Promise.all(
    visible.slice(skip, skip + limit).map(async (e) => {
      const progress = await Progress.findOne({ userId: req.user!.id, storyId: e.storyId });
      const chapter = progress
        ? await Chapter.findOne({ _id: progress.chapterId, ...visibleChapter() })
        : null;
      return {
        ...storyDto(byId.get(String(e.storyId))!),
        progress: chapter
          ? { chapterId: chapter.id, chapterSlug: chapter.slug, blockAnchor: progress!.blockAnchor }
          : null,
      };
    }),
  );
  res.json(pageResult(items, visible.length, page, limit));
});
readerRouter.get('/library/:storyId', async (req, res) => {
  const id = objectId.parse(req.params.storyId);
  res.json({ saved: !!(await Library.exists({ userId: req.user!.id, storyId: id })) });
});
readerRouter.put('/library/:storyId', async (req, res) => {
  const story = await publishedStory(String(req.params.storyId));
  await Library.updateOne(
    { userId: req.user!.id, storyId: story._id },
    { $setOnInsert: { userId: req.user!.id, storyId: story._id } },
    { upsert: true },
  );
  res.status(204).end();
});
readerRouter.delete('/library/:storyId', async (req, res) => {
  await Library.deleteOne({ userId: req.user!.id, storyId: objectId.parse(req.params.storyId) });
  res.status(204).end();
});
readerRouter.get('/bookmarks', async (req, res) => {
  const bookmarks = await Bookmark.find({ userId: req.user!.id }).sort({ updatedAt: -1 });
  const items = [];
  for (const b of bookmarks) {
    const c = await Chapter.findOne({ _id: b.chapterId, ...visibleChapter() });
    if (!c) continue;
    const s = await Story.findOne({ _id: c.storyId, status: 'published' });
    if (s) items.push({ chapter: chapterDto(c), story: storyDto(s), blockAnchor: b.blockAnchor });
  }
  const { page, limit, skip } = pagination(req);
  res.json(pageResult(items.slice(skip, skip + limit), items.length, page, limit));
});
readerRouter.get('/bookmarks/:chapterId', async (req, res) => {
  const bookmark = await Bookmark.findOne({
    userId: req.user!.id,
    chapterId: objectId.parse(req.params.chapterId),
  });
  res.json({ saved: !!bookmark, blockAnchor: bookmark?.blockAnchor ?? 0 });
});
readerRouter.put('/bookmarks/:chapterId', async (req, res) => {
  const { chapter } = await chapterAccess(String(req.params.chapterId), req.user, true);
  const blockAnchor = z
    .number()
    .int()
    .min(0)
    .max(100000)
    .parse(req.body.blockAnchor ?? 0);
  await Bookmark.updateOne(
    { userId: req.user!.id, chapterId: chapter._id },
    { $set: { blockAnchor } },
    { upsert: true },
  );
  res.status(204).end();
});
readerRouter.delete('/bookmarks/:chapterId', async (req, res) => {
  await Bookmark.deleteOne({
    userId: req.user!.id,
    chapterId: objectId.parse(req.params.chapterId),
  });
  res.status(204).end();
});
readerRouter.get('/progress/:storyId', async (req, res) => {
  const story = await publishedStory(String(req.params.storyId));
  const progress = await Progress.findOne({ userId: req.user!.id, storyId: story._id });
  const chapter = progress
    ? await Chapter.findOne({ _id: progress.chapterId, ...visibleChapter() })
    : null;
  res.json(chapter ? { chapterId: chapter.id, blockAnchor: progress!.blockAnchor } : null);
});
readerRouter.put('/progress/:storyId', async (req, res) => {
  const input = progressSchema.parse(req.body);
  const { chapter } = await chapterAccess(input.chapterId, req.user, true);
  if (String(chapter.storyId) !== objectId.parse(req.params.storyId))
    throw new ApiError(400, 'STORY_MISMATCH', 'Chapter does not belong to this story.');
  await Progress.updateOne(
    { userId: req.user!.id, storyId: chapter.storyId },
    { $set: input },
    { upsert: true },
  );
  res.status(204).end();
});
readerRouter.post('/content-confirmation', async (req, res) => {
  z.object({ confirmed: z.literal(true) }).parse(req.body);
  await User.updateOne({ _id: req.user!.id }, { matureConfirmedAt: new Date() });
  res.status(204).end();
});
