import { Router } from 'express';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { commentSchema, commentModerationSchema, objectId } from '@storyhaven/contracts';
import { Comment, Chapter, Story, User, Audit } from '../models.js';
import { requireUser, requireAdmin } from './auth.js';
import { chapterAccess } from './content.js';
import { ApiError, pagination, pageResult } from '../lib.js';
import { deploymentRateLimitStore } from '../rate-limit-store.js';

async function dtos(rows: InstanceType<typeof Comment>[], viewer: string, admin = false) {
  const users = await User.find({ _id: { $in: rows.map((row) => row.userId) } }).select(
    'name status',
  );
  const names = new Map(
    users.map((user) => [user.id, user.status === 'deleted' ? 'Deleted reader' : user.name]),
  );
  const chapters = admin
    ? await Chapter.find({ _id: { $in: rows.map((row) => row.chapterId) } }).select('title')
    : [];
  const titles = new Map(chapters.map((chapter) => [chapter.id, chapter.title]));
  return rows.map((row) => ({
    id: row.id,
    chapterId: String(row.chapterId),
    authorName: names.get(String(row.userId)) ?? 'Deleted reader',
    body: row.body,
    createdAt: row.createdAt,
    own: String(row.userId) === viewer,
    ...(admin
      ? {
          status: row.status,
          chapterTitle: titles.get(String(row.chapterId)) ?? 'Unavailable chapter',
        }
      : {}),
  }));
}
export const commentsRouter = Router({ mergeParams: true });
commentsRouter.use(requireUser);
commentsRouter.get<{ chapterId: string }>('/', async (req, res) => {
  const { chapter } = await chapterAccess(String(req.params.chapterId), req.user, true);
  const { page, limit, skip } = pagination(req);
  const filter = { chapterId: chapter._id, status: 'visible' as const };
  const [rows, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Comment.countDocuments(filter),
  ]);
  res.json(pageResult(await dtos(rows, req.user!.id), total, page, limit));
});
commentsRouter.post<{ chapterId: string }>(
  '/',
  rateLimit({
    windowMs: 60000,
    limit: 5,
    keyGenerator: (req) => req.user!.id,
    store: deploymentRateLimitStore('comments'),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: {
        code: 'COMMENT_RATE_LIMIT',
        message: 'Please wait a minute before posting another comment.',
      },
    },
  }),
  async (req, res) => {
    const input = commentSchema.parse(req.body);
    const { chapter, story } = await chapterAccess(String(req.params.chapterId), req.user, true);
    const row = await mongoose.connection.transaction(async (session) => {
      // Serialize against account/content deletion so the cascades cannot leave orphan comments.
      const account = await User.updateOne(
        { _id: req.user!.id, status: 'active' },
        { $inc: { __v: 1 } },
        { session },
      );
      const parent = await Story.updateOne({ _id: story._id }, { $inc: { __v: 1 } }, { session });
      const target = await Chapter.updateOne(
        { _id: chapter._id },
        { $inc: { __v: 1 } },
        { session },
      );
      if (!account.matchedCount || !parent.matchedCount || !target.matchedCount)
        throw new ApiError(
          409,
          'CONTENT_CHANGED',
          'Your account or chapter changed. Reload before commenting.',
        );
      await chapterAccess(chapter.id, req.user, true, session);
      const [created] = await Comment.create(
        [{ userId: req.user!.id, chapterId: chapter._id, body: input.body }],
        { session },
      );
      return created;
    });
    res.status(201).json((await dtos([row], req.user!.id))[0]);
  },
);
commentsRouter.delete<{ chapterId: string; id: string }>('/:id', async (req, res) => {
  // Readers may remove their own comment even if a chapter later becomes locked/unpublished.
  const result = await Comment.deleteOne({
    _id: objectId.parse(req.params.id),
    chapterId: objectId.parse(req.params.chapterId),
    userId: req.user!.id,
  });
  if (!result.deletedCount) throw new ApiError(404, 'NOT_FOUND', 'Comment not found.');
  res.status(204).end();
});
export const adminCommentsRouter = Router();
adminCommentsRouter.use(requireAdmin);
adminCommentsRouter.get('/', async (req, res) => {
  const status = z.enum(['visible', 'hidden', 'all']).parse(req.query.status ?? 'visible');
  const filter = status === 'all' ? {} : { status };
  const { page, limit, skip } = pagination(req);
  const [rows, total] = await Promise.all([
    Comment.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Comment.countDocuments(filter),
  ]);
  res.json(pageResult(await dtos(rows, req.user!.id, true), total, page, limit));
});
adminCommentsRouter.patch('/:id', async (req, res) => {
  const id = objectId.parse(req.params.id);
  const { status } = commentModerationSchema.parse(req.body);
  await mongoose.connection.transaction(async (session) => {
    const row = await Comment.findByIdAndUpdate(id, { $set: { status } }, { session });
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Comment not found.');
    await Audit.create([{ actorId: req.user!.id, action: `comment.${status}`, targetId: id }], {
      session,
    });
  });
  res.status(204).end();
});
