'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api';
import { Modal } from '@/components/ui/Modal';
import { TICKET_CATEGORIES, SERVICE_ORDER_ACTIVITY_OPTIONS } from '@/lib/ticketCategories';
import { Info } from 'lucide-react';
import { Asset } from '@/types';
import { useEffect } from 'react';

type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export default function ClientNewTicketPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipoOrdenSugerido, setTipoOrdenSugerido] = useState('');
  const [categoria, setCategoria] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activoId, setActivoId] = useState('');
  const [cantidadActivosAfectados, setCantidadActivosAfectados] = useState('1');
  const [prioridad, setPrioridad] = useState<TicketPriority>('MEDIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showCategoryInfo, setShowCategoryInfo] = useState(false);

  useEffect(() => {
    api.get<Asset[]>('/assets')
      .then((res) => setAssets(res.data ?? []))
      .catch(() => setAssets([]));
  }, []);

  const operationalAssets = assets.filter((asset) => asset.estado === 'OPERATIVO');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await api.post('/tickets', {
        titulo,
        descripcion: tipoOrdenSugerido
          ? `[Tipo de orden sugerido: ${tipoOrdenSugerido.replace(/_/g, ' ')}]\n${descripcion}`
          : descripcion,
        categoria: categoria || undefined,
        activoId: activoId || undefined,
        cantidadActivosAfectados: activoId ? Number(cantidadActivosAfectados) : undefined,
        prioridad,
      });

      router.push('/client-dashboard/tickets');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.errors?.length) {
          setError(err.errors.map((e) => `${e.field}: ${e.message}`).join(' | '));
        } else {
          setError(err.message);
        }
      } else {
        setError('No se pudo crear el ticket. Intenta nuevamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Crear Ticket</h1>
        <p className="mt-1 text-sm text-gray-600">Describe el problema para que soporte lo atienda.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Input
          id="titulo"
          label="Titulo"
          placeholder="Ejemplo: Mi impresora no enciende"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          required
        />

        <div>
          <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-gray-700">
            Descripcion
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            placeholder="Explica con detalle el inconveniente"
            required
          />
        </div>

        <div>
          <label htmlFor="tipoOrdenSugerido" className="mb-1 block text-sm font-medium text-gray-700">
            Tipo de orden sugerido
          </label>
          <select
            id="tipoOrdenSugerido"
            value={tipoOrdenSugerido}
            onChange={(e) => setTipoOrdenSugerido(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Seleccionar...</option>
            {SERVICE_ORDER_ACTIVITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">
              Categoria
            </label>
            <button
              type="button"
              onClick={() => setShowCategoryInfo(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <Info className="h-4 w-4" />
              Ver guia
            </button>
          </div>
          <select
            id="categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Selecciona una categoria</option>
            {TICKET_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="activo" className="mb-1 block text-sm font-medium text-gray-700">
            Activo afectado (opcional)
          </label>
          <select
            id="activo"
            value={activoId}
            onChange={(e) => {
              setActivoId(e.target.value);
              if (!e.target.value) setCantidadActivosAfectados('1');
            }}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Sin activo</option>
            {operationalAssets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.nombre} - {asset.empresa} ({asset.cantidad})
              </option>
            ))}
          </select>
        </div>

        {activoId && (
          <Input
            id="cantidadActivosAfectados"
            label="Cantidad de activos afectados"
            type="number"
            min={1}
            value={cantidadActivosAfectados}
            onChange={(e) => setCantidadActivosAfectados(e.target.value)}
            required
          />
        )}

        <div>
          <label htmlFor="prioridad" className="mb-1 block text-sm font-medium text-gray-700">
            Prioridad
          </label>
          <select
            id="prioridad"
            value={prioridad}
            onChange={(e) => setPrioridad(e.target.value as TicketPriority)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Critica</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={submitting}>
            Crear ticket
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/client-dashboard/tickets')}>
            Cancelar
          </Button>
        </div>
      </form>

      <Modal open={showCategoryInfo} onClose={() => setShowCategoryInfo(false)} title="Guia de categorias" maxWidth="xl">
        <div className="space-y-3">
          {TICKET_CATEGORIES.map((cat) => (
            <div key={cat.value} className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
              <p className="mt-1 text-sm text-gray-600">{cat.description}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
