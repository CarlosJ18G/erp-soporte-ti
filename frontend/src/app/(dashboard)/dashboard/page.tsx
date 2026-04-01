'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Ticket, TicketPriority, TicketStatus } from '@/types';
import { LoadingSpinner } from '@/components/ui/States';
import { Badge, ticketPriorityVariant, ticketStatusVariant } from '@/components/ui/Badge';
import { formatDate, fmt } from '@/lib/utils';
import { Ticket as TicketIcon, AlertTriangle, Clock, CheckCircle2, Ban } from 'lucide-react';

type DashboardFilter = 'ALL' | TicketStatus | `P_${TicketPriority}`;

const STATUS_ORDER: TicketStatus[] = ['ABIERTO', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTO', 'CERRADO'];
const PRIORITY_ORDER: TicketPriority[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];

const statusIcon = {
  ABIERTO: TicketIcon,
  EN_PROGRESO: Clock,
  EN_ESPERA: AlertTriangle,
  RESUELTO: CheckCircle2,
  CERRADO: Ban,
};

const statusColor = {
  ABIERTO: 'bg-blue-50 text-blue-600',
  EN_PROGRESO: 'bg-amber-50 text-amber-600',
  EN_ESPERA: 'bg-orange-50 text-orange-600',
  RESUELTO: 'bg-emerald-50 text-emerald-600',
  CERRADO: 'bg-gray-100 text-gray-600',
};

const priorityColor = {
  BAJA: 'bg-sky-50 text-sky-600',
  MEDIA: 'bg-indigo-50 text-indigo-600',
  ALTA: 'bg-amber-50 text-amber-600',
  CRITICA: 'bg-red-50 text-red-600',
};

export default function DashboardPage() {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('ALL');

  useEffect(() => {
    api.get<Ticket[]>('/tickets', { mostrarCerrados: 'true' })
      .then(res => {
        const list = res.data ?? [];
        setTickets(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusCards = useMemo(
    () =>
      STATUS_ORDER.map((estado) => ({
        key: estado as DashboardFilter,
        label: fmt(estado),
        value: tickets.filter((t) => t.estado === estado).length,
        icon: statusIcon[estado],
        color: statusColor[estado],
      })),
    [tickets],
  );

  const priorityCards = useMemo(
    () =>
      PRIORITY_ORDER.map((prioridad) => ({
        key: `P_${prioridad}` as DashboardFilter,
        label: `Prioridad ${fmt(prioridad)}`,
        value: tickets.filter((t) => t.prioridad === prioridad).length,
        icon: TicketIcon,
        color: priorityColor[prioridad],
      })),
    [tickets],
  );

  const filteredTickets = tickets
    .filter((t) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter.startsWith('P_')) return t.prioridad === activeFilter.replace('P_', '');
      return t.estado === activeFilter;
    });

  const visibleTickets = activeFilter === 'ALL' ? filteredTickets : filteredTickets.slice(0, 5);

  const filterLabel = activeFilter === 'ALL' ? 'Todos' : fmt(activeFilter);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Tickets por estado</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {statusCards.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => setActiveFilter((prev) => (prev === c.key ? 'ALL' : c.key))}
              className={`rounded-xl bg-white p-4 shadow-sm border text-left transition hover:-translate-y-0.5 hover:shadow-md ${activeFilter === c.key ? 'border-primary ring-2 ring-primary/25' : 'border-gray-100'}`}
            >
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Tickets por prioridad</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {priorityCards.map(c => (
            <button
              key={c.label}
              type="button"
              onClick={() => setActiveFilter((prev) => (prev === c.key ? 'ALL' : c.key))}
              className={`rounded-xl bg-white p-4 shadow-sm border text-left transition hover:-translate-y-0.5 hover:shadow-md ${activeFilter === c.key ? 'border-primary ring-2 ring-primary/25' : 'border-gray-100'}`}
            >
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-sm text-gray-500">{c.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-1">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`rounded-xl bg-white p-4 shadow-sm border text-left transition hover:-translate-y-0.5 hover:shadow-md ${activeFilter === 'ALL' ? 'border-primary ring-2 ring-primary/25' : 'border-gray-100'}`}
        >
          <p className="text-sm text-gray-500">Total tickets</p>
          <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
        </button>
      </div>

      {/* Tickets filtrados */}
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
              {visibleTickets.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.titulo}</td>
                  <td className="px-5 py-3"><Badge variant={ticketStatusVariant(t.estado)}>{fmt(t.estado)}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={ticketPriorityVariant(t.prioridad)}>{fmt(t.prioridad)}</Badge></td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
              {visibleTickets.length === 0 && (
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
