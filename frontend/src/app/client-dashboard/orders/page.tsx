'use client';

import { useClientAuth } from '@/context/ClientAuthContext';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ServiceOrder } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Badge, orderStatusVariant } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate, fmt } from '@/lib/utils';

export default function ClientOrdersPage() {
  const { user } = useClientAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      try {
        const res = await api.get<ServiceOrder[]>('/service-orders');
        setOrders(res.data ?? []);
      } catch (error) {
        console.error('Error cargando órdenes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  const openOrderDetail = async (orderId: string) => {
    setDetailError('');
    setLoadingDetail(true);
    setSelectedOrder(null);

    try {
      const res = await api.get<ServiceOrder>(`/service-orders/${orderId}`);
      if (res.data) setSelectedOrder(res.data);
    } catch (error) {
      console.error('Error cargando detalle de la orden:', error);
      setDetailError('No se pudo cargar la información de la orden. Intenta nuevamente.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeOrderDetail = () => {
    setSelectedOrder(null);
    setDetailError('');
    setLoadingDetail(false);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Órdenes de Servicio</h1>
        <p className="text-gray-600 mt-1">Tareas de mantenimiento y reparación</p>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="Sin órdenes de servicio" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="px-6 py-4">Número</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Costo</th>
                <th className="px-6 py-4">Fecha Inicio</th>
                <th className="px-6 py-4">Fecha Fin</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => openOrderDetail(order.id)}
                >
                  <td className="px-6 py-4 font-mono font-semibold text-gray-900">{order.numero}</td>
                  <td className="px-6 py-4 text-gray-700">{fmt(order.tipo)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={orderStatusVariant(order.estado)}>{fmt(order.estado)}</Badge>
                  </td>
                  <td className="px-6 py-4 text-gray-700">
                    ${order.costoFinal ? parseFloat(String(order.costoFinal)).toFixed(2) : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {order.fechaInicio ? formatDate(order.fechaInicio) : '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {order.fechaFin ? formatDate(order.fechaFin) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(selectedOrder) || loadingDetail || Boolean(detailError)}
        onClose={closeOrderDetail}
        title={selectedOrder ? `Orden ${selectedOrder.numero}` : 'Detalle de orden'}
        maxWidth="2xl"
      >
        {loadingDetail ? (
          <LoadingSpinner />
        ) : detailError ? (
          <p className="text-sm text-red-600">{detailError}</p>
        ) : selectedOrder ? (
          <div className="space-y-6 text-sm">
            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Estado</p>
                <Badge variant={orderStatusVariant(selectedOrder.estado)}>{fmt(selectedOrder.estado)}</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Tipo</p>
                <p className="text-gray-900">{fmt(selectedOrder.tipo)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Costo final</p>
                <p className="font-semibold text-gray-900">
                  ${selectedOrder.costoFinal ? parseFloat(String(selectedOrder.costoFinal)).toFixed(2) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Ticket</p>
                <p className="text-gray-900">{selectedOrder.ticket?.titulo ?? '-'}</p>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500">Técnico asignado</p>
                <p className="text-gray-900">
                  {selectedOrder.tecnico
                    ? `${selectedOrder.tecnico.nombre} ${selectedOrder.tecnico.apellido}`
                    : '-'}
                </p>
                {selectedOrder.tecnico?.especialidad ? (
                  <p className="text-xs text-gray-500 mt-1">{fmt(selectedOrder.tecnico.especialidad)}</p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Empresa</p>
                <p className="text-gray-900">{selectedOrder.ticket?.cliente?.empresa ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Fecha inicio</p>
                <p className="text-gray-900">{selectedOrder.fechaInicio ? formatDate(selectedOrder.fechaInicio) : '-'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Fecha fin</p>
                <p className="text-gray-900">{selectedOrder.fechaFin ? formatDate(selectedOrder.fechaFin) : '-'}</p>
              </div>
            </section>

            {selectedOrder.descripcion ? (
              <section>
                <p className="text-xs font-medium text-gray-500">Descripción</p>
                <p className="text-gray-800 mt-1 rounded-lg bg-gray-50 p-3">{selectedOrder.descripcion}</p>
              </section>
            ) : null}

            {selectedOrder.notas ? (
              <section>
                <p className="text-xs font-medium text-gray-500">Notas</p>
                <p className="text-gray-800 mt-1 rounded-lg bg-gray-50 p-3">{selectedOrder.notas}</p>
              </section>
            ) : null}

            {selectedOrder.repuestosUsados && selectedOrder.repuestosUsados.length > 0 ? (
              <section>
                <p className="text-xs font-medium text-gray-500 mb-2">Repuestos utilizados</p>
                <div className="space-y-2">
                  {selectedOrder.repuestosUsados.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.repuesto?.nombre ?? 'Repuesto'}</p>
                        <p className="text-xs text-gray-500">Código: {item.repuesto?.codigo ?? '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-700">Cant: {item.cantidad}</p>
                        <p className="font-semibold text-gray-900">${Number(item.subtotal).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {selectedOrder.workLogs && selectedOrder.workLogs.length > 0 ? (
              <section>
                <p className="text-xs font-medium text-gray-500 mb-2">Registro de actividades</p>
                <div className="space-y-2">
                  {selectedOrder.workLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-gray-900">{fmt(log.tipoActividad)}</p>
                      <p className="text-xs text-gray-500">{formatDate(log.fecha)} • {log.horasTrabajadas} h</p>
                      <p className="text-gray-700 mt-1">{log.descripcion}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
