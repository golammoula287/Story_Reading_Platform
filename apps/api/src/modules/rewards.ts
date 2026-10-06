import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { rateLimit } from 'express-rate-limit';
import { objectId } from '@storyhaven/contracts';
import {
  RewardSession,
  RewardEvent,
  Unlock,
  UnlockToken,
  User,
  Chapter,
  Story,
} from '../models.js';
import { ApiError, hash, randomToken } from '../lib.js';
import { requireUser } from './auth.js';
import { chapterAccess, chapterDto, visibleChapter } from './content.js';
import { deploymentRateLimitStore } from '../rate-limit-store.js';
import type { RewardProvider, VerifiedReward } from './reward-provider.js';
const lifetime = 10 * 60000,
  grace = 5 * 60000;
const proofSchema = z
  .object({
    transactionId: z.string().min(1).max(256),
    sessionId: objectId,
    nonce: z.string().min(32).max(256),
    completedAt: z.date(),
  })
  .strict();
function conflict() {
  return new ApiError(409, 'REWARD_REJECTED', 'This reward cannot be applied.');
}
export async function acceptReward(provider: string, input: VerifiedReward) {
  const proof = proofSchema.parse(input),
    transactionHash = hash(proof.transactionId);
  async function apply() {
    return mongoose.connection.transaction(async (session) => {
      const row = await RewardSession.findById(proof.sessionId).session(session);
      if (!row || row.provider !== provider || row.nonceHash !== hash(proof.nonce))
        throw conflict();
      const previous = await RewardEvent.findOne({ provider, transactionHash }).session(session);
      if (previous) {
        if (String(previous.sessionId) !== row.id || row.status !== 'verified') throw conflict();
        return;
      }
      if (
        !['pending', 'expired'].includes(row.status) ||
        Date.now() > row.expiresAt.getTime() + grace ||
        proof.completedAt > row.expiresAt ||
        proof.completedAt < row.createdAt ||
        proof.completedAt.getTime() > Date.now() + 30000
      )
        throw conflict();
      // Serialize with suspension/deletion/publishing edits and with concurrent callbacks.
      const user = await User.findOneAndUpdate(
        { _id: row.userId, status: 'active' },
        { $inc: { __v: 1 } },
        { session, returnDocument: 'after' },
      );
      const chapter = await Chapter.findOneAndUpdate(
        { _id: row.chapterId, ...visibleChapter() },
        { $inc: { __v: 1 } },
        { session, returnDocument: 'after' },
      );
      const story =
        chapter &&
        (await Story.findOneAndUpdate(
          { _id: chapter.storyId, status: 'published' },
          { $inc: { __v: 1 } },
          { session, returnDocument: 'after' },
        ));
      if (
        !user ||
        !chapter ||
        !story ||
        (story.classification === 'mature' && !user.matureConfirmedAt && user.role !== 'admin')
      )
        throw conflict();
      await RewardEvent.create([{ provider, transactionHash, sessionId: row._id }], { session });
      await Unlock.updateOne(
        { userId: row.userId, chapterId: row.chapterId },
        { $setOnInsert: { grantedAt: new Date() } },
        { upsert: true, session },
      );
      row.status = 'verified';
      await row.save({ session });
    });
  }
  try {
    await apply();
  } catch (error) {
    // Unique-key races can occur when a duplicate callback arrives during a commit.
    if ((error as { code?: number }).code !== 11000) throw error;
    const previous = await RewardEvent.findOne({ provider, transactionHash });
    const row = await RewardSession.findById(proof.sessionId);
    if (
      !previous ||
      String(previous.sessionId) !== proof.sessionId ||
      row?.status !== 'verified' ||
      row.provider !== provider ||
      row.nonceHash !== hash(proof.nonce)
    )
      throw conflict();
  }
}
export function rewardRoutes(provider: RewardProvider | null) {
  const router = Router();
  router.use(
    ['/rewards', '/reward-sessions', '/chapters/:id/reward-sessions', '/chapters/:id/unlock-token'],
    requireUser,
  );
  router.get('/rewards/availability', (_req, res) => res.json({ available: !!provider }));
  router.post(
    '/chapters/:id/reward-sessions',
    rateLimit({
      windowMs: 60000,
      limit: 5,
      keyGenerator: (req) => req.user!.id,
      store: deploymentRateLimitStore('reward-start'),
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
    async (req, res) => {
      z.object({})
        .strict()
        .parse(req.body ?? {});
      const { chapter, gated } = await chapterAccess(String(req.params.id), req.user);
      if (gated)
        throw new ApiError(403, 'MATURE_CONFIRMATION', 'Confirm mature content access first.');
      if (
        chapterDto(chapter).accessType !== 'premium' ||
        (await Unlock.exists({ userId: req.user!.id, chapterId: chapter._id }))
      )
        return res.json({ status: 'entitled' });
      if (!provider)
        throw new ApiError(
          503,
          'REWARDS_UNAVAILABLE',
          'Rewarded ads are not available yet. Please try again later.',
        );
      const nonce = randomToken();
      const row = await RewardSession.create({
        userId: req.user!.id,
        chapterId: chapter._id,
        provider: provider.id,
        nonceHash: hash(nonce),
        expiresAt: new Date(Date.now() + lifetime),
      });
      try {
        const launch = await provider.prepare({
          sessionId: row.id,
          nonce,
          expiresAt: row.expiresAt,
        });
        const url = new URL(launch.url);
        if (url.protocol !== 'https:' || url.username || url.password)
          throw Error('Invalid provider URL');
        res
          .status(201)
          .json({ id: row.id, status: row.status, expiresAt: row.expiresAt, launchUrl: url.href });
      } catch {
        await RewardSession.updateOne({ _id: row._id, status: 'pending' }, { status: 'failed' });
        throw new ApiError(
          503,
          'REWARD_NO_FILL',
          'No rewarded ad is available. Please try again later.',
        );
      }
    },
  );
  router.get('/reward-sessions/:id', async (req, res) => {
    const row = await RewardSession.findOne({
      _id: objectId.parse(req.params.id),
      userId: req.user!.id,
    });
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Reward session not found.');
    await chapterAccess(String(row.chapterId), req.user);
    if (row.status === 'pending' && row.expiresAt <= new Date()) {
      await RewardSession.updateOne({ _id: row._id, status: 'pending' }, { status: 'expired' });
    }
    const current = await RewardSession.findById(row._id);
    if (!current) throw new ApiError(404, 'NOT_FOUND', 'Reward session not found.');
    res.json({
      id: row.id,
      chapterId: String(row.chapterId),
      status: current!.status,
      expiresAt: row.expiresAt,
    });
  });
  router.delete('/reward-sessions/:id', async (req, res) => {
    const id = objectId.parse(req.params.id);
    if (!(await RewardSession.exists({ _id: id, userId: req.user!.id })))
      throw new ApiError(404, 'NOT_FOUND', 'Reward session not found.');
    await RewardSession.updateOne(
      { _id: id, userId: req.user!.id, status: { $in: ['pending', 'expired'] } },
      { status: 'cancelled' },
    );
    res.status(204).end();
  });
  router.post('/chapters/:id/unlock-token', async (req, res) => {
    const { chapter } = await chapterAccess(String(req.params.id), req.user, true);
    const token = randomToken(),
      expiresAt = new Date(Date.now() + 2 * 60000);
    await UnlockToken.create({
      userId: req.user!.id,
      chapterId: chapter._id,
      tokenHash: hash(token),
      expiresAt,
    });
    res.json({ token, expiresAt });
  });
  return router;
}
export async function validateUnlockToken(token: string, userId: string, chapterId: string) {
  if (
    token.length > 256 ||
    !(await UnlockToken.exists({
      tokenHash: hash(token),
      userId,
      chapterId,
      expiresAt: { $gt: new Date() },
    }))
  )
    throw new ApiError(403, 'INVALID_UNLOCK_TOKEN', 'The reading token is invalid or expired.');
}
