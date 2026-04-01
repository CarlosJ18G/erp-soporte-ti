'use strict';

const AssetModel          = require('../models/asset.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

/**
 * Controlador del módulo Asset.
 * Los activos se gestionan por nombre de empresa.
 */

// GET /api/assets  (query: empresa, tipo, estado)
const getAll = async (req, res, next) => {
  try {
    const { empresa, tipo, estado } = req.query;
    const filters = { empresa, tipo, estado };

    // Un cliente solo puede ver sus propios activos.
    if (req.user?.type === 'CLIENT') {
      filters.empresa = req.user.empresa || '__NO_EMPRESA__';
    }

    const assets = await AssetModel.findAll(filters);
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

    if (req.user?.type === 'CLIENT' && asset.empresa !== req.user.empresa) {
      return next(createHttpError(403, 'No tienes permisos para ver este activo.'));
    }

    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    next(error);
  }
};

// POST /api/assets
const create = async (req, res, next) => {
  try {
    if (req.user?.type === 'CLIENT') {
      return next(createHttpError(403, 'No tienes permisos para crear activos.'));
    }

    const body = matchedData(req);

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
    if (req.user?.type === 'CLIENT') {
      return next(createHttpError(403, 'No tienes permisos para actualizar activos.'));
    }

    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await AssetModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Activo no encontrado.'));
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
    if (req.user?.type === 'CLIENT') {
      return next(createHttpError(403, 'No tienes permisos para eliminar activos.'));
    }

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
