'use client';

import { useClientAuth } from '@/context/ClientAuthContext';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Asset } from '@/types';
import { LoadingSpinner, EmptyState } from '@/components/ui/States';
import { Badge, assetStatusVariant } from '@/components/ui/Badge';
import { formatDate, fmt } from '@/lib/utils';

export default function ClientAssetsPage() {
  const { user } = useClientAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const visibleAssets = assets.filter((asset) => asset.estado !== 'DADO_DE_BAJA');

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const res = await api.get<Asset[]>('/assets');
        setAssets(res.data ?? []);
      } catch (error) {
        console.error('Error cargando activos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Activos</h1>
        <p className="text-gray-600 mt-1">Equipos e infraestructura registrada</p>
      </div>

      {visibleAssets.length === 0 ? (
        <EmptyState title="Sin activos registrados" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleAssets.map((asset) => (
            <div key={asset.id} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{asset.nombre}</h3>
                  <p className="text-sm text-gray-600 mt-1">{fmt(asset.tipo)}</p>
                </div>
                <Badge variant={assetStatusVariant(asset.estado)}>{fmt(asset.estado)}</Badge>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Empresa:</strong> {asset.empresa}</p>
                <p><strong>Cantidad:</strong> {asset.cantidad}</p>
                {asset.marca && <p><strong>Marca:</strong> {asset.marca}</p>}
                {asset.modelo && <p><strong>Modelo:</strong> {asset.modelo}</p>}
                {asset.numeroSerie && <p><strong>Serie:</strong> {asset.numeroSerie}</p>}
                {asset.descripcion && <p><strong>Descripción:</strong> {asset.descripcion}</p>}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                <p>Registrado: {formatDate(asset.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
