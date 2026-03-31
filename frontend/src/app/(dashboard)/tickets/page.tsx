'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Ticket, Client, Asset, Technician } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, ticketPriorityVariant, ticketStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, ChevronDown, Filter } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';

const PRIORIDADES = ['BAJA','MEDIA','ALTA','CRITICA'];
const ESTADOS     = ['ABIERTO','EN_PROGRESO','EN_ESPERA','RESUELTO','CERRADO'];

interface TicketForm { clienteId: string; activoId: string; tecnicoAsignadoId: string; titulo: string; descripcion: string; prioridad: string; }
const empty: TicketForm = { clienteId: '', activoId: '', tecnicoAsignadoId: '', titulo: '', descripcion: '', prioridad: 'MEDIA' };

export default function TicketsPage() {
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get('estado') ?? '';
  const priorityFilter = searchParams.get('prioridad') ?? undefined;
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [techs,    setTechs]    = useState<Technician[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [form,     setForm]     = useState<TicketForm>(empty);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [statusModal, setStatusModal] = useState<Ticket | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [hideClosed, setHideClosed] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const load = useCallback(() => Promise.all([
    api
      .get<Ticket[]>('/tickets', {
        ...(isAdmin && !hideClosed ? { mostrarCerrados: 'true' } : {}),
        ...(statusFilter ? { estado: statusFilter } : {}),
        ...(priorityFilter ? { prioridad: priorityFilter } : {}),
      })
      .then(r => setTickets(r.data ?? [])),
    api.get<Client[]>('/clients').then(r => setClients(r.data ?? [])),
    api.get<Asset[]>('/assets').then(r => setAssets(r.data ?? [])),
    api.get<Technician[]>('/technicians').then(r => setTechs(r.data ?? [])),
  ]).finally(() => setLoading(false)), [hideClosed, isAdmin, priorityFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const clientAssets = assets.filter(a => a.clienteId === form.clienteId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const body = { ...form, tecnicoAsignadoId: form.tecnicoAsignadoId || undefined, activoId: form.activoId || undefined };
    try {
      await api.post('/tickets', body);
      await load(); setOpen(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async () => {
    if (!statusModal || !newStatus) return;
    try { await api.patch(`/tickets/${statusModal.id}/status`, { estado: newStatus }); await load(); setStatusModal(null); }
    catch (err: unknown) { alert(err instanceof Error ? err.message : 'Error'); }
  };

  const f = (k: keyof TicketForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const clientName = (id?: string) => { if (!id) return '-'; const c = clients.find(c => c.id === id); return c ? `${c.nombre} ${c.apellido}` : '-'; };
  const technicianName = (ticket: Ticket) => {
    if (ticket.tecnicoAsignado) return `${ticket.tecnicoAsignado.nombre} ${ticket.tecnicoAsignado.apellido}`;
    return 'Sin asignar';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{tickets.length} ticket(s)</p>
          <select
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>{fmt(s)}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              size="sm"
              variant={hideClosed ? 'secondary' : 'ghost'}
              onClick={() => setHideClosed(prev => !prev)}
            >
              <Filter className="h-4 w-4" /> {hideClosed ? 'Mostrar todos' : 'Ocultar cerrados'}
            </Button>
          )}
          <Button size="sm" onClick={() => { setForm(empty); setError(''); setOpen(true); }}><Plus className="h-4 w-4" /> Nuevo ticket</Button>
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="Sin tickets" />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Asunto</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Tecnico</th>
                <th className="px-5 py-3">Prioridad</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{t.titulo}</td>
                  <td className="px-5 py-3 text-gray-500">{clientName(t.clienteId)}</td>
                  <td className="px-5 py-3 text-gray-500">{technicianName(t)}</td>
                  <td className="px-5 py-3"><Badge variant={ticketPriorityVariant(t.prioridad)}>{fmt(t.prioridad)}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={ticketStatusVariant(t.estado)}>{fmt(t.estado)}</Badge></td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
                  <td className="px-5 py-3">
                    {t.estado !== 'CERRADO' && (
                      <button onClick={() => { setStatusModal(t); setNewStatus(t.estado); }} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        Cambiar estado <ChevronDown className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo ticket" maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cliente *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.clienteId} onChange={e => { f('clienteId')(e); setForm(p => ({ ...p, activoId: '' })); }} required>
              <option value="">Seleccionar...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Activo</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.activoId} onChange={f('activoId')}>
              <option value="">Sin activo</option>
              {clientAssets.map(a => <option key={a.id} value={a.id}>{a.nombre} - {a.marca ?? ''} {a.modelo ?? ''}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tecnico asignado</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tecnicoAsignadoId} onChange={f('tecnicoAsignadoId')}>
              <option value="">Sin asignar</option>
              {techs.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
            </select>
          </div>
          <Input label="Titulo *" value={form.titulo} onChange={f('titulo')} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" rows={3} value={form.descripcion} onChange={f('descripcion')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Prioridad</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.prioridad} onChange={f('prioridad')}>
              {PRIORIDADES.map(p => <option key={p} value={p}>{fmt(p)}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear ticket</Button>
          </div>
        </form>
      </Modal>

      {/* Status modal */}
      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Cambiar estado">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nuevo estado</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setStatusModal(null)}>Cancelar</Button>
            <Button onClick={handleStatusChange}>Actualizar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
