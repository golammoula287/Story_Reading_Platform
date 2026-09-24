import Link from 'next/link';
import { ArrowRight, Sparkles, BookOpen, Bookmark, MoveUpRight } from 'lucide-react';
import type { StoryDto, TaxonomyDto, Page } from '@storyhaven/contracts';
import { publicApi } from '@/lib/api';
import { Cover, StoryCard } from '@/components/story-card';
export const dynamic = 'force-dynamic';
export default async function Home() {
  let stories: StoryDto[] = [],
    trending: StoryDto[] = [],
    taxonomy: TaxonomyDto[] = [],
    unavailable = false;
  try {
    const [catalogue, trends, terms] = await Promise.all([
      publicApi<Page<StoryDto>>('/stories?limit=4'),
      publicApi<StoryDto[]>('/trending'),
      publicApi<TaxonomyDto[]>('/taxonomy'),
    ]);
    stories = catalogue.items;
    trending = trends;
    taxonomy = terms;
  } catch {
    unavailable = true;
  }
  const featured = trending[0] || stories[0];
  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="tiny-spark">✳</span> YOUR NEXT CHAPTER STARTS HERE
          </span>
          <h1>
            A little escape.
            <br />
            An entire <em>world.</em>
          </h1>
          <p>
            Fall into a story that stays with you. Discover new voices, unforgettable characters,
            and worlds worth getting lost in.
          </p>
          <div className="hero-buttons">
            <Link href="/discover" className="button">
              Find your next read <ArrowRight size={18} />
            </Link>
            <Link href="/library" className="text-link">
              Make yourself at home <MoveUpRight size={15} />
            </Link>
          </div>
          <div className="hero-footnote">
            <span className="mini-icon">
              <BookOpen size={16} />
            </span>
            One chapter. A thousand possibilities.
          </div>
        </div>
        <div className="hero-art">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <span className="floating-spark spark-one">✳</span>
          <span className="floating-spark spark-two">✧</span>
          <div className="hero-book back-book">
            <span>
              BETWEEN
              <br />
              THE LINES
            </span>
            <small>A WORLD AWAITS</small>
          </div>
          {featured ? (
            <Link href={`/stories/${featured.slug}`} className="hero-book front-book">
              <Cover story={featured} large />
            </Link>
          ) : (
            <div className="hero-book front-book empty-book">
              <BookOpen size={45} />
              <span>
                Your next
                <br />
                great story.
              </span>
            </div>
          )}
          <div className="floating-note">
            <span>
              <Bookmark size={19} />
            </span>
            <div>
              A new favourite awaits<small>Keep a place for a little wonder.</small>
            </div>
          </div>
          <span className="art-caption">GOOD STORIES. NO HURRY.</span>
        </div>
      </section>
      <div className="genre-strip">
        <div className="container genre-inner">
          <span>Follow your curiosity</span>
          <div>
            {taxonomy
              .filter((t) => t.facet === 'genre')
              .slice(0, 6)
              .map((t) => (
                <Link href={`/discover?taxonomy=${t.id}`} key={t.id}>
                  {t.name}
                  <ArrowUpRightSmall />
                </Link>
              ))}
            {!taxonomy.length && (
              <Link href="/discover">
                Browse all stories <ArrowUpRightSmall />
              </Link>
            )}
          </div>
        </div>
      </div>
      <section className="container section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FRESH OFF THE PAGE</span>
            <h2>
              Find your next obsession<span className="brand-dot">.</span>
            </h2>
          </div>
          <Link href="/discover" className="text-link">
            View all stories <ArrowRight size={16} />
          </Link>
        </div>
        {unavailable ? (
          <div className="empty-state">
            <BookOpen />
            <h3>The shelves will be back soon.</h3>
            <p>We couldn’t reach the catalogue. Please try again in a moment.</p>
            <Link href="/" className="button secondary">
              Try again
            </Link>
          </div>
        ) : stories.length ? (
          <div className="story-grid">
            {stories.map((s) => (
              <StoryCard key={s.id} story={s} taxonomy={taxonomy} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen />
            <h3>A new chapter is on its way.</h3>
            <p>Our first stories are coming soon. Make yourself at home.</p>
          </div>
        )}
      </section>
      <section className="container reading-banner">
        <span className="banner-icon">
          <Sparkles size={31} />
        </span>
        <div>
          <span className="eyebrow">YOUR STORIES, YOUR LITTLE CORNER</span>
          <h2>Pick up right where you left off.</h2>
          <p>Save the stories you love. Your next chapter will be waiting.</p>
        </div>
        <Link className="button cream-button" href="/library">
          Build your library <ArrowRight size={17} />
        </Link>
      </section>
      {trending.length > 0 && (
        <section className="container section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE STORIES YOU’RE LOVING</span>
              <h2>On everyone’s reading list</h2>
            </div>
            <Link href="/discover?view=trending" className="text-link">
              Trending this week <ArrowRight size={16} />
            </Link>
          </div>
          <div className="story-grid">
            {trending.slice(0, 4).map((s) => (
              <StoryCard key={s.id} story={s} taxonomy={taxonomy} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function ArrowUpRightSmall() {
  return <MoveUpRight size={13} />;
}
