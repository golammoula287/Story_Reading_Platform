'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserDto } from '@storyhaven/contracts';
import { api } from '@/lib/api';
const Context = createContext<{
  user: UserDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setUser(await api<UserDto>('/auth/me'));
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.assign('/');
  }
  useEffect(() => {
    void refresh();
  }, []);
  return <Context.Provider value={{ user, loading, refresh, logout }}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
