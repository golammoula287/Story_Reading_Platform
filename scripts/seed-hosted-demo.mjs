import { readingExamples } from './demo-reading-data.mjs';
// Explicitly invoked hosted demo provisioning. Uses admin APIs and never deletes content.
import { definitions, examples } from '../apps/api/src/scripts/demo-data.ts';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const base = process.env.SEED_WEB_URL;
if (!base || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)
  throw new Error('Set SEED_WEB_URL, ADMIN_EMAIL and ADMIN_PASSWORD for this invocation.');
const origin = new URL(base).origin;
const imageDir = fileURLToPath(new URL('../docs/Img Demo/', import.meta.url));
const images = (await readdir(imageDir, { withFileTypes: true }))
  .filter((f) => f.isFile() && /\.(png|jpe?g|jfif|webp)$/i.test(f.name))
  .map((f) => f.name)
  .sort();
let cookie = '';
async function call(route, method = 'GET', data) {
  const multipart = data instanceof FormData;
  const res = await fetch(`${origin}/api/v1${route}`, {
    method,
    headers: {
      Origin: origin,
      'X-Requested-With': 'Storyhaven',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(multipart ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(data === undefined ? {} : { body: multipart ? data : JSON.stringify(data) }),
    signal: AbortSignal.timeout(60000),
  });
  if (route === '/auth/login' && res.ok)
    cookie = res.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; ');
  const result = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(`${method} ${route}: HTTP ${res.status} ${result?.error?.code || ''}`);
  return result;
}
const counts = { storiesCreated: 0, chaptersCreated: 0, coversUploaded: 0, taxonomyCreated: 0 };
try {
  const user = await call('/auth/login', 'POST', {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (user.role !== 'admin') throw new Error('Administrator access required.');
  if (process.env.RESTORE_DEMO_COVERS === 'true') {
    const storage = await call('/admin/media/storage');
    if (storage.provider !== 'cloudinary')
      throw new Error('Deploy and configure Cloudinary storage before restoring demo covers.');
  }
  const terms = await call('/taxonomy');
  for (const [facet, names] of Object.entries(definitions)) {
    for (const name of names) {
      const slug = name.toLowerCase().replaceAll(' ', '-');
      if (terms.some((t) => t.slug === slug && t.facet === facet)) continue;
      const parent =
        facet === 'subgenre'
          ? terms.find((t) => t.slug === 'romance' && t.facet === 'genre')
          : null;
      terms.push({
        name,
        slug,
        facet,
        parentId: parent?.id || null,
        ...(await call('/admin/taxonomy', 'POST', {
          name,
          slug,
          facet,
          parentId: parent?.id || null,
        })),
      });
      counts.taxonomyCreated++;
    }
  }
  const stories = [];
  for (let page = 1; ; page++) {
    const batch = await call(`/admin/stories?limit=50&page=${page}`);
    stories.push(...batch.items);
    if (page >= batch.pages) break;
  }
  for (const [index, sample] of [...examples, ...readingExamples].entries()) {
    let story = stories.find((s) => s.slug === sample.slug);
    const data = {
      title: sample.title,
      slug: sample.slug,
      authorName: sample.authorName,
      prologue: sample.prologue,
      classification: 'clean',
      status: 'published',
      taxonomyIds: terms
        .filter((t) => t.slug === sample.genre && t.facet === 'genre')
        .map((t) => t.id),
    };
    if (
      story &&
      (story.title !== sample.title ||
        story.authorName !== sample.authorName ||
        story.prologue !== sample.prologue)
    ) {
      console.log(`Preserving existing non-demo story: ${sample.slug}`);
      continue;
    }
    if (!story) {
      story = await call('/admin/stories', 'POST', data);
      counts.storiesCreated++;
    }
    if ((!story.coverKey || process.env.RESTORE_DEMO_COVERS === 'true') && images[index]) {
      const form = new FormData();
      form.append(
        'cover',
        new Blob([await readFile(path.join(imageDir, images[index]))]),
        images[index],
      );
      const cover = await call('/admin/media', 'POST', form);
      story = await call(`/admin/stories/${story.id}`, 'PUT', { ...story, coverKey: cover.key });
      counts.coversUploaded++;
    }
    const detail = await call(`/admin/stories/${story.id}`);
    const chapters = sample.chapters || [
      {
        title: 'An unexpected beginning',
        slug: 'an-unexpected-beginning',
        body: `${sample.opening}\n\nOutside, the afternoon was becoming evening. There was still time to put everything back where it belonged and pretend that nothing unusual had happened. But curiosity had already pulled up a chair.\n\nOn the table stood an untouched cup of tea. Beside it lay a folded note. Begin where you are, it said. The rest will find you.\n\nAt the door came a sound: not quite a knock, and not quite the wind. A beginning rarely announces itself. Most of the time, it waits for someone to notice.\n\nOriginal demonstration content for Storyhaven. Sample ${index + 1} ends here.`,
      },
      {
        title: 'The next small step',
        slug: 'the-next-small-step',
        body: `By morning, the note had acquired a new significance. It was no longer a curiosity to be put aside. It was a question that needed an answer.\n\nThe street outside was waking slowly. A shopkeeper swept rainwater from the pavement, and somewhere a bicycle bell rang twice. Ordinary life continued, indifferent to the small mystery unfolding behind one window.\n\nAt the corner bookshop, an elderly woman listened to the story without interrupting. Then she pulled a blank notebook from a drawer. Write down what you know, she suggested. Leave room for what you do not.\n\nThe first page held only three things: a date, a place, and a promise to return. It seemed too little to begin with. Yet by the time the notebook closed, the next step was clear.\n\nThis is an original sample continuation of ${sample.title}, provided to demonstrate chapter navigation. Replace demo content with your approved stories before launch.`,
      },
    ];
    for (const chapter of chapters) {
      if (detail.chapters.some((c) => c.slug === chapter.slug)) continue;
      await call(`/admin/stories/${story.id}/chapters`, 'POST', {
        ...chapter,
        status: 'published',
        accessType: chapter.accessType || 'free',
        publishAt: null,
        freeAt: null,
        preview: { mode: 'percentage', value: 25 },
      });
      counts.chaptersCreated++;
    }
    const published = await call(`/stories/${sample.slug}`);
    console.log(`Verified published demo: ${sample.title}`);
    if (!published) throw new Error('Missing public story.');
  }
  console.log(JSON.stringify({ ...counts, imageFilesAvailable: images.length }));
} finally {
  if (cookie) await call('/auth/logout', 'POST');
}
