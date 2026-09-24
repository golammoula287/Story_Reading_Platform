'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bookmark, Library as LibraryIcon, Trash2 } from 'lucide-react';
import type { StoryDto, ChapterDto, Page } from '@storyhaven/contracts';
import { api, message } from '@/lib/api';
import { Cover } from '@/components/story-card';
import { RequireSession } from '@/components/require-session';
import { useSession } from '@/components/session';
type SavedStory = StoryDto & { progress: { chapterSlug: string } | null };
type SavedBookmark = { chapter: ChapterDto; story: StoryDto; blockAnchor: number };
export default function LibraryPage() {
  const { user } = useSession();
  const [stories, setStories] = useState<SavedStory[]>([]),
    [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(true),
    [tab, setTab] = useState('stories'),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(1);
  async function load() {
    setBusy(true);
    setError('');
    try {
      if (tab === 'stories') {
        const data = await api<Page<SavedStory>>(`/me/library?page=${page}`);
        setStories(data.items);
        setPages(data.pages);
      } else {
        const data = await api<Page<SavedBookmark>>(`/me/bookmarks?page=${page}`);
        setBookmarks(data.items);
        setPages(data.pages);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (user) void load();
  }, [user, tab, page]);
  async function remove(id: string) {
    try {
      await api(`/me/${tab === 'stories' ? 'library' : 'bookmarks'}/${id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(message(e));
    }
  }
  return (
    <div className="container page-section">
      <RequireSession>
        <div className="page-heading">
          <span className="eyebrow">YOUR LITTLE CORNER</span>
          <h1>Every story, right where you left it.</h1>
          <p>A home for the worlds you’re not quite ready to leave.</p>
        </div>
        <div className="tabs">
          <button
            className={tab === 'stories' ? 'selected' : ''}
            onClick={() => {
              setTab('stories');
              setPage(1);
            }}
          >
            <LibraryIcon size={17} /> Saved stories
          </button>
          <button
            className={tab === 'bookmarks' ? 'selected' : ''}
            onClick={() => {
              setTab('bookmarks');
              setPage(1);
            }}
          >
            <Bookmark size={17} /> Bookmarks
          </button>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {busy ? (
          <p className="empty-state">Opening your library…</p>
        ) : tab === 'stories' ? (
          stories.length ? (
            <div className="library-grid">
              {stories.map((s) => (
                <article key={s.id} className="library-card">
                  <Link href={`/stories/${s.slug}`}>
                    <Cover story={s} />
                  </Link>
                  <div>
                    <span className="eyebrow">YOUR READING LIST</span>
                    <h2>
                      <Link href={`/stories/${s.slug}`}>{s.title}</Link>
                    </h2>
                    <p className="muted">{s.authorName}</p>
                    <Link
                      className="text-link"
                      href={
                        s.progress
                          ? `/stories/${s.slug}/chapters/${s.progress.chapterSlug}`
                          : `/stories/${s.slug}`
                      }
                    >
                      {s.progress ? 'Continue reading' : 'Open story'} <ArrowRight size={16} />
                    </Link>
                    <button className="subtle-button" onClick={() => void remove(s.id)}>
                      <Trash2 size={13} /> Remove from library
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <LibraryIcon />
              <h2>Your next favourite belongs here.</h2>
              <p>Explore a story and save it to your library.</p>
              <Link className="button" href="/discover">
                Find a story <ArrowRight size={16} />
              </Link>
            </div>
          )
        ) : bookmarks.length ? (
          <div className="chapter-list">
            {bookmarks.map((b) => (
              <div className="chapter-row" key={b.chapter.id}>
                <Bookmark size={18} />
                <Link href={`/stories/${b.story.slug}/chapters/${b.chapter.slug}`}>
                  <strong>{b.chapter.title}</strong>
                  <p className="muted small">{b.story.title}</p>
                </Link>
                <button
                  className="icon-link"
                  aria-label={`Remove bookmark for ${b.chapter.title}`}
                  onClick={() => void remove(b.chapter.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Bookmark />
            <h2>Keep a place in the story.</h2>
            <p>Bookmark a chapter while reading to find it here.</p>
          </div>
        )}
        <div className="pagination">
          <button
            className="button secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {pages}
          </span>
          <button
            className="button secondary"
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </RequireSession>
    </div>
  );
}
