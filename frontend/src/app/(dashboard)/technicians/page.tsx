'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Technician } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ESPECIALIDADES = [
  'SOPORTE_HARDWARE',
  'SOPORTE_SOFTWARE',
  'REDES_Y_CONECTIVIDAD',
  'SERVIDORES',
  'BASES_DE_DATOS',
  'SEGURIDAD_INFORMATICA',
  'SISTEMAS_OPERATIVOS',
  'CORREO_Y_COLABORACION',
  'MESA_DE_AYUDA',
  'TELEFONIA_IP',
  'OTRA',
] as const;

interface TechForm {
  nombre: string; apellido: string; email: string; telefono: string;
  especialidad: string; password?: string; rol: 'ADMIN' | 'TECNICO';
}

const empty: TechForm = { nombre: '', apellido: '', email: '', telefono: '', especialidad: '', password: '', rol: 'TECNICO' };

export default function TechniciansPage() {
  const { isAdmin, user } = useAuth();
  const [techs,   setTechs]   = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [form,    setForm]    = useState<TechForm>(empty);
  const [customEspecialidad, setCustomEspecialidad] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const load = () =>
    api.get<Technician[]>('/technicians')
       .then(r => setTechs(r.data ?? []))
       .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setCustomEspecialidad(''); setError(''); setOpen(true); };
  const openEdit   = (t: Technician) => {
    const especialidad = t.especialidad ?? '';
    const conocida = ESPECIALIDADES.includes(especialidad as (typeof ESPECIALIDADES)[number]);

    setEditing(t);
    setForm({
      nombre: t.nombre,
      apellido: t.apellido,
      email: t.email,
      telefono: t.telefono ?? '',
      especialidad: conocida ? especialidad : especialidad ? 'OTRA' : '',
      rol: t.rol,
      password: '',
    });
    setCustomEspecialidad(conocida ? '' : especialidad);
    setError(''); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const body = {
      ...form,
      especialidad: form.especialidad === 'OTRA' ? customEspecialidad.trim() : form.especialidad,
    };
    if (!body.password) delete body.password;
    if (form.especialidad === 'OTRA' && !body.especialidad) {
      setError('Escribe la especialidad personalizada.');
      setSaving(false);
      return;
    }
    try {
      if (editing) await api.put(`/technicians/${editing.id}`, body);
      else         await api.post('/technicians', body);
      await load(); setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar tecnico?')) return;
    await api.delete(`/technicians/${id}`);
    await load();
  };

  const f = (k: keyof TechForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{techs.length} tecnico(s)</p>
        {isAdmin && <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo tecnico</Button>}
      </div>

      {techs.length === 0 ? (
        <EmptyState title="Sin tecnicos" />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Especialidad</th>
                <th className="px-5 py-3">Rol</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Creado</th>
                {isAdmin && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {techs.map(t => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{t.nombre} {t.apellido}</td>
                  <td className="px-5 py-3 text-gray-500">{t.email}</td>
                  <td className="px-5 py-3 text-gray-500">{t.especialidad ? fmt(t.especialidad) : '-'}</td>
                  <td className="px-5 py-3"><Badge variant={t.rol === 'ADMIN' ? 'info' : 'default'}>{fmt(t.rol)}</Badge></td>
                  <td className="px-5 py-3"><Badge variant={t.activo ? 'success' : 'danger'}>{t.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
                  {isAdmin && (
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(t)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-primary"><Pencil className="h-4 w-4" /></button>
                        {t.id !== user?.id && (
                          <button onClick={() => handleDelete(t.id)} className="rounded p-1 hover:bg-gray-100 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar tecnico' : 'Nuevo tecnico'}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre *" value={form.nombre} onChange={f('nombre')} required />
            <Input label="Apellido *" value={form.apellido} onChange={f('apellido')} required />
          </div>
          <Input label="Email *" type="email" value={form.email} onChange={f('email')} required />
          <Input label="Telefono" value={form.telefono} onChange={f('telefono')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Especialidad</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.especialidad}
              onChange={(e) => {
                f('especialidad')(e);
                if (e.target.value !== 'OTRA') setCustomEspecialidad('');
              }}
            >
              <option value="">Seleccionar...</option>
              {ESPECIALIDADES.map((s) => (
                <option key={s} value={s}>{fmt(s)}</option>
              ))}
              {editing && editing.especialidad && !ESPECIALIDADES.includes(editing.especialidad as (typeof ESPECIALIDADES)[number]) && (
                <option value={editing.especialidad}>{editing.especialidad}</option>
              )}
            </select>
          </div>
          {form.especialidad === 'OTRA' && (
            <Input
              label="Especialidad personalizada"
              value={customEspecialidad}
              onChange={(e) => setCustomEspecialidad(e.target.value)}
              placeholder="Ej. Virtualización"
              required
            />
          )}
          <Input label={editing ? 'Nueva contrasena (dejar vacio para no cambiar)' : 'Contrasena *'} type="password" value={form.password ?? ''} onChange={f('password')} required={!editing} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Rol</label>
            <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary" value={form.rol} onChange={f('rol')}>
              <option value="TECNICO">TECNICO</option>
              <option value="ADMIN">ADMIN</option>
            </select>
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
