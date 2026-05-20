'use client';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';

import {
  Ticket,
  Client,
  Asset,
  Technician,
} from '@/types';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

import {
  Badge,
  ticketPriorityVariant,
  ticketStatusVariant,
} from '@/components/ui/Badge';

import {
  LoadingSpinner,
  EmptyState,
} from '@/components/ui/States';

import { formatDate, fmt } from '@/lib/utils';

import {
  Plus,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Clock3,
} from 'lucide-react';

const PRIORIDADES = [
  'BAJA',
  'MEDIA',
  'ALTA',
  'CRITICA',
];

const ESTADOS = [
  'ABIERTO',
  'EN_PROGRESO',
  'EN_ESPERA',
  'RESUELTO',
  'CERRADO',
];

interface TicketForm {
  clienteId: string;
  activoId: string;
  tecnicoAsignadoId: string;
  titulo: string;
  descripcion: string;
  prioridad: string;
}

const empty: TicketForm = {
  clienteId: '',
  activoId: '',
  tecnicoAsignadoId: '',
  titulo: '',
  descripcion: '',
  prioridad: 'MEDIA',
};

export default function TicketsPage() {
  const [tickets, setTickets] =
    useState<Ticket[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [assets, setAssets] =
    useState<Asset[]>([]);

  const [techs, setTechs] =
    useState<Technician[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [open, setOpen] =
    useState(false);

  const [form, setForm] =
    useState<TicketForm>(empty);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [statusModal, setStatusModal] =
    useState<Ticket | null>(null);

  const [newStatus, setNewStatus] =
    useState('');

  const [detailsTicket, setDetailsTicket] =
    useState<Ticket | null>(null);

  const [search, setSearch] =
    useState('');

  const [filterStatus, setFilterStatus] =
    useState('TODOS');

  const [filterPriority, setFilterPriority] =
    useState('TODAS');

  const load = () =>
    Promise.all([
      api
        .get<Ticket[]>('/tickets')
        .then((r) =>
          setTickets(r.data ?? [])
        ),

      api
        .get<Client[]>('/clients')
        .then((r) =>
          setClients(r.data ?? [])
        ),

      api
        .get<Asset[]>('/assets')
        .then((r) =>
          setAssets(r.data ?? [])
        ),

      api
        .get<Technician[]>(
          '/technicians'
        )
        .then((r) =>
          setTechs(r.data ?? [])
        ),
    ]).finally(() =>
      setLoading(false)
    );

  useEffect(() => {
    load();
  }, []);

  const clientAssets = assets.filter(
    (a) =>
      a.clienteId === form.clienteId
  );

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setSaving(true);

    setError('');

    const body = {
      ...form,

      tecnicoAsignadoId:
        form.tecnicoAsignadoId || undefined,

      activoId:
        form.activoId || undefined,
    };

    try {
      await api.post('/tickets', body);

      await load();

      setForm(empty);

      setOpen(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error al crear ticket'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange =
    async () => {
      if (
        !statusModal ||
        !newStatus
      )
        return;

      try {
        await api.patch(
          `/tickets/${statusModal.id}/status`,
          {
            estado: newStatus,
          }
        );

        await load();

        setStatusModal(null);
      } catch (err: unknown) {
        alert(
          err instanceof Error
            ? err.message
            : 'Error'
        );
      }
    };

  const f =
    (k: keyof TicketForm) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLSelectElement>
        | React.ChangeEvent<HTMLTextAreaElement>
    ) =>
      setForm((p) => ({
        ...p,
        [k]: e.target.value,
      }));

  const clientName = (
    id?: string
  ) => {
    if (!id) return '-';

    const c = clients.find(
      (c) => c.id === id
    );

    return c
      ? `${c.nombre} ${c.apellido}`
      : '-';
  };

  const filteredTickets =
    useMemo(() => {
      return tickets.filter((t) => {
        const matchesSearch =
          t.titulo
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );

        const matchesStatus =
          filterStatus === 'TODOS'
            ? true
            : t.estado ===
              filterStatus;

        const matchesPriority =
          filterPriority === 'TODAS'
            ? true
            : t.prioridad ===
              filterPriority;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesPriority
        );
      });
    }, [
      tickets,
      search,
      filterStatus,
      filterPriority,
    ]);

  if (loading)
    return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tickets
          </h1>

          <p className="text-sm text-gray-500">
            Gestiona incidencias y soporte técnico
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setForm(empty);
            setError('');
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </Button>
      </div>

      {/* FILTERS */}
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">

        <div className="grid gap-4 lg:grid-cols-4">

          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

            <input
              type="text"
              placeholder="Buscar ticket..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-white"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-primary focus:bg-white"
            >
              <option value="TODOS">
                Todos los estados
              </option>

              {ESTADOS.map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  {fmt(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(
                  e.target.value
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary focus:bg-white"
            >
              <option value="TODAS">
                Todas las prioridades
              </option>

              {PRIORIDADES.map((p) => (
                <option
                  key={p}
                  value={p}
                >
                  {fmt(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABLE */}
      {filteredTickets.length === 0 ? (
        <EmptyState title="Sin tickets encontrados" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-medium text-gray-600">
              {
                filteredTickets.length
              }{' '}
              ticket(s)
              encontrados
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">

                  <th className="px-5 py-4">
                    Asunto
                  </th>

                  <th className="px-5 py-4">
                    Cliente
                  </th>

                  <th className="px-5 py-4">
                    Prioridad
                  </th>

                  <th className="px-5 py-4">
                    Estado
                  </th>

                  <th className="px-5 py-4">
                    Fecha
                  </th>

                  <th className="px-5 py-4">
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTickets.map(
                  (t) => (
                    <tr
                      key={t.id}
                      className="border-b border-gray-50 transition-all duration-200 hover:bg-orange-50/40"
                    >
                      <td className="px-5 py-4">

                        <div className="flex flex-col gap-1">

                          <div className="flex items-center gap-2">

                            <span className="font-semibold text-gray-900">
                              {t.titulo}
                            </span>

                            {t.prioridad ===
                              'CRITICA' && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">
                                Urgente
                              </span>
                            )}
                          </div>

                          <span className="text-xs text-gray-400">
                            ID:{' '}
                            {t.id.slice(
                              0,
                              8
                            )}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {clientName(
                          t.clienteId
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          variant={ticketPriorityVariant(
                            t.prioridad
                          )}
                        >
                          {fmt(
                            t.prioridad
                          )}
                        </Badge>
                      </td>

                      <td className="px-5 py-4">
                        <Badge
                          variant={ticketStatusVariant(
                            t.estado
                          )}
                        >
                          {fmt(
                            t.estado
                          )}
                        </Badge>
                      </td>

                      <td className="px-5 py-4 text-gray-400">
                        {formatDate(
                          t.createdAt
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              setDetailsTicket(
                                t
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-primary hover:text-primary"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Ver
                          </button>

                          <button
                            onClick={() => {
                              setStatusModal(
                                t
                              );

                              setNewStatus(
                                t.estado
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-2 text-xs font-medium text-primary transition-all hover:bg-orange-100"
                          >
                            Cambiar
                            estado

                            <ChevronDown className="h-3 w-3" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>

            </table>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal
        open={open}
        onClose={() =>
          setOpen(false)
        }
        title="Nuevo ticket"
        maxWidth="lg"
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >

          {/* CLIENTE */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Cliente *
            </label>

            <select
              value={form.clienteId}
              onChange={(e) => {
                f('clienteId')(e);

                setForm((p) => ({
                  ...p,
                  activoId: '',
                }));
              }}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="">
                Seleccionar...
              </option>

              {clients.map((c) => (
                <option
                  key={c.id}
                  value={c.id}
                >
                  {c.nombre}{' '}
                  {c.apellido}
                </option>
              ))}
            </select>
          </div>

          {/* ACTIVO */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Activo
            </label>

            <select
              value={form.activoId}
              onChange={f(
                'activoId'
              )}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">
                Sin activo
              </option>

              {clientAssets.map(
                (a) => (
                  <option
                    key={a.id}
                    value={a.id}
                  >
                    {a.nombre}
                  </option>
                )
              )}
            </select>
          </div>

          {/* TECNICO */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Técnico asignado
            </label>

            <select
              value={
                form.tecnicoAsignadoId
              }
              onChange={f(
                'tecnicoAsignadoId'
              )}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">
                Sin asignar
              </option>

              {techs
                .filter(
                  (t) => t.activo
                )
                .map((t) => (
                  <option
                    key={t.id}
                    value={t.id}
                  >
                    {t.nombre}{' '}
                    {t.apellido}
                  </option>
                ))}
            </select>
          </div>

          {/* TITULO */}
          <Input
            label="Título *"
            value={form.titulo}
            onChange={f('titulo')}
            required
          />

          {/* DESCRIPCION */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Descripción
            </label>

            <textarea
              rows={4}
              value={
                form.descripcion
              }
              onChange={f(
                'descripcion'
              )}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          {/* PRIORIDAD */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Prioridad
            </label>

            <select
              value={form.prioridad}
              onChange={f(
                'prioridad'
              )}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              {PRIORIDADES.map(
                (p) => (
                  <option
                    key={p}
                    value={p}
                  >
                    {fmt(p)}
                  </option>
                )
              )}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">

            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setOpen(false)
              }
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              loading={saving}
            >
              Crear ticket
            </Button>
          </div>
        </form>
      </Modal>

      {/* STATUS MODAL */}
      <Modal
        open={!!statusModal}
        onClose={() =>
          setStatusModal(null)
        }
        title="Cambiar estado"
      >
        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-1">

            <label className="text-sm font-medium text-gray-700">
              Nuevo estado
            </label>

            <select
              value={newStatus}
              onChange={(e) =>
                setNewStatus(
                  e.target.value
                )
              }
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              {ESTADOS.map((s) => (
                <option
                  key={s}
                  value={s}
                >
                  {fmt(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">

            <Button
              variant="secondary"
              onClick={() =>
                setStatusModal(null)
              }
            >
              Cancelar
            </Button>

            <Button
              onClick={
                handleStatusChange
              }
            >
              Actualizar
            </Button>
          </div>
        </div>
      </Modal>

      {/* DETAILS MODAL */}
      <Modal
        open={!!detailsTicket}
        onClose={() =>
          setDetailsTicket(null)
        }
        title="Detalle del ticket"
        maxWidth="lg"
      >
        {detailsTicket && (
          <div className="flex flex-col gap-5">

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">

              <div className="flex items-start justify-between gap-4">

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {
                      detailsTicket.titulo
                    }
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Ticket #
                    {detailsTicket.id.slice(
                      0,
                      8
                    )}
                  </p>
                </div>

                <Badge
                  variant={ticketPriorityVariant(
                    detailsTicket.prioridad
                  )}
                >
                  {fmt(
                    detailsTicket.prioridad
                  )}
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">

              <div className="rounded-xl border border-gray-100 p-4">

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Cliente
                </p>

                <p className="font-medium text-gray-800">
                  {clientName(
                    detailsTicket.clienteId
                  )}
                </p>
              </div>

              <div className="rounded-xl border border-gray-100 p-4">

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Estado
                </p>

                <Badge
                  variant={ticketStatusVariant(
                    detailsTicket.estado
                  )}
                >
                  {fmt(
                    detailsTicket.estado
                  )}
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-4">

              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Descripción
              </p>

              <p className="text-sm leading-relaxed text-gray-700">
                {detailsTicket.descripcion ||
                  'Sin descripción'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">

              <Clock3 className="h-4 w-4" />

              Creado el{' '}
              {formatDate(
                detailsTicket.createdAt
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}