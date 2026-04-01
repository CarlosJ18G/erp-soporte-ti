'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { WorkLog, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, ticketPriorityVariant, ticketStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ACTIVIDADES = ['DIAGNOSTICO','REPARACION','INSTALACION','CONFIGURACION','MANTENIMIENTO','CONSULTA','OTRO'];
const ORDER_TYPE_TO_ACTIVITY: Record<string, string> = {
  DIAGNOSTICO: 'DIAGNOSTICO',
  REPARACION: 'REPARACION',
  INSTALACION: 'INSTALACION',
  CONFIGURACION: 'CONFIGURACION',
  MANTENIMIENTO: 'MANTENIMIENTO',
  CONSULTA: 'CONSULTA',
  OTRO: 'OTRO',
  CORRECTIVO: 'REPARACION',
  PREVENTIVO: 'MANTENIMIENTO',
  CONSULTORIA: 'CONSULTA',
};

interface LogForm { ordenServicioId: string; tipoActividad: string; horas: string; minutos: string; fecha: string; }
const today = () => new Date().toISOString().slice(0, 10);
const empty: LogForm = { ordenServicioId: '', tipoActividad: 'DIAGNOSTICO', horas: '1', minutos: '0', fecha: today() };

export default function WorkLogsPage() {
  const { isAdmin, user } = useAuth();
  const [logs,    setLogs]    = useState<WorkLog[]>([]);
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [ticketModal, setTicketModal] = useState<{ open: boolean; order?: ServiceOrder }>({ open: false });
  const [form,    setForm]    = useState<LogForm>(empty);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = () => Promise.all([
    api.get<WorkLog[]>('/work-logs').then(r => setLogs(r.data ?? [])),
    api.get<ServiceOrder[]>('/service-orders').then(r => setOrders(r.data ?? [])),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...empty, fecha: today() }); setError(''); setOpen(true); };
  const openEdit   = (l: WorkLog) => {
    const totalMinutes = Math.round(Number(l.horasTrabajadas) * 60);
    const horas = Math.floor(totalMinutes / 60);
    const minutos = totalMinutes % 60;
    setEditing(l);
    setForm({
      ordenServicioId: l.ordenServicioId,
      tipoActividad: l.tipoActividad,
      horas: String(horas),
      minutos: String(minutos),
      fecha: l.fecha.slice(0,10),
    });
    setError(''); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const fechaIso = form.fecha.includes('T') ? form.fecha.slice(0, 10) : form.fecha;

    const horas = Math.max(0, Number(form.horas) || 0);
    const minutos = Math.max(0, Number(form.minutos) || 0);

    if (minutos > 59) {
      setError('Los minutos deben estar entre 0 y 59.');
      setSaving(false);
      return;
    }

    const horasTrabajadas = Number((horas + minutos / 60).toFixed(2));
    if (horasTrabajadas <= 0 || horasTrabajadas > 24) {
      setError('El tiempo total debe ser mayor a 0 y menor o igual a 24 horas.');
      setSaving(false);
      return;
    }

    const body = {
      ordenServicioId: form.ordenServicioId,
      tipoActividad: form.tipoActividad,
      fecha: fechaIso,
      horasTrabajadas,
      descripcion: `${form.tipoActividad}: ${horas}h ${minutos}m`,
    };
    try {
      if (editing) await api.put(`/work-logs/${editing.id}`, body);
      else         await api.post('/work-logs', body);
      await load(); setOpen(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar registro?')) return;
    await api.delete(`/work-logs/${id}`);
    await load();
  };

  const f = (k: keyof LogForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleOrderChange = (ordenServicioId: string) => {
    const selected = orders.find((o) => o.id === ordenServicioId);
    const activityFromOrder = selected ? ORDER_TYPE_TO_ACTIVITY[selected.tipo] : undefined;

    setForm((prev) => ({
      ...prev,
      ordenServicioId,
      tipoActividad: activityFromOrder && ACTIVIDADES.includes(activityFromOrder)
        ? activityFromOrder
        : prev.tipoActividad,
    }));
  };

  const orderNum = (log: WorkLog) => log.ordenServicio?.numero ?? orders.find(o => o.id === log.ordenServicioId)?.numero ?? log.ordenServicioId;
  const orderForLog = (log: WorkLog) => orders.find((o) => o.id === log.ordenServicioId);
  const canEdit  = () => isAdmin;
  const canDelete = (l: WorkLog) => isAdmin || l.tecnicoId === user?.id;
  const usedOrderIds = new Set(logs.map((l) => l.ordenServicioId));
  const availableOrders = orders.filter((o) => {
    const ticketPermitido = ['RESUELTO', 'CERRADO'].includes(o.ticket?.estado ?? '');
    const ordenDisponible = editing ? o.id === form.ordenServicioId || !usedOrderIds.has(o.id) : !usedOrderIds.has(o.id);
    return ticketPermitido && ordenDisponible;
  });
  const selectedOrder = orders.find((o) => o.id === form.ordenServicioId);
  const selectedOrderTechnician = selectedOrder?.tecnico
    ? `${selectedOrder.tecnico.nombre} ${selectedOrder.tecnico.apellido}`.trim()
    : '-';
  const selectedOrderClient = selectedOrder?.ticket?.cliente
    ? `${selectedOrder.ticket.cliente.nombre} ${selectedOrder.ticket.cliente.apellido}`.trim()
    : '-';
  const selectedOrderCompany = selectedOrder?.ticket?.cliente?.empresa || '-';
  const formatLoggedHours = (value: number | string) => {
    const totalMinutes = Math.round(Number(value) * 60);
    const horas = Math.floor(totalMinutes / 60);
    const minutos = totalMinutes % 60;
    if (horas === 0) return `${minutos}m`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos}m`;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{logs.length} registro(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo registro</Button>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Sin registros de horas" action={<Button size="sm" onClick={openCreate}>Agregar</Button>} />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Orden</th>
                <th className="px-5 py-3">Actividad</th>
                <th className="px-5 py-3">Horas</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Ticket asociado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{orderNum(l)}</td>
                  <td className="px-5 py-3 text-gray-600">{fmt(l.tipoActividad)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{formatLoggedHours(l.horasTrabajadas)}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(l.fecha)}</td>
                  <td className="px-5 py-3">
                    {orderForLog(l)?.ticket ? (
                      <button
                        type="button"
                        className="max-w-xs truncate text-left text-sm text-primary hover:underline"
                        onClick={() => setTicketModal({ open: true, order: orderForLog(l) })}
                      >
                        {orderForLog(l)?.ticket?.titulo}
                      </button>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {(canEdit() || canDelete(l)) && (
                      <div className="flex items-center gap-2 justify-end">
                        {canEdit() && (
                          <button onClick={() => openEdit(l)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        )}
                        {canDelete(l) && (
                        <button onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar registro' : 'Nuevo registro de horas'} maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Orden de servicio *</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-gray-100"
              value={form.ordenServicioId}
              onChange={(e) => handleOrderChange(e.target.value)}
              required
              disabled={!!editing}
            >
              <option value="">Seleccionar...</option>
              {availableOrders.map(o => (
                <option key={o.id} value={o.id}>{o.numero}</option>
              ))}
            </select>
            {!editing && availableOrders.length === 0 && (
              <p className="text-xs text-amber-700">No hay órdenes disponibles: cada orden solo admite un registro de horas.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium text-gray-500">Técnico</p>
              <p className="mt-1 text-sm text-gray-900">{selectedOrderTechnician}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium text-gray-500">Cliente</p>
              <p className="mt-1 text-sm text-gray-900">{selectedOrderClient}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium text-gray-500">Empresa</p>
              <p className="mt-1 text-sm text-gray-900">{selectedOrderCompany}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Actividad *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tipoActividad} onChange={f('tipoActividad')}>
              {ACTIVIDADES.map(a => <option key={a} value={a}>{fmt(a)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Horas *" type="number" min="0" max="24" step="1" value={form.horas} onChange={f('horas')} required />
            <Input label="Minutos *" type="number" min="0" max="59" step="1" value={form.minutos} onChange={f('minutos')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Fecha *" type="date" value={form.fecha} onChange={f('fecha')} required />
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-xs font-medium text-gray-500">Tiempo registrado</p>
              <p className="mt-1 text-sm text-gray-900">{`${Number(form.horas || 0)}h ${Number(form.minutos || 0)}m`}</p>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={ticketModal.open}
        onClose={() => setTicketModal({ open: false })}
        title={`Ticket asociado${ticketModal.order?.ticket?.titulo ? `: ${ticketModal.order.ticket.titulo}` : ''}`}
        maxWidth="lg"
      >
        {ticketModal.order?.ticket ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Orden</p>
                <p className="text-sm font-medium text-gray-900">{ticketModal.order.numero}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ticket</p>
                <p className="text-sm font-medium text-gray-900">{ticketModal.order.ticket.titulo}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <Badge variant={ticketStatusVariant(ticketModal.order.ticket.estado)}>{fmt(ticketModal.order.ticket.estado)}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prioridad</p>
                <Badge variant={ticketPriorityVariant(ticketModal.order.ticket.prioridad)}>{fmt(ticketModal.order.ticket.prioridad)}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="text-sm text-gray-900">
                  {ticketModal.order.ticket.cliente
                    ? `${ticketModal.order.ticket.cliente.nombre} ${ticketModal.order.ticket.cliente.apellido}`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Empresa</p>
                <p className="text-sm text-gray-900">{ticketModal.order.ticket.cliente?.empresa || '-'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setTicketModal({ open: false })}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No hay ticket asociado para esta orden.</p>
        )}
      </Modal>
    </div>
  );
}
