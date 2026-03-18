'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo Client.
 * Toda interacción con Prisma ocurre exclusivamente aquí.
 * Los filtros de soft delete (deletedAt: null) se aplican en este nivel.
 */

const ClientModel = {
  /**
   * Obtiene todos los clientes activos (no eliminados).
   */
  findAll: () =>
    prisma.client.findMany({
      where:   { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    }),

  /**
   * Busca un cliente por ID. Retorna null si no existe o fue eliminado.
   */
  findById: (id) =>
    prisma.client.findFirst({
      where: { id, deletedAt: null },
    }),

  /**
   * Busca un cliente por email (para validar unicidad en creación/edición).
   * Puede excluir un ID concreto (útil en updates).
   */
  findByEmail: (email, excludeId = null) =>
    prisma.client.findFirst({
      where: {
        email,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
    }),

  /**
   * Crea un nuevo cliente.
   */
  create: (data) =>
    prisma.client.create({ data }),

  /**
   * Actualiza los campos de un cliente existente.
   */
  update: (id, data) =>
    prisma.client.update({
      where: { id },
      data,
    }),

  /**
   * Soft delete: marca deletedAt con la fecha actual y activo en false.
   * No elimina físicamente el registro.
   */
  softDelete: (id) =>
    prisma.client.update({
      where: { id },
      data:  { deletedAt: new Date(), activo: false },
    }),
};

module.exports = ClientModel;
