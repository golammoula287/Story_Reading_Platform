import { Router } from 'express';
import { z } from 'zod';
import { objectId } from '@storyhaven/contracts';
import { Story, Chapter, ChapterContent, Taxonomy, Unlock, ReadEvent, Library } from '../models.js';
import { ApiError, pagination, pageResult, previewText, tokens } from '../lib.js';
import { requireUser } from './auth.js';
import type { UserDto } from '@storyhaven/contracts';
export const storyDto = (s: InstanceType<typeof Story>) => ({
  id: s.id,
  title: s.title,
  slug: s.slug,
  authorName: s.authorName,
  prologue: s.prologue,
  status: s.status,
  classification: s.classification,
  taxonomyIds: s.taxonomyIds.map(String),
  coverKey: s.coverKey,
  createdAt: s.createdAt,
});
export const chapterDto = (c: InstanceType<typeof Chapter>) => ({
  id: c.id,
  storyId: String(c.storyId),
  title: c.title,
  slug: c.slug,
  order: c.order,
  status: c.status,
  accessType: c.freeAt && c.freeAt <= new Date() ? 'free' : c.accessType,
  publishAt: c.publishAt,
  freeAt: c.freeAt,
  preview: c.preview,
});
export const visibleChapter = () => ({
  $or: [{ status: 'published' }, { status: 'scheduled', publishAt: { $lte: new Date() } }],
});
export async function publishedStory(id: string) {
  const story = await Story.findOne({ _id: objectId.parse(id), status: 'published' });
  if (!story) throw new ApiError(404, 'NOT_FOUND', 'Story not found.');
  return story;
}
export async function chapterAccess(id: string, user?: UserDto, full = false) {
  const chapter = await Chapter.findOne({ _id: objectId.parse(id), ...visibleChapter() });
  if (!chapter) throw new ApiError(404, 'NOT_FOUND', 'Chapter not found.');
  const story = await publishedStory(String(chapter.storyId));
  const gated =
    story.classification === 'mature' && !user?.matureConfirmed && user?.role !== 'admin';
  if (full) {
    if (!user) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to read the full chapter.');
    if (gated)
      throw new ApiError(
        403,
        'MATURE_CONFIRMATION',
        'Confirm mature content access in your account first.',
      );
    if (
      chapterDto(chapter).accessType === 'premium' &&
      user.role !== 'admin' &&
      !(await Unlock.exists({ userId: user.id, chapterId: chapter._id }))
    )
      throw new ApiError(
        403,
        'CHAPTER_LOCKED',
        'This premium chapter is locked. Rewarded unlocks arrive in Phase 2.',
      );
  }
  return { chapter, story, gated };
}
export const contentRouter = Router();
contentRouter.get('/taxonomy', async (_req, res) => {
  const list = await Taxonomy.find().sort({ facet: 1, name: 1 });
  res.json(
    list.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      facet: t.facet,
      parentId: t.parentId ? String(t.parentId) : null,
    })),
  );
});
contentRouter.get('/stories', async (req, res) => {
  const { page, limit, skip } = pagination(req);
  const q = z
    .string()
    .max(100)
    .parse(req.query.q ?? '');
  const author = z
    .string()
    .max(100)
    .parse(req.query.author ?? '');
  const taxonomy = z
    .string()
    .max(800)
    .parse(req.query.taxonomy ?? '')
    .split(',')
    .filter(Boolean)
    .map((v) => objectId.parse(v));
  const filter: Record<string, unknown> = { status: 'published' };
  const words = tokens(`${q} ${author}`);
  if (words.length) filter.searchTokens = { $all: words };
  if (taxonomy.length) filter.taxonomyIds = { $all: taxonomy };
  if (author)
    filter.authorName = new RegExp(`^${author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  const [list, total] = await Promise.all([
    Story.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Story.countDocuments(filter),
  ]);
  res.json(pageResult(list.map(storyDto), total, page, limit));
});
contentRouter.get('/trending', async (_req, res) => {
  const since = new Date(Date.now() - 7 * 86400000);
  const [reads, saves] = await Promise.all([
    ReadEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$storyId', score: { $sum: 1 } } },
    ]),
    Library.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$storyId', score: { $sum: 3 } } },
    ]),
  ]);
  const scores = new Map<string, number>();
  for (const entry of [...reads, ...saves])
    scores.set(String(entry._id), (scores.get(String(entry._id)) ?? 0) + entry.score);
  const ids = [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const stories = await Story.find({ _id: { $in: ids }, status: 'published' });
  res.json(
    stories
      .map((s) => ({ ...storyDto(s), score: scores.get(s.id) ?? 0 }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, 8),
  );
});
contentRouter.get('/stories/:slug', async (req, res) => {
  const story = await Story.findOne({ slug: req.params.slug, status: 'published' });
  if (!story) throw new ApiError(404, 'NOT_FOUND', 'Story not found.');
  const chapters = await Chapter.find({ storyId: story._id, ...visibleChapter() }).sort({
    order: 1,
  });
  res.json({ story: storyDto(story), chapters: chapters.map(chapterDto) });
});
contentRouter.get('/chapters/:id/preview', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const { chapter, story, gated } = await chapterAccess(String(req.params.id), req.user);
  const content = gated ? null : await ChapterContent.findOne({ chapterId: chapter._id });
  res.json({
    chapter: chapterDto(chapter),
    story: storyDto(story),
    gated,
    text: content
      ? previewText(
          content.body,
          chapter.preview?.mode ?? 'percentage',
          chapter.preview?.value ?? 20,
        )
      : '',
  });
});
contentRouter.get('/chapters/:id/content', requireUser, async (req, res) => {
  const { chapter } = await chapterAccess(String(req.params.id), req.user, true);
  const content = await ChapterContent.findOne({ chapterId: chapter._id });
  if (!content) throw new ApiError(404, 'NOT_FOUND', 'Chapter content is unavailable.');
  res.json({ chapter: chapterDto(chapter), body: content.body });
});
contentRouter.post('/chapters/:id/read', requireUser, async (req, res) => {
  const { chapter } = await chapterAccess(String(req.params.id), req.user, true);
  const day = new Date().toISOString().slice(0, 10);
  await ReadEvent.updateOne(
    { userId: req.user!.id, chapterId: chapter._id, day },
    { $setOnInsert: { storyId: chapter.storyId } },
    { upsert: true },
  );
  res.status(204).end();
});
