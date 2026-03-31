'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  Wrench,
  Monitor,
  Ticket,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Terminal,
  X,
  Package,
} from 'lucide-react';

const nav = [
  { href: '/dashboard',        label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/clients',          label: 'Clientes',         icon: Users },
  { href: '/technicians',      label: 'Técnicos',         icon: Wrench,      adminOnly: true },
  { href: '/assets',           label: 'Activos',          icon: Monitor },
  { href: '/tickets',          label: 'Tickets',          icon: Ticket },
  { href: '/service-orders',   label: 'Órdenes de servicio', icon: ClipboardList },
  { href: '/spare-parts',      label: 'Repuestos',        icon: Package, adminOnly: true },
  { href: '/work-logs',        label: 'Registros de horas',  icon: Clock },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar = ({ mobileOpen = false, onCloseMobile }: SidebarProps) => {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-900">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-white">Soporte Técnico</span>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Administrador</p>
          </div>
        </div>

        {mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="custom-scrollbar flex-1 overflow-y-auto px-4 py-3">
        <ul className="space-y-1">
          {nav
            .filter(item => !item.adminOnly || isAdmin)
            .map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onCloseMobile}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-white' : 'text-slate-400')} />
                    {label}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      {/* User / Logout */}
      <div className="border-t border-slate-800 p-4">
        {user && (
          <div className="mb-3 rounded-xl bg-slate-800/60 px-3 py-3">
            <p className="truncate text-xs font-semibold text-white">
              {user.nombre} {user.apellido}
            </p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
            {isAdmin && (
              <span className="mt-1 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                Admin
              </span>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
};
