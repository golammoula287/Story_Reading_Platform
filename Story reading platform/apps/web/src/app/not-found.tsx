import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container empty-state">
      <span className="eyebrow">404 · A PAGE OUT OF PLACE</span>
      <h1>This chapter isn’t here.</h1>
      <p>It may be unpublished, or the story may have moved.</p>
      <Link className="button" href="/discover">
        Discover a new story
      </Link>
    </div>
  );
}
