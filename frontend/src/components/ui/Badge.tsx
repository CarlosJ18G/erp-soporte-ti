import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-700',
  info:    'bg-primary/15 text-primary',
  purple:  'bg-indigo-100 text-indigo-700',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => (
  <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
    {children}
  </span>
);

// ─── Helpers de color por enum ────────────────────────────────────────────────

export const ticketPriorityVariant = (p: string): BadgeVariant => ({
  BAJA:    'info',
  MEDIA:   'default',
  ALTA:    'warning',
  CRITICA: 'danger',
}[p] ?? 'default') as BadgeVariant;

export const ticketStatusVariant = (s: string): BadgeVariant => ({
  ABIERTO:     'info',
  EN_PROGRESO: 'warning',
  EN_ESPERA:   'purple',
  RESUELTO:    'success',
  CERRADO:     'default',
}[s] ?? 'default') as BadgeVariant;

export const orderStatusVariant = (s: string): BadgeVariant => ({
  PENDIENTE:   'warning',
  EN_PROGRESO: 'info',
  COMPLETADA:  'success',
  CANCELADA:   'danger',
}[s] ?? 'default') as BadgeVariant;

export const assetStatusVariant = (s: string): BadgeVariant => ({
  OPERATIVO:     'success',
  EN_REPARACION: 'warning',
  DADO_DE_BAJA:  'danger',
}[s] ?? 'default') as BadgeVariant;
