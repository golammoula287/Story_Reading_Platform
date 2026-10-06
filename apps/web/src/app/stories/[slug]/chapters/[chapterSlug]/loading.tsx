import { LoadingState } from '@/components/loading-state';

export default function Loading() {
  return (
    <div className="container loading-reader">
      <LoadingState label="Opening your chapter…" />
      <div aria-hidden="true" className="loading-paragraphs">
        {Array.from({ length: 9 }, (_, i) => <div key={i} className="skeleton skeleton-line" />)}
      </div>
    </div>
  );
}
