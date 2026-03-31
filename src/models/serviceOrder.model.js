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
  repuestosUsados: {
    where: { deletedAt: null },
    include: {
      repuesto: {
        select: { id: true, codigo: true, nombre: true, precio: true, stock: true, stockMinimo: true },
      },
    },
    orderBy: { createdAt: 'asc' },
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
   * Completa la orden consumiendo repuestos y descontando inventario.
   * Cada línea guarda precio unitario histórico para trazabilidad.
   */
  completarConRepuestos: (id, ticketId, repuestos = []) =>
    prisma.$transaction(async (tx) => {
      const agregados = repuestos.reduce((acc, item) => {
        if (!item?.repuestoId || !item?.cantidad) return acc;
        const actual = acc.get(item.repuestoId) ?? 0;
        acc.set(item.repuestoId, actual + Number(item.cantidad));
        return acc;
      }, new Map());

      const lineas = Array.from(agregados.entries()).map(([repuestoId, cantidad]) => ({ repuestoId, cantidad }));
      const repuestoIds = lineas.map((l) => l.repuestoId);

      const repuestosDb = repuestoIds.length === 0
        ? []
        : await tx.sparePart.findMany({
          where: { id: { in: repuestoIds }, deletedAt: null, activo: true },
        });

      if (repuestosDb.length !== repuestoIds.length) {
        const error = new Error('Uno o más repuestos no existen o están inactivos.');
        error.statusCode = 400;
        throw error;
      }

      const repuestosMap = new Map(repuestosDb.map((r) => [r.id, r]));
      let total = 0;

      for (const linea of lineas) {
        if (!Number.isInteger(linea.cantidad) || linea.cantidad <= 0) {
          const error = new Error('La cantidad de cada repuesto debe ser un entero mayor a cero.');
          error.statusCode = 400;
          throw error;
        }

        const repuesto = repuestosMap.get(linea.repuestoId);
        if (!repuesto) continue;

        if (repuesto.stock < linea.cantidad) {
          const error = new Error(`Stock insuficiente para '${repuesto.nombre}'. Disponible: ${repuesto.stock}, solicitado: ${linea.cantidad}.`);
          error.statusCode = 400;
          throw error;
        }

        const precioUnitario = Number(repuesto.precio);
        const subtotal = Number((precioUnitario * linea.cantidad).toFixed(2));
        total += subtotal;

        await tx.serviceOrderSparePart.upsert({
          where: {
            ordenServicioId_repuestoId: {
              ordenServicioId: id,
              repuestoId: linea.repuestoId,
            },
          },
          update: {
            cantidad: linea.cantidad,
            precioUnitario,
            subtotal,
            deletedAt: null,
          },
          create: {
            ordenServicioId: id,
            repuestoId: linea.repuestoId,
            cantidad: linea.cantidad,
            precioUnitario,
            subtotal,
          },
        });

        await tx.sparePart.update({
          where: { id: linea.repuestoId },
          data: { stock: { decrement: linea.cantidad } },
        });
      }

      const orderActualizada = await tx.serviceOrder.update({
        where: { id },
        data: {
          estado: 'COMPLETADA',
          fechaFin: new Date(),
          costoFinal: Number(total.toFixed(2)),
        },
        include: includeRelaciones,
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: { estado: 'RESUELTO' },
      });

      return orderActualizada;
    }),

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
