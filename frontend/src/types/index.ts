// ─── Entidades del sistema ────────────────────────────────────────────────────

export interface Client {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  especialidad?: string;
  rol: 'ADMIN' | 'TECNICO';
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AssetType =
  | 'COMPUTADORA' | 'LAPTOP' | 'SERVIDOR' | 'IMPRESORA'
  | 'UPS' | 'SWITCH' | 'ROUTER' | 'FIREWALL' | 'OTRO';

export type AssetStatus = 'OPERATIVO' | 'EN_REPARACION' | 'DADO_DE_BAJA';

export interface Asset {
  id: string;
  nombre: string;
  tipo: AssetType;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  descripcion?: string;
  fechaAdquisicion?: string;
  estado: AssetStatus;
  clienteId: string;
  cliente?: Pick<Client, 'id' | 'nombre' | 'apellido' | 'empresa'>;
  createdAt: string;
  updatedAt: string;
}

export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type TicketStatus   = 'ABIERTO' | 'EN_PROGRESO' | 'EN_ESPERA' | 'RESUELTO' | 'CERRADO';

export interface Ticket {
  id: string;
  titulo: string;
  descripcion: string;
  prioridad: TicketPriority;
  estado: TicketStatus;
  categoria?: string;
  fechaVencimiento?: string;
  clienteId: string;
  activoId?: string;
  tecnicoAsignadoId?: string;
  cliente?: Pick<Client, 'id' | 'nombre' | 'apellido' | 'empresa' | 'email'>;
  activo?: Pick<Asset, 'id' | 'nombre' | 'tipo' | 'marca' | 'modelo' | 'numeroSerie'>;
  tecnicoAsignado?: Pick<Technician, 'id' | 'nombre' | 'apellido' | 'especialidad' | 'email'>;
  createdAt: string;
  updatedAt: string;
}

export type ServiceOrderStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
export type ServiceOrderType   = 'CORRECTIVO' | 'PREVENTIVO' | 'INSTALACION' | 'CONSULTORIA';

export interface ServiceOrder {
  id: string;
  numero: string;
  descripcion?: string;
  estado: ServiceOrderStatus;
  tipo: ServiceOrderType;
  fechaInicio?: string;
  fechaFin?: string;
  costoEstimado?: number;
  costoFinal?: number;
  notas?: string;
  ticketId: string;
  tecnicoId: string;
  ticket?: Pick<Ticket, 'id' | 'titulo' | 'estado' | 'prioridad'> & {
    cliente?: Pick<Client, 'id' | 'nombre' | 'apellido' | 'empresa'>;
  };
  tecnico?: Pick<Technician, 'id' | 'nombre' | 'apellido' | 'especialidad' | 'email'>;
  workLogs?: WorkLog[];
  createdAt: string;
  updatedAt: string;
}

export type WorkLogActivity =
  | 'DIAGNOSTICO' | 'REPARACION' | 'INSTALACION'
  | 'CONFIGURACION' | 'MANTENIMIENTO' | 'CONSULTA' | 'OTRO';

export interface WorkLog {
  id: string;
  descripcion: string;
  horasTrabajadas: number;
  fecha: string;
  tipoActividad: WorkLogActivity;
  interno: boolean;
  ordenServicioId: string;
  tecnicoId: string;
  ordenServicio?: Pick<ServiceOrder, 'id' | 'numero' | 'estado' | 'tipo'>;
  tecnico?: Pick<Technician, 'id' | 'nombre' | 'apellido'>;
  createdAt: string;
  updatedAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: { field: string; message: string }[];
}

export interface AuthResponse {
  token: string;
  technician: Technician;
}
