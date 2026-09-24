'use client';
import { useEffect, useState } from 'react';
import { Bookmark, Check } from 'lucide-react';
import { useSession } from './session';
import { api, message } from '@/lib/api';
export function LibraryButton({ storyId }: { storyId: string }) {
  const { user } = useSession();
  const [saved, setSaved] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    if (user)
      void api<{ saved: boolean }>(`/me/library/${storyId}`)
        .then((r) => setSaved(r.saved))
        .catch((e) => setError(message(e)));
  }, [storyId, user]);
  async function toggle() {
    if (!user) {
      window.location.assign('/sign-in');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api(`/me/library/${storyId}`, { method: saved ? 'DELETE' : 'PUT' });
      setSaved(!saved);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button secondary" onClick={() => void toggle()} disabled={busy}>
        {saved ? <Check size={17} /> : <Bookmark size={17} />}
        {saved ? 'In your library' : 'Save to library'}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
