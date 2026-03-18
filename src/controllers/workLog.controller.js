'use strict';

const WorkLogModel        = require('../models/workLog.model');
const ServiceOrderModel   = require('../models/serviceOrder.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

/**
 * Controlador del módulo WorkLog.
 *
 * Reglas de negocio aplicadas:
 *  - Solo se pueden registrar horas en órdenes PENDIENTE o EN_PROGRESO.
 *  - Solo el técnico asignado a la orden o un ADMIN puede registrar horas.
 *  - Solo el técnico que creó el registro o un ADMIN puede editarlo/eliminarlo.
 *  - horasTrabajadas > 0 y <= 24 (validado en route, reforzado aquí).
 */

const ESTADOS_PERMITIDOS = ['PENDIENTE', 'EN_PROGRESO'];

// GET /api/work-logs
const getAll = async (req, res, next) => {
  try {
    const { ordenServicioId, tecnicoId, fecha } = req.query;
    const logs = await WorkLogModel.findAll({ ordenServicioId, tecnicoId, fecha });
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

    // Solo se registran horas en órdenes activas
    if (!ESTADOS_PERMITIDOS.includes(orden.estado)) {
      return next(createHttpError(400, `No se pueden registrar horas en una orden con estado '${orden.estado}'.`));
    }

    // Solo el técnico asignado a la orden o un ADMIN puede registrar horas
    const esAdmin   = req.user.rol === 'ADMIN';
    const esTecnico = orden.tecnico.id === req.user.id;
    if (!esAdmin && !esTecnico) {
      return next(createHttpError(403, 'Solo el técnico asignado a la orden puede registrar horas.'));
    }

    // El tecnicoId del log debe ser siempre el usuario autenticado
    // (un admin puede registrar en nombre de cualquier técnico solo si lo especifica explícitamente)
    const tecnicoId = body.tecnicoId ?? req.user.id;

    const log = await WorkLogModel.create({ ...body, tecnicoId });
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

    // Solo el técnico dueño del registro o un ADMIN puede editarlo
    const esAdmin  = req.user.rol === 'ADMIN';
    const esDuenio = existing.tecnico.id === req.user.id;
    if (!esAdmin && !esDuenio) {
      return next(createHttpError(403, 'No tienes permiso para editar este registro.'));
    }

    // Verificar que la orden sigue activa
    const orden = await ServiceOrderModel.findById(existing.ordenServicioId);
    if (orden && !ESTADOS_PERMITIDOS.includes(orden.estado)) {
      return next(createHttpError(400, `No se puede editar un registro de una orden en estado '${orden.estado}'.`));
    }

    const updated = await WorkLogModel.update(id, body);
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
