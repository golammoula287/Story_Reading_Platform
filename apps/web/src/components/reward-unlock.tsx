'use client';
import { useEffect, useState } from 'react';
import { api, json, message } from '@/lib/api';
type RewardSession = { id: string; status: string; expiresAt: string; launchUrl?: string };
export function RewardUnlock({
  chapterId,
  onUnlocked,
}: {
  chapterId: string;
  onUnlocked: () => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [session, setSession] = useState<RewardSession | null>(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void api<{ available: boolean }>('/rewards/availability')
      .then((result) => {
        if (active) setAvailable(result.available);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [revision]);
  useEffect(() => {
    if (!session || session.status !== 'pending') return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await api<RewardSession>(`/reward-sessions/${session.id}`);
        if (!active) return;
        setError('');
        if (result.status === 'verified') {
          onUnlocked();
          setSession(result);
          return;
        }
        if (result.status !== 'pending') {
          setSession(result);
          return;
        }
      } catch (e) {
        if (active) setError(message(e));
      }
      if (active) {
        if (Date.now() > new Date(session.expiresAt).getTime() + 300000)
          setSession({ ...session, status: 'expired' });
        else timer = setTimeout(() => void poll(), 3000);
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session?.id, session?.status, revision]);
  async function start() {
    setBusy(true);
    setError('');
    try {
      const result = await api<RewardSession>(`/chapters/${chapterId}/reward-sessions`, {
        method: 'POST',
        body: json({}),
      });
      if (result.status === 'entitled') onUnlocked();
      else setSession(result);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!session) return;
    setBusy(true);
    try {
      await api(`/reward-sessions/${session.id}`, { method: 'DELETE' });
      setSession({ ...session, status: 'cancelled' });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Unlock chapter">
      {available === null && !error && <p role="status">Checking rewarded ad availability...</p>}
      {available === false && <p>Rewarded ads are not available yet. Please check back later.</p>}
      {session?.status === 'pending' ? (
        <>
          <p role="status">
            Waiting for confirmed ad completion. Your chapter stays locked until confirmation
            arrives.
          </p>
          {session.launchUrl && (
            <a
              className="button"
              href={session.launchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open rewarded ad
            </a>
          )}
          <button className="button secondary" disabled={busy} onClick={() => void cancel()}>
            Cancel ad attempt
          </button>
        </>
      ) : (
        <>
          {session && session.status !== 'verified' && (
            <p role="status">
              {session.status === 'expired'
                ? 'This ad attempt expired. A completion received late may still be confirmed; check access before watching again.'
                : 'The ad did not unlock this chapter. You can try again.'}
            </p>
          )}
          {available && (
            <button className="button" disabled={busy} onClick={() => void start()}>
              {busy ? 'Preparing ad...' : 'Unlock with a rewarded ad'}
            </button>
          )}
        </>
      )}
      <button
        className="button secondary small-button"
        disabled={busy}
        onClick={() => {
          setRevision((value) => value + 1);
          onUnlocked();
        }}
      >
        Check access again
      </button>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
