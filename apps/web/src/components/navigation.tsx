'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BookOpen, Library, Search, ArrowUpRight, LogOut } from 'lucide-react';
import { useSession } from './session';
export function Navigation() {
  const { user, loading, logout } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTrending = pathname === '/discover' && searchParams.get('view') === 'trending';
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link className="brand" href="/" aria-label="Storyhaven home">
          <span className="brand-icon">
            <BookOpen size={23} strokeWidth={1.5} />
          </span>
          {process.env.NEXT_PUBLIC_SITE_NAME || 'Storyhaven'}
          <span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link
            className={
              !isTrending && (pathname === '/' || pathname.startsWith('/discover')) ? 'active' : ''
            }
            href="/discover"
          >
            Discover
          </Link>
          <Link className={isTrending ? 'active' : ''} href="/discover?view=trending">
            Trending
          </Link>
          <Link href="/library">
            <Library size={16} /> My library
          </Link>
        </nav>
        <div className="header-actions">
          <Link className="icon-link" href="/discover" aria-label="Search stories">
            <Search size={19} />
          </Link>
          {loading ? (
            <span className="muted small">One moment…</span>
          ) : user ? (
            <>
              <Link className="account-link" href={user.role === 'admin' ? '/admin' : '/account'}>
                {user.role === 'admin' ? 'Studio' : user.name.split(' ')[0]}
              </Link>
              <button className="icon-link" onClick={() => void logout()} aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link className="button small-button" href="/sign-in">
              Sign in <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
