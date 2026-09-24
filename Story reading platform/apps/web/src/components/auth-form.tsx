'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { api, json, message } from '@/lib/api';
import { useSession } from './session';
export function AuthForm({ register = false }: { register?: boolean }) {
  const { refresh } = useSession();
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [google, setGoogle] = useState(false);
  useEffect(() => {
    void api<{ google: boolean }>('/auth/providers')
      .then((r) => setGoogle(r.google))
      .catch(() => {});
    const code = new URLSearchParams(window.location.search).get('error');
    if (code)
      setError(
        code === 'existing-account'
          ? 'An account already uses this email. Sign in with your password; automatic account linking is disabled.'
          : 'Google Sign-In could not be completed. Please try again or use your email.',
      );
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    try {
      await api(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST',
        body: json(Object.fromEntries(form)),
      });
      await refresh();
      window.location.assign('/library');
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout container">
      <div className="auth-aside">
        <BookOpen size={35} strokeWidth={1.3} />
        <span className="eyebrow">A PLACE FOR YOUR STORIES</span>
        <h1>
          Somewhere
          <br />
          between a page
          <br />
          and a <em>possibility.</em>
        </h1>
        <p>Your favourites, your bookmarks, your own little escape.</p>
        <span className="auth-decoration">✳</span>
      </div>
      <div className="auth-card">
        <span className="eyebrow">{register ? 'A NEW CHAPTER' : 'GOOD TO SEE YOU AGAIN'}</span>
        <h2>{register ? 'Make yourself at home.' : 'Welcome back.'}</h2>
        <p className="muted">
          {register
            ? 'A few details, and a world of stories awaits.'
            : 'Your next chapter is right where you left it.'}
        </p>
        {google && (
          <>
            <a className="button secondary google-button" href="/api/v1/auth/google">
              <strong>G</strong> Continue with Google
            </a>
            <div className="divider">
              <span>or with your email</span>
            </div>
          </>
        )}
        <form onSubmit={submit} className="stack-form">
          {register && (
            <label>
              Your name
              <input
                required
                name="name"
                autoComplete="name"
                minLength={2}
                maxLength={80}
                placeholder="What should we call you?"
              />
            </label>
          )}
          <label>
            Email address
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              name="password"
              autoComplete={register ? 'new-password' : 'current-password'}
              minLength={12}
              maxLength={128}
              placeholder={register ? 'At least 12 characters' : 'Your password'}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button full-width" disabled={busy}>
            {busy ? 'One moment…' : register ? 'Create your account' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already have an account?' : 'New around here?'}{' '}
          <Link href={register ? '/sign-in' : '/sign-up'}>
            {register ? 'Sign in' : 'Join the story'}
          </Link>
        </p>
      </div>
    </div>
  );
}
