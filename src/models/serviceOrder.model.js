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
      numero:   true,
      titulo:   true,
      descripcion: true,
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
 * Toma el último número existente del mismo día y suma 1.
 */
const generarNumero = async () => {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const prefijo = `OS-${fecha}-`;

  const ultimaOrden = await prisma.serviceOrder.findFirst({
    where: { numero: { startsWith: prefijo } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });

  const correlativoActual = ultimaOrden?.numero ? Number(ultimaOrden.numero.split('-').pop()) : 0;
  const correlativo = String(correlativoActual + 1).padStart(4, '0');
  return `OS-${fecha}-${correlativo}`;
};

const isNumeroUniqueError = (error) =>
  error?.code === 'P2002';

// Compatibilidad: mientras el enum de BD no tenga todos los tipos nuevos,
// mapeamos actividades a los tipos legacy persistidos.
const mapServiceOrderType = (tipo) => {
  const value = String(tipo || '').trim().toUpperCase();
  if (!value) return tipo;

  const compat = {
    DIAGNOSTICO: 'CORRECTIVO',
    REPARACION: 'CORRECTIVO',
    CONFIGURACION: 'CONSULTORIA',
    MANTENIMIENTO: 'PREVENTIVO',
    CONSULTA: 'CONSULTORIA',
    OTRO: 'CONSULTORIA',
  };

  return compat[value] || value;
};

const parseSuggestedOrderType = (descripcion = '') => {
  const text = String(descripcion || '');
  const match = text.match(/\[Tipo de orden sugerido:\s*([^\]]+)\]/i);
  if (!match?.[1]) return null;

  const normalized = match[1]
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  const allowed = new Set([
    'DIAGNOSTICO', 'REPARACION', 'INSTALACION', 'CONFIGURACION', 'MANTENIMIENTO', 'CONSULTA', 'OTRO',
    'CORRECTIVO', 'PREVENTIVO', 'CONSULTORIA',
  ]);

  return allowed.has(normalized) ? normalized : null;
};

const normalizeOrderTypeFromTicket = (order) => {
  if (!order) return order;
  const suggested = parseSuggestedOrderType(order.ticket?.descripcion);
  if (!suggested) return order;
  return { ...order, tipo: suggested };
};

const ServiceOrderModel = {
  /**
   * Lista órdenes no eliminadas con filtros opcionales.
   */
  findAll: (filters = {}) => {
    const where = { deletedAt: null };
    if (filters.estado)    where.estado    = filters.estado;
    if (filters.tipo)      where.tipo      = mapServiceOrderType(filters.tipo);
    if (filters.tecnicoId) where.tecnicoId = filters.tecnicoId;
    if (filters.clienteId) where.ticket = { clienteId: filters.clienteId };

    return prisma.serviceOrder.findMany({
      where,
      include: includeRelaciones,
      orderBy: { createdAt: 'desc' },
    }).then((orders) => orders.map(normalizeOrderTypeFromTicket));
  },

  /**
   * Busca una orden por ID incluyendo sus WorkLogs.
   */
  findById: (id) =>
    prisma.serviceOrder.findFirst({
      where:   { id, deletedAt: null },
      include: includeConWorkLogs,
    }).then(normalizeOrderTypeFromTicket),

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
    const maxRetries = 5;
    const payload = {
      ...data,
      ...(data?.tipo ? { tipo: mapServiceOrderType(data.tipo) } : {}),
    };

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const numero = await generarNumero();
      try {
        return await prisma.serviceOrder.create({
          data:    { ...payload, numero },
          include: includeRelaciones,
        }).then(normalizeOrderTypeFromTicket);
      } catch (error) {
        if (!isNumeroUniqueError(error) || attempt === maxRetries - 1) throw error;
      }
    }

    const fallbackError = new Error('No se pudo generar un número único de orden. Intenta nuevamente.');
    fallbackError.statusCode = 409;
    throw fallbackError;
  },

  /**
   * Actualiza campos de una orden.
   */
  update: (id, data) =>
    prisma.serviceOrder.update({
      where:   { id },
      data: {
        ...data,
        ...(data?.tipo ? { tipo: mapServiceOrderType(data.tipo) } : {}),
      },
      include: includeRelaciones,
    }).then(normalizeOrderTypeFromTicket),

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
