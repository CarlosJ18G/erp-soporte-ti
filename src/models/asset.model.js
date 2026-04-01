'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo Asset.
 * Los activos se registran por nombre de empresa.
 * Los filtros de soft delete se aplican aquí.
 */

const AssetModel = {
  /**
   * Lista activos no eliminados con filtros opcionales.
   * @param {object} filters - { empresa, tipo, estado }
   */
  findAll: (filters = {}) => {
    const where = { deletedAt: null };
    if (filters.empresa) where.empresa = filters.empresa;
    if (filters.tipo)    where.tipo = filters.tipo;
    if (filters.estado)  where.estado = filters.estado;

    return prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Busca un activo por ID. Retorna null si no existe o fue eliminado.
   */
  findById: (id) =>
    prisma.asset.findFirst({
      where: { id, deletedAt: null },
    }),

  /**
   * Verifica si un número de serie ya está en uso por otro activo.
   */
  findByNumeroSerie: (numeroSerie, excludeId = null) =>
    prisma.asset.findFirst({
      where: {
        numeroSerie,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    }),

  /**
   * Crea un nuevo activo.
   */
  create: (data) =>
    prisma.asset.create({
      data,
    }),

  /**
   * Actualiza los campos de un activo.
   */
  update: (id, data) =>
    prisma.asset.update({
      where: { id },
      data,
    }),

  /**
   * Soft delete: marca deletedAt y cambia estado a DADO_DE_BAJA.
   */
  softDelete: (id) =>
    prisma.asset.update({
      where: { id },
      data:  { deletedAt: new Date(), estado: 'DADO_DE_BAJA' },
    }),
};

module.exports = AssetModel;
