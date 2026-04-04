'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo WorkLog.
 * Cada registro está asociado a una ServiceOrder y un Technician.
 */

const includeRelaciones = {
  ordenServicio: {
    select: { id: true, numero: true, estado: true, tipo: true, tecnicoId: true },
  },
  tecnico: {
    select: { id: true, nombre: true, apellido: true, email: true, especialidad: true },
  },
};

const WorkLogModel = {
  /**
   * Lista registros no eliminados con filtros opcionales.
   * @param {object} filters - { ordenServicioId, tecnicoId, fecha }
   */
  findAll: (filters = {}) => {
    const where = { deletedAt: null };
    if (filters.ordenServicioId) where.ordenServicioId = filters.ordenServicioId;
    if (filters.tecnicoId)       where.tecnicoId       = filters.tecnicoId;
    if (filters.tecnicoOrdenId)   where.ordenServicio  = { tecnicoId: filters.tecnicoOrdenId };
    if (filters.fecha) {
      // Filtrar por día exacto
      const dia       = new Date(filters.fecha);
      const diaSig    = new Date(dia);
      diaSig.setDate(diaSig.getDate() + 1);
      where.fecha = { gte: dia, lt: diaSig };
    }

    return prisma.workLog.findMany({
      where,
      include: includeRelaciones,
      orderBy: { fecha: 'desc' },
    });
  },

  /**
   * Busca un WorkLog por ID.
   */
  findById: (id) =>
    prisma.workLog.findFirst({
      where:   { id, deletedAt: null },
      include: includeRelaciones,
    }),

  /**
   * Busca si ya existe un registro activo para una orden de servicio.
   */
  findByOrdenServicioId: (ordenServicioId) =>
    prisma.workLog.findFirst({
      where: { ordenServicioId, deletedAt: null },
      select: { id: true, ordenServicioId: true },
    }),

  /**
   * Suma total de horas trabajadas en una orden de servicio.
   * Útil para mostrar en el detalle de la orden.
   */
  sumHorasByOrden: async (ordenServicioId) => {
    const result = await prisma.workLog.aggregate({
      where:  { ordenServicioId, deletedAt: null },
      _sum:   { horasTrabajadas: true },
    });
    return result._sum.horasTrabajadas ?? 0;
  },

  /**
   * Crea un nuevo registro de horas.
   */
  create: (data) =>
    prisma.workLog.create({
      data,
      include: includeRelaciones,
    }),

  /**
   * Actualiza un registro de horas.
   */
  update: (id, data) =>
    prisma.workLog.update({
      where:   { id },
      data,
      include: includeRelaciones,
    }),

  /**
   * Soft delete del registro.
   */
  softDelete: (id) =>
    prisma.workLog.update({
      where: { id },
      data:  { deletedAt: new Date() },
    }),
};

module.exports = WorkLogModel;
