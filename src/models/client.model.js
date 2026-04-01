'use strict';

const prisma = require('../config/database');

const safeSelect = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  telefono: true,
  empresa: true,
  direccion: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

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
      select:  safeSelect,
      orderBy: { createdAt: 'desc' },
    }),

  /**
   * Busca un cliente por ID. Retorna null si no existe o fue eliminado.
   */
  findById: (id) =>
    prisma.client.findFirst({
      where: { id, deletedAt: null },
      select: safeSelect,
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
      select: { id: true },
    }),

  findByEmailWithPassword: (email) =>
    prisma.client.findFirst({
      where: { email, deletedAt: null, activo: true },
    }),

  /**
   * Crea un nuevo cliente.
   */
  create: (data) =>
    prisma.client.create({ data, select: safeSelect }),

  /**
   * Actualiza los campos de un cliente existente.
   */
  update: (id, data) =>
    prisma.client.update({
      where: { id },
      data,
      select: safeSelect,
    }),

  /**
   * Soft delete: marca deletedAt con la fecha actual y activo en false.
   * No elimina físicamente el registro.
   */
  softDelete: (id) =>
    prisma.client.update({
      where: { id },
      data:  { deletedAt: new Date(), activo: false },
      select: safeSelect,
    }),
};

module.exports = ClientModel;
