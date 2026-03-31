'use strict';

const TicketModel         = require('../models/ticket.model');
const ClientModel         = require('../models/client.model');
const AssetModel          = require('../models/asset.model');
const TechnicianModel     = require('../models/technician.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

/**
 * Controlador del módulo Ticket.
 * Valida la coherencia referencial antes de persistir:
 *  - El cliente debe existir.
 *  - El activo (si se especifica) debe pertenecer al cliente.
 *  - El técnico asignado (si se especifica) debe existir y estar activo.
 */

// GET /api/tickets
const getAll = async (req, res, next) => {
  try {
    const { estado, prioridad, clienteId, tecnicoAsignadoId, mostrarCerrados } = req.query;
    const isAdmin = req.user?.rol === 'ADMIN';
    const adminIncluyeCerrados = isAdmin && String(mostrarCerrados).toLowerCase() === 'true';
    const adminConFiltros = isAdmin && Boolean(estado || prioridad || clienteId || tecnicoAsignadoId);

    // Alcance por rol: ADMIN ve todo; TECNICO solo sus tickets asignados.
    const filters = { estado, prioridad, clienteId, tecnicoAsignadoId };
    if (!isAdmin) {
      filters.tecnicoAsignadoId = req.user.id;
      if (!estado || estado === 'CERRADO') {
        delete filters.estado;
        filters.estadoNot = 'CERRADO';
      }
    }

    // Por defecto se ocultan tickets cerrados en el listado.
    // Admin puede incluirlos usando ?mostrarCerrados=true
    // o aplicando cualquier filtro de búsqueda.
    if (isAdmin && !adminConFiltros && !estado && !adminIncluyeCerrados) {
      filters.estadoNot = 'CERRADO';
    }

    const tickets = await TicketModel.findAll(filters);
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

// GET /api/tickets/:id
const getById = async (req, res, next) => {
  try {
    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    if (req.user?.rol !== 'ADMIN' && ticket.tecnicoAsignadoId !== req.user.id) {
      return next(createHttpError(403, 'No tienes permisos para ver este ticket.'));
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// POST /api/tickets
const create = async (req, res, next) => {
  try {
    const body = matchedData(req);

    // Verificar cliente
    const cliente = await ClientModel.findById(body.clienteId);
    if (!cliente) {
      return next(createHttpError(404, 'El cliente especificado no existe.'));
    }

    // Verificar activo y que pertenece al cliente
    if (body.activoId) {
      const activo = await AssetModel.findById(body.activoId);
      if (!activo) {
        return next(createHttpError(404, 'El activo especificado no existe.'));
      }
      if (activo.clienteId !== body.clienteId) {
        return next(createHttpError(400, 'El activo no pertenece al cliente indicado.'));
      }
    }

    // Verificar técnico asignado
    if (body.tecnicoAsignadoId) {
      const tecnico = await TechnicianModel.findById(body.tecnicoAsignadoId);
      if (!tecnico) {
        return next(createHttpError(404, 'El técnico especificado no existe.'));
      }
    }

    const ticket = await TicketModel.create(body);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tickets/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await TicketModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    // Determinar clienteId vigente (el nuevo si se envía, el actual si no)
    const clienteId = body.clienteId ?? existing.clienteId;

    if (body.clienteId) {
      const cliente = await ClientModel.findById(body.clienteId);
      if (!cliente) {
        return next(createHttpError(404, 'El cliente especificado no existe.'));
      }
    }

    if (body.activoId) {
      const activo = await AssetModel.findById(body.activoId);
      if (!activo) {
        return next(createHttpError(404, 'El activo especificado no existe.'));
      }
      if (activo.clienteId !== clienteId) {
        return next(createHttpError(400, 'El activo no pertenece al cliente indicado.'));
      }
    }

    if (body.tecnicoAsignadoId) {
      const tecnico = await TechnicianModel.findById(body.tecnicoAsignadoId);
      if (!tecnico) {
        return next(createHttpError(404, 'El técnico especificado no existe.'));
      }
    }

    const updated = await TicketModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tickets/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { id }   = req.params;
    const { estado } = matchedData(req);

    const existing = await TicketModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    // Regla de negocio: un ticket cerrado no puede reabrirse
    if (existing.estado === 'CERRADO') {
      return next(createHttpError(400, 'Un ticket cerrado no puede cambiar de estado.'));
    }

    const updated = await TicketModel.update(id, { estado });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tickets/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await TicketModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    await TicketModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Ticket cerrado y eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, updateStatus, remove };
