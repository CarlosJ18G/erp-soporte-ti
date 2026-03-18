'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Asset, Client } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, assetStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Pencil } from 'lucide-react';

const TIPOS   = ['COMPUTADORA','LAPTOP','SERVIDOR','IMPRESORA','UPS','SWITCH','ROUTER','FIREWALL','OTRO'];
const ESTADOS = ['OPERATIVO', 'EN REPARACION', 'DADO DE BAJA'];

interface AssetForm { clienteId: string; nombre: string; tipo: string; marca: string; modelo: string; numeroSerie: string; estado: string; descripcion: string; }
const empty: AssetForm = { clienteId: '', nombre: '', tipo: 'COMPUTADORA', marca: '', modelo: '', numeroSerie: '', estado: 'OPERATIVO', descripcion: '' };

export default function AssetsPage() {
  const [assets,   setAssets]   = useState<Asset[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<Asset | null>(null);
  const [form,     setForm]     = useState<AssetForm>(empty);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = () => Promise.all([
    api.get<Asset[]>('/assets').then(r => setAssets(r.data ?? [])),
    api.get<Client[]>('/clients').then(r => setClients(r.data ?? [])),
  ]).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setOpen(true); };
  const openEdit   = (a: Asset) => {
    setEditing(a);
    setForm({ clienteId: a.clienteId, nombre: a.nombre, tipo: a.tipo, marca: a.marca ?? '', modelo: a.modelo ?? '', numeroSerie: a.numeroSerie ?? '', estado: a.estado, descripcion: a.descripcion ?? '' });
    setError(''); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/assets/${editing.id}`, form);
      else         await api.post('/assets', form);
      await load(); setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const f = (k: keyof AssetForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const clientName = (id: string) => {
    const c = clients.find(c => c.id === id);
    return c ? `${c.nombre} ${c.apellido}` : id;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{assets.length} activo(s)</p>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo activo</Button>
      </div>

      {assets.length === 0 ? (
        <EmptyState title="Sin activos" action={<Button size="sm" onClick={openCreate}>Agregar</Button>} />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Serie</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Marca / Modelo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {assets.map(a => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{a.nombre}</td>
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{a.numeroSerie ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-700">{fmt(a.tipo)}</td>
                  <td className="px-5 py-3 text-gray-700">{a.marca} {a.modelo ? `/ ${a.modelo}` : ''}</td>
                  <td className="px-5 py-3"><Badge variant={assetStatusVariant(a.estado)}>{fmt(a.estado)}</Badge></td>
                  <td className="px-5 py-3 text-gray-500">{clientName(a.clienteId)}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(a.createdAt)}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => openEdit(a)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar activo' : 'Nuevo activo'} maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cliente *</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.clienteId} onChange={f('clienteId')} required>
              <option value="">Seleccionar...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>)}
            </select>
          </div>
          <Input label="Nombre del equipo *" value={form.nombre} onChange={f('nombre')} required />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Tipo *</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.tipo} onChange={f('tipo')}>
                {TIPOS.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.estado} onChange={f('estado')}>
                {ESTADOS.map(s => <option key={s} value={s}>{fmt(s)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marca *" value={form.marca} onChange={f('marca')} required />
            <Input label="Modelo" value={form.modelo} onChange={f('modelo')} />
          </div>
          <Input label="Numero de serie *" value={form.numeroSerie} onChange={f('numeroSerie')} required />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" rows={2} value={form.descripcion} onChange={f('descripcion')} />
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
