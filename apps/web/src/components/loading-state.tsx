import { BookOpen } from 'lucide-react';

export function Spinner() {
  return <span className="loading-spinner" aria-hidden="true" />;
}

export function LoadingState({
  label = 'Opening your next chapter…',
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={compact ? 'loading-state loading-state-compact' : 'loading-state'}
      role="status"
      aria-live="polite"
    >
      <span className="loading-book" aria-hidden="true">
        <BookOpen size={24} strokeWidth={1.5} />
      </span>
      <span>{label}</span>
      <span className="loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

export function StorySkeletons() {
  return (
    <div role="status" aria-label="Loading stories" className="loading-shelf">
      {Array.from({ length: 4 }, (_, i) => (
        <div className="loading-story" key={i} aria-hidden="true">
          <div className="skeleton skeleton-cover" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-author" />
        </div>
      ))}
    </div>
  );
}
