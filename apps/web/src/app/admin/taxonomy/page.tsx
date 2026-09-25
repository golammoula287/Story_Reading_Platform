'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { TaxonomyDto } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
const initial = { name: '', slug: '', facet: 'genre', parentId: '' };
export default function Taxonomy() {
  const [terms, setTerms] = useState<TaxonomyDto[]>([]),
    [form, setForm] = useState(initial),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  async function load() {
    setTerms(await api('/taxonomy'));
  }
  useEffect(() => {
    void load().catch((e) => setError(message(e)));
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/admin/taxonomy${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        body: json({ ...form, parentId: form.parentId || null }),
      });
      setForm(initial);
      setEditing(null);
      setNotice('Catalogue value saved.');
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(t: TaxonomyDto) {
    if (
      !window.confirm(`Delete “${t.name}”? Values used by stories or subgenres cannot be deleted.`)
    )
      return;
    setBusy(true);
    try {
      await api(`/admin/taxonomy/${t.id}`, { method: 'DELETE' });
      await load();
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
          <span className="eyebrow">MAKE DISCOVERY A DELIGHT</span>
          <h1>Genres, tropes & tags</h1>
          <p className="muted">A catalogue that grows with your imagination.</p>
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
      <div className="editor-grid">
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Facet</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {terms.map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.name}</strong>
                    {t.parentId && (
                      <small className="block muted">
                        {terms.find((p) => p.id === t.parentId)?.name}
                      </small>
                    )}
                  </td>
                  <td>
                    <span className="badge">{t.facet}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-link"
                        aria-label={`Edit ${t.name}`}
                        onClick={() => {
                          setEditing(t.id);
                          setForm({
                            name: t.name,
                            slug: t.slug,
                            facet: t.facet,
                            parentId: t.parentId || '',
                          });
                          setNotice('');
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-link danger"
                        aria-label={`Delete ${t.name}`}
                        disabled={busy}
                        onClick={() => void remove(t)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!terms.length && <p className="empty-state">Add your first genre to get started.</p>}
        </div>
        <form className="panel stack-form" onSubmit={save}>
          <h3>{editing ? 'Edit catalogue value' : 'Add something new'}</h3>
          <label>
            Name
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Slug
            <input
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="slow-burn"
            />
          </label>
          <label>
            Facet
            <select
              value={form.facet}
              onChange={(e) => setForm({ ...form, facet: e.target.value, parentId: '' })}
            >
              {['genre', 'subgenre', 'trope', 'descriptor', 'tag'].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {form.facet === 'subgenre' && (
            <label>
              Parent genre
              <select
                required
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              >
                <option value="">Choose a genre</option>
                {terms
                  .filter((t) => t.facet === 'genre')
                  .map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <button className="button" disabled={busy}>
            <Plus size={17} />
            {editing ? 'Save changes' : 'Add to catalogue'}
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setEditing(null);
                setForm(initial);
              }}
            >
              Cancel editing
            </button>
          )}
        </form>
      </div>
    </>
  );
}
