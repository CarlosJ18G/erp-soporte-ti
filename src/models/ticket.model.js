'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo Ticket.
 * Cada consulta incluye las relaciones principales para evitar
 * múltiples round-trips desde el controller.
 */

// Relaciones incluidas por defecto
const includeRelaciones = {
  cliente: {
    select: { id: true, nombre: true, apellido: true, empresa: true, email: true },
  },
  activo: {
    select: { id: true, nombre: true, tipo: true, marca: true, modelo: true, numeroSerie: true },
  },
  tecnicoAsignado: {
    select: { id: true, nombre: true, apellido: true, especialidad: true, email: true },
  },
};

const generarNumeroTicket = async () => {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const prefijo = `T-${fecha}-`;

  const ultimoTicket = await prisma.ticket.findFirst({
    where: { numero: { startsWith: prefijo } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });

  const correlativoActual = ultimoTicket?.numero ? Number(ultimoTicket.numero.split('-').pop()) : 0;
  const correlativo = String(correlativoActual + 1).padStart(4, '0');
  return `T-${fecha}-${correlativo}`;
};

const isNumeroUniqueError = (error) => error?.code === 'P2002';

const TicketModel = {
  /**
   * Lista tickets no eliminados con filtros opcionales.
   * @param {object} filters - { estado, estadoNot, prioridad, clienteId, tecnicoAsignadoId }
   */
  findAll: (filters = {}) => {
    const where = { deletedAt: null };
    if (filters.estado)            where.estado            = filters.estado;
    if (filters.estadoNot)         where.estado            = { not: filters.estadoNot };
    if (filters.prioridad)         where.prioridad         = filters.prioridad;
    if (filters.clienteId)         where.clienteId         = filters.clienteId;
    if (filters.tecnicoAsignadoId) where.tecnicoAsignadoId = filters.tecnicoAsignadoId;

    return prisma.ticket.findMany({
      where,
      include: includeRelaciones,
      orderBy: [
        // Primero por estado (ABIERTO -> ... -> CERRADO), luego urgencia y recencia.
        { estado: 'asc' },
        { prioridad: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  },

  /**
   * Busca un ticket por ID con todas sus relaciones.
   */
  findById: (id) =>
    prisma.ticket.findFirst({
      where:   { id, deletedAt: null },
      include: includeRelaciones,
    }),

  /**
   * Crea un nuevo ticket.
   */
  create: async (data) => {
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const numero = await generarNumeroTicket();
      try {
        return await prisma.ticket.create({
          data: { ...data, numero },
          include: includeRelaciones,
        });
      } catch (error) {
        if (!isNumeroUniqueError(error) || attempt === maxRetries - 1) throw error;
      }
    }

    const fallbackError = new Error('No se pudo generar un número único de ticket. Intenta nuevamente.');
    fallbackError.statusCode = 409;
    throw fallbackError;
  },

  /**
   * Actualiza campos de un ticket.
   */
  update: (id, data) =>
    prisma.ticket.update({
      where:   { id },
      data,
      include: includeRelaciones,
    }),

  /**
   * Soft delete: marca deletedAt y cierra el ticket.
   */
  softDelete: (id) =>
    prisma.ticket.update({
      where: { id },
      data:  { deletedAt: new Date(), estado: 'CERRADO' },
    }),
};

module.exports = TicketModel;
