'use client';
import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import type { ChapterDto } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
const initial = {
  title: '',
  slug: '',
  status: 'draft',
  accessType: 'free',
  publishAt: '',
  freeAt: '',
  body: '',
  preview: { mode: 'percentage', value: 20 },
};
const localDate = (date: string | null) =>
  date
    ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
export default function ChapterEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params),
    isNew = id === 'new',
    router = useRouter();
  const [storyId, setStoryId] = useState(''),
    [form, setForm] = useState(initial),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(isNew);
  useEffect(() => {
    if (isNew) setStoryId(new URLSearchParams(window.location.search).get('storyId') || '');
    else
      void api<ChapterDto & { body: string }>(`/admin/chapters/${id}`)
        .then((c) => {
          setStoryId(c.storyId);
          setForm({
            title: c.title,
            slug: c.slug,
            status: c.status,
            accessType: c.accessType,
            publishAt: localDate(c.publishAt),
            freeAt: localDate(c.freeAt),
            body: c.body,
            preview: c.preview,
          });
          setReady(true);
        })
        .catch((e) => setError(message(e)));
  }, [id]);
  function field(key: string, value: string) {
    setForm((v) => ({ ...v, [key]: value }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const data = {
        ...form,
        publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
        freeAt: form.freeAt ? new Date(form.freeAt).toISOString() : null,
      };
      const result = await api<ChapterDto | undefined>(
        isNew ? `/admin/stories/${storyId}/chapters` : `/admin/chapters/${id}`,
        { method: isNew ? 'POST' : 'PUT', body: json(data) },
      );
      if (result && isNew) router.replace(`/admin/chapters/${result.id}`);
      setNotice('Chapter saved.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm('Permanently delete this chapter?')) return;
    setBusy(true);
    try {
      await api(`/admin/chapters/${id}`, { method: 'DELETE' });
      router.push(`/admin/stories/${storyId}`);
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <>
      <Link className="text-link" href={storyId ? `/admin/stories/${storyId}` : '/admin/stories'}>
        <ArrowLeft size={16} /> Back to story
      </Link>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">LET THE STORY UNFOLD</span>
          <h1>{isNew ? 'A new chapter' : 'Edit chapter'}</h1>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {ready && (
        <form className="editor-grid" onSubmit={save}>
          <div className="panel stack-form">
            <label>
              Chapter title
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.title}
                onChange={(e) => field('title', e.target.value)}
              />
            </label>
            <label>
              URL slug
              <input
                required
                value={form.slug}
                onChange={(e) => field('slug', e.target.value)}
                placeholder="chapter-one"
              />
            </label>
            <label>
              Chapter text
              <textarea
                className="chapter-textarea"
                required
                rows={24}
                maxLength={200000}
                value={form.body}
                onChange={(e) => field('body', e.target.value)}
                placeholder="Begin here. Separate paragraphs with a blank line."
              />
            </label>
            <span className="muted small">
              Plain text keeps your story safe and readable. HTML is displayed as text.
            </span>
            <button className="button" disabled={busy || !storyId}>
              <Save size={17} /> {busy ? 'Saving…' : 'Save chapter'}
            </button>
          </div>
          <aside className="stack">
            <div className="panel stack-form">
              <h3>Publication</h3>
              <label>
                Status
                <select value={form.status} onChange={(e) => field('status', e.target.value)}>
                  <option value="draft">Draft — private</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </label>
              {form.status === 'scheduled' && (
                <label>
                  Publish at
                  <input
                    type="datetime-local"
                    required
                    value={form.publishAt}
                    onChange={(e) => field('publishAt', e.target.value)}
                  />
                </label>
              )}
              <p className="muted small">
                Times use your browser’s local timezone and are stored in UTC.
              </p>
              <label>
                Chapter access
                <select
                  value={form.accessType}
                  onChange={(e) => field('accessType', e.target.value)}
                >
                  <option value="free">Free for signed-in readers</option>
                  <option value="premium">Premium / locked</option>
                </select>
              </label>
              {form.accessType === 'premium' && (
                <label>
                  Automatically become free (optional)
                  <input
                    type="datetime-local"
                    value={form.freeAt}
                    onChange={(e) => field('freeAt', e.target.value)}
                  />
                </label>
              )}
            </div>
            <div className="panel stack-form">
              <h3>Public preview</h3>
              <label>
                Preview type
                <select
                  value={form.preview.mode}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      preview: { ...v.preview, mode: e.target.value, value: 20 },
                    }))
                  }
                >
                  <option value="percentage">Percentage of words</option>
                  <option value="words">Word count</option>
                </select>
              </label>
              <label>
                Preview amount
                <input
                  type="number"
                  min={0}
                  max={form.preview.mode === 'percentage' ? 99 : 10000}
                  required
                  value={form.preview.value}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      preview: { ...v.preview, value: Number(e.target.value) },
                    }))
                  }
                />
              </label>
              <p className="muted small">
                The public preview always stays shorter than the full chapter.
              </p>
            </div>
            {!isNew && (
              <button
                type="button"
                disabled={busy}
                className="subtle-button danger"
                onClick={() => void remove()}
              >
                <Trash2 size={15} /> Delete chapter
              </button>
            )}
          </aside>
        </form>
      )}
    </>
  );
}
