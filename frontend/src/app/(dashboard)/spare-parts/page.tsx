'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SparePart } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface SparePartForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
  stockMinimo: string;
  activo: boolean;
}

const empty: SparePartForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  precio: '',
  stock: '0',
  stockMinimo: '5',
  activo: true,
};

export default function SparePartsPage() {
  const { isAdmin } = useAuth();
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SparePart | null>(null);
  const [form, setForm] = useState<SparePartForm>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () =>
    api
      .get<SparePart[]>('/spare-parts')
      .then((r) => setParts(r.data ?? []))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setError('');
    setOpen(true);
  };

  const openEdit = (part: SparePart) => {
    setEditing(part);
    setForm({
      codigo: part.codigo,
      nombre: part.nombre,
      descripcion: part.descripcion ?? '',
      precio: String(part.precio),
      stock: String(part.stock),
      stockMinimo: String(part.stockMinimo),
      activo: part.activo,
    });
    setError('');
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      codigo: form.codigo.trim(),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || undefined,
      precio: parseFloat(form.precio),
      stock: parseInt(form.stock, 10),
      stockMinimo: parseInt(form.stockMinimo, 10),
      activo: form.activo,
    };

    try {
      if (editing) {
        await api.put(`/spare-parts/${editing.id}`, payload);
      } else {
        await api.post('/spare-parts', payload);
      }
      await load();
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar repuesto?')) return;
    await api.delete(`/spare-parts/${id}`);
    await load();
  };

  const lowStockCount = parts.filter((p) => p.stock <= p.stockMinimo).length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{parts.length} repuesto(s)</p>
          <Badge variant={lowStockCount > 0 ? 'warning' : 'success'}>
            Bajo stock: {lowStockCount}
          </Badge>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nuevo repuesto
          </Button>
        )}
      </div>

      {parts.length === 0 ? (
        <EmptyState title="Sin repuestos" />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Codigo</th>
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Precio</th>
                <th className="px-5 py-3">Stock</th>
                <th className="px-5 py-3">Stock minimo</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => {
                const lowStock = p.stock <= p.stockMinimo;
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{p.codigo}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{p.nombre}</td>
                    <td className="px-5 py-3 text-gray-600">${Number(p.precio).toFixed(2)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={lowStock ? 'warning' : 'default'}>{p.stock}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.stockMinimo}</td>
                    <td className="px-5 py-3">
                      <Badge variant={p.activo ? 'success' : 'danger'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-3">
                      {isAdmin && (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar repuesto' : 'Nuevo repuesto'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Codigo *</label>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.codigo}
                onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Nombre *</label>
              <input
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Precio *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.precio}
                onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Stock *</label>
              <input
                type="number"
                min="0"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Stock minimo *</label>
              <input
                type="number"
                min="0"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                value={form.stockMinimo}
                onChange={(e) => setForm((p) => ({ ...p, stockMinimo: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm((p) => ({ ...p, activo: e.target.checked }))}
            />
            Repuesto activo
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear repuesto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
