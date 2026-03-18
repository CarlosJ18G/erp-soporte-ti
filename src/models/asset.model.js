'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo Asset.
 * Incluye siempre los datos básicos del cliente propietario.
 * Los filtros de soft delete se aplican aquí.
 */

// Relación incluida por defecto en las consultas
const includeCliente = {
  cliente: {
    select: { id: true, nombre: true, apellido: true, empresa: true },
  },
};

const AssetModel = {
  /**
   * Lista activos no eliminados con filtros opcionales.
   * @param {object} filters - { clienteId, tipo, estado }
   */
  findAll: (filters = {}) => {
    const where = { deletedAt: null };
    if (filters.clienteId) where.clienteId = filters.clienteId;
    if (filters.tipo)      where.tipo       = filters.tipo;
    if (filters.estado)    where.estado     = filters.estado;

    return prisma.asset.findMany({
      where,
      include: includeCliente,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Busca un activo por ID. Retorna null si no existe o fue eliminado.
   */
  findById: (id) =>
    prisma.asset.findFirst({
      where:   { id, deletedAt: null },
      include: includeCliente,
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
      include: includeCliente,
    }),

  /**
   * Actualiza los campos de un activo.
   */
  update: (id, data) =>
    prisma.asset.update({
      where:   { id },
      data,
      include: includeCliente,
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
