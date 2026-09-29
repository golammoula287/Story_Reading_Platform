'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ensureBackendReady } from '@/lib/backend-ready.mjs';

export function BackendStartup() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    ensureBackendReady()
      .then(() => {
        if (cancelled) return;
        // Reload server-rendered data that may have timed out during startup.
        router.refresh();
        window.dispatchEvent(new Event('storyhaven:backend-ready'));
      })
      .catch(() => {
        // Individual pages and forms handle unavailable data without hiding the site.
      });
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
