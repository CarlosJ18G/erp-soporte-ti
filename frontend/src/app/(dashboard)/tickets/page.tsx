'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { Ticket, Client, Asset, Technician, SparePart } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge, ticketPriorityVariant, ticketStatusVariant } from '@/components/ui/Badge';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { formatDate, fmt } from '@/lib/utils';
import { Plus, Filter, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSearchParams } from 'next/navigation';
import { TICKET_CATEGORIES, SERVICE_ORDER_ACTIVITY_OPTIONS } from '@/lib/ticketCategories';
import { TIPOS_ACTIVO, MARCAS_POR_TIPO, MODELOS_POR_TIPO_Y_MARCA } from '@/lib/assetCatalog';

const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const ESTADOS = ['ABIERTO', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTO', 'CERRADO'];

interface TicketForm {
  clienteId: string;
  activoId: string;
  cantidadActivosAfectados: string;
  tecnicoAsignadoId: string;
  titulo: string;
  descripcion: string;
  tipoOrdenSugerido: string;
  categoria: string;
  prioridad: string;
}

const empty: TicketForm = {
  clienteId: '',
  activoId: '',
  cantidadActivosAfectados: '1',
  tecnicoAsignadoId: '',
  titulo: '',
  descripcion: '',
  tipoOrdenSugerido: '',
  categoria: '',
  prioridad: 'MEDIA',
};

type FinalizacionActivo = {
  estadoFinal: 'OPERATIVO' | 'DADO_DE_BAJA';
  fueReemplazado: 'SI' | 'NO';
  reemplazoTipo: 'IGUAL' | 'DIFERENTE';
  activoReemplazo: {
    nombre: string;
    tipo: string;
    marca: string;
    modelo: string;
    numeroSerie: string;
    descripcion: string;
  };
};

type RepuestoItem = {
  repuestoId: string;
  cantidad: string;
};

const makeEmptyRepuesto = (): RepuestoItem => ({ repuestoId: '', cantidad: '1' });
const generateRandomSerial = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
  return `SR-${timestamp}-${rand}`;
};

export default function TicketsPage() {
  const { isAdmin, user } = useAuth();
  const searchParams = useSearchParams();
  const initialStatusFilter = searchParams.get('estado') ?? '';
  const priorityFilter = searchParams.get('prioridad') ?? undefined;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [techs, setTechs] = useState<Technician[]>([]);
  const [parts, setParts] = useState<SparePart[]>([]);

  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TicketForm>(empty);
  const [createEmpresa, setCreateEmpresa] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [hideClosed, setHideClosed] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [empresaFilter, setEmpresaFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [detailModal, setDetailModal] = useState<{ open: boolean; ticket?: Ticket; changing: boolean }>({
    open: false,
    changing: false,
  });

  const [finalizeModal, setFinalizeModal] = useState<{
    open: boolean;
    ticket?: Ticket;
    activosFinalizacion: FinalizacionActivo[];
    repuestos: RepuestoItem[];
    notaFinalizacion: string;
  }>({
    open: false,
    activosFinalizacion: [],
    repuestos: [makeEmptyRepuesto()],
    notaFinalizacion: '',
  });
  const [replacementAssetModal, setReplacementAssetModal] = useState<{ open: boolean; index: number | null }>({
    open: false,
    index: null,
  });

  useEffect(() => {
    setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);

  const load = useCallback(
    () =>
      Promise.all([
        api
          .get<Ticket[]>('/tickets', {
            ...(isAdmin && !hideClosed ? { mostrarCerrados: 'true' } : {}),
            ...(statusFilter ? { estado: statusFilter } : {}),
            ...(priorityFilter ? { prioridad: priorityFilter } : {}),
            ...(clienteFilter ? { clienteId: clienteFilter } : {}),
          })
          .then((r) => setTickets(r.data ?? [])),
        api.get<Client[]>('/clients').then((r) => setClients(r.data ?? [])),
        api.get<Asset[]>('/assets').then((r) => setAssets(r.data ?? [])),
        api.get<Technician[]>('/technicians').then((r) => setTechs(r.data ?? [])),
        api.get<SparePart[]>('/spare-parts').then((r) => setParts(r.data ?? [])),
      ]).finally(() => setLoading(false)),
    [hideClosed, isAdmin, priorityFilter, statusFilter, clienteFilter],
  );

  useEffect(() => {
    load();
  }, [load]);

  const selectedClient = clients.find((c) => c.id === form.clienteId);
  const empresasDisponibles = useMemo(
    () => Array.from(new Set(clients.map((c) => c.empresa).filter(Boolean) as string[])).sort(),
    [clients],
  );
  const clientesFiltrables = useMemo(
    () => clients.filter((c) => !empresaFilter || c.empresa === empresaFilter),
    [clients, empresaFilter],
  );
  const ticketsFiltrados = useMemo(
    () => tickets.filter((t) => {
      if (hideClosed && t.estado === 'CERRADO') return false;
      if (!empresaFilter) return true;
      const cliente = clients.find((c) => c.id === t.clienteId);
      return cliente?.empresa === empresaFilter;
    }),
    [tickets, clients, empresaFilter, hideClosed],
  );

  useEffect(() => {
    if (!clienteFilter) return;
    if (!clientesFiltrables.some((c) => c.id === clienteFilter)) {
      setClienteFilter('');
    }
  }, [clientesFiltrables, clienteFilter]);

  const clientAssets = assets.filter(
    (a) => selectedClient?.empresa && a.empresa === selectedClient.empresa && a.estado === 'OPERATIVO',
  );
  const clientsForCreateTicket = useMemo(
    () => clients.filter((c) => !createEmpresa || c.empresa === createEmpresa),
    [clients, createEmpresa],
  );

  useEffect(() => {
    if (!form.clienteId) return;
    if (!clientsForCreateTicket.some((c) => c.id === form.clienteId)) {
      setForm((prev) => ({ ...prev, clienteId: '', activoId: '', cantidadActivosAfectados: '1' }));
    }
  }, [clientsForCreateTicket, form.clienteId]);

  useEffect(() => {
    if (!form.clienteId) return;
    const clienteSeleccionado = clients.find((c) => c.id === form.clienteId);
    if (clienteSeleccionado?.empresa && createEmpresa !== clienteSeleccionado.empresa) {
      setCreateEmpresa(clienteSeleccionado.empresa);
    }
  }, [clients, createEmpresa, form.clienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const body = {
      ...form,
      descripcion: form.tipoOrdenSugerido
        ? `[Tipo de orden sugerido: ${fmt(form.tipoOrdenSugerido)}]\n${form.descripcion}`
        : form.descripcion,
      tecnicoAsignadoId: form.tecnicoAsignadoId || undefined,
      activoId: form.activoId || undefined,
      cantidadActivosAfectados: form.activoId ? Number(form.cantidadActivosAfectados) : undefined,
    };

    try {
      await api.post('/tickets', body);
      await load();
      setOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async (ticketId: string) => {
    try {
      await api.patch(`/tickets/${ticketId}/status`, { estado: 'EN_PROGRESO' });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleFinalize = (ticket: Ticket) => {
    const cantidad = ticket.activoId ? Math.max(1, Number(ticket.cantidadActivosAfectados ?? 1)) : 0;

    setFinalizeModal({
      open: true,
      ticket,
      activosFinalizacion: Array.from({ length: cantidad }).map(() => ({
        estadoFinal: 'OPERATIVO',
        fueReemplazado: 'NO',
        reemplazoTipo: 'IGUAL',
        activoReemplazo: {
          nombre: '',
          tipo: 'COMPUTADORA',
          marca: '',
          modelo: '',
          numeroSerie: generateRandomSerial(),
          descripcion: '',
        },
      })),
      repuestos: [makeEmptyRepuesto()],
      notaFinalizacion: '',
    });
  };

  const openDetail = (ticket: Ticket) => {
    setDetailModal({
      open: true,
      ticket,
      changing: false,
    });
  };

  const changeTicketStatus = async (estado: Ticket['estado']) => {
    if (!detailModal.ticket) return;

    const ticket = detailModal.ticket;

    if (estado === 'RESUELTO') {
      setDetailModal((prev) => ({ ...prev, open: false }));
      handleFinalize(ticket);
      return;
    }

    try {
      setDetailModal((prev) => ({ ...prev, changing: true }));
      await api.patch(`/tickets/${ticket.id}/status`, { estado });
      await load();
      const updated = await api.get<Ticket>(`/tickets/${ticket.id}`);
      setDetailModal({
        open: true,
        ticket: updated.data,
        changing: false,
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
      setDetailModal((prev) => ({ ...prev, changing: false }));
    }
  };

  const confirmFinalizeTicket = async () => {
    if (!finalizeModal.ticket) return;

    const reemplazoDiferenteInvalido = finalizeModal.activosFinalizacion.find(
      (item) =>
        item.estadoFinal === 'DADO_DE_BAJA'
        && item.fueReemplazado === 'SI'
        && item.reemplazoTipo === 'DIFERENTE'
        && (!item.activoReemplazo.nombre || !item.activoReemplazo.tipo || !item.activoReemplazo.numeroSerie),
    );

    if (reemplazoDiferenteInvalido) {
      alert('Completa nombre, tipo y numero de serie para los activos de reemplazo diferentes.');
      return;
    }

    try {
      await api.patch(`/tickets/${finalizeModal.ticket.id}/status`, {
        estado: 'RESUELTO',
        ...(finalizeModal.activosFinalizacion.length > 0
          ? {
              activosFinalizacion: finalizeModal.activosFinalizacion.map((item) => ({
                estadoFinal: item.estadoFinal,
                ...(item.estadoFinal === 'DADO_DE_BAJA'
                  ? {
                      fueReemplazado: item.fueReemplazado === 'SI',
                      ...(item.fueReemplazado === 'SI' ? { reemplazoTipo: item.reemplazoTipo } : {}),
                      ...(item.fueReemplazado === 'SI' && item.reemplazoTipo === 'DIFERENTE'
                        ? {
                            activoReemplazo: {
                              nombre: item.activoReemplazo.nombre,
                              tipo: item.activoReemplazo.tipo,
                              marca: item.activoReemplazo.marca || undefined,
                              modelo: item.activoReemplazo.modelo || undefined,
                              numeroSerie: item.activoReemplazo.numeroSerie,
                              descripcion: item.activoReemplazo.descripcion || undefined,
                            },
                          }
                        : {}),
                    }
                  : {}),
              })),
            }
          : {}),
        repuestos: finalizeModal.repuestos
          .filter((item) => item.repuestoId && Number(item.cantidad) > 0)
          .map((item) => ({ repuestoId: item.repuestoId, cantidad: Number(item.cantidad) })),
        notaFinalizacion: finalizeModal.notaFinalizacion || undefined,
      });

      setFinalizeModal({
        open: false,
        activosFinalizacion: [],
        repuestos: [makeEmptyRepuesto()],
        notaFinalizacion: '',
      });
      await load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error');
    }
  };

  const updateFinalizacionItem = (
    index: number,
    field: keyof FinalizacionActivo,
    value: FinalizacionActivo[keyof FinalizacionActivo],
  ) => {
    setFinalizeModal((prev) => ({
      ...prev,
      activosFinalizacion: prev.activosFinalizacion.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const updateFinalizacionActivoReemplazo = (
    index: number,
    field: 'nombre' | 'tipo' | 'marca' | 'modelo' | 'numeroSerie' | 'descripcion',
    value: string,
  ) => {
    setFinalizeModal((prev) => ({
      ...prev,
      activosFinalizacion: prev.activosFinalizacion.map((item, idx) =>
        idx === index
          ? {
              ...item,
              activoReemplazo: {
                ...item.activoReemplazo,
                [field]: value,
              },
            }
          : item,
      ),
    }));
  };

  const updateRepuestoItem = (index: number, field: keyof RepuestoItem, value: string) => {
    setFinalizeModal((prev) => ({
      ...prev,
      repuestos: prev.repuestos.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addRepuestoItem = () => {
    setFinalizeModal((prev) => ({ ...prev, repuestos: [...prev.repuestos, makeEmptyRepuesto()] }));
  };

  const removeRepuestoItem = (index: number) => {
    setFinalizeModal((prev) => ({
      ...prev,
      repuestos: prev.repuestos.filter((_, idx) => idx !== index),
    }));
  };

  const selectedPartIds = useMemo(
    () => new Set(finalizeModal.repuestos.map((item) => item.repuestoId).filter(Boolean)),
    [finalizeModal.repuestos],
  );

  const totalRepuestos = useMemo(
    () =>
      finalizeModal.repuestos.reduce((acc, item) => {
        const part = parts.find((p) => p.id === item.repuestoId);
        if (!part) return acc;
        const qty = Number(item.cantidad) || 0;
        return acc + qty * Number(part.precio);
      }, 0),
    [finalizeModal.repuestos, parts],
  );

  const replacementAsset =
    replacementAssetModal.index !== null
      ? finalizeModal.activosFinalizacion[replacementAssetModal.index]?.activoReemplazo
      : null;
  const replacementMarcasDisponibles = replacementAsset
    ? MARCAS_POR_TIPO[replacementAsset.tipo] ?? []
    : [];
  const replacementMarcaKey = (replacementAsset?.marca || '').trim().toUpperCase().replace(/\s+/g, '_');
  const replacementModelosDisponibles = replacementAsset
    ? MODELOS_POR_TIPO_Y_MARCA[replacementAsset.tipo]?.[replacementMarcaKey] ?? []
    : [];

  const f =
    (k: keyof TicketForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value }));

  const clientName = (id?: string) => {
    if (!id) return '-';
    const c = clients.find((client) => client.id === id);
    return c ? `${c.nombre} ${c.apellido}` : '-';
  };

  const clientCompany = (id?: string) => {
    if (!id) return '-';
    const c = clients.find((client) => client.id === id);
    return c?.empresa || '-';
  };

  const technicianName = (ticket: Ticket) => {
    if (ticket.tecnicoAsignado) return `${ticket.tecnicoAsignado.nombre} ${ticket.tecnicoAsignado.apellido}`;
    return 'Sin asignar';
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{ticketsFiltrados.length} ticket(s)</p>
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
            value={clienteFilter}
            onChange={(e) => setClienteFilter(e.target.value)}
            aria-label="Filtrar por cliente"
          >
            <option value="">Todos los clientes</option>
            {clientesFiltrables.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>{cliente.nombre} {cliente.apellido}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map((s) => (
              <option key={s} value={s}>
                {fmt(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" variant={hideClosed ? 'secondary' : 'ghost'} onClick={() => setHideClosed((prev) => !prev)}>
              <Filter className="h-4 w-4" /> {hideClosed ? 'Mostrar todos' : 'Ocultar cerrados'}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setForm(empty);
              setCreateEmpresa('');
              setError('');
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nuevo ticket
          </Button>
        </div>
      </div>

      {ticketsFiltrados.length === 0 ? (
        <EmptyState title="Sin tickets" />
      ) : (
        <div className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-5 py-3">Numero</th>
                <th className="px-5 py-3">Asunto</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Empresa</th>
                <th className="px-5 py-3">Tecnico</th>
                <th className="px-5 py-3">Prioridad</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {ticketsFiltrados.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(t)}>
                  <td className="px-5 py-3 font-mono text-xs font-medium text-gray-700">{t.numero || t.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 font-medium text-gray-900 max-w-xs truncate">{t.titulo}</td>
                  <td className="px-5 py-3 text-gray-500">{clientName(t.clienteId)}</td>
                  <td className="px-5 py-3 text-gray-500">{clientCompany(t.clienteId)}</td>
                  <td className="px-5 py-3 text-gray-500">{technicianName(t)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={ticketPriorityVariant(t.prioridad)}>{fmt(t.prioridad)}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={ticketStatusVariant(t.estado)}>{fmt(t.estado)}</Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(t.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, changing: false })}
        title={`Ticket ${detailModal.ticket?.numero || detailModal.ticket?.id?.slice(0, 8) || ''}: ${detailModal.ticket?.titulo || ''}`}
        maxWidth="2xl"
      >
        {detailModal.ticket && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Numero</p>
                <p className="text-sm font-mono font-semibold text-gray-900">{detailModal.ticket.numero || detailModal.ticket.id.slice(0, 8)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <p className="text-sm font-medium text-gray-900">{clientName(detailModal.ticket.clienteId)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Empresa</p>
                <p className="text-sm font-medium text-gray-900">{clientCompany(detailModal.ticket.clienteId)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tecnico</p>
                <p className="text-sm font-medium text-gray-900">{technicianName(detailModal.ticket)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prioridad</p>
                <Badge variant={ticketPriorityVariant(detailModal.ticket.prioridad)}>{fmt(detailModal.ticket.prioridad)}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado actual</p>
                <Badge variant={ticketStatusVariant(detailModal.ticket.estado)}>{fmt(detailModal.ticket.estado)}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Categoria</p>
                <p className="text-sm text-gray-900">{detailModal.ticket.categoria ? fmt(detailModal.ticket.categoria) : '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Activos incluidos</p>
                {detailModal.ticket.activo ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-sm font-medium text-gray-900">{detailModal.ticket.activo.nombre}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {fmt(detailModal.ticket.activo.tipo)}
                      {detailModal.ticket.activo.marca ? ` • ${detailModal.ticket.activo.marca}` : ''}
                      {detailModal.ticket.activo.modelo ? ` / ${detailModal.ticket.activo.modelo}` : ''}
                      {detailModal.ticket.activo.numeroSerie ? ` • Serie: ${detailModal.ticket.activo.numeroSerie}` : ''}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Cantidad afectada: {detailModal.ticket.cantidadActivosAfectados || 1}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Sin activos asociados</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Creado</p>
                <p className="text-sm text-gray-900">{formatDate(detailModal.ticket.createdAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Descripcion</p>
              <p className="text-sm text-gray-700 rounded-lg bg-gray-50 p-3">{detailModal.ticket.descripcion}</p>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <p className="text-sm font-semibold text-gray-900 mb-3">Acciones de estado</p>
              {user ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {detailModal.ticket.estado === 'ABIERTO' && (
                    <Button size="sm" loading={detailModal.changing} onClick={() => changeTicketStatus('EN_PROGRESO')}>
                      Iniciar
                    </Button>
                  )}
                  {detailModal.ticket.estado === 'EN_PROGRESO' && (
                    <Button size="sm" variant="secondary" loading={detailModal.changing} onClick={() => changeTicketStatus('EN_ESPERA')}>
                      En espera
                    </Button>
                  )}
                  {detailModal.ticket.estado === 'EN_ESPERA' && (
                    <Button size="sm" variant="secondary" loading={detailModal.changing} onClick={() => changeTicketStatus('EN_PROGRESO')}>
                      Reanudar
                    </Button>
                  )}
                  {detailModal.ticket.estado === 'EN_PROGRESO' && (
                    <Button size="sm" loading={detailModal.changing} onClick={() => changeTicketStatus('RESUELTO')}>
                      Finalizar
                    </Button>
                  )}
                  {detailModal.ticket.estado === 'RESUELTO' && !detailModal.ticket.activoId && (
                    isAdmin ? (
                      <Button size="sm" variant="secondary" loading={detailModal.changing} onClick={() => changeTicketStatus('CERRADO')}>
                        Cerrar
                      </Button>
                    ) : null
                  )}
                  {detailModal.ticket.estado === 'CERRADO' && (
                    isAdmin ? (
                      <Button size="sm" variant="secondary" loading={detailModal.changing} onClick={() => changeTicketStatus('ABIERTO')}>
                        Reabrir
                      </Button>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No tienes permisos para cambiar estado.</p>
              )}
              {!isAdmin && (detailModal.ticket.estado === 'RESUELTO' || detailModal.ticket.estado === 'CERRADO') ? (
                <p className="text-xs text-gray-500">Solo un administrador puede cerrar o reabrir tickets.</p>
              ) : null}
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setDetailModal({ open: false, changing: false })}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo ticket" maxWidth="lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Empresa *</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={createEmpresa}
              onChange={(e) => {
                const empresa = e.target.value;
                if (empresa === createEmpresa) return;
                setCreateEmpresa(empresa);
                setForm((p) => ({ ...p, clienteId: '', activoId: '', cantidadActivosAfectados: '1' }));
              }}
              required
            >
              <option value="">Seleccionar...</option>
              {empresasDisponibles.map((empresa) => (
                <option key={empresa} value={empresa}>{empresa}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Cliente *</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.clienteId}
              onChange={(e) => {
                const clienteId = e.target.value;
                const cliente = clients.find((c) => c.id === clienteId);
                setForm((p) => ({
                  ...p,
                  clienteId,
                  activoId: '',
                  cantidadActivosAfectados: '1',
                }));
                if (cliente?.empresa) {
                  setCreateEmpresa(cliente.empresa);
                }
              }}
              required
            >
              <option value="">Seleccionar...</option>
              {clientsForCreateTicket.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.apellido}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Activo</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.activoId}
              onChange={f('activoId')}
            >
              <option value="">Sin activo</option>
              {clientAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} - {a.empresa} ({a.cantidad})
                </option>
              ))}
            </select>
          </div>

          {form.activoId && (
            <Input
              label="Cantidad de activos afectados"
              type="number"
              min={1}
              value={form.cantidadActivosAfectados}
              onChange={f('cantidadActivosAfectados')}
              required
            />
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tecnico asignado</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.tecnicoAsignadoId}
              onChange={f('tecnicoAsignadoId')}
            >
              <option value="">Sin asignar</option>
              {techs.filter((t) => t.activo).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre} {t.apellido}
                </option>
              ))}
            </select>
          </div>

          <Input label="Titulo *" value={form.titulo} onChange={f('titulo')} required />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              rows={3}
              value={form.descripcion}
              onChange={f('descripcion')}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Tipo de orden sugerido</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.tipoOrdenSugerido}
              onChange={f('tipoOrdenSugerido')}
            >
              <option value="">Seleccionar...</option>
              {SERVICE_ORDER_ACTIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Categoria</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.categoria}
              onChange={f('categoria')}
            >
              <option value="">Seleccionar...</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Prioridad</label>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              value={form.prioridad}
              onChange={f('prioridad')}
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {fmt(p)}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving}>
              Crear ticket
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={finalizeModal.open}
        onClose={() => setFinalizeModal({ open: false, activosFinalizacion: [], repuestos: [makeEmptyRepuesto()], notaFinalizacion: '' })}
        title="Finalizar ticket"
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-4">
          {finalizeModal.activosFinalizacion.length > 0 && (
            <>
              <p className="text-sm text-gray-700">
                Este ticket afecta {finalizeModal.ticket?.cantidadActivosAfectados ?? 1} activo(s). Selecciona la opcion por cada activo:
              </p>

              <div className="max-h-[40vh] overflow-y-auto pr-1">
                <div className="flex flex-col gap-3">
                  {finalizeModal.activosFinalizacion.map((item, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 p-3">
                      <p className="mb-2 text-sm font-semibold text-gray-800">Activo #{idx + 1}</p>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-sm font-medium text-gray-700">Estado final</label>
                          <select
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            value={item.estadoFinal}
                            onChange={(e) =>
                              updateFinalizacionItem(idx, 'estadoFinal', e.target.value as 'OPERATIVO' | 'DADO_DE_BAJA')
                            }
                          >
                            <option value="OPERATIVO">Operativo</option>
                            <option value="DADO_DE_BAJA">Dado de baja</option>
                          </select>
                        </div>

                        {item.estadoFinal === 'DADO_DE_BAJA' && (
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-sm font-medium text-gray-700">Fue reemplazado?</label>
                              <select
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                value={item.fueReemplazado}
                                onChange={(e) =>
                                  updateFinalizacionItem(idx, 'fueReemplazado', e.target.value as 'SI' | 'NO')
                                }
                              >
                                <option value="SI">Si</option>
                                <option value="NO">No</option>
                              </select>
                            </div>

                            {item.fueReemplazado === 'SI' && (
                              <>
                                <div className="flex flex-col gap-1">
                                  <label className="text-sm font-medium text-gray-700">Reemplazo por</label>
                                  <select
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                                    value={item.reemplazoTipo}
                                    onChange={(e) =>
                                      updateFinalizacionItem(idx, 'reemplazoTipo', e.target.value as 'IGUAL' | 'DIFERENTE')
                                    }
                                  >
                                    <option value="IGUAL">Uno igual</option>
                                    <option value="DIFERENTE">Uno diferente</option>
                                  </select>
                                </div>

                                {item.reemplazoTipo === 'DIFERENTE' && (
                                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                    <p className="mb-2 text-xs font-semibold text-gray-700">Activo de reemplazo</p>
                                    <p className="mb-2 text-xs text-gray-600">
                                      {item.activoReemplazo.nombre
                                        ? `${item.activoReemplazo.nombre} / ${fmt(item.activoReemplazo.tipo)} / Serie: ${item.activoReemplazo.numeroSerie}`
                                        : 'Sin configurar'}
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => setReplacementAssetModal({ open: true, index: idx })}
                                    >
                                      Configurar activo de reemplazo
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-blue-900">Repuestos usados</p>
              <Button type="button" size="sm" variant="secondary" onClick={addRepuestoItem}>
                Agregar repuesto
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              {finalizeModal.repuestos.map((item, idx) => {
                const part = parts.find((p) => p.id === item.repuestoId);
                const qty = Number(item.cantidad) || 0;
                const subtotal = part ? Number(part.precio) * qty : 0;

                return (
                <div
                  key={`${idx}-${item.repuestoId}`}
                  className="grid gap-2 rounded-lg border border-blue-100 bg-white p-2 md:grid-cols-[minmax(0,1fr)_120px_160px_40px] md:items-center"
                >
                  <select
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={item.repuestoId}
                    onChange={(e) => updateRepuestoItem(idx, 'repuestoId', e.target.value)}
                  >
                    <option value="">Seleccionar repuesto...</option>
                    {parts
                      .filter((p) => p.activo)
                      .filter((p) => !selectedPartIds.has(p.id) || p.id === item.repuestoId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    value={item.cantidad}
                    onChange={(e) => updateRepuestoItem(idx, 'cantidad', e.target.value)}
                  />

                  <div className="text-xs text-gray-700">
                    <p>Precio: ${part ? Number(part.precio).toFixed(2) : '0.00'}</p>
                    <p className="font-semibold">Subtotal: ${subtotal.toFixed(2)}</p>
                  </div>

                  <button
                    type="button"
                    className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                    onClick={() => removeRepuestoItem(idx)}
                    aria-label="Quitar repuesto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );})}
            </div>

            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Total repuestos: <span className="font-semibold">${totalRepuestos.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nota adicional de cierre (opcional)</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              rows={3}
              value={finalizeModal.notaFinalizacion}
              onChange={(e) => setFinalizeModal((prev) => ({ ...prev, notaFinalizacion: e.target.value }))}
              placeholder="Escribe observaciones adicionales del cierre..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() =>
                setFinalizeModal({ open: false, activosFinalizacion: [], repuestos: [makeEmptyRepuesto()], notaFinalizacion: '' })
              }
            >
              Cancelar
            </Button>
            <Button onClick={confirmFinalizeTicket}>Finalizar ticket</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={replacementAssetModal.open}
        onClose={() => setReplacementAssetModal({ open: false, index: null })}
        title="Nuevo activo de reemplazo"
        maxWidth="lg"
      >
        {replacementAssetModal.index !== null && finalizeModal.activosFinalizacion[replacementAssetModal.index] && (
          <div className="flex flex-col gap-4">
            <Input
              label="Nombre del equipo *"
              value={finalizeModal.activosFinalizacion[replacementAssetModal.index].activoReemplazo.nombre}
              onChange={(e) => updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'nombre', e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tipo *</label>
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={finalizeModal.activosFinalizacion[replacementAssetModal.index].activoReemplazo.tipo}
                  onChange={(e) => {
                    const tipo = e.target.value;
                    updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'tipo', tipo);
                    updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'marca', '');
                    updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'modelo', '');
                  }}
                >
                  {TIPOS_ACTIVO.map((tipo) => (
                    <option key={tipo} value={tipo}>{fmt(tipo)}</option>
                  ))}
                </select>
              </div>

              <Input
                label="Numero de serie *"
                value={finalizeModal.activosFinalizacion[replacementAssetModal.index].activoReemplazo.numeroSerie}
                onChange={(e) => updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'numeroSerie', e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Marca</label>
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={finalizeModal.activosFinalizacion[replacementAssetModal.index].activoReemplazo.marca}
                  onChange={(e) => {
                    updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'marca', e.target.value);
                    updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'modelo', '');
                  }}
                >
                  <option value="">Seleccionar marca...</option>
                  {replacementMarcasDisponibles.map((marca) => (
                    <option key={marca} value={fmt(marca)}>{fmt(marca)}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Modelo</label>
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={finalizeModal.activosFinalizacion[replacementAssetModal.index].activoReemplazo.modelo}
                  onChange={(e) => updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'modelo', e.target.value)}
                >
                  <option value="">Seleccionar modelo...</option>
                  {replacementModelosDisponibles.map((modelo) => (
                    <option key={modelo} value={fmt(modelo)}>{fmt(modelo)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Descripcion</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                rows={3}
                value={finalizeModal.activosFinalizacion[replacementAssetModal.index].activoReemplazo.descripcion}
                onChange={(e) => updateFinalizacionActivoReemplazo(replacementAssetModal.index as number, 'descripcion', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setReplacementAssetModal({ open: false, index: null })}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
