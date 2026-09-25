import Link from 'next/link';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { StoryDto, TaxonomyDto } from '@storyhaven/contracts';
export function Cover({ story, large = false }: { story: StoryDto; large?: boolean }) {
  const variant = [...story.slug].reduce((n, c) => n + c.charCodeAt(0), 0) % 4;
  return (
    <div className={`book-cover cover-${variant} ${large ? 'cover-large' : ''}`}>
      {story.coverKey ? (
        <img
          src={`/api/v1/media/${story.coverKey}`}
          alt={`Cover of ${story.title}`}
          loading="lazy"
        />
      ) : (
        <>
          <span className="cover-imprint">STORYHAVEN ORIGINAL</span>
          <div className="cover-orbit" />
          <div className="cover-flower">✳</div>
          <div className="cover-title">{story.title}</div>
          <span className="cover-author">{story.authorName}</span>
        </>
      )}
      <span className="cover-spine" />
    </div>
  );
}
export function StoryCard({ story, taxonomy = [] }: { story: StoryDto; taxonomy?: TaxonomyDto[] }) {
  const genre = taxonomy.find((t) => story.taxonomyIds.includes(t.id) && t.facet === 'genre');
  return (
    <article className="story-card">
      <Link className="cover-link" href={`/stories/${story.slug}`} tabIndex={-1} aria-hidden="true">
        <Cover story={story} />
        <span className="cover-open">
          <ArrowUpRight size={21} />
        </span>
      </Link>
      <div className="card-meta">
        <span>{genre?.name || 'Fiction'}</span>
        <span>{story.classification === 'mature' ? 'Mature' : 'Clean'}</span>
      </div>
      <h3>
        <Link href={`/stories/${story.slug}`}>{story.title}</Link>
      </h3>
      <p className="muted">by {story.authorName}</p>
      <div className="card-footer">
        <BookOpen size={13} />
        <span>Read the story</span>
        {story.score !== undefined && <span className="trend-label">{story.score} points</span>}
      </div>
    </article>
  );
}
