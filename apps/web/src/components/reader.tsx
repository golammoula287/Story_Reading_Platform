'use client';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, Lock } from 'lucide-react';
import type { ChapterDto, StoryDto } from '@storyhaven/contracts';
import { useSession } from './session';
import { api, json, message } from '@/lib/api';
import { RewardUnlock } from './reward-unlock';
import { ChapterNarrative } from './in-chapter-ads';
import { ChapterComments } from './chapter-comments';
import { LoadingState } from './loading-state';
import { ReadingPreferencesPanel } from './reading-preferences';
export function Reader({
  story,
  chapter,
  chapters,
  preview,
  gated,
}: {
  story: StoryDto;
  chapter: ChapterDto;
  chapters: ChapterDto[];
  preview: string;
  gated: boolean;
}) {
  const { user, loading } = useSession();
  const [body, setBody] = useState<string | null>(null),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false),
    [notice, setNotice] = useState('');
  const [accessRevision, setAccessRevision] = useState(0);
  const anchor = useRef(0);
  const resumeAnchor = useRef(0);
  const readerRoot = useRef<HTMLDivElement>(null);
  const index = chapters.findIndex((c) => c.id === chapter.id);
  useEffect(() => {
    setBody(null);
    setSaved(false);
    setNotice('');
    setError('');
    if (!user) return;
    let active = true;
    void api<{ body: string }>(`/chapters/${chapter.id}/content`)
      .then(async (result) => {
        if (!active) return;
        setBody(result.body);
        await api(`/chapters/${chapter.id}/read`, { method: 'POST' });
        const progress = await api<{ chapterId: string; blockAnchor: number } | null>(
          `/me/progress/${story.id}`,
        );
        if (!active) return;
        const lastParagraph = Math.max(0, result.body.split(/\n\s*\n/).filter(Boolean).length - 1);
        anchor.current =
          progress?.chapterId === chapter.id ? Math.min(progress.blockAnchor, lastParagraph) : 0;
        resumeAnchor.current = anchor.current;
        if (anchor.current)
          setNotice('Your reading position was saved. Use “Resume position” to return.');
        await api(`/me/progress/${story.id}`, {
          method: 'PUT',
          body: json({ chapterId: chapter.id, blockAnchor: anchor.current }),
        });
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    void api<{ saved: boolean }>(`/me/bookmarks/${chapter.id}`)
      .then((r) => {
        if (active) setSaved(r.saved);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, chapter.id, story.id, accessRevision]);
  useEffect(() => {
    if (!body || !user) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const paragraphs = [...(readerRoot.current?.querySelectorAll('[data-paragraph]') ?? [])];
        const current = paragraphs.findIndex((p) => p.getBoundingClientRect().bottom > 100);
        if (current >= 0) {
          anchor.current = current;
          void api(`/me/progress/${story.id}`, {
            method: 'PUT',
            body: json({ chapterId: chapter.id, blockAnchor: current }),
          }).catch(() => {});
        }
      }, 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [body, user, chapter.id, story.id]);
  async function bookmark() {
    try {
      await api(`/me/bookmarks/${chapter.id}`, {
        method: saved ? 'DELETE' : 'PUT',
        body: json({ blockAnchor: anchor.current }),
      });
      setSaved(!saved);
      setNotice(saved ? 'Bookmark removed.' : 'Chapter bookmarked.');
    } catch (e) {
      setNotice(message(e));
    }
  }
  const text = body ?? preview;
  return (
    <div className="reader-page container" ref={readerRoot}>
      <div className="reader-toolbar">
        <Link className="text-link" href={`/stories/${story.slug}`}>
          <ArrowLeft size={16} /> {story.title}
        </Link>
        {body && (
          <button className="button secondary small-button" onClick={() => void bookmark()}>
            {saved ? <Check size={16} /> : <Bookmark size={16} />}
            {saved ? 'Bookmarked' : 'Bookmark'}
          </button>
        )}
      </div>
      <ReadingPreferencesPanel key={user?.id ?? 'visitor'} userId={user?.id ?? null}>
        <article className="reader-article">
          <span className="eyebrow">CHAPTER {chapter.order}</span>
          <h1>{chapter.title}</h1>
          <p className="reader-byline">
            {story.authorName} <span>✦</span> {story.title}
          </p>
          {notice && (
            <div className="notice" role="status">
              {notice}{' '}
              <button
                className="text-link"
                onClick={() =>
                  readerRoot.current
                    ?.querySelector(`#paragraph-${resumeAnchor.current}`)
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Resume position
              </button>
            </div>
          )}
          <ChapterNarrative
            key={`narrative:${user?.id ?? 'visitor'}:${chapter.id}`}
            text={text}
            chapterId={chapter.id}
            authorized={!!body && !!user}
          />
          {!body && (loading || (!!user && !error)) ? (
            <LoadingState label="Opening your chapter…" compact />
          ) : (
            !body && (
              <div className="reading-gate">
                <Lock size={24} />
                <h2>
                  {gated
                    ? 'A story for mature readers'
                    : chapter.accessType === 'premium'
                      ? 'A little more story awaits.'
                      : 'Keep the story going.'}
                </h2>
                <p>
                  {loading
                    ? 'Checking your reading access…'
                    : error ||
                      (gated
                        ? 'Sign in and confirm mature content access in your account.'
                        : 'Create your free account or sign in to read the full chapter.')}
                </p>
                {!user ? (
                  <Link className="button" href="/sign-in">
                    Sign in to read <ArrowRight size={16} />
                  </Link>
                ) : gated && !user.matureConfirmed ? (
                  <Link className="button" href="/account">
                    Content preferences
                  </Link>
                ) : chapter.accessType === 'premium' ? (
                  <RewardUnlock
                    key={user.id + chapter.id}
                    chapterId={chapter.id}
                    onUnlocked={() => setAccessRevision((value) => value + 1)}
                  />
                ) : (
                  <button
                    className="button secondary"
                    onClick={() => setAccessRevision((value) => value + 1)}
                  >
                    Retry chapter
                  </button>
                )}
              </div>
            )
          )}
          {body && user && (
            <ChapterComments key={`comments:${user.id}:${chapter.id}`} chapterId={chapter.id} />
          )}
          <div className="reader-pagination">
            {chapters[index - 1] ? (
              <Link
                className="button secondary"
                href={`/stories/${story.slug}/chapters/${chapters[index - 1].slug}`}
              >
                <ArrowLeft size={16} /> Previous
              </Link>
            ) : (
              <span />
            )}
            {chapters[index + 1] && (
              <Link
                className="button"
                href={`/stories/${story.slug}/chapters/${chapters[index + 1].slug}`}
              >
                Next chapter <ArrowRight size={16} />
              </Link>
            )}
          </div>
        </article>
      </ReadingPreferencesPanel>
    </div>
  );
}
