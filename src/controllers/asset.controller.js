'use strict';

const AssetModel          = require('../models/asset.model');
const ClientModel         = require('../models/client.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

/**
 * Controlador del módulo Asset.
 * Valida existencia de recursos relacionados (cliente) antes de persistir.
 */

// GET /api/assets  (query: clienteId, tipo, estado)
const getAll = async (req, res, next) => {
  try {
    const { clienteId, tipo, estado } = req.query;
    const assets = await AssetModel.findAll({ clienteId, tipo, estado });
    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    next(error);
  }
};

// GET /api/assets/:id
const getById = async (req, res, next) => {
  try {
    const asset = await AssetModel.findById(req.params.id);
    if (!asset) {
      return next(createHttpError(404, 'Activo no encontrado.'));
    }
    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

// POST /api/assets
const create = async (req, res, next) => {
  try {
    const body = matchedData(req);

    // Verificar que el cliente existe
    const cliente = await ClientModel.findById(body.clienteId);
    if (!cliente) {
      return next(createHttpError(404, 'El cliente especificado no existe.'));
    }

    // Verificar unicidad del número de serie (si se proporcionó)
    if (body.numeroSerie) {
      const duplicate = await AssetModel.findByNumeroSerie(body.numeroSerie);
      if (duplicate) {
        return next(createHttpError(409, `El número de serie '${body.numeroSerie}' ya está registrado.`));
      }
    }

    const asset = await AssetModel.create(body);
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

// PUT /api/assets/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await AssetModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Activo no encontrado.'));
    }

    // Si se cambia el cliente, verificar que existe
    if (body.clienteId) {
      const cliente = await ClientModel.findById(body.clienteId);
      if (!cliente) {
        return next(createHttpError(404, 'El cliente especificado no existe.'));
      }
    }

    // Verificar unicidad del número de serie en caso de actualización
    if (body.numeroSerie) {
      const duplicate = await AssetModel.findByNumeroSerie(body.numeroSerie, id);
      if (duplicate) {
        return next(createHttpError(409, `El número de serie '${body.numeroSerie}' ya está en uso.`));
      }
    }

    const updated = await AssetModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/assets/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await AssetModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Activo no encontrado.'));
    }

    await AssetModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Activo dado de baja correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
