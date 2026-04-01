'use client';

import { useClientAuth } from '@/context/ClientAuthContext';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Ticket, Asset, ServiceOrder } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';

export default function ClientDashboard() {
  const { user } = useClientAuth();
  const [stats, setStats] = useState({ tickets: 0, assets: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [ticketsRes, assetsRes, ordersRes] = await Promise.all([
          api.get<Ticket[]>('/tickets'),
          api.get<Asset[]>('/assets'),
          api.get<ServiceOrder[]>('/service-orders'),
        ]);

        setStats({
          tickets: ticketsRes.data?.length ?? 0,
          assets: assetsRes.data?.length ?? 0,
          orders: ordersRes.data?.length ?? 0,
        });
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {user?.nombre} {user?.apellido}
        </h1>
        <p className="text-gray-600 mt-2">{user?.empresa || 'Cliente'}</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mis Tickets</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.tickets}</p>
            </div>
            <div className="text-4xl">🎫</div>
          </div>
          <a
            href="/client-dashboard/tickets"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-4 block"
          >
            Ver tickets →
          </a>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Activos Registrados</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.assets}</p>
            </div>
            <div className="text-4xl">💾</div>
          </div>
          <a
            href="/client-dashboard/assets"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-4 block"
          >
            Ver activos →
          </a>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Órdenes de Servicio</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.orders}</p>
            </div>
            <div className="text-4xl">📋</div>
          </div>
          <a
            href="/client-dashboard/orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-4 block"
          >
            Ver órdenes →
          </a>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h2>
        <div className="space-y-2">
          <a
            href="/client-dashboard/tickets/new"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 hover:border-blue-300"
          >
            <div>
              <p className="font-medium text-gray-900">Crear nuevo ticket</p>
              <p className="text-sm text-gray-600">Reporta un problema o solicitud</p>
            </div>
            <span className="text-2xl">➕</span>
          </a>
        </div>
      </div>
    </div>
  );
}
