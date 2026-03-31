'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ServiceOrder, SparePart, Ticket, Technician } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge, orderStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, CheckCircle, Trash2 } from 'lucide-react';

const TIPOS = ['CORRECTIVO','PREVENTIVO','INSTALACION','CONSULTORIA'];
const makeEmptyItem = () => ({ repuestoId: '', cantidad: '1' });

interface OrderForm { ticketId: string; tecnicoId: string; tipo: string; descripcion: string; }
const empty: OrderForm = { ticketId: '', tecnicoId: '', tipo: 'CORRECTIVO', descripcion: '' };

export default function ServiceOrdersPage() {
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [techs,   setTechs]   = useState<Technician[]>([]);
  const [parts,   setParts]   = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState<OrderForm>(empty);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [costModal, setCostModal] = useState<{ open: boolean; orderId?: string; items: Array<{ repuestoId: string; cantidad: string }> }>({ open: false, items: [makeEmptyItem()] });

  const load = () => Promise.all([
    api.get<ServiceOrder[]>('/service-orders').then(r => setOrders(r.data ?? [])),
    api.get<Ticket[]>('/tickets').then(r => setTickets(r.data ?? [])),
    api.get<Technician[]>('/technicians').then(r => setTechs(r.data ?? [])),
    api.get<SparePart[]>('/spare-parts').then(r => setParts(r.data ?? [])),
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
    const order = orders.find(o => o.id === id);
    if (!order) return;
    setCostModal({ open: true, orderId: id, items: [makeEmptyItem()] });
  };

  const handleCompleteFinal = async () => {
    if (!costModal.orderId) return;
    try {
      const repuestos = costModal.items
        .filter((item) => item.repuestoId && Number(item.cantidad) > 0)
        .map((item) => ({ repuestoId: item.repuestoId, cantidad: Number(item.cantidad) }));

      await api.patch(`/service-orders/${costModal.orderId}/status`, { estado: 'COMPLETADA', repuestos });
      await load();
      setCostModal({ open: false, items: [makeEmptyItem()] });
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Error'); }
  };

  const updateItem = (index: number, field: 'repuestoId' | 'cantidad', value: string) => {
    setCostModal((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setCostModal((prev) => ({ ...prev, items: [...prev.items, makeEmptyItem()] }));
  };

  const removeItem = (index: number) => {
    setCostModal((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const f = (k: keyof OrderForm) => (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const openTickets = tickets.filter(t => !['RESUELTO','CERRADO'].includes(t.estado));
  const ticketOptionLabel = (t: Ticket) => {
    const nombreCliente = t.cliente
      ? `${t.cliente.nombre} ${t.cliente.apellido}`.trim()
      : 'Cliente no disponible';
    return `${t.titulo} - ${nombreCliente}`;
  };
  const activeParts = parts.filter((p) => p.activo);
  const selectedPartIds = new Set(costModal.items.map((item) => item.repuestoId).filter(Boolean));
  const totalRepuestos = costModal.items.reduce((acc, item) => {
    const part = parts.find((p) => p.id === item.repuestoId);
    if (!part) return acc;
    const qty = Number(item.cantidad) || 0;
    return acc + qty * Number(part.precio);
  }, 0);
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
                <th className="px-5 py-3">C. Final</th>
                <th className="px-5 py-3">Inicio</th>
                <th className="px-5 py-3">Fin</th>
                <th className="px-5 py-3">Estado</th>
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
                  <td className="px-5 py-3 text-gray-600">${o.costoFinal ? parseFloat(String(o.costoFinal)).toFixed(2) : '-'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{o.fechaInicio ? formatDate(o.fechaInicio) : '-'}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{o.fechaFin ? formatDate(o.fechaFin) : '-'}</td>
                  <td className="px-5 py-3"><Badge variant={orderStatusVariant(o.estado)}>{fmt(o.estado)}</Badge></td>
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
              {openTickets.map(t => <option key={t.id} value={t.id}>{ticketOptionLabel(t)}</option>)}
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

      <Modal open={costModal.open} onClose={() => setCostModal({ open: false, items: [makeEmptyItem()] })} title="Completar orden de servicio" maxWidth="2xl">
        <form onSubmit={(e) => { e.preventDefault(); handleCompleteFinal(); }} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">Repuestos usados</p>
            <Button type="button" size="sm" variant="secondary" onClick={addItem}>Agregar repuesto</Button>
          </div>

          <div className="flex flex-col gap-2">
            {costModal.items.map((item, idx) => {
              const part = parts.find((p) => p.id === item.repuestoId);
              const qty = Number(item.cantidad) || 0;
              const subtotal = part ? Number(part.precio) * qty : 0;
              return (
                <div key={`${idx}-${item.repuestoId}`} className="grid gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-[minmax(0,1fr)_140px_170px_40px] md:items-center">
                  <select
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={item.repuestoId}
                    onChange={(e) => updateItem(idx, 'repuestoId', e.target.value)}
                  >
                    <option value="">Seleccionar repuesto...</option>
                    {activeParts
                      .filter((p) => !selectedPartIds.has(p.id) || p.id === item.repuestoId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={item.cantidad}
                    onChange={(e) => updateItem(idx, 'cantidad', e.target.value)}
                    placeholder="Cantidad"
                  />

                  <div className="text-sm text-gray-600">Subtotal: ${subtotal.toFixed(2)}</div>

                  <button
                    type="button"
                    className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    onClick={() => removeItem(idx)}
                    aria-label="Quitar repuesto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {costModal.items.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                No hay repuestos agregados. Usa "Agregar repuesto" para añadir uno.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Costo final calculado por repuestos: <span className="font-semibold">${totalRepuestos.toFixed(2)}</span>
          </div>

          <p className="text-xs text-gray-500">Al completar se descuenta stock y se guarda el costo final automáticamente.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCostModal({ open: false, items: [makeEmptyItem()] })}>Cancelar</Button>
            <Button type="submit">Completar orden</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
