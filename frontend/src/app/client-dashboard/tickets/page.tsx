'use client';

import { useClientAuth } from '@/context/ClientAuthContext';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Ticket } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Badge, ticketStatusVariant, ticketPriorityVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate, fmt } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClientTicketsPage() {
  const { user } = useClientAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const res = await api.get<Ticket[]>('/tickets');
        setTickets(res.data ?? []);
      } catch (error) {
        console.error('Error cargando tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Tickets</h1>
          <p className="text-gray-600 mt-1">Historial de tus solicitudes de soporte</p>
        </div>
        <Button size="sm" onClick={() => router.push('/client-dashboard/tickets/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo ticket
        </Button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="Sin tickets" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-6 py-4">Numero</th>
                <th className="px-6 py-4">Título</th>
                <th className="px-6 py-4">Prioridad</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-6 py-4 font-mono text-xs font-medium text-gray-700">{ticket.numero || ticket.id.slice(0, 8)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{ticket.titulo}</td>
                  <td className="px-6 py-4">
                    <Badge variant={ticketPriorityVariant(ticket.prioridad)}>{fmt(ticket.prioridad)}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={ticketStatusVariant(ticket.estado)}>{fmt(ticket.estado)}</Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
