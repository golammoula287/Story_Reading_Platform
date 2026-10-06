'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  displayAdProvider,
  type DisplayAdOutcome,
  type DisplayAdProvider,
} from '@/lib/display-ads';
import './in-chapter-ads.css';
export function AdSlot({
  provider,
  slotId,
  consent,
  onConsent,
}: {
  provider: DisplayAdProvider;
  slotId: string;
  consent: boolean | null;
  onConsent: (value: boolean) => void;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DisplayAdOutcome | 'loading'>('loading');
  const allowed = !provider.requiresConsent || consent === true;
  useEffect(() => {
    if (!allowed || !target.current) return;
    let active = true;
    let dispose: (() => void) | undefined;
    const element = target.current;
    setState('loading');
    const timer = setTimeout(() => {
      if (active) {
        active = false;
        setState('error');
        element.replaceChildren();
      }
    }, 8000);
    try {
      dispose = provider.mount(element, slotId, (outcome) => {
        if (!active) return;
        clearTimeout(timer);
        setState(outcome);
        if (outcome !== 'filled') element.replaceChildren();
      });
    } catch {
      clearTimeout(timer);
      setState('error');
      element.replaceChildren();
    }
    return () => {
      active = false;
      clearTimeout(timer);
      try {
        dispose?.();
      } catch {
        /* Ad cleanup cannot interrupt reading. */
      }
      element.replaceChildren();
    };
  }, [allowed, provider, slotId]);
  return (
    <aside
      className="in-chapter-ad"
      aria-label="Advertisement"
      data-ad-state={allowed ? state : 'consent'}
    >
      <small>Advertisement</small>
      {!allowed ? (
        consent === null ? (
          <div>
            <p>Allow an advertisement in this chapter?</p>
            <button className="button secondary small-button" onClick={() => onConsent(true)}>
              Allow ads for this chapter
            </button>
            <button className="button secondary small-button" onClick={() => onConsent(false)}>
              Not now
            </button>
          </div>
        ) : (
          <p>Ads are not loaded.</p>
        )
      ) : null}
      <div
        ref={target}
        className="ad-creative"
        hidden={!allowed || (state !== 'filled' && state !== 'loading')}
      />
      {allowed && state !== 'filled' && (
        <p role="status">
          {state === 'loading'
            ? 'Loading advertisement...'
            : state === 'no-fill'
              ? 'No advertisement available.'
              : state === 'blocked'
                ? 'Advertisement blocked. You can keep reading.'
                : 'Advertisement unavailable. You can keep reading.'}
        </p>
      )}
    </aside>
  );
}
export function ChapterNarrative({
  text,
  chapterId,
  authorized,
  provider = displayAdProvider,
}: {
  text: string;
  chapterId: string;
  authorized: boolean;
  provider?: DisplayAdProvider | null;
}) {
  const [consent, setConsent] = useState<boolean | null>(null);
  const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
  return (
    <div className="narrative">
      {paragraphs.map((paragraph, i) => (
        <Fragment key={i}>
          <p data-paragraph id={`paragraph-${i}`}>
            {paragraph}
          </p>
          {authorized && provider && (i + 1) % 6 === 0 && i < paragraphs.length - 1 && (
            <AdSlot
              provider={provider}
              slotId={`${chapterId}-${i}`}
              consent={consent}
              onConsent={setConsent}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
