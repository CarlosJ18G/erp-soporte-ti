'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Technician, AuthResponse } from '@/types';
import { api } from '@/lib/api';

interface AuthContextValue {
  user:     Technician | null;
  token:    string | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  logout:   () => void;
  isAdmin:  boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router  = useRouter();
  const [{ user, token }, setAuthState] = useState<{ user: Technician | null; token: string | null }>(() => {
    if (typeof window === 'undefined') return { user: null, token: null };

    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser) return { user: null, token: null };

    try {
      return {
        token: storedToken,
        user: JSON.parse(storedUser) as Technician,
      };
    } catch {
      return { user: null, token: null };
    }
  });
  const loading = false;

  const login = async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    if (res.data) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user',  JSON.stringify(res.data.technician));
      setAuthState({ token: res.data.token, user: res.data.technician });
      router.push('/dashboard');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthState({ token: null, user: null });
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      logout,
      isAdmin: user?.rol === 'ADMIN',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
