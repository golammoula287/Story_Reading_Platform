'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { defaultReadingPreferences, type ReadingPreferences } from '@storyhaven/contracts';
import { api, json, message } from '@/lib/api';
import './reading-preferences.css';

export function ReadingPreferencesPanel({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [preferences, setPreferences] = useState<ReadingPreferences>(defaultReadingPreferences);
  const [ready, setReady] = useState(!userId);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setPreferences(defaultReadingPreferences);
    setReady(!userId);
    setStatus('');
    if (userId)
      void api<ReadingPreferences>('/me/preferences')
        .then((value) => {
          if (active) {
            setPreferences(value);
            setReady(true);
          }
        })
        .catch((error) => {
          if (active) setStatus(message(error));
        });
    return () => {
      active = false;
    };
  }, [userId, reload]);
  async function save() {
    setSaving(true);
    setStatus('');
    try {
      await api('/me/preferences', { method: 'PUT', body: json(preferences) });
      setStatus('Reading settings saved to your account.');
    } catch (error) {
      setStatus(message(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section
      className="reading-surface"
      data-theme={preferences.theme}
      data-font={preferences.fontFamily}
      style={{ '--reading-font-size': `${preferences.fontSize}px` } as React.CSSProperties}
    >
      <details className="reading-settings">
        <summary>Reading settings</summary>
        <fieldset disabled={!ready || saving}>
          <legend>Appearance</legend>
          <label>
            Theme
            <select
              value={preferences.theme}
              onChange={(e) => {
                setPreferences({
                  ...preferences,
                  theme: e.target.value as ReadingPreferences['theme'],
                });
                setStatus('');
              }}
            >
              <option value="day">Day</option>
              <option value="night">Night</option>
              <option value="grey">Grey</option>
              <option value="off-white">Off-White</option>
            </select>
          </label>
          <label>
            Font
            <select
              value={preferences.fontFamily}
              onChange={(e) => {
                setPreferences({
                  ...preferences,
                  fontFamily: e.target.value as ReadingPreferences['fontFamily'],
                });
                setStatus('');
              }}
            >
              <option value="serif">Serif</option>
              <option value="sans-serif">Sans-serif</option>
            </select>
          </label>
          <label>
            Font size: {preferences.fontSize} px
            <input
              type="range"
              min="16"
              max="32"
              step="1"
              value={preferences.fontSize}
              onChange={(e) => {
                setPreferences({ ...preferences, fontSize: Number(e.target.value) });
                setStatus('');
              }}
            />
          </label>
          {userId ? (
            <button className="button" onClick={() => void save()}>
              {saving ? 'Saving...' : 'Save reading settings'}
            </button>
          ) : (
            <p>Sign in to save settings across devices.</p>
          )}
        </fieldset>
        {!ready && !status && <p role="status">Loading reading settings...</p>}
        {status && <p role="status">{status}</p>}
        {!ready && status && (
          <button className="button secondary" onClick={() => setReload(reload + 1)}>
            Retry settings
          </button>
        )}
      </details>
      {children}
    </section>
  );
}
