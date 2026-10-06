import { LoadingState, StorySkeletons } from '@/components/loading-state';

export default function Loading() {
  return (
    <div className="container page-section">
      <LoadingState />
      <StorySkeletons />
    </div>
  );
}
