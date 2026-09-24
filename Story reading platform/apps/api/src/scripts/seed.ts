import { connect } from '../db.js';
import { Chapter, ChapterContent, Story, Taxonomy } from '../models.js';
import { tokens } from '../lib.js';
import mongoose from 'mongoose';
import { config } from '../config.js';
if (config.NODE_ENV === 'production') throw new Error('Demo seeding is disabled in production.');
await connect();
await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
const definitions: Record<string, string[]> = {
  genre: ['Romance', 'Fantasy', 'Mystery', 'Contemporary', 'Historical', 'Paranormal'],
  trope: [
    'Enemies to lovers',
    'Friends to lovers',
    'Fake relationship',
    'Forced relationship marriage',
    'Slow burn',
    'Love triangle',
    'Second chance romance',
    'Love after marriage',
    'Love after baby',
    'Arranged marriage',
    'Secret relationship romance',
    'Unrequited love',
    'Revenge',
    'Regret',
    'Forbidden romance',
  ],
  descriptor: ['Angst', 'Young adult'],
  subgenre: [
    'Dark romance',
    'High school romance',
    'Werewolf romance',
    'Mafia romance',
    'Billionaire romance',
  ],
};
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
const examples = [
  {
    title: 'The Art of Almost',
    slug: 'the-art-of-almost',
    authorName: 'Mira Sen',
    genre: 'romance',
    prologue:
      'Two strangers. One borrowed book. A hundred things left unsaid. In a city that never slows down, Anika and Rayan find a reason to take their time.',
    opening:
      'The book arrived on a Thursday, wrapped in paper the colour of weak tea. Anika knew at once that it was not the book she had ordered. Someone had written a name inside the cover, then crossed it out so carefully that it looked like a small, dark window.',
  },
  {
    title: 'Where the Wildflowers Stay',
    slug: 'where-the-wildflowers-stay',
    authorName: 'Elena Brooks',
    genre: 'contemporary',
    prologue:
      'An old house, a garden full of secrets, and a summer that changes everything. Sometimes finding your way home means taking the long road.',
    opening:
      'At the end of the lane, the house was still waiting. Ivy had climbed over the front gate and the garden was full of flowers nobody had planted. Nora set her suitcase on the path and listened to a silence she remembered from childhood.',
  },
  {
    title: 'A Map of Quiet Stars',
    slug: 'a-map-of-quiet-stars',
    authorName: 'Ayaan Rahman',
    genre: 'fantasy',
    prologue:
      'In a kingdom where every star has a keeper, one apprentice discovers a light that belongs to no one. A gentle adventure about courage, belonging, and the magic of being seen.',
    opening:
      'Every evening, before the bells rang, Idris counted the stars in the observatory ledger. There were always three hundred and sixteen. Tonight there were three hundred and seventeen, and the newest one was humming his name.',
  },
  {
    title: 'Letters from the Monsoon',
    slug: 'letters-from-the-monsoon',
    authorName: 'Nila Das',
    genre: 'mystery',
    prologue:
      'The rain brings a letter with no address. Then another. As forgotten memories surface, one woman follows a trail of ink through the streets of her old neighbourhood.',
    opening:
      'The first letter was dry, though the rain had been falling for three days. It lay beneath the door with a single word on the envelope: remember. Tara turned it over twice before noticing the familiar curve of the handwriting.',
  },
];
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
