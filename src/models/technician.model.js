'use strict';

const prisma = require('../config/database');

/**
 * Capa de acceso a datos para el módulo Technician.
 * El campo password se excluye por defecto en todos los métodos
 * que retornan datos al cliente. Solo se incluye cuando es estrictamente
 * necesario (login).
 */

// Campos seguros: se usan en todas las consultas excepto login
const safeSelect = {
  id:           true,
  nombre:       true,
  apellido:     true,
  email:        true,
  telefono:     true,
  especialidad: true,
  rol:          true,
  activo:       true,
  createdAt:    true,
  updatedAt:    true,
};

const TechnicianModel = {
  /**
   * Lista todos los técnicos activos (sin password).
   */
  findAll: () =>
    prisma.technician.findMany({
      where:   { deletedAt: null },
      select:  safeSelect,
      orderBy: { createdAt: 'desc' },
    }),

  /**
   * Busca un técnico por ID (sin password).
   */
  findById: (id) =>
    prisma.technician.findFirst({
      where:  { id, deletedAt: null },
      select: safeSelect,
    }),

  /**
   * Busca por email SIN excluir el password.
   * Uso exclusivo del proceso de autenticación (login).
   */
  findByEmailWithPassword: (email) =>
    prisma.technician.findFirst({
      where: { email, deletedAt: null, activo: true },
    }),

  /**
   * Verifica si un email ya está en uso por otro técnico.
   */
  findByEmail: (email, excludeId = null) =>
    prisma.technician.findFirst({
      where: {
        email,
        deletedAt: null,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    }),

  /**
   * Crea un nuevo técnico. El password ya debe llegar hasheado.
   */
  create: (data) =>
    prisma.technician.create({
      data,
      select: safeSelect,
    }),

  /**
   * Actualiza campos de un técnico. El password, si se incluye, ya debe
   * llegar hasheado desde el controller.
   */
  update: (id, data) =>
    prisma.technician.update({
      where:  { id },
      data,
      select: safeSelect,
    }),

  /**
   * Soft delete: marca deletedAt y desactiva el técnico.
   */
  softDelete: (id) =>
    prisma.technician.update({
      where:  { id },
      data:   { deletedAt: new Date(), activo: false },
      select: safeSelect,
    }),
};

module.exports = TechnicianModel;
