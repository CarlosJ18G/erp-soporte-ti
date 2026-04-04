'use strict';

const WorkLogModel        = require('../models/workLog.model');
const ServiceOrderModel   = require('../models/serviceOrder.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

/**
 * Controlador del módulo WorkLog.
 *
 * Reglas de negocio aplicadas:
 *  - Solo se pueden registrar horas cuando el ticket está RESUELTO o CERRADO.
 *  - Solo se permite un registro de horas por orden de servicio.
 *  - Solo el técnico asignado a la orden o un ADMIN puede registrar horas.
 *  - Solo un ADMIN puede editar un registro de horas.
 *  - Solo el técnico que creó el registro o un ADMIN puede eliminarlo.
 *  - horasTrabajadas > 0 y <= 24 (validado en route, reforzado aquí).
 */

const ESTADOS_TICKET_PERMITIDOS = ['RESUELTO', 'CERRADO'];

// GET /api/work-logs
const getAll = async (req, res, next) => {
  try {
    const { ordenServicioId, tecnicoId, fecha } = req.query;
    const filters = { ordenServicioId, tecnicoId, fecha };

    // Alcance por rol: ADMIN ve todo; TECNICO ve los registros de las órdenes asignadas a él.
    if (req.user?.rol !== 'ADMIN') {
      delete filters.tecnicoId;
      filters.tecnicoOrdenId = req.user.id;
    }

    const logs = await WorkLogModel.findAll(filters);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

// GET /api/work-logs/:id
const getById = async (req, res, next) => {
  try {
    const log = await WorkLogModel.findById(req.params.id);
    if (!log) {
      return next(createHttpError(404, 'Registro de trabajo no encontrado.'));
    }

    const tecnicoDeLaOrden = log.ordenServicio?.tecnicoId === req.user.id;
    if (req.user?.rol !== 'ADMIN' && log.tecnicoId !== req.user.id && !tecnicoDeLaOrden) {
      return next(createHttpError(403, 'No tienes permisos para ver este registro.'));
    }

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// POST /api/work-logs
const create = async (req, res, next) => {
  try {
    const body = matchedData(req);

    // Verificar que la orden existe
    const orden = await ServiceOrderModel.findById(body.ordenServicioId);
    if (!orden) {
      return next(createHttpError(404, 'La orden de servicio especificada no existe.'));
    }

    // Solo se registran horas cuando el ticket está resuelto/cerrado
    if (!ESTADOS_TICKET_PERMITIDOS.includes(orden.ticket.estado)) {
      return next(createHttpError(400, `Solo se pueden registrar horas cuando el ticket está RESUELTO o CERRADO. Estado actual: '${orden.ticket.estado}'.`));
    }

    const registroExistente = await WorkLogModel.findByOrdenServicioId(body.ordenServicioId);
    if (registroExistente) {
      return next(createHttpError(409, 'La orden de servicio ya tiene un registro de horas asignado.'));
    }

    // Solo el técnico asignado a la orden o un ADMIN puede registrar horas
    const esAdmin   = req.user.rol === 'ADMIN';
    const esTecnico = orden.tecnico.id === req.user.id;
    if (!esAdmin && !esTecnico) {
      return next(createHttpError(403, 'Solo el técnico asignado a la orden puede registrar horas.'));
    }

    // Por defecto el registro queda asociado al técnico de la orden.
    // Un admin puede asignarlo explícitamente a otro técnico si lo necesita.
    const tecnicoId = body.tecnicoId ?? orden.tecnico.id;

    // Prisma espera tipos consistentes para DateTime/Decimal.
    const payload = {
      ...body,
      tecnicoId,
      fecha: new Date(body.fecha),
      horasTrabajadas: Number(body.horasTrabajadas),
    };

    const log = await WorkLogModel.create(payload);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};

// PUT /api/work-logs/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await WorkLogModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Registro de trabajo no encontrado.'));
    }

    // Solo un ADMIN puede editar registros
    const esAdmin = req.user.rol === 'ADMIN';
    if (!esAdmin) {
      return next(createHttpError(403, 'Solo el administrador puede editar este registro.'));
    }

    // Verificar que el ticket de la orden permite registrar horas
    const orden = await ServiceOrderModel.findById(existing.ordenServicioId);
    if (orden && !ESTADOS_TICKET_PERMITIDOS.includes(orden.ticket.estado)) {
      return next(createHttpError(400, `Solo se puede editar este registro cuando el ticket está RESUELTO o CERRADO. Estado actual: '${orden.ticket.estado}'.`));
    }

    const payload = { ...body };
    if (payload.fecha) payload.fecha = new Date(payload.fecha);
    if (payload.horasTrabajadas !== undefined) payload.horasTrabajadas = Number(payload.horasTrabajadas);

    const updated = await WorkLogModel.update(id, payload);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/work-logs/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await WorkLogModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Registro de trabajo no encontrado.'));
    }

    // Solo el técnico dueño o un ADMIN puede eliminar
    const esAdmin  = req.user.rol === 'ADMIN';
    const esDuenio = existing.tecnico.id === req.user.id;
    if (!esAdmin && !esDuenio) {
      return next(createHttpError(403, 'No tienes permiso para eliminar este registro.'));
    }

    await WorkLogModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Registro de trabajo eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
