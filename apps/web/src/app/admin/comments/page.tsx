'use client';
import { useEffect, useState } from 'react';
import type { AdminCommentDto, Page } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
import '@/components/comments.css';
export default function Comments() {
  const [data, setData] = useState<Page<AdminCommentDto> | null>(null);
  const [filter, setFilter] = useState('visible'),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    void api<Page<AdminCommentDto>>(`/admin/comments?status=${filter}&page=${page}&limit=20`)
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
  }, [filter, page, revision]);
  async function moderate(comment: AdminCommentDto) {
    setBusy(true);
    setError('');
    try {
      await api(`/admin/comments/${comment.id}`, {
        method: 'PATCH',
        body: json({ status: comment.status === 'visible' ? 'hidden' : 'visible' }),
      });
      setRevision((value) => value + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">COMMUNITY</span>
          <h1>Chapter comments</h1>
          <p>Hidden comments are removed from reader discussions. You can restore them here.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label>
          Comment status
          <select
            value={filter}
            disabled={busy}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="all">All comments</option>
          </select>
        </label>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading comments...</p>}
      {data?.items.length === 0 && <p className="empty-state">No matching comments.</p>}
      <ul className="comment-list">
        {data?.items.map((comment) => (
          <li key={comment.id}>
            <div className="comment-actions">
              <strong>
                {comment.authorName} · {comment.chapterTitle}
              </strong>
              <span>{comment.status}</span>
            </div>
            <p className="comment-body">{comment.body}</p>
            <small>{new Date(comment.createdAt).toLocaleString()}</small>
            <div>
              <button
                className="button secondary small-button"
                disabled={busy}
                onClick={() => void moderate(comment)}
              >
                {comment.status === 'visible' ? 'Hide comment' : 'Restore comment'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {data && (
        <nav className="pagination" aria-label="Moderation pages">
          <button
            className="button secondary"
            disabled={page === 1 || busy}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            {page} / {Math.max(1, data.pages)}
          </span>
          <button
            className="button secondary"
            disabled={page >= data.pages || busy}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
