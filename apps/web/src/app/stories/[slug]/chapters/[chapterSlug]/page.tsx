import { notFound } from 'next/navigation';
import type { StoryDto, ChapterDto } from '@storyhaven/contracts';
import { publicApi, HttpError } from '@/lib/api';
import { Reader } from '@/components/reader';
export const dynamic = 'force-dynamic';
export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string; chapterSlug: string }>;
}) {
  const { slug, chapterSlug } = await params;
  try {
    const { story, chapters } = await publicApi<{ story: StoryDto; chapters: ChapterDto[] }>(
      `/stories/${encodeURIComponent(slug)}`,
    );
    const chapter = chapters.find((c) => c.slug === chapterSlug);
    if (!chapter) notFound();
    const preview = await publicApi<{ text: string; gated: boolean }>(
      `/chapters/${chapter.id}/preview`,
    );
    return (
      <Reader
        story={story}
        chapter={chapter}
        chapters={chapters}
        preview={preview.text}
        gated={preview.gated}
      />
    );
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
}
