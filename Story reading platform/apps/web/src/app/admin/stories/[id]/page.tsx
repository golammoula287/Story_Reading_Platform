'use client';
import { use, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Save, Trash2, ImagePlus } from 'lucide-react';
import type { StoryDto, ChapterDto, TaxonomyDto } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
const empty = {
  title: '',
  slug: '',
  authorName: '',
  prologue: '',
  status: 'draft',
  classification: 'clean',
  taxonomyIds: [] as string[],
  coverKey: null as string | null,
};
export default function StoryEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params),
    isNew = id === 'new',
    router = useRouter();
  const [form, setForm] = useState(empty),
    [chapters, setChapters] = useState<ChapterDto[]>([]),
    [terms, setTerms] = useState<TaxonomyDto[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [ready, setReady] = useState(isNew);
  async function load() {
    const data = await api<{ story: StoryDto; chapters: ChapterDto[] }>(`/admin/stories/${id}`);
    setForm({
      title: data.story.title,
      slug: data.story.slug,
      authorName: data.story.authorName,
      prologue: data.story.prologue,
      status: data.story.status,
      classification: data.story.classification,
      taxonomyIds: data.story.taxonomyIds,
      coverKey: data.story.coverKey,
    });
    setChapters(data.chapters);
    setReady(true);
  }
  useEffect(() => {
    void api<TaxonomyDto[]>('/taxonomy')
      .then(setTerms)
      .catch((e) => setError(message(e)));
    if (!isNew) void load().catch((e) => setError(message(e)));
  }, [id]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const story = await api<StoryDto>(isNew ? '/admin/stories' : `/admin/stories/${id}`, {
        method: isNew ? 'POST' : 'PUT',
        body: json(form),
      });
      if (isNew) router.replace(`/admin/stories/${story.id}`);
      else setNotice('Story saved.');
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    const body = new FormData();
    body.append('cover', file);
    setBusy(true);
    setError('');
    try {
      const data = await api<{ key: string }>('/admin/media', { method: 'POST', body });
      setForm((v) => ({ ...v, coverKey: data.key }));
      setNotice('Cover uploaded and cropped to 2:3. Save the story to apply it.');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function reorder(index: number, offset: number) {
    const copy = [...chapters];
    [copy[index], copy[index + offset]] = [copy[index + offset], copy[index]];
    setBusy(true);
    try {
      await api(`/admin/stories/${id}/chapters/reorder`, {
        method: 'PUT',
        body: json({ ids: copy.map((c) => c.id) }),
      });
      setChapters(copy.map((c, i) => ({ ...c, order: i + 1 })));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm('Delete this story and all its chapters? This cannot be undone.')) return;
    setBusy(true);
    try {
      await api(`/admin/stories/${id}`, { method: 'DELETE' });
      router.push('/admin/stories');
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  function field(key: keyof typeof empty, value: string) {
    setForm((v) => ({ ...v, [key]: value }));
  }
  return (
    <>
      <Link className="text-link" href="/admin/stories">
        <ArrowLeft size={16} /> All stories
      </Link>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">GIVE YOUR WORLD A HOME</span>
          <h1>{isNew ? 'A new story' : 'Edit your story'}</h1>
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
        <form onSubmit={save} className="editor-grid">
          <div className="panel stack-form">
            <label>
              Story title
              <input
                required
                minLength={2}
                maxLength={200}
                value={form.title}
                onChange={(e) => field('title', e.target.value)}
                placeholder="Every story starts with a name"
              />
            </label>
            <div className="form-grid">
              <label>
                URL slug
                <input
                  required
                  value={form.slug}
                  onChange={(e) => field('slug', e.target.value)}
                  placeholder="a-world-of-our-own"
                />
              </label>
              <label>
                Author name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.authorName}
                  onChange={(e) => field('authorName', e.target.value)}
                />
              </label>
            </div>
            <label>
              Prologue / About the story
              <textarea
                rows={9}
                maxLength={12000}
                value={form.prologue}
                onChange={(e) => field('prologue', e.target.value)}
                placeholder="Invite readers into your world…"
              />
            </label>
            <div className="form-grid">
              <label>
                Publication status
                <select value={form.status} onChange={(e) => field('status', e.target.value)}>
                  <option value="draft">Draft — private</option>
                  <option value="published">Published — visible</option>
                </select>
              </label>
              <label>
                Content classification
                <select
                  value={form.classification}
                  onChange={(e) => field('classification', e.target.value)}
                >
                  <option value="clean">Clean</option>
                  <option value="mature">Mature</option>
                </select>
              </label>
            </div>
            <button className="button" disabled={busy}>
              <Save size={17} />
              {busy ? 'Saving…' : 'Save story'}
            </button>
          </div>
          <aside className="stack">
            <div className="panel stack-form">
              <h3>Cover image</h3>
              {form.coverKey ? (
                <img
                  className="cover-preview"
                  src={`/api/v1/media/${form.coverKey}`}
                  alt="Uploaded cover"
                />
              ) : (
                <div className="upload-placeholder">
                  <ImagePlus size={30} />
                  <span>Give your story a face</span>
                </div>
              )}
              <label className="small">
                JPEG, PNG or WebP · max 5 MB
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => void upload(e.target.files?.[0])}
                />
              </label>
              <p className="muted small">Automatically cropped to a 2:3 portrait cover.</p>
            </div>
            <div className="panel">
              <h3>Genres, tropes & tags</h3>
              <div className="taxonomy-checks">
                {terms.map((t) => (
                  <label key={t.id}>
                    <input
                      type="checkbox"
                      checked={form.taxonomyIds.includes(t.id)}
                      onChange={(e) =>
                        setForm((v) => ({
                          ...v,
                          taxonomyIds: e.target.checked
                            ? [...v.taxonomyIds, t.id]
                            : v.taxonomyIds.filter((x) => x !== t.id),
                        }))
                      }
                    />
                    <span>
                      {t.name}
                      <small>{t.facet}</small>
                    </span>
                  </label>
                ))}
              </div>
              {!terms.length && <Link href="/admin/taxonomy">Add your first genre or tag</Link>}
            </div>
          </aside>
        </form>
      )}
      {!isNew && ready && (
        <section className="panel editor-chapters">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ONE CHAPTER AT A TIME</span>
              <h2>Chapters</h2>
            </div>
            <Link className="button" href={`/admin/chapters/new?storyId=${id}`}>
              <Plus size={17} /> Add chapter
            </Link>
          </div>
          {chapters.map((c, i) => (
            <div key={c.id} className="chapter-row">
              <span className="chapter-number">{c.order}</span>
              <Link href={`/admin/chapters/${c.id}`}>
                <strong>{c.title}</strong>
                <span className="small muted">
                  {' '}
                  · {c.status} · {c.accessType}
                </span>
              </Link>
              <div className="row-actions">
                <button
                  type="button"
                  className="icon-link"
                  disabled={busy || i === 0}
                  aria-label={`Move ${c.title} up`}
                  onClick={() => void reorder(i, -1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="icon-link"
                  disabled={busy || i === chapters.length - 1}
                  aria-label={`Move ${c.title} down`}
                  onClick={() => void reorder(i, 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          ))}
          {!chapters.length && (
            <p className="empty-state">Start with the first chapter. The rest will follow.</p>
          )}
          <button className="subtle-button danger" disabled={busy} onClick={() => void remove()}>
            <Trash2 size={15} /> Delete story and chapters
          </button>
        </section>
      )}
    </>
  );
}
