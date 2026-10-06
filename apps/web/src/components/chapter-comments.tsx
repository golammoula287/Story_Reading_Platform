'use client';
import { useEffect, useState, type FormEvent } from 'react';
import type { CommentDto, Page } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
import './comments.css';
export function ChapterComments({ chapterId }: { chapterId: string }) {
  const [data, setData] = useState<Page<CommentDto> | null>(null);
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [body, setBody] = useState(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    void api<Page<CommentDto>>(`/chapters/${chapterId}/comments?page=${page}&limit=10`)
      .then((result) => {
        if (active) {
          if (page > Math.max(1, result.pages)) setPage(Math.max(1, result.pages));
          else setData(result);
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [chapterId, page, revision]);
  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);
  async function post(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/chapters/${chapterId}/comments`, { method: 'POST', body: json({ body }) });
      setBody('');
      setPage(1);
      setRevision((value) => value + 1);
      setNotice('Comment posted.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await api(`/chapters/${chapterId}/comments/${id}`, { method: 'DELETE' });
      setRevision((value) => value + 1);
      setNotice('Comment deleted.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="chapter-comments" aria-labelledby="comments-heading">
      <div className="section-heading">
        <h2 id="comments-heading">Chapter discussion</h2>
        <button
          className="button secondary small-button"
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh comments
        </button>
      </div>
      <p>Share your thoughts on this chapter. Please be kind to other readers.</p>
      <form onSubmit={(event) => void post(event)}>
        <label htmlFor="chapter-comment">Your comment</label>
        <textarea
          id="chapter-comment"
          required
          maxLength={2000}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          disabled={busy}
        />
        <div className="comment-actions">
          <small>{body.length}/2000</small>
          <button className="button" disabled={busy || !body.trim()}>
            {busy ? 'Please wait...' : 'Post comment'}
          </button>
        </div>
      </form>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data && !error && <p role="status">Loading comments...</p>}
      {data?.items.length === 0 && <p>No comments yet. Start the discussion.</p>}
      <ul className="comment-list">
        {data?.items.map((comment) => (
          <li key={comment.id}>
            <div className="comment-actions">
              <strong>{comment.authorName}</strong>
              <time dateTime={comment.createdAt}>
                {new Date(comment.createdAt).toLocaleDateString()}
              </time>
            </div>
            <p className="comment-body">{comment.body}</p>
            {comment.own && (
              <button
                className="button secondary small-button"
                disabled={busy}
                onClick={() => void remove(comment.id)}
              >
                Delete my comment
              </button>
            )}
          </li>
        ))}
      </ul>
      {data && data.pages > 1 && (
        <nav className="pagination" aria-label="Comment pages">
          <button
            className="button secondary"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            Previous comments
          </button>
          <span>
            {page} / {data.pages}
          </span>
          <button
            className="button secondary"
            disabled={page >= data.pages || busy}
            onClick={() => setPage(page + 1)}
          >
            Next comments
          </button>
        </nav>
      )}
    </section>
  );
}
