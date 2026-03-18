'use client';

import { usePathname } from 'next/navigation';
import { Bell, HelpCircle, LayoutGrid, Menu, Search } from 'lucide-react';

const titles: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/clients':        'Clientes',
  '/technicians':    'Técnicos',
  '/assets':         'Activos',
  '/tickets':        'Tickets',
  '/service-orders': 'Órdenes de servicio',
  '/work-logs':      'Registros de horas',
};

function getTitle(pathname: string) {
  for (const [key, label] of Object.entries(titles)) {
    if (pathname === key || pathname.startsWith(key + '/')) return label;
  }
  return 'Panel';
}

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header = ({ onOpenMobileMenu }: HeaderProps) => {
  const pathname = usePathname();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3 md:gap-5">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden items-center gap-2 text-sm text-slate-400 md:flex">
          <span>Módulos</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-900">{getTitle(pathname)}</span>
        </div>

        <h1 className="truncate text-sm font-semibold text-slate-900 md:hidden">{getTitle(pathname)}</h1>

        <div className="relative ml-1 hidden w-full max-w-sm xl:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar en el sistema..."
            className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        <button className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-primary" />
        </button>
        <button className="hidden rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:inline-flex">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="mx-1 hidden h-8 w-px bg-slate-200 md:block" />
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-slate-200 md:text-sm">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden md:inline">Panel de Control</span>
        </button>
      </div>
    </header>
  );
};
