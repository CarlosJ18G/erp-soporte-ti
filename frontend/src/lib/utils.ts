import { type ClassValue, clsx } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

/** Reemplaza guiones bajos por espacios para mostrar enums legibles */
export const fmt = (value: string): string => value.replace(/_/g, ' ');

/** Formatea una fecha ISO a DD/MM/YYYY */
export const formatDate = (date?: string | null): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-ES', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  });
};

/** Formatea un número como moneda COP/USD */
export const formatCurrency = (amount?: number | null): string => {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-CO', {
    style:    'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
};

/** Nombre completo de un objeto con nombre + apellido */
export const fullName = (obj?: { nombre: string; apellido: string } | null): string => {
  if (!obj) return '—';
  return `${obj.nombre} ${obj.apellido}`;
};
