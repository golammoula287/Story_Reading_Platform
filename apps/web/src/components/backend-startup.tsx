'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ensureBackendReady } from '@/lib/backend-ready.mjs';

export function BackendStartup() {
  const router = useRouter();
  const [state, setState] = useState<'starting' | 'ready' | 'failed'>('starting');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    ensureBackendReady()
      .then(() => {
        if (cancelled) return;
        setState('ready');
        // Reload server-rendered data that may have timed out during startup.
        router.refresh();
        window.dispatchEvent(new Event('storyhaven:backend-ready'));
      })
      .catch(() => {
        if (!cancelled) setState('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, router]);
  if (state === 'ready') return null;
  return (
    <div className="backend-startup" role="status" aria-live="polite">
      <div className="backend-startup-card">
        <h2>
          {state === 'starting' ? 'Getting your stories ready' : 'Unable to connect right now'}
        </h2>
        <p>
          {state === 'starting'
            ? 'The service is starting. This can take up to two minutes. This page will update automatically.'
            : 'Please try again in a moment.'}
        </p>
        {state === 'failed' && (
          <button
            className="button"
            onClick={() => {
              setState('starting');
              setAttempt((value) => value + 1);
            }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
