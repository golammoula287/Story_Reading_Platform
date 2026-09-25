'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
import type { StoryDto, Page } from '@storyhaven/contracts';
import { api, message } from '@/lib/api';
export default function AdminStories() {
  const [data, setData] = useState<Page<StoryDto> | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState('');
  useEffect(() => {
    void api<Page<StoryDto>>(`/admin/stories?page=${page}`)
      .then(setData)
      .catch((e) => setError(message(e)));
  }, [page]);
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">FROM FIRST LINE TO FINAL CHAPTER</span>
          <h1>Your stories</h1>
          <p className="muted">A home for every world you’re building.</p>
        </div>
        <Link className="button" href="/admin/stories/new">
          <Plus size={17} /> New story
        </Link>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Story</th>
              <th>Author</th>
              <th>Status</th>
              <th>Content</th>
              <th>
                <span className="sr-only">Action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link href={`/admin/stories/${s.id}`}>
                    <strong>{s.title}</strong>
                  </Link>
                </td>
                <td>{s.authorName}</td>
                <td>
                  <span className={`badge ${s.status}`}>{s.status}</span>
                </td>
                <td>{s.classification}</td>
                <td>
                  <Link className="text-link" href={`/admin/stories/${s.id}`}>
                    Edit <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.items.length && (
          <div className="empty-state">
            <h3>Your first story starts here.</h3>
            <Link href="/admin/stories/new" className="text-link">
              Create a story
            </Link>
          </div>
        )}
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
    </>
  );
}
