'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Ticket } from '@/types';
import { LoadingSpinner } from '@/components/ui/States';
import { Badge, ticketPriorityVariant, ticketStatusVariant } from '@/components/ui/Badge';
import { formatDate, fmt } from '@/lib/utils';
import { Ticket as TicketIcon, Users, Monitor, ClipboardList } from 'lucide-react';

type DashboardFilter = 'ALL' | 'ABIERTO' | 'EN_PROGRESO' | 'RESUELTO' | 'CRITICA';

interface Stats {
  abiertos:    number;
  enProgreso:  number;
  resueltos:   number;
  criticos:    number;
}

export default function DashboardPage() {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [stats,    setStats]    = useState<Stats | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('ALL');

  useEffect(() => {
    api.get<Ticket[]>('/tickets')
      .then(res => {
        const list = res.data ?? [];
        setTickets(list);
        setStats({
          abiertos:   list.filter(t => t.estado === 'ABIERTO').length,
          enProgreso: list.filter(t => t.estado === 'EN_PROGRESO').length,
          resueltos:  list.filter(t => t.estado === 'RESUELTO').length,
          criticos:   list.filter(t => t.prioridad === 'CRITICA' && t.estado !== 'CERRADO').length,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { key: 'ABIERTO' as DashboardFilter, label: 'Tickets abiertos', value: stats?.abiertos ?? '-', icon: TicketIcon, color: 'bg-primary/10 text-primary' },
    { key: 'EN_PROGRESO' as DashboardFilter, label: 'En progreso', value: stats?.enProgreso ?? '-', icon: ClipboardList, color: 'bg-yellow-50 text-yellow-600' },
    { key: 'RESUELTO' as DashboardFilter, label: 'Resueltos', value: stats?.resueltos ?? '-', icon: Monitor, color: 'bg-green-50 text-green-600' },
    { key: 'CRITICA' as DashboardFilter, label: 'Tickets criticos', value: stats?.criticos ?? '-', icon: Users, color: 'bg-red-50 text-red-600' },
  ];

  const filteredTickets = tickets
    .filter((t) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'CRITICA') return t.prioridad === 'CRITICA' && t.estado !== 'CERRADO';
      return t.estado === activeFilter;
    })
    .slice(0, 5);

  const filterLabel = activeFilter === 'ALL' ? 'Todos' : fmt(activeFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(c => (
          <button
            key={c.label}
            type="button"
            onClick={() => setActiveFilter((prev) => (prev === c.key ? 'ALL' : c.key))}
            className={`rounded-xl bg-white p-5 shadow-sm border text-left transition hover:-translate-y-0.5 hover:shadow-md ${activeFilter === c.key ? 'border-primary ring-2 ring-primary/25' : 'border-gray-100'}`}
          >
            <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
              <c.icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-sm text-gray-500">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Recent tickets */}
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Tickets recientes</h2>
          <span className="text-xs text-gray-500">Filtro activo: {filterLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Asunto</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Prioridad</th>
                <th className="px-5 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.titulo}</td>
                  <td className="px-5 py-3"><Badge variant={ticketStatusVariant(t.estado)}>{fmt(t.estado)}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={ticketPriorityVariant(t.prioridad)}>{fmt(t.prioridad)}</Badge></td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
              {filteredTickets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-500">No hay tickets para este filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
