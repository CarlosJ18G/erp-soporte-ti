'use client';

import { AuthProvider } from '@/context/AuthContext';
import { ClientAuthProvider } from '@/context/ClientAuthContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientAuthProvider>
        {children}
      </ClientAuthProvider>
    </AuthProvider>
  );
}
