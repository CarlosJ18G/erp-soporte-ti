'use client';

import { useClientAuth } from '@/context/ClientAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useClientAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) return null;

  const menuItems = [
    { label: 'Dashboard', href: '/client-dashboard', icon: '📊' },
    { label: 'Mis Tickets', href: '/client-dashboard/tickets', icon: '🎫' },
    { label: 'Crear Ticket', href: '/client-dashboard/tickets/new', icon: '➕' },
    { label: 'Mis Activos', href: '/client-dashboard/assets', icon: '💾' },
    { label: 'Órdenes de Servicio', href: '/client-dashboard/orders', icon: '📋' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="font-bold text-lg">Soporte</h1>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hover:bg-gray-800 p-2 rounded transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              <span className="text-lg">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {sidebarOpen ? (
            <div className="text-xs mb-3">
              <p className="font-semibold">{user.nombre} {user.apellido}</p>
              <p className="text-gray-400">{user.email}</p>
            </div>
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            onClick={logout}
            className="w-full"
          >
            {sidebarOpen ? (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </>
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
