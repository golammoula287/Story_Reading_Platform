import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { publicApi } from '@/lib/api';
import { StoryCard } from '@/components/story-card';
import type { StoryDto, TaxonomyDto, Page } from '@storyhaven/contracts';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Discover stories' };
export default async function Discover({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const get = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '');
  const q = get('q'),
    author = get('author'),
    taxonomyValue = get('taxonomy'),
    view = get('view'),
    page = get('page') || '1';
  const query = new URLSearchParams({ q, author, taxonomy: taxonomyValue, page });
  let terms: TaxonomyDto[] = [],
    result: Page<StoryDto> = { items: [], total: 0, page: 1, pages: 1 },
    error = false;
  try {
    terms = await publicApi('/taxonomy');
    result =
      view === 'trending'
        ? await publicApi<StoryDto[]>('/trending').then((items) => ({
            items,
            total: items.length,
            page: 1,
            pages: 1,
          }))
        : await publicApi(`/stories?${query}`);
  } catch {
    error = true;
  }
  return (
    <div className="container page-section">
      <div className="page-heading">
        <span className="eyebrow">A WORLD BETWEEN THE PAGES</span>
        <h1>
          {view === 'trending' ? 'This week’s favourites' : 'Find a story that feels like you.'}
        </h1>
        <p>Follow a familiar feeling. Or discover something entirely unexpected.</p>
      </div>
      <form className="filter-bar" action="/discover">
        <label className="search-field">
          <Search size={19} />
          <input
            name="q"
            aria-label="Search title or author keywords"
            placeholder="Search stories or authors…"
            defaultValue={q}
          />
        </label>
        <label>
          <span className="sr-only">Exact author name</span>
          <input name="author" placeholder="Author name" defaultValue={author} />
        </label>
        <label>
          <span className="sr-only">Genre, subgenre or tag</span>
          <select name="taxonomy" defaultValue={taxonomyValue}>
            <option value="">All genres & tags</option>
            {['genre', 'subgenre', 'trope', 'descriptor', 'tag'].map((facet) => (
              <optgroup key={facet} label={facet}>
                {terms
                  .filter((t) => t.facet === facet)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button className="button" type="submit">
          <SlidersHorizontal size={16} /> Explore
        </button>
      </form>
      <div className="results-heading">
        <span>
          {error
            ? 'Catalogue unavailable'
            : `${result.total} ${result.total === 1 ? 'story' : 'stories'} to explore`}
        </span>
        <Link href="/discover">Reset filters</Link>
      </div>
      {error ? (
        <div className="empty-state">
          <h2>We couldn’t load the shelves.</h2>
          <p>Please try again shortly.</p>
        </div>
      ) : !result.items.length ? (
        <div className="empty-state">
          <h2>No stories here just yet.</h2>
          <p>Try a different search or explore all stories.</p>
        </div>
      ) : (
        <div className="story-grid">
          {result.items.map((s) => (
            <StoryCard key={s.id} story={s} taxonomy={terms} />
          ))}
        </div>
      )}
      <div className="pagination">
        {result.page > 1 && (
          <Link
            className="button secondary"
            href={`/discover?${new URLSearchParams({ q, author, taxonomy: taxonomyValue, page: String(result.page - 1) })}`}
          >
            Previous
          </Link>
        )}
        {result.pages > 1 && (
          <span>
            Page {result.page} of {result.pages}
          </span>
        )}
        {result.page < result.pages && (
          <Link
            className="button secondary"
            href={`/discover?${new URLSearchParams({ q, author, taxonomy: taxonomyValue, page: String(result.page + 1) })}`}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
