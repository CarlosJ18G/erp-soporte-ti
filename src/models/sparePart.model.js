'use strict';

const prisma = require('../config/database');

const SparePartModel = {
  findAll: async ({ lowStock } = {}) => {
    const parts = await prisma.sparePart.findMany({
      where: { deletedAt: null },
      orderBy: [{ stock: 'asc' }, { nombre: 'asc' }],
    });

    if (String(lowStock).toLowerCase() !== 'true') return parts;
    return parts.filter((p) => p.stock <= p.stockMinimo);
  },

  findById: (id) =>
    prisma.sparePart.findFirst({
      where: { id, deletedAt: null },
    }),

  create: (data) =>
    prisma.sparePart.create({
      data,
    }),

  update: (id, data) =>
    prisma.sparePart.update({
      where: { id },
      data,
    }),

  softDelete: (id) =>
    prisma.sparePart.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    }),
};

module.exports = SparePartModel;
