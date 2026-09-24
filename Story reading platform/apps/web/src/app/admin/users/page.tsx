'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import type { Page } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
type Reader = { id: string; name: string; email: string; role: string; status: string };
type ActivityItem = {
  _id: string;
  storyId?: { title: string };
  chapterId?: { title: string };
  blockAnchor?: number;
  updatedAt?: string;
  createdAt?: string;
};
type Activity = Record<'library' | 'bookmarks' | 'progress' | 'reads', ActivityItem[]>;
export default function Users() {
  const [data, setData] = useState<Page<Reader> | null>(null),
    [q, setQ] = useState(''),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [activity, setActivity] = useState<Activity | null>(null),
    [selected, setSelected] = useState<Reader | null>(null);
  async function load() {
    setData(await api(`/admin/users?q=${encodeURIComponent(search)}&page=${page}`));
  }
  useEffect(() => {
    void load().catch((e) => setError(message(e)));
  }, [search, page]);
  async function change(user: Reader, remove = false) {
    if (
      !window.confirm(
        remove
          ? `Delete and anonymize ${user.name}'s account and remove their reading data?`
          : `${user.status === 'active' ? 'Suspend' : 'Reactivate'} ${user.name}'s account? Existing sessions will be signed out.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api(`/admin/users/${user.id}`, {
        method: remove ? 'DELETE' : 'PATCH',
        body: remove
          ? undefined
          : json({ status: user.status === 'active' ? 'suspended' : 'active' }),
      });
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function view(user: Reader) {
    setBusy(true);
    try {
      setActivity(await api(`/admin/users/${user.id}/activity`));
      setSelected(user);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setSearch(q);
    setPage(1);
  }
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">THE PEOPLE BEHIND THE PAGES</span>
          <h1>Your readers</h1>
          <p className="muted">Look after the community that brings your stories to life.</p>
        </div>
      </div>
      <form className="filter-bar" onSubmit={submit}>
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Search readers by name or email"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <button className="button">Search readers</button>
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reader</th>
              <th>Status</th>
              <th>Role</th>
              <th>Manage</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.name}</strong>
                  <small className="block muted">{u.email}</small>
                </td>
                <td>
                  <span className={`badge ${u.status}`}>{u.status}</span>
                </td>
                <td>{u.role}</td>
                <td>
                  <div className="row-actions">
                    <button className="text-link" disabled={busy} onClick={() => void view(u)}>
                      Activity
                    </button>
                    {u.role !== 'admin' && (
                      <>
                        <button
                          className="text-link"
                          disabled={busy}
                          onClick={() => void change(u)}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button
                          className="text-link danger"
                          disabled={busy}
                          onClick={() => void change(u, true)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.items.length && <p className="empty-state">No matching readers.</p>}
      </div>
      <div className="pagination">
        <button
          className="button secondary"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous
        </button>
        <span>
          {page} / {data?.pages ?? 1}
        </span>
        <button
          className="button secondary"
          disabled={!data || page >= data.pages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>
      {selected && activity && (
        <section className="panel">
          <div className="section-heading">
            <h2>{selected.name}’s reading activity</h2>
            <button
              className="icon-link"
              aria-label="Close activity"
              onClick={() => setSelected(null)}
            >
              <X size={20} />
            </button>
          </div>
          <p className="muted small">The most recent 50 entries per category.</p>
          <div className="activity-grid">
            {(['library', 'bookmarks', 'progress', 'reads'] as const).map((key) => (
              <div key={key}>
                <h3>
                  {key === 'progress'
                    ? 'Reading progress'
                    : key === 'reads'
                      ? 'Reading history'
                      : key}
                </h3>
                {activity[key].length ? (
                  activity[key].map((item) => (
                    <p key={item._id} className="activity-item">
                      <strong>
                        {item.chapterId?.title || item.storyId?.title || 'Unavailable content'}
                      </strong>
                      <small>
                        {new Date(item.updatedAt || item.createdAt || '').toLocaleDateString()}
                        {item.blockAnchor !== undefined
                          ? ` · paragraph ${item.blockAnchor + 1}`
                          : ''}
                      </small>
                    </p>
                  ))
                ) : (
                  <p className="muted small">No activity yet.</p>
                )}
              </div>
            ))}
          </div>
          <p className="muted small">
            Comment activity will be available when chapter comments are added in Phase 2.
          </p>
        </section>
      )}
    </>
  );
}
