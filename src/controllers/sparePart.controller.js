'use strict';

const SparePartModel = require('../models/sparePart.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData } = require('express-validator');

const normalizePayload = (body) => {
  const payload = { ...body };
  if (payload.precio !== undefined) payload.precio = Number(payload.precio);
  if (payload.stock !== undefined) payload.stock = Number(payload.stock);
  if (payload.stockMinimo !== undefined) payload.stockMinimo = Number(payload.stockMinimo);
  if (payload.activo !== undefined) payload.activo = payload.activo === true || payload.activo === 'true';
  return payload;
};

const getAll = async (req, res, next) => {
  try {
    const { lowStock } = req.query;
    const parts = await SparePartModel.findAll({ lowStock });
    res.status(200).json({ success: true, data: parts });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const part = await SparePartModel.findById(req.params.id);
    if (!part) {
      return next(createHttpError(404, 'Repuesto no encontrado.'));
    }
    res.status(200).json({ success: true, data: part });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    if (req.user?.rol !== 'ADMIN') {
      return next(createHttpError(403, 'Solo el administrador puede crear repuestos.'));
    }

    const body = matchedData(req, { includeOptionals: true });
    const part = await SparePartModel.create(normalizePayload(body));
    res.status(201).json({ success: true, data: part });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    if (req.user?.rol !== 'ADMIN') {
      return next(createHttpError(403, 'Solo el administrador puede editar repuestos.'));
    }

    const { id } = req.params;
    const body = normalizePayload(matchedData(req, { includeOptionals: true }));

    const existing = await SparePartModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Repuesto no encontrado.'));
    }

    const updated = await SparePartModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    if (req.user?.rol !== 'ADMIN') {
      return next(createHttpError(403, 'Solo el administrador puede eliminar repuestos.'));
    }

    const { id } = req.params;
    const existing = await SparePartModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Repuesto no encontrado.'));
    }

    await SparePartModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Repuesto eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, remove };
