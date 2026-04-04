'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { WorkLog, ServiceOrder, Ticket } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, orderStatusVariant } from '@/components/ui/Badge';
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

type NoteSection = {
  title: string;
  items: string[];
};

const parseOrderNotes = (notes?: string): NoteSection[] => {
  if (!notes?.trim()) return [];

  return notes
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const [firstLine, ...rest] = lines;
      const title = (firstLine || 'Notas').replace(/:$/, '');
      const rawItems = rest.length > 0 ? rest : lines.slice(1);

      const items = rawItems.length > 0
        ? rawItems.map((line) => line.replace(/^[-•]\s*/, '').trim()).filter(Boolean)
        : [];

      return { title, items };
    });
};

const parseOrderDescription = (description?: string) => {
  const text = description?.trim() || '';
  if (!text) return { suggestion: '', body: '' };

  const match = text.match(/^\[Tipo de orden sugerido:\s*([^\]]+)\]\s*([\s\S]*)$/i);
  if (!match) return { suggestion: '', body: text };

  return {
    suggestion: match[1].trim(),
    body: match[2].trim(),
  };
};

export default function WorkLogsPage() {
  const { isAdmin, user } = useAuth();
  const [logs,    setLogs]    = useState<WorkLog[]>([]);
  const [registeredOrderIds, setRegisteredOrderIds] = useState<Set<string>>(new Set());
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [orderModal, setOrderModal] = useState<{ open: boolean; order?: ServiceOrder; loading?: boolean }>({ open: false });
  const [form,    setForm]    = useState<LogForm>(empty);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const loadOrders = async () => {
    const response = await api.get<ServiceOrder[]>('/service-orders');
    setOrders(response.data ?? []);
  };

  const loadLogs = async (fecha = filterDate) => {
    setLogsLoading(true);
    try {
      const response = await api.get<WorkLog[]>('/work-logs', fecha ? { fecha } : undefined);
      setLogs(response.data ?? []);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadRegisteredOrderIds = async () => {
    const response = await api.get<WorkLog[]>('/work-logs');
    setRegisteredOrderIds(new Set((response.data ?? []).map((log) => log.ordenServicioId)));
  };

  const load = async () => {
    setLoading(true);
    try {
      await Promise.all([loadOrders(), loadLogs(), loadRegisteredOrderIds()]);
    } finally {
      setLoading(false);
    }
  };

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
      await Promise.all([loadLogs(), loadRegisteredOrderIds()]);
      setOpen(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar registro?')) return;
    await api.delete(`/work-logs/${id}`);
    await loadLogs();
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

  const openOrderDetail = async (ordenServicioId: string) => {
    setOrderModal({ open: true, loading: true });
    try {
      const response = await api.get<ServiceOrder>(`/service-orders/${ordenServicioId}`);
      const orderData = response.data;
      let ticketNumero = orderData.ticket?.numero;

      if (!ticketNumero && orderData.ticketId) {
        try {
          const ticketResponse = await api.get<Ticket>(`/tickets/${orderData.ticketId}`);
          ticketNumero = ticketResponse.data?.numero;
        } catch {
          ticketNumero = undefined;
        }
      }

      setOrderModal({
        open: true,
        loading: false,
        order: {
          ...orderData,
          ticket: orderData.ticket
            ? { ...orderData.ticket, numero: ticketNumero ?? orderData.ticket.numero }
            : orderData.ticket,
        },
      });
    } catch (err: unknown) {
      setOrderModal({ open: false });
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const orderNum = (log: WorkLog) => log.ordenServicio?.numero ?? orders.find(o => o.id === log.ordenServicioId)?.numero ?? log.ordenServicioId;
  const orderForLog = (log: WorkLog) => orders.find((o) => o.id === log.ordenServicioId);
  const canEdit  = () => isAdmin;
  const canDelete = (l: WorkLog) => isAdmin || l.tecnicoId === user?.id;
  const availableOrders = orders.filter((o) => {
    const ticketPermitido = ['RESUELTO', 'CERRADO'].includes(o.ticket?.estado ?? '');
    const ordenDisponible = editing ? o.id === form.ordenServicioId || !registeredOrderIds.has(o.id) : !registeredOrderIds.has(o.id);
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

  const formatLoggedTime = (value: string) =>
    new Date(value).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">{logs.length} registro(s)</p>
          {logsLoading && <p className="text-xs text-gray-400">Actualizando registros...</p>}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Input
            label="Filtrar por fecha"
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="md:w-56"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => loadLogs()} disabled={logsLoading}>
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                setFilterDate('');
                await loadLogs('');
              }}
              disabled={logsLoading || !filterDate}
            >
              Limpiar
            </Button>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo registro</Button>
          </div>
        </div>
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
                <th className="px-5 py-3">Hora</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">
                    <button
                      type="button"
                      className="text-left text-primary hover:underline"
                      onClick={() => openOrderDetail(l.ordenServicioId)}
                    >
                      {orderNum(l)}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{fmt(l.tipoActividad)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{formatLoggedHours(l.horasTrabajadas)}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(l.fecha)}</td>
                  <td className="px-5 py-3 text-gray-400">{formatLoggedTime(l.createdAt)}</td>
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
              <p className="text-xs text-amber-700">No hay órdenes disponibles con ticket resuelto o cerrado sin registro de horas.</p>
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
        open={orderModal.open}
        onClose={() => setOrderModal({ open: false })}
        title={`Orden de servicio${orderModal.order?.numero ? `: ${orderModal.order.numero}` : ''}`}
        maxWidth="2xl"
      >
        {orderModal.loading ? (
          <p className="text-sm text-gray-500">Cargando información de la orden...</p>
        ) : orderModal.order ? (
          <div className="flex flex-col gap-6">
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Información General</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Numero</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">{orderModal.order.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Estado</p>
                  <Badge variant={orderStatusVariant(orderModal.order.estado)}>{fmt(orderModal.order.estado)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tipo</p>
                  <p className="text-sm text-gray-900">{fmt(orderModal.order.tipo)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Costo Final</p>
                  <p className="text-sm font-semibold text-gray-900">${orderModal.order.costoFinal ? parseFloat(String(orderModal.order.costoFinal)).toFixed(2) : '-'}</p>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Ticket y Asignación</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">N° Ticket</p>
                  <div className="text-sm text-gray-900">
                    <p className="font-mono text-xs text-gray-600">{orderModal.order.ticket?.numero ?? '-'}</p>
                    <p className="font-medium">{orderModal.order.ticket?.titulo ?? '-'}</p>
                    {orderModal.order.ticket?.cliente && (
                      <>
                        <p className="text-gray-600 text-xs mt-1">
                          Cliente: {orderModal.order.ticket.cliente.nombre} {orderModal.order.ticket.cliente.apellido}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          Empresa: {orderModal.order.ticket.cliente.empresa || '-'}</p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Técnico Asignado</p>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">{orderModal.order.tecnico ? `${orderModal.order.tecnico.nombre} ${orderModal.order.tecnico.apellido}` : '-'}</p>
                    {orderModal.order.tecnico?.especialidad && (
                      <p className="text-gray-600 text-xs mt-1">Especialidad: {fmt(orderModal.order.tecnico.especialidad)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {orderModal.order.descripcion && (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Descripción</h3>
                {(() => {
                  const parsed = parseOrderDescription(orderModal.order.descripcion);
                  return (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                      {parsed.suggestion ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sugerencia</span>
                          <Badge variant="info">{parsed.suggestion}</Badge>
                        </div>
                      ) : null}
                      <p className="text-sm text-gray-700 whitespace-pre-line">{parsed.body || orderModal.order.descripcion}</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {orderModal.order.notas && (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notas</h3>
                <div className="space-y-3">
                  {parseOrderNotes(orderModal.order.notas).map((section, index) => (
                    <div key={`${section.title}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{section.title}</p>
                      {section.items.length > 0 ? (
                        <ul className="mt-2 space-y-1 text-sm text-gray-700">
                          {section.items.map((item, itemIndex) => (
                            <li key={`${item}-${itemIndex}`} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{section.title}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Cronograma</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Fecha Inicio</p>
                  <p className="text-sm text-gray-900">{orderModal.order.fechaInicio ? formatDate(orderModal.order.fechaInicio) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Fecha Fin</p>
                  <p className="text-sm text-gray-900">{orderModal.order.fechaFin ? formatDate(orderModal.order.fechaFin) : '-'}</p>
                </div>
              </div>
            </div>

            {orderModal.order.repuestosUsados && orderModal.order.repuestosUsados.length > 0 && (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Repuestos Usados</h3>
                <div className="space-y-2">
                  {orderModal.order.repuestosUsados.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm rounded-lg p-3 bg-gray-50">
                      <div>
                        <p className="font-medium text-gray-900">{item.repuesto?.nombre}</p>
                        <p className="text-xs text-gray-600">Código: {item.repuesto?.codigo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-700">Cant: {item.cantidad}</p>
                        <p className="font-semibold text-gray-900">${Number(item.subtotal).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orderModal.order.workLogs && orderModal.order.workLogs.length > 0 && (
              <div className="pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Registro de Actividades</h3>
                <div className="space-y-3">
                  {orderModal.order.workLogs.map((log) => (
                    <div key={log.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-600 uppercase">{fmt(log.tipoActividad)}</p>
                          <p className="text-xs text-gray-500">{formatDate(log.fecha)} • {log.horasTrabajadas}h</p>
                        </div>
                        {log.tecnico && (
                          <p className="text-xs text-gray-600">{log.tecnico.nombre} {log.tecnico.apellido}</p>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{log.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
              <p>Creada: {formatDate(orderModal.order.createdAt)}</p>
              <p>Actualizada: {formatDate(orderModal.order.updatedAt)}</p>
            </div>

            <Button variant="secondary" onClick={() => setOrderModal({ open: false })} className="w-full">Cerrar</Button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No se pudo cargar la orden.</p>
        )}
      </Modal>
    </div>
  );
}
