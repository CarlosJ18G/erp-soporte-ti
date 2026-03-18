'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo ServiceOrder.
 *
 * Relación 1:1 con Ticket (ticketId es único en el schema).
 * El número de orden se genera en este layer para mantener
 * la lógica de generación centralizada.
 */

const includeRelaciones = {
  ticket: {
    select: {
      id:       true,
      titulo:   true,
      estado:   true,
      prioridad: true,
      cliente:  { select: { id: true, nombre: true, apellido: true, empresa: true } },
    },
  },
  tecnico: {
    select: { id: true, nombre: true, apellido: true, especialidad: true, email: true },
  },
};

const includeConWorkLogs = {
  ...includeRelaciones,
  workLogs: {
    where:   { deletedAt: null },
    orderBy: { fecha: 'desc' },
  },
};

/**
 * Genera un número de orden único con formato OS-YYYYMMDD-XXXX.
 * Cuenta las órdenes creadas hoy para generar el correlativo.
 */
const generarNumero = async () => {
  const hoy   = new Date();
  const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const finDia    = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const count = await prisma.serviceOrder.count({
    where: { createdAt: { gte: inicioDia, lt: finDia } },
  });

  const correlativo = String(count + 1).padStart(4, '0');
  return `OS-${fecha}-${correlativo}`;
};

const ServiceOrderModel = {
  /**
   * Lista órdenes no eliminadas con filtros opcionales.
   */
  findAll: (filters = {}) => {
    const where = { deletedAt: null };
    if (filters.estado)    where.estado    = filters.estado;
    if (filters.tipo)      where.tipo      = filters.tipo;
    if (filters.tecnicoId) where.tecnicoId = filters.tecnicoId;

    return prisma.serviceOrder.findMany({
      where,
      include: includeRelaciones,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Busca una orden por ID incluyendo sus WorkLogs.
   */
  findById: (id) =>
    prisma.serviceOrder.findFirst({
      where:   { id, deletedAt: null },
      include: includeConWorkLogs,
    }),

  /**
   * Verifica si ya existe una orden activa para un ticket.
   */
  findByTicketId: (ticketId, excludeId = null) =>
    prisma.serviceOrder.findFirst({
      where: {
        ticketId,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true, numero: true },
    }),

  /**
   * Crea una nueva orden. Genera el número automáticamente.
   */
  create: async (data) => {
    const numero = await generarNumero();
    return prisma.serviceOrder.create({
      data:    { ...data, numero },
      include: includeRelaciones,
    });
  },

  /**
   * Actualiza campos de una orden.
   */
  update: (id, data) =>
    prisma.serviceOrder.update({
      where:   { id },
      data,
      include: includeRelaciones,
    }),

  /**
   * Completa la orden y actualiza el ticket a RESUELTO en
   * una única transacción para mantener consistencia.
   */
  completar: (id, ticketId) =>
    prisma.$transaction([
      prisma.serviceOrder.update({
        where:   { id },
        data:    { estado: 'COMPLETADA', fechaFin: new Date() },
        include: includeRelaciones,
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data:  { estado: 'RESUELTO' },
      }),
    ]),

  /**
   * Soft delete: marca deletedAt y cancela la orden.
   */
  softDelete: (id) =>
    prisma.serviceOrder.update({
      where: { id },
      data:  { deletedAt: new Date(), estado: 'CANCELADA' },
    }),
};

module.exports = ServiceOrderModel;
