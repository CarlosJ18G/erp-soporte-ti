'use strict';

const ClientModel                = require('../models/client.model');
const { createHttpError }        = require('../middlewares/error.middleware');
const { matchedData }            = require('express-validator');

/**
 * Controlador del módulo Client.
 * Responsabilidades:
 *  - Recibir la request validada.
 *  - Delegar operaciones de datos al model.
 *  - Construir y enviar la respuesta HTTP.
 *  - Propagar errores al middleware global con next().
 */

// GET /api/clients
const getAll = async (_req, res, next) => {
  try {
    const clients = await ClientModel.findAll();
    res.status(200).json({ success: true, data: clients });
  } catch (error) {
    next(error);
  }
};

// GET /api/clients/:id
const getById = async (req, res, next) => {
  try {
    const client = await ClientModel.findById(req.params.id);

    if (!client) {
      return next(createHttpError(404, 'Cliente no encontrado.'));
    }

    res.status(200).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// POST /api/clients
const create = async (req, res, next) => {
  try {
    // matchedData extrae solo los campos que pasaron validación
    const body = matchedData(req);

    // Verificar unicidad del email en la capa de negocio
    const existingClient = await ClientModel.findByEmail(body.email);
    if (existingClient) {
      return next(createHttpError(409, `El email '${body.email}' ya está registrado.`));
    }

    const client = await ClientModel.create(body);
    res.status(201).json({ success: true, data: client });
  } catch (error) {
    next(error);
  }
};

// PUT /api/clients/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await ClientModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Cliente no encontrado.'));
    }

    // Si se actualiza el email, verificar que no pertenezca a otro registro
    if (body.email) {
      const emailTaken = await ClientModel.findByEmail(body.email, id);
      if (emailTaken) {
        return next(createHttpError(409, `El email '${body.email}' ya está en uso.`));
      }
    }

    const updated = await ClientModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/clients/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await ClientModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Cliente no encontrado.'));
    }

    await ClientModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Cliente eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
