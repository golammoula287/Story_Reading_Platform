import { definitions, examples } from './demo-data.js';
import { connect } from '../db.js';
import { Chapter, ChapterContent, Story, Taxonomy } from '../models.js';
import { tokens } from '../lib.js';
import mongoose from 'mongoose';
import { config } from '../config.js';
if (config.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
await connect();
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
for (const [facet, names] of Object.entries(definitions))
  for (const name of names) {
    const slug = name.toLowerCase().replaceAll(' ', '-');
    const parent =
      facet === 'subgenre' ? await Taxonomy.findOne({ slug: 'romance', facet: 'genre' }) : null;
    await Taxonomy.updateOne(
      { slug, facet },
      { $setOnInsert: { name, slug, facet, parentId: parent?._id ?? null } },
      { upsert: true },
    );
  }
for (const [index, sample] of examples.entries()) {
  if (await Story.exists({ slug: sample.slug })) continue;
  const term = await Taxonomy.findOne({ slug: sample.genre, facet: 'genre' });
  await mongoose.connection.transaction(async (session) => {
    const [story] = await Story.create(
      [
        {
          title: sample.title,
          slug: sample.slug,
          authorName: sample.authorName,
          prologue: sample.prologue,
          classification: 'clean',
          status: 'published',
          taxonomyIds: term ? [term._id] : [],
          searchTokens: tokens(`${sample.title} ${sample.authorName}`),
        },
      ],
      { session },
    );
    const [chapter] = await Chapter.create(
      [
        {
          storyId: story._id,
          title: 'An unexpected beginning',
          slug: 'an-unexpected-beginning',
          order: 1,
          status: 'published',
          accessType: 'free',
          preview: { mode: 'percentage', value: 25 },
        },
      ],
      { session },
    );
    const body = `${sample.opening}\n\nOutside, the afternoon was becoming evening. There was still time to put everything back where it belonged and pretend that nothing unusual had happened. But the room seemed to be holding its breath, and curiosity had already pulled up a chair.\n\nOn the table stood a cup of tea, untouched and cooling. Beside it lay a folded piece of paper. The writing was small, almost shy, as though the words had only just decided to exist. “Begin where you are,” it said. “The rest will find you.”\n\nFor a long moment, nothing moved. Then came a sound at the door: not quite a knock, and not quite the wind. A beginning rarely announces itself. Most of the time, it simply waits for someone to notice.\n\nThis is original demonstration content for Storyhaven. Replace it with approved client stories before launch. Sample ${index + 1} ends here.`;
    await ChapterContent.create([{ chapterId: chapter._id, body }], { session });
  });
}
console.log(
  'Editable taxonomy and four original demo stories are ready. No login credentials or artificial trending activity were created.',
);
await mongoose.disconnect();
