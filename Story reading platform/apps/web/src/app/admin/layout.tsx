'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookOpen, Tags, Users, ArrowUpRight } from 'lucide-react';
import { RequireSession } from '@/components/require-session';
const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/stories', label: 'Stories & chapters', icon: BookOpen },
  { href: '/admin/taxonomy', label: 'Genres & tags', icon: Tags },
  { href: '/admin/users', label: 'Readers', icon: Users },
];
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <RequireSession admin>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <span className="eyebrow">THE STORYHAVEN STUDIO</span>
          <h2>Room to create.</h2>
          <nav aria-label="Studio navigation">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={
                  (href === '/admin' ? path === href : path.startsWith(href)) ? 'selected' : ''
                }
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
          </nav>
          <Link className="text-link" href="/">
            View your website <ArrowUpRight size={16} />
          </Link>
          <div className="studio-note">
            <span>✳</span>
            <p>
              Every great story
              <br />
              starts with a first line.
            </p>
          </div>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </RequireSession>
  );
}
