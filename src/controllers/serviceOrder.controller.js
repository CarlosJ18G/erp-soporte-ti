'use strict';

const ServiceOrderModel   = require('../models/serviceOrder.model');
const TicketModel         = require('../models/ticket.model');
const TechnicianModel     = require('../models/technician.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

/**
 * Controlador del módulo ServiceOrder.
 *
 * Reglas de negocio aplicadas aquí:
 *  - Un ticket solo puede tener una orden activa.
 *  - No se puede modificar una orden COMPLETADA o CANCELADA.
 *  - Al cambiar estado a COMPLETADA se usa una transacción
 *    que también marca el ticket como RESUELTO.
 *  - No se puede reabrir una orden terminal (COMPLETADA | CANCELADA).
 */

const ESTADOS_TERMINALES = ['COMPLETADA', 'CANCELADA'];

// GET /api/service-orders
const getAll = async (req, res, next) => {
  try {
    const { estado, tipo, tecnicoId } = req.query;
    const orders = await ServiceOrderModel.findAll({ estado, tipo, tecnicoId });
    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

// GET /api/service-orders/:id
const getById = async (req, res, next) => {
  try {
    const order = await ServiceOrderModel.findById(req.params.id);
    if (!order) {
      return next(createHttpError(404, 'Orden de servicio no encontrada.'));
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// POST /api/service-orders
const create = async (req, res, next) => {
  try {
    const body = matchedData(req);

    // Verificar que el ticket existe
    const ticket = await TicketModel.findById(body.ticketId);
    if (!ticket) {
      return next(createHttpError(404, 'El ticket especificado no existe.'));
    }

    // Un ticket cerrado no puede generar nuevas órdenes
    if (ticket.estado === 'CERRADO') {
      return next(createHttpError(400, 'No se puede crear una orden para un ticket cerrado.'));
    }

    // Verificar que el ticket no tenga ya una orden activa (relación 1:1)
    const ordenExistente = await ServiceOrderModel.findByTicketId(body.ticketId);
    if (ordenExistente) {
      return next(createHttpError(409, `El ticket ya tiene la orden activa #${ordenExistente.numero}.`));
    }

    // Verificar que el técnico existe
    const tecnico = await TechnicianModel.findById(body.tecnicoId);
    if (!tecnico) {
      return next(createHttpError(404, 'El técnico especificado no existe.'));
    }

    const order = await ServiceOrderModel.create(body);

    // Avanzar el ticket a EN_PROGRESO al crear la orden
    await TicketModel.update(body.ticketId, { estado: 'EN_PROGRESO' });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

// PUT /api/service-orders/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await ServiceOrderModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Orden de servicio no encontrada.'));
    }

    // No se puede editar una orden en estado terminal
    if (ESTADOS_TERMINALES.includes(existing.estado)) {
      return next(createHttpError(400, `No se puede modificar una orden en estado '${existing.estado}'.`));
    }

    // Si se cambia el técnico, verificar que existe
    if (body.tecnicoId) {
      const tecnico = await TechnicianModel.findById(body.tecnicoId);
      if (!tecnico) {
        return next(createHttpError(404, 'El técnico especificado no existe.'));
      }
    }

    const updated = await ServiceOrderModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/service-orders/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const { estado } = matchedData(req);

    const existing = await ServiceOrderModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Orden de servicio no encontrada.'));
    }

    // No se puede cambiar el estado de una orden terminal
    if (ESTADOS_TERMINALES.includes(existing.estado)) {
      return next(createHttpError(400, `La orden ya está en estado '${existing.estado}' y no puede cambiar.`));
    }

    // Al completar: usar transacción que también resuelve el ticket
    if (estado === 'COMPLETADA') {
      const [orderActualizada] = await ServiceOrderModel.completar(id, existing.ticket.id);
      return res.status(200).json({ success: true, data: orderActualizada });
    }

    const updated = await ServiceOrderModel.update(id, { estado });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/service-orders/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await ServiceOrderModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Orden de servicio no encontrada.'));
    }

    if (existing.estado === 'COMPLETADA') {
      return next(createHttpError(400, 'No se puede eliminar una orden completada.'));
    }

    await ServiceOrderModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Orden de servicio cancelada correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, updateStatus, remove };
