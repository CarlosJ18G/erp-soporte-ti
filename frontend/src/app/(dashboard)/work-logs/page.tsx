'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { WorkLog, ServiceOrder } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ACTIVIDADES = ['DIAGNOSTICO','REPARACION','INSTALACION','CONFIGURACION','MANTENIMIENTO','CONSULTA','OTRO'];

interface LogForm { ordenServicioId: string; tipoActividad: string; descripcion: string; horasTrabajadas: string; fecha: string; }
const today = () => new Date().toISOString().slice(0, 10);
const empty: LogForm = { ordenServicioId: '', tipoActividad: 'DIAGNOSTICO', descripcion: '', horasTrabajadas: '1', fecha: today() };

export default function WorkLogsPage() {
  const { isAdmin, user } = useAuth();
  const [logs,    setLogs]    = useState<WorkLog[]>([]);
  const [orders,  setOrders]  = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<WorkLog | null>(null);
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
    setEditing(l);
    setForm({ ordenServicioId: l.ordenServicioId, tipoActividad: l.tipoActividad, descripcion: l.descripcion ?? '', horasTrabajadas: String(l.horasTrabajadas), fecha: l.fecha.slice(0,10) });
    setError(''); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    const body = { ...form, horasTrabajadas: parseFloat(form.horasTrabajadas) };
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

  const orderNum = (id: string) => orders.find(o => o.id === id)?.numero ?? id;
  const canEdit  = (l: WorkLog) => isAdmin || l.tecnicoId === user?.id;

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
                <th className="px-5 py-3">Descripcion</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-mono text-xs text-gray-700">{orderNum(l.ordenServicioId)}</td>
                  <td className="px-5 py-3 text-gray-600">{fmt(l.tipoActividad)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">{l.horasTrabajadas}h</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(l.fecha)}</td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">{l.descripcion ?? '-'}</td>
                  <td className="px-5 py-3">
                    {canEdit(l) && (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(l)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(l.id)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
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
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.ordenServicioId} onChange={f('ordenServicioId')} required>
              <option value="">Seleccionar...</option>
              {orders.filter(o => ['PENDIENTE','EN_PROGRESO'].includes(o.estado)).map(o => (
                <option key={o.id} value={o.id}>{o.numero}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Actividad *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tipoActividad} onChange={f('tipoActividad')}>
              {ACTIVIDADES.map(a => <option key={a} value={a}>{fmt(a)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Horas trabajadas *" type="number" min="0.01" max="24" step="0.01" value={form.horasTrabajadas} onChange={f('horasTrabajadas')} required />
            <Input label="Fecha *" type="date" value={form.fecha} onChange={f('fecha')} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" rows={3} value={form.descripcion} onChange={f('descripcion')} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
