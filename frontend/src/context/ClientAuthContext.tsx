'use client';

import React, { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export interface ClientUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientAuthContextValue {
  user: ClientUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const ClientAuthContext = createContext<ClientAuthContextValue | null>(null);

export const ClientAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [{ user, token }, setAuthState] = useState<{ user: ClientUser | null; token: string | null }>(() => {
    if (typeof window === 'undefined') return { user: null, token: null };

    const storedToken = localStorage.getItem('clientToken');
    const storedUser = localStorage.getItem('clientUser');

    if (!storedToken || !storedUser) return { user: null, token: null };

    try {
      return {
        token: storedToken,
        user: JSON.parse(storedUser) as ClientUser,
      };
    } catch {
      return { user: null, token: null };
    }
  });
  const loading = false;

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; client: ClientUser }>('/auth/client-login', {
      email,
      password,
    });
    if (res.data) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('clientToken', res.data.token);
      localStorage.setItem('clientUser', JSON.stringify(res.data.client));
      setAuthState({ token: res.data.token, user: res.data.client });
      router.push('/client-dashboard');
    }
  };

  const logout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('clientUser');
    setAuthState({ token: null, user: null });
    router.push('/login');
  };

  return (
    <ClientAuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth debe ser usado dentro de ClientAuthProvider');
  }
  return context;
};
