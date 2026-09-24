import { Chapter } from '../models.js';
export async function runPublishingJobs(now = new Date()) {
  // Atomic conditional updates are naturally retry-safe and catch up after downtime.
  const published = await Chapter.updateMany(
    { status: 'scheduled', publishAt: { $lte: now } },
    { $set: { status: 'published' } },
  );
  const freed = await Chapter.updateMany(
    { accessType: 'premium', freeAt: { $ne: null, $lte: now } },
    { $set: { accessType: 'free' } },
  );
  return { published: published.modifiedCount, freed: freed.modifiedCount };
}
