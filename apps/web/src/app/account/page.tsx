'use client';
import { useState } from 'react';
import { useSession } from '@/components/session';
import { RequireSession } from '@/components/require-session';
import { api, json, message } from '@/lib/api';
export default function Account() {
  const { user, refresh } = useSession();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function confirm() {
    setBusy(true);
    try {
      await api('/me/content-confirmation', { method: 'POST', body: json({ confirmed: true }) });
      await refresh();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-section">
      <RequireSession>
        <div className="page-heading">
          <span className="eyebrow">MAKE YOURSELF AT HOME</span>
          <h1>Your account</h1>
        </div>
        <div className="panel narrow-panel">
          <h2>{user?.name}</h2>
          <p>{user?.email}</p>
          <hr />
          <h3>Mature content preferences</h3>
          <p>
            Some stories contain mature themes. Please confirm that you understand and wish to
            access this content. This is a self-attested content confirmation.
          </p>
          {user?.matureConfirmed ? (
            <p className="success-message">Mature content access confirmed.</p>
          ) : (
            <button disabled={busy} className="button" onClick={() => void confirm()}>
              I understand — show mature content
            </button>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </RequireSession>
    </div>
  );
}
