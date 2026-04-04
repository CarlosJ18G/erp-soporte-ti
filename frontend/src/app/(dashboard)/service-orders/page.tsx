'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ServiceOrder, Ticket, Technician, WorkLog, WorkLogActivity } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, orderStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Edit } from 'lucide-react';

const TIPOS = ['DIAGNOSTICO','REPARACION','INSTALACION','CONFIGURACION','MANTENIMIENTO','CONSULTA','OTRO'];

interface OrderForm { ticketId: string; tecnicoId: string; tipo: string; descripcion: string; }
const empty: OrderForm = { ticketId: '', tecnicoId: '', tipo: 'DIAGNOSTICO', descripcion: '' };

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

export default function ServiceOrdersPage() {
  const { isAdmin } = useAuth();
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [techs,   setTechs]   = useState<Technician[]>([]);
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [tecnicoFilter, setTecnicoFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<OrderForm>(empty);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [detailModal, setDetailModal] = useState<{ open: boolean; order?: ServiceOrder }>({ open: false });
  const [workLogModal, setWorkLogModal] = useState<{ 
    open: boolean; 
    workLog?: WorkLog;
    editForm?: { descripcion: string; horasTrabajadas: number; tipoActividad: WorkLogActivity };
    isEditing?: boolean;
    saving?: boolean; 
    error?: string 
  }>({ open: false });

  const load = () =>
    Promise.all([
      api.get<ServiceOrder[]>('/service-orders'),
      api.get<Ticket[]>('/tickets', { params: { mostrarCerrados: true } }),
      api.get<Technician[]>('/technicians'),
    ])
      .then(([ordersRes, ticketsRes, techsRes]) => {
        const ordersData = ordersRes.data ?? [];
        const ticketsData = ticketsRes.data ?? [];
        const techsData = techsRes.data ?? [];

        const ticketNumeroById = new Map(ticketsData.map((t) => [t.id, t.numero]));
        const hydratedOrders = ordersData.map((o) => ({
          ...o,
          ticket: {
            ...(o.ticket ?? {}),
            id: o.ticket?.id ?? o.ticketId,
            numero: o.ticket?.numero ?? ticketNumeroById.get(o.ticketId),
          },
        }));

        setOrders(hydratedOrders);
        setTickets(ticketsData);
        setTechs(techsData);
      })
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/service-orders', form);
      await load(); setOpen(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Error'); }
    finally { setSaving(false); }
  };

  const handleEditWorkLog = (workLog: WorkLog) => {
    setWorkLogModal({ 
      open: true, 
      workLog,
      isEditing: false,
      saving: false,
      error: '',
    });
  };

  const handleSaveWorkLog = async () => {
    if (!workLogModal.workLog?.id) return;
    const editForm = workLogModal.editForm || {
      descripcion: workLogModal.workLog.descripcion,
      horasTrabajadas: workLogModal.workLog.horasTrabajadas,
      tipoActividad: workLogModal.workLog.tipoActividad,
    };
    setWorkLogModal((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      await api.put(`/work-logs/${workLogModal.workLog.id}`, {
        descripcion: editForm.descripcion,
        horasTrabajadas: editForm.horasTrabajadas,
        tipoActividad: editForm.tipoActividad,
      });
      await load();
      setWorkLogModal({ open: false });
    } catch (err: unknown) {
      setWorkLogModal((prev) => ({ ...prev, error: err instanceof Error ? err.message : 'Error' }));
    } finally {
      setWorkLogModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const f = (k: keyof OrderForm) => (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const onTicketChange = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    setForm((prev) => ({
      ...prev,
      ticketId,
      tecnicoId: ticket?.tecnicoAsignadoId ?? '',
      descripcion: ticket?.descripcion ?? '',
    }));
  };

  const selectedTicket = tickets.find((t) => t.id === form.ticketId);
  const hasTicketAssignedTechnician = Boolean(selectedTicket?.tecnicoAsignadoId);

  const openTickets = tickets.filter(t => !['RESUELTO','CERRADO'].includes(t.estado));
  const ticketOptionLabel = (t: Ticket) => {
    const nombreCliente = t.cliente
      ? `${t.cliente.nombre} ${t.cliente.apellido}`.trim()
      : 'Cliente no disponible';
    return `${t.numero ?? '-'} - ${t.titulo} - ${nombreCliente}`;
  };
  const ticketNumero = (ticketId: string, numeroDesdeOrden?: string) =>
    numeroDesdeOrden ?? tickets.find((t) => t.id === ticketId)?.numero ?? '-';
  const techName = (id?: string) => { if (!id) return '-'; const t = techs.find(t => t.id === id); return t ? `${t.nombre} ${t.apellido}` : '-'; };
  const empresasDisponibles = useMemo(
    () => Array.from(new Set(orders.map((o) => o.ticket?.cliente?.empresa).filter(Boolean) as string[])).sort(),
    [orders],
  );
  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        const empresa = o.ticket?.cliente?.empresa || '';
        const byEmpresa = !empresaFilter || empresa === empresaFilter;
        const byTecnico = !tecnicoFilter || o.tecnicoId === tecnicoFilter;
        return byEmpresa && byTecnico;
      }),
    [orders, empresaFilter, tecnicoFilter],
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{filteredOrders.length} orden(es)</p>
          <select
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            value={empresaFilter}
            onChange={(e) => setEmpresaFilter(e.target.value)}
            aria-label="Filtrar por empresa"
          >
            <option value="">Todas las empresas</option>
            {empresasDisponibles.map((empresa) => (
              <option key={empresa} value={empresa}>{empresa}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            value={tecnicoFilter}
            onChange={(e) => setTecnicoFilter(e.target.value)}
            aria-label="Filtrar por técnico"
          >
            <option value="">Todos los técnicos</option>
            {techs.filter((t) => t.activo).map((t) => (
              <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => { setForm(empty); setError(''); setOpen(true); }}><Plus className="h-4 w-4" /> Nueva orden</Button>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState title="Sin ordenes de servicio" />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Numero</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">N° Ticket</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Tecnico</th>
                <th className="px-5 py-3">C. Final</th>
                <th className="px-5 py-3">Inicio</th>
                <th className="px-5 py-3">Fin</th>
                <th className="px-5 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(o => (
                <tr 
                  key={o.id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors hover:bg-blue-50"
                  onClick={() => setDetailModal({ open: true, order: o })}
                >
                  <td className="px-5 py-3 font-mono text-xs font-medium text-gray-700">{o.numero}</td>
                  <td className="px-5 py-3 text-gray-600">{fmt(o.tipo)}</td>
                  <td className="px-5 py-3 font-mono text-xs font-medium text-gray-700">{ticketNumero(o.ticketId, o.ticket?.numero)}</td>
                  <td className="px-5 py-3 text-gray-500">{o.ticket?.cliente?.empresa || '-'}</td>
                  <td className="px-5 py-3 text-gray-500">{techName(o.tecnicoId)}</td>
                  <td className="px-5 py-3 text-gray-600">${o.costoFinal ? parseFloat(String(o.costoFinal)).toFixed(2) : '-'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{o.fechaInicio ? formatDate(o.fechaInicio) : '-'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{o.fechaFin ? formatDate(o.fechaFin) : '-'}</td>
                  <td className="px-5 py-3"><Badge variant={orderStatusVariant(o.estado)}>{fmt(o.estado)}</Badge></td>
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
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.ticketId} onChange={(e) => onTicketChange(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {openTickets.map(t => <option key={t.id} value={t.id}>{ticketOptionLabel(t)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tecnico asignado *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:bg-gray-100" value={form.tecnicoId} onChange={f('tecnicoId')} required disabled={hasTicketAssignedTechnician}>
              <option value="">Seleccionar...</option>
              {techs.filter(t => t.activo).map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido}</option>)}
            </select>
            {hasTicketAssignedTechnician && (
              <p className="text-xs text-gray-500">Se autocompleta desde el técnico asignado al ticket.</p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tipo</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tipo} onChange={f('tipo')}>
              {TIPOS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion (opcional)</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" rows={3} value={form.descripcion} onChange={f('descripcion')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Crear orden</Button>
          </div>
        </form>
      </Modal>

      <Modal open={detailModal.open} onClose={() => setDetailModal({ open: false })} title={`Orden: ${detailModal.order?.numero}`} maxWidth="2xl">
        {detailModal.order && (
          <div className="flex flex-col gap-6">
            {/* Información general */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Información General</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Numero</p>
                  <p className="text-sm font-mono font-semibold text-gray-900">{detailModal.order.numero}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Estado</p>
                  <Badge variant={orderStatusVariant(detailModal.order.estado)}>{fmt(detailModal.order.estado)}</Badge>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Tipo</p>
                  <p className="text-sm text-gray-900">{fmt(detailModal.order.tipo)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Costo Final</p>
                  <p className="text-sm font-semibold text-gray-900">${detailModal.order.costoFinal ? parseFloat(String(detailModal.order.costoFinal)).toFixed(2) : '-'}</p>
                </div>
              </div>
            </div>

            {/* Ticket y Técnico */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Ticket y Asignación</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">N° Ticket</p>
                  <div className="text-sm text-gray-900">
                    <p className="font-mono text-xs text-gray-600">{ticketNumero(detailModal.order.ticketId, detailModal.order.ticket?.numero)}</p>
                    <p className="font-medium">{detailModal.order.ticket?.titulo ?? '-'}</p>
                    {detailModal.order.ticket?.cliente && (
                      <>
                        <p className="text-gray-600 text-xs mt-1">
                          Cliente: {detailModal.order.ticket.cliente.nombre} {detailModal.order.ticket.cliente.apellido}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          Empresa: {detailModal.order.ticket.cliente.empresa || '-'}
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-2">Técnico Asignado</p>
                  <div className="text-sm text-gray-900">
                    <p className="font-medium">{detailModal.order.tecnico?.nombre} {detailModal.order.tecnico?.apellido}</p>
                    {detailModal.order.tecnico?.especialidad && (
                      <p className="text-gray-600 text-xs mt-1">Especialidad: {fmt(detailModal.order.tecnico.especialidad)}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Descripción */}
            {detailModal.order.descripcion && (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Descripción</h3>
                {(() => {
                  const parsed = parseOrderDescription(detailModal.order.descripcion);
                  return (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                      {parsed.suggestion ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sugerencia</span>
                          <Badge variant="info">{parsed.suggestion}</Badge>
                        </div>
                      ) : null}
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {parsed.body || detailModal.order.descripcion}
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Notas */}
            {detailModal.order.notas && (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notas</h3>
                <div className="space-y-3">
                  {parseOrderNotes(detailModal.order.notas).map((section, index) => (
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

            {/* Fechas */}
            <div className="border-b border-gray-200 pb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Cronograma</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 font-medium">Fecha Inicio</p>
                  <p className="text-sm text-gray-900">{detailModal.order.fechaInicio ? formatDate(detailModal.order.fechaInicio) : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Fecha Fin</p>
                  <p className="text-sm text-gray-900">{detailModal.order.fechaFin ? formatDate(detailModal.order.fechaFin) : '-'}</p>
                </div>
              </div>
            </div>

            {/* Repuestos usados */}
            {detailModal.order.repuestosUsados && detailModal.order.repuestosUsados.length > 0 && (
              <div className="border-b border-gray-200 pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Repuestos Usados</h3>
                <div className="space-y-2">
                  {detailModal.order.repuestosUsados.map((item) => (
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

            {/* Bitácoras de trabajo */}
            {detailModal.order.workLogs && detailModal.order.workLogs.length > 0 && (
              <div className="pb-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Registro de Actividades</h3>
                <div className="space-y-3">
                  {detailModal.order.workLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`border border-gray-200 rounded-lg p-3 ${isAdmin ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors' : ''}`}
                      onClick={() => isAdmin && handleEditWorkLog(log)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-blue-600 uppercase">{fmt(log.tipoActividad)}</p>
                          <p className="text-xs text-gray-500">{formatDate(log.fecha)} • {log.horasTrabajadas}h</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {log.tecnico && (
                            <p className="text-xs text-gray-600">{log.tecnico.nombre} {log.tecnico.apellido}</p>
                          )}
                          {isAdmin && (
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEditWorkLog(log); }}
                              className="p-1 rounded hover:bg-white transition-colors"
                            >
                              <Edit className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{log.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer con datos de creación */}
            <div className="border-t border-gray-200 pt-4 text-xs text-gray-500">
              <p>Creada: {formatDate(detailModal.order.createdAt)}</p>
              <p>Actualizada: {formatDate(detailModal.order.updatedAt)}</p>
            </div>

            <Button variant="secondary" onClick={() => setDetailModal({ open: false })} className="w-full">Cerrar</Button>
          </div>
        )}
      </Modal>

      <Modal open={workLogModal.open} onClose={() => setWorkLogModal({ open: false })} title="Registro de Actividad" maxWidth="lg">
        {workLogModal.workLog && (
          <div className="flex flex-col gap-4">
            {!workLogModal.isEditing ? (
              <>
                {/* Vista de lectura */}
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Tipo de Actividad</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{fmt(workLogModal.workLog.tipoActividad)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Horas Trabajadas</p>
                      <p className="text-sm font-semibold text-gray-900 mt-1">{workLogModal.workLog.horasTrabajadas}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Fecha</p>
                      <p className="text-sm text-gray-900 mt-1">{formatDate(workLogModal.workLog.fecha)}</p>
                    </div>
                  </div>

                  {workLogModal.workLog.tecnico && (
                    <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Información del Técnico</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Nombre</p>
                          <p className="text-sm text-gray-900">{workLogModal.workLog.tecnico.nombre} {workLogModal.workLog.tecnico.apellido}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Email</p>
                          <p className="text-sm text-gray-900">{workLogModal.workLog.tecnico.email || '-'}</p>
                        </div>
                        {workLogModal.workLog.tecnico.especialidad && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-600 font-medium">Especialidad</p>
                            <p className="text-sm text-gray-900">{fmt(workLogModal.workLog.tecnico.especialidad)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-xs text-gray-500 font-medium mb-2">Descripción</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{workLogModal.workLog.descripcion}</p>
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">
                    <p>Creado: {formatDate(workLogModal.workLog.createdAt)}</p>
                    <p>Actualizado: {formatDate(workLogModal.workLog.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                  <Button variant="secondary" onClick={() => setWorkLogModal({ open: false })}>Cerrar</Button>
                  {isAdmin && (
                    <Button onClick={() => setWorkLogModal((prev) => ({ ...prev, isEditing: true }))} variant="secondary">
                      <Edit className="h-4 w-4 mr-2" /> Editar
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Modo edición */}
                <form onSubmit={(e) => { e.preventDefault(); handleSaveWorkLog(); }} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Tipo de Actividad</label>
                    <select 
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      value={workLogModal.editForm?.tipoActividad || workLogModal.workLog.tipoActividad}
                      onChange={(e) => setWorkLogModal((prev) => {
                        if (!prev.editForm) {
                          prev.editForm = {
                            descripcion: prev.workLog?.descripcion || '',
                            horasTrabajadas: prev.workLog?.horasTrabajadas || 0,
                            tipoActividad: e.target.value as WorkLogActivity,
                          };
                        } else {
                          prev.editForm.tipoActividad = e.target.value as WorkLogActivity;
                        }
                        return { ...prev };
                      })}
                    >
                      <option value="DIAGNOSTICO">Diagnóstico</option>
                      <option value="REPARACION">Reparación</option>
                      <option value="INSTALACION">Instalación</option>
                      <option value="CONFIGURACION">Configuración</option>
                      <option value="MANTENIMIENTO">Mantenimiento</option>
                      <option value="CONSULTA">Consulta</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Horas Trabajadas</label>
                    <input 
                      type="number" 
                      step="0.5"
                      min="0.5"
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      value={workLogModal.editForm?.horasTrabajadas || workLogModal.workLog.horasTrabajadas}
                      onChange={(e) => setWorkLogModal((prev) => {
                        if (!prev.editForm) {
                          prev.editForm = {
                            descripcion: prev.workLog?.descripcion || '',
                            horasTrabajadas: parseFloat(e.target.value),
                            tipoActividad: prev.workLog?.tipoActividad || 'DIAGNOSTICO',
                          };
                        } else {
                          prev.editForm.horasTrabajadas = parseFloat(e.target.value);
                        }
                        return { ...prev };
                      })}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Descripción</label>
                    <textarea 
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      rows={4}
                      value={workLogModal.editForm?.descripcion || workLogModal.workLog.descripcion}
                      onChange={(e) => setWorkLogModal((prev) => {
                        if (!prev.editForm) {
                          prev.editForm = {
                            descripcion: e.target.value,
                            horasTrabajadas: prev.workLog?.horasTrabajadas || 0,
                            tipoActividad: prev.workLog?.tipoActividad || 'DIAGNOSTICO',
                          };
                        } else {
                          prev.editForm.descripcion = e.target.value;
                        }
                        return { ...prev };
                      })}
                      required
                    />
                  </div>

                  {workLogModal.error && <p className="text-sm text-red-600">{workLogModal.error}</p>}

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <Button type="button" variant="secondary" onClick={() => setWorkLogModal((prev) => ({ ...prev, isEditing: false }))}>Cancelar</Button>
                    <Button type="submit" loading={workLogModal.saving}>Guardar cambios</Button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

