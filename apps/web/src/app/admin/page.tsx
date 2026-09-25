'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Plus, BookOpen, Users, FileText, Layers } from 'lucide-react';
import { api, message } from '@/lib/api';
import { useSession } from '@/components/session';
export default function AdminHome() {
  const { user } = useSession();
  const [data, setData] = useState<Record<string, number> | null>(null),
    [error, setError] = useState('');
  useEffect(() => {
    void api<Record<string, number>>('/admin/overview')
      .then(setData)
      .catch((e) => setError(message(e)));
  }, []);
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">YOUR CREATIVE SPACE</span>
          <h1>Hello, {user?.name.split(' ')[0]}.</h1>
          <p className="muted">Let’s bring your next chapter to life.</p>
        </div>
        <Link className="button" href="/admin/stories/new">
          <Plus size={17} /> New story
        </Link>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="stat-grid">
        {[
          { key: 'stories', title: 'Stories', icon: BookOpen },
          { key: 'chapters', title: 'Chapters', icon: Layers },
          { key: 'readers', title: 'Readers', icon: Users },
          { key: 'drafts', title: 'Chapter drafts', icon: FileText },
        ].map(({ key, title, icon: Icon }) => (
          <div className="stat-card" key={key}>
            <span>
              <Icon size={20} />
            </span>
            <strong>{data?.[key] ?? '—'}</strong>
            <p>{title}</p>
          </div>
        ))}
      </div>
      <div className="studio-welcome">
        <span className="eyebrow">A GOOD DAY TO TELL A STORY</span>
        <h2>
          The next world is
          <br />
          waiting to be written.
        </h2>
        <p>
          Create a story, add your chapters, and publish when you’re ready.
          <br />
          Your drafts stay private until you share them.
        </p>
        <Link href="/admin/stories" className="button">
          Open your stories <ArrowRight size={17} />
        </Link>
        <span className="welcome-flower">✳</span>
      </div>
      <div className="admin-help-grid">
        <Link className="panel" href="/admin/taxonomy">
          <h3>
            Help readers find their favourites <ArrowRight size={17} />
          </h3>
          <p>Organize genres, tropes and tags. Your catalogue grows with you.</p>
        </Link>
        <Link className="panel" href="/admin/users">
          <h3>
            A space for your readers <ArrowRight size={17} />
          </h3>
          <p>View accounts, inspect reading activity, and manage access.</p>
        </Link>
      </div>
    </>
  );
}
