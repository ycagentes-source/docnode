import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { saveToken, getToken, clearToken } from './secureStorage';

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

type AuthState = {
  user: User | null | undefined; // undefined = loading
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  const refreshUser = useCallback(async () => {
    const t = await getToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get<User>('/api/auth/me');
      setUser(me);
    } catch {
      await clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ user: User; access_token: string }>('/api/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    await saveToken(data.access_token);
    setUser(data.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    // Register, then login to get token
    await api.post('/api/auth/register', { name, email: email.trim().toLowerCase(), password });
    const data = await api.post<{ user: User; access_token: string }>('/api/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    await saveToken(data.access_token);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {}
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
