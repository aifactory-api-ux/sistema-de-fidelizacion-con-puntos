'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from './api';

export type UserRole = 'SOCIO' | 'ADMIN' | 'ATENCION_CLIENTE' | 'AUDITOR';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  customerId: string | null;
  firstName: string | null;
  lastName: string | null;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  customerId: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    consent?: boolean;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function storeTokens(tokens: AuthTokens) {
  window.localStorage.setItem('accessToken', tokens.accessToken);
  window.localStorage.setItem('refreshToken', tokens.refreshToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem('accessToken');
        window.localStorage.removeItem('refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const tokens = await api.post<AuthTokens>('/auth/login', { email, password });
    storeTokens(tokens);
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
  }

  async function register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    consent?: boolean;
  }) {
    const tokens = await api.post<AuthTokens>('/auth/register', data);
    storeTokens(tokens);
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
  }

  function logout() {
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('refreshToken');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

export { ApiError };
