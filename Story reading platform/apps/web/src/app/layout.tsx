import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { SessionProvider } from '@/components/session';
import { Navigation } from '@/components/navigation';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Storyhaven — A little escape, one chapter at a time',
    template: '%s · Storyhaven',
  },
  description:
    'Find your next favourite story. Explore serial fiction and keep a little room for imagination.',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <SessionProvider>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Navigation />
          <main id="main">{children}</main>
          <footer className="site-footer container">
            <div>
              <Link className="brand" href="/">
                <BookOpen size={20} />
                Storyhaven<span className="brand-dot">.</span>
              </Link>
              <p>A little room for imagination.</p>
            </div>
            <div className="footer-links">
              <Link href="/discover">Explore stories</Link>
              <Link href="/library">Your library</Link>
              <span>Made for the love of reading.</span>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
