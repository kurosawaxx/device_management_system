'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { apiClient } from '@/shared/api/client';
import { deleteCookie, getCookie, setCookie } from '@/shared/lib/cookies';
import type { User } from '@/shared/types';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_CACHE_KEY = 'auth_user';

function getCachedUser(): User | null {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: User) {
  sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function clearCachedUser() {
  sessionStorage.removeItem(USER_CACHE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useIsomorphicLayoutEffect(() => {
    const token = getCookie('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    // キャッシュがあれば即座にUI表示し、バックグラウンドでトークン検証
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
    }

    apiClient
      .get<{ user: User }>('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        setCachedUser(res.data.user);
      })
      .catch(() => {
        deleteCookie('auth_token');
        clearCachedUser();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setCookie('auth_token', res.data.token);
    setCachedUser(res.data.user);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiClient.post('/auth/logout').catch(() => {});
    deleteCookie('auth_token');
    clearCachedUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
