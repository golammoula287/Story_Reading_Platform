import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import type { Store, Options } from 'express-rate-limit';

const schema = new mongoose.Schema({
  _id: { type: String, required: true },
  hits: { type: Number, required: true },
  resetTime: { type: Date, required: true, expires: 0 },
});
const Counter = mongoose.model('RateLimitCounter', schema);

// Shared counters survive cold starts and horizontal scaling. Expiry is checked
// in the atomic update, so MongoDB TTL cleanup timing cannot extend a ban.
export class MongoRateLimitStore implements Store {
  localKeys = false;
  windowMs = 60000;
  constructor(public prefix: string) {}
  init(options: Options) {
    this.windowMs = options.windowMs;
  }
  private id(key: string) {
    return `${this.prefix}:${createHash('sha256').update(key).digest('hex')}`;
  }
  async increment(key: string) {
    const collection = mongoose.connection.db!.collection<{
      _id: string;
      hits: number;
      resetTime: Date;
    }>(Counter.collection.name);
    const now = new Date();
    const expired = { $lte: [{ $ifNull: ['$resetTime', new Date(0)] }, now] };
    const update = [
      {
        $set: {
          hits: { $cond: [expired, 1, { $add: ['$hits', 1] }] },
          resetTime: { $cond: [expired, new Date(now.getTime() + this.windowMs), '$resetTime'] },
        },
      },
    ];
    let result;
    try {
      result = await collection.findOneAndUpdate({ _id: this.id(key) }, update, {
        upsert: true,
        returnDocument: 'after',
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      // Concurrent first requests may race to insert the same unique key.
      result = await collection.findOneAndUpdate({ _id: this.id(key) }, update, {
        returnDocument: 'after',
      });
    }
    if (!result) throw new Error('Rate limit counter unavailable');
    return { totalHits: result.hits, resetTime: result.resetTime };
  }
  async decrement(key: string) {
    await Counter.updateOne({ _id: this.id(key), hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }
  async resetKey(key: string) {
    await Counter.deleteOne({ _id: this.id(key) });
  }
}
export function deploymentRateLimitStore(prefix: string) {
  return process.env.VERCEL === '1' ? new MongoRateLimitStore(prefix) : undefined;
}
