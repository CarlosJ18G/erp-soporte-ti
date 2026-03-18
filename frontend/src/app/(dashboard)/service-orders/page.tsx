'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ServiceOrder, Ticket, Technician } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, orderStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, CheckCircle } from 'lucide-react';

const TIPOS = ['CORRECTIVO','PREVENTIVO','INSTALACION','CONSULTORIA'];

interface OrderForm { ticketId: string; tecnicoId: string; tipo: string; descripcion: string; }
const empty: OrderForm = { ticketId: '', tecnicoId: '', tipo: 'CORRECTIVO', descripcion: '' };

export default function ServiceOrdersPage() {
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [techs,   setTechs]   = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<OrderForm>(empty);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = () => Promise.all([
    api.get<ServiceOrder[]>('/service-orders').then(r => setOrders(r.data ?? [])),
    api.get<Ticket[]>('/tickets').then(r => setTickets(r.data ?? [])),
    api.get<Technician[]>('/technicians').then(r => setTechs(r.data ?? [])),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/service-orders', form);
      await load(); setOpen(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Marcar orden como COMPLETADA? Esto resolvera el ticket asociado.')) return;
    try { await api.patch(`/service-orders/${id}/complete`, {}); await load(); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Error'); }
  };

  const f = (k: keyof OrderForm) => (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const openTickets = tickets.filter(t => !['RESUELTO','CERRADO'].includes(t.estado));
  const ticketSubject = (id: string) => tickets.find(t => t.id === id)?.titulo ?? id;
  const techName = (id?: string) => { if (!id) return '-'; const t = techs.find(t => t.id === id); return t ? `${t.nombre} ${t.apellido}` : '-'; };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{orders.length} orden(es)</p>
        <Button size="sm" onClick={() => { setForm(empty); setError(''); setOpen(true); }}><Plus className="h-4 w-4" /> Nueva orden</Button>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Sin ordenes de servicio" />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Numero</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Tecnico</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-gray-700">{o.numero}</td>
                  <td className="px-5 py-3 text-gray-600">{fmt(o.tipo)}</td>
                  <td className="px-5 py-3 text-gray-600 max-w-xs truncate">{ticketSubject(o.ticketId)}</td>
                  <td className="px-5 py-3 text-gray-500">{techName(o.tecnicoId)}</td>
                  <td className="px-5 py-3"><Badge variant={orderStatusVariant(o.estado)}>{fmt(o.estado)}</Badge></td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(o.createdAt)}</td>
                  <td className="px-5 py-3">
                    {(o.estado === 'PENDIENTE' || o.estado === 'EN_PROGRESO') && (
                      <button onClick={() => handleComplete(o.id)} className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                        <CheckCircle className="h-3.5 w-3.5" /> Completar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva orden de servicio" maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Ticket *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.ticketId} onChange={f('ticketId')} required>
              <option value="">Seleccionar...</option>
              {openTickets.map(t => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tecnico asignado *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tecnicoId} onChange={f('tecnicoId')} required>
              <option value="">Seleccionar...</option>
              {techs.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tipo} onChange={f('tipo')}>
              {TIPOS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" rows={3} value={form.descripcion} onChange={f('descripcion')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear orden</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
