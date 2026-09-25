'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useSession } from './session';
export function RequireSession({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading } = useSession();
  if (loading) return <div className="empty-state">Opening your space…</div>;
  if (!user)
    return (
      <div className="empty-state">
        <h2>A space just for you.</h2>
        <p>Sign in to continue.</p>
        <Link className="button" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  if (admin && user.role !== 'admin')
    return (
      <div className="empty-state">
        <h2>This space is for administrators.</h2>
        <Link href="/">Return home</Link>
      </div>
    );
  return children;
}
