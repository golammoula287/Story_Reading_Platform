import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Lock, BookOpen } from 'lucide-react';
import { publicApi, HttpError } from '@/lib/api';
import type { StoryDto, ChapterDto } from '@storyhaven/contracts';
import { Cover } from '@/components/story-card';
import { LibraryButton } from '@/components/library-button';
export const dynamic = 'force-dynamic';
export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let data: { story: StoryDto; chapters: ChapterDto[] };
  try {
    data = await publicApi(`/stories/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    throw e;
  }
  const { story, chapters } = data;
  return (
    <div className="container page-section">
      <Link className="text-link back-link" href="/discover">
        <ArrowLeft size={16} /> Back to discovery
      </Link>
      <div className="story-detail">
        <Cover story={story} large />
        <div>
          <span className="eyebrow">
            {story.classification === 'mature'
              ? 'MATURE FICTION · CONTENT CONFIRMATION REQUIRED'
              : 'A STORY TO GET LOST IN'}
          </span>
          <h1>{story.title}</h1>
          <p className="author-line">by {story.authorName}</p>
          <div className="prologue">{story.prologue}</div>
          <p className="muted small">
            {chapters.length} published chapters ·{' '}
            {story.classification === 'clean' ? 'Clean' : 'Mature'} content
          </p>
          <div className="hero-buttons">
            {chapters[0] && (
              <Link className="button" href={`/stories/${slug}/chapters/${chapters[0].slug}`}>
                Start reading <ArrowRight size={17} />
              </Link>
            )}
            <LibraryButton storyId={story.id} />
          </div>
        </div>
      </div>
      <section className="chapter-list">
        <div className="section-heading">
          <h2>Your next chapter</h2>
          <span className="muted">{chapters.length} chapters</span>
        </div>
        {chapters.map((c) => (
          <Link className="chapter-row" key={c.id} href={`/stories/${slug}/chapters/${c.slug}`}>
            <span className="chapter-number">{String(c.order).padStart(2, '0')}</span>
            <span>{c.title}</span>
            <span className="chapter-kind">
              {c.accessType === 'premium' ? (
                <>
                  <Lock size={14} /> Premium
                </>
              ) : (
                <>
                  <BookOpen size={14} /> Free
                </>
              )}
            </span>
            <ArrowRight size={17} />
          </Link>
        ))}
        {!chapters.length && <p className="empty-state">The first chapter is on its way.</p>}
      </section>
    </div>
  );
}
