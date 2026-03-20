'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, HelpCircle, Menu, Search } from 'lucide-react';

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

const moduleLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clientes' },
  { href: '/technicians', label: 'Técnicos' },
  { href: '/assets', label: 'Activos' },
  { href: '/tickets', label: 'Tickets' },
  { href: '/service-orders', label: 'Órdenes de servicio' },
  { href: '/work-logs', label: 'Registros de horas' },
];

export const Header = ({ onOpenMobileMenu }: HeaderProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const filteredModules = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return moduleLinks;
    return moduleLinks.filter((item) => item.label.toLowerCase().includes(term));
  }, [search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navigateToModule = (href: string) => {
    setSearchOpen(false);
    setSearch('');
    router.push(href);
  };

  const onSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!filteredModules.length) return;
    navigateToModule(filteredModules[0].href);
  };

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

        <form onSubmit={onSearchSubmit} className="relative ml-1 hidden w-full max-w-sm lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setTimeout(() => setSearchOpen(false), 120)}
            placeholder="Buscar módulo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2 pl-10 pr-12 text-sm text-slate-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 xl:inline">
            Ctrl+K
          </kbd>

          {searchOpen && (
            <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-20 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {filteredModules.length ? (
                <ul className="max-h-72 overflow-y-auto py-1.5">
                  {filteredModules.map((item) => (
                    <li key={item.href}>
                      <button
                        type="button"
                        onClick={() => navigateToModule(item.href)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        <span>{item.label}</span>
                        <span className="text-xs text-slate-400">{item.href}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-3 text-sm text-slate-500">Sin coincidencias</p>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3">
        <button className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-primary" />
        </button>
        <button className="hidden rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 md:inline-flex">
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
