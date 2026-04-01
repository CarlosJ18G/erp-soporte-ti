'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Client } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type ClientForm = Partial<Client> & { password?: string };

const empty: ClientForm = { nombre: '', apellido: '', email: '', telefono: '', empresa: '', password: '' };

export default function ClientsPage() {
  const { isAdmin } = useAuth();
  const [clients,  setClients]  = useState<Client[]>([]);
  const [companyFilter, setCompanyFilter] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [open,     setOpen]     = useState(false);
  const [editing,  setEditing]  = useState<Client | null>(null);
  const [form,     setForm]     = useState<ClientForm>(empty);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = () =>
    api.get<Client[]>('/clients')
       .then(r => setClients(r.data ?? []))
       .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setError(''); setOpen(true); };
  const openEdit   = (c: Client) => { setEditing(c); setForm({ ...c, password: '' }); setError(''); setOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editing) await api.put(`/clients/${editing.id}`, form);
      else         await api.post('/clients', form);
      await load();
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar cliente?')) return;
    await api.delete(`/clients/${id}`);
    await load();
  };

  const f = (k: keyof Client) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const empresas = Array.from(new Set(clients.map((c) => (c.empresa ?? '').trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
  const filteredClients = companyFilter
    ? clients.filter((c) => (c.empresa ?? '').trim() === companyFilter)
    : clients;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{filteredClients.length} cliente(s)</p>
          <select
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            aria-label="Filtrar por empresa"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((empresa) => (
              <option key={empresa} value={empresa}>{empresa}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo cliente</Button>
      </div>

      {filteredClients.length === 0 ? (
        <EmptyState title="Sin clientes" action={<Button size="sm" onClick={openCreate}>Agregar</Button>} />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Telefono</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Creado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.nombre} {c.apellido}</td>
                  <td className="px-5 py-3 text-gray-500">{c.email}</td>
                  <td className="px-5 py-3 text-gray-500">{c.telefono ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500">{c.empresa ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(c.id)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar cliente' : 'Nuevo cliente'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre ?? ''} onChange={f('nombre')} required />
            <Input label="Apellido *" value={form.apellido ?? ''} onChange={f('apellido')} required />
          </div>
          <Input label="Email *" type="email" value={form.email ?? ''} onChange={f('email')} required />
          <Input
            label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
            type="password"
            value={form.password ?? ''}
            onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            required={!editing}
          />
          <Input label="Telefono" value={form.telefono ?? ''} onChange={f('telefono')} />
          <Input label="Empresa" value={form.empresa ?? ''} onChange={f('empresa')} />
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
