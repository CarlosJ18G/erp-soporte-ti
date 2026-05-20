'use client';

import dynamic from 'next/dynamic';

import { useEffect, useMemo, useState } from 'react';

import { api } from '@/lib/api';

import { Ticket } from '@/types';

import { LoadingSpinner } from '@/components/ui/States';

import {
  Badge,
  ticketPriorityVariant,
  ticketStatusVariant,
} from '@/components/ui/Badge';

import { formatDate, fmt } from '@/lib/utils';

import {
  Ticket as TicketIcon,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Activity,
  TrendingUp,
  TimerReset,
  Gauge,
} from 'lucide-react';

/* =========================
   RECHARTS FIX SSR
========================= */

const PieChart = dynamic(
  () => import('recharts').then((mod) => mod.PieChart),
  { ssr: false }
);

const Pie = dynamic(
  () => import('recharts').then((mod) => mod.Pie),
  { ssr: false }
);

const Cell = dynamic(
  () => import('recharts').then((mod) => mod.Cell),
  { ssr: false }
);

const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then(
      (mod) => mod.ResponsiveContainer
    ),
  { ssr: false }
);

const Tooltip = dynamic(
  () => import('recharts').then((mod) => mod.Tooltip),
  { ssr: false }
);

const BarChart = dynamic(
  () => import('recharts').then((mod) => mod.BarChart),
  { ssr: false }
);

const Bar = dynamic(
  () => import('recharts').then((mod) => mod.Bar),
  { ssr: false }
);

const XAxis = dynamic(
  () => import('recharts').then((mod) => mod.XAxis),
  { ssr: false }
);

const YAxis = dynamic(
  () => import('recharts').then((mod) => mod.YAxis),
  { ssr: false }
);

const CartesianGrid = dynamic(
  () =>
    import('recharts').then(
      (mod) => mod.CartesianGrid
    ),
  { ssr: false }
);

/* ========================= */

interface Stats {
  abiertos: number;
  progreso: number;
  resueltos: number;
  criticos: number;
  total: number;
}

const COLORS = [
  '#f97316',
  '#eab308',
  '#22c55e',
  '#ef4444',
];

export default function DashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] =
    useState<Stats | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    api
      .get<Ticket[]>('/tickets')
      .then((res) => {
        const list = res.data ?? [];

        setTickets(list);

        setStats({
          abiertos: list.filter(
            (t) => t.estado === 'ABIERTO'
          ).length,

          progreso: list.filter(
            (t) =>
              t.estado === 'EN_PROGRESO'
          ).length,

          resueltos: list.filter(
            (t) => t.estado === 'RESUELTO'
          ).length,

          criticos: list.filter(
            (t) =>
              t.prioridad === 'CRITICA' &&
              t.estado !== 'CERRADO'
          ).length,

          total: list.length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const resolvedPercent = useMemo(() => {
    if (!stats?.total) return 0;

    return Math.round(
      (stats.resueltos / stats.total) * 100
    );
  }, [stats]);

  /* =========================
     KPI
  ========================= */

  const kpiResolutionRate =
    stats?.total
      ? Math.round(
          (stats.resueltos / stats.total) * 100
        )
      : 0;

  const kpiCriticalRate =
    stats?.total
      ? Math.round(
          (stats.criticos / stats.total) * 100
        )
      : 0;

  const kpiPending =
    (stats?.abiertos || 0) +
    (stats?.progreso || 0);

  const chartData = [
    {
      name: 'Abiertos',
      value: stats?.abiertos || 0,
    },
    {
      name: 'En progreso',
      value: stats?.progreso || 0,
    },
    {
      name: 'Resueltos',
      value: stats?.resueltos || 0,
    },
  ];

  const cards = [
    {
      title: 'Tickets abiertos',
      value: stats?.abiertos || 0,
      icon: TicketIcon,
      color:
        'bg-orange-50 text-orange-600 border-orange-100',
    },

    {
      title: 'En progreso',
      value: stats?.progreso || 0,
      icon: Clock3,
      color:
        'bg-yellow-50 text-yellow-600 border-yellow-100',
    },

    {
      title: 'Resueltos',
      value: stats?.resueltos || 0,
      icon: CheckCircle2,
      color:
        'bg-green-50 text-green-600 border-green-100',
    },

    {
      title: 'Críticos',
      value: stats?.criticos || 0,
      icon: AlertTriangle,
      color:
        'bg-red-50 text-red-600 border-red-100',
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Resumen general del sistema
          </p>
        </div>

        <div className="hidden md:flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
          <TrendingUp className="h-4 w-4" />
          {resolvedPercent}% resueltos
        </div>
      </div>

      {/* CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <div
              className={`inline-flex rounded-xl border p-3 ${card.color}`}
            >
              <card.icon className="h-5 w-5" />
            </div>

            <div className="mt-4">
              <h3 className="text-3xl font-bold text-gray-900">
                {card.value}
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                {card.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <Gauge className="h-5 w-5" />
            </div>

            <span className="text-xs font-medium text-blue-500">
              KPI
            </span>
          </div>

          <h3 className="mt-4 text-3xl font-bold text-gray-900">
            {kpiResolutionRate}%
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Tasa de resolución
          </p>
        </div>

        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-red-50 p-3 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <span className="text-xs font-medium text-red-500">
              KPI
            </span>
          </div>

          <h3 className="mt-4 text-3xl font-bold text-gray-900">
            {kpiCriticalRate}%
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Tickets críticos
          </p>
        </div>

        <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <TimerReset className="h-5 w-5" />
            </div>

            <span className="text-xs font-medium text-purple-500">
              KPI
            </span>
          </div>

          <h3 className="mt-4 text-3xl font-bold text-gray-900">
            {kpiPending}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Tickets pendientes
          </p>
        </div>

      </div>

      {/* GRID */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* CHART */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Estado de tickets
              </h2>

              <p className="text-sm text-gray-500">
                Distribución actual
              </p>
            </div>

            <div className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">
              Total: {stats?.total}
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis dataKey="name" />

                <YAxis />

                <Tooltip />

                <Bar
                  dataKey="value"
                  radius={[10, 10, 0, 0]}
                >
                  {chartData.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Rendimiento
            </h2>

            <p className="text-sm text-gray-500">
              Tickets resueltos
            </p>
          </div>

          <div className="h-72">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label
                >
                  {chartData.map(
                    (_, index) => (
                      <Cell
                        key={index}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RECENT TICKETS */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Actividad reciente
            </h2>

            <p className="text-sm text-gray-500">
              Últimos tickets registrados
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Activity className="h-4 w-4" />
            Tiempo real
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">

            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">

                <th className="px-5 py-4">
                  Ticket
                </th>

                <th className="px-5 py-4">
                  Estado
                </th>

                <th className="px-5 py-4">
                  Prioridad
                </th>

                <th className="px-5 py-4">
                  Fecha
                </th>
              </tr>
            </thead>

            <tbody>
              {tickets
                .slice(0, 6)
                .map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 transition-all hover:bg-orange-50/40"
                  >
                    <td className="px-5 py-4">

                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">
                          {t.titulo}
                        </span>

                        <span className="mt-1 text-xs text-gray-400">
                          #{t.id.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        variant={ticketStatusVariant(
                          t.estado
                        )}
                      >
                        {fmt(t.estado)}
                      </Badge>
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

                    <td className="px-5 py-4 text-gray-400">
                      {formatDate(
                        t.createdAt
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>

          </table>
        </div>
      </div>
    </div>
  );
}