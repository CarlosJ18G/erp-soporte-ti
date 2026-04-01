'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useClientAuth } from '@/context/ClientAuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

type UserType = 'technician' | 'client';

export default function LoginPage() {
  const { login } = useAuth();
  const { login: loginClient } = useClientAuth();
  const searchParams = useSearchParams();
  const [userType, setUserType] = useState<UserType>('technician');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const role = searchParams.get('role');
    if (role === 'client') {
      setUserType('client');
      return;
    }

    if (role === 'technician') {
      setUserType('technician');
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (userType === 'technician') {
        await login(email, password);
      } else {
        await loginClient(email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Soporte Técnico</h1>
          <p className="text-sm text-slate-500">Inicia sesión en tu cuenta</p>
        </div>

        {/* Toggle de tipo de usuario */}
        <div className="mb-6 flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setUserType('technician')}
            className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-colors ${
              userType === 'technician'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4 inline mr-2" />
            Técnico
          </button>
          <button
            type="button"
            onClick={() => setUserType('client')}
            className={`flex-1 py-2 px-3 rounded-md font-medium text-sm transition-colors ${
              userType === 'client'
                ? 'bg-white text-primary shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Cliente
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            label="Correo electrónico"
            placeholder={userType === 'technician' ? 'admin@soporte.com' : 'cliente@empresa.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <Input
            id="password"
            type="password"
            label="Contraseña"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {userType === 'technician' ? 'Iniciar sesión como técnico' : 'Acceder como cliente'}
          </Button>

          <div className="text-center text-xs text-slate-600">
            <p>
              {userType === 'technician'
                ? '¿No tienes cuenta? Contacta al administrador'
                : '¿Primera vez? El equipo de soporte te creará una cuenta'}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
