'use strict';

const bcrypt          = require('bcryptjs');
const jwt             = require('jsonwebtoken');
const TechnicianModel = require('../models/technician.model');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

const JWT_SECRET     = process.env.JWT_SECRET     || 'dev_secret_inseguro';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const SALT_ROUNDS    = 10;

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Autentica un técnico y retorna un JWT.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = matchedData(req);

    // Obtener técnico con password incluido (método especial del model)
    const technician = await TechnicianModel.findByEmailWithPassword(email);
    if (!technician) {
      return next(createHttpError(401, 'Credenciales inválidas.'));
    }

    const passwordMatch = await bcrypt.compare(password, technician.password);
    if (!passwordMatch) {
      return next(createHttpError(401, 'Credenciales inválidas.'));
    }

    const payload = { id: technician.id, rol: technician.rol };
    const token   = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Nunca incluir password en la respuesta
    const { password: _pw, ...technicianData } = technician;

    res.status(200).json({
      success: true,
      data:    { token, technician: technicianData },
    });
  } catch (error) {
    next(error);
  }
};

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// GET /api/technicians
const getAll = async (_req, res, next) => {
  try {
    const technicians = await TechnicianModel.findAll();
    res.status(200).json({ success: true, data: technicians });
  } catch (error) {
    next(error);
  }
};

// GET /api/technicians/:id
const getById = async (req, res, next) => {
  try {
    const technician = await TechnicianModel.findById(req.params.id);
    if (!technician) {
      return next(createHttpError(404, 'Técnico no encontrado.'));
    }
    res.status(200).json({ success: true, data: technician });
  } catch (error) {
    next(error);
  }
};

// POST /api/technicians
const create = async (req, res, next) => {
  try {
    const body = matchedData(req);

    const emailTaken = await TechnicianModel.findByEmail(body.email);
    if (emailTaken) {
      return next(createHttpError(409, `El email '${body.email}' ya está registrado.`));
    }

    // Hashear password antes de persistir
    body.password = await bcrypt.hash(body.password, SALT_ROUNDS);

    const technician = await TechnicianModel.create(body);
    res.status(201).json({ success: true, data: technician });
  } catch (error) {
    next(error);
  }
};

// PUT /api/technicians/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await TechnicianModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Técnico no encontrado.'));
    }

    if (body.email) {
      const emailTaken = await TechnicianModel.findByEmail(body.email, id);
      if (emailTaken) {
        return next(createHttpError(409, `El email '${body.email}' ya está en uso.`));
      }
    }

    // Un administrador no puede quitarse su propio rol ADMIN.
    if (req.user?.id === id && req.user?.rol === 'ADMIN' && body.rol && body.rol !== 'ADMIN') {
      return next(createHttpError(400, 'No puedes quitarte el rol de administrador a ti mismo.'));
    }

    // Si se envía un nuevo password, hashearlo
    if (body.password) {
      body.password = await bcrypt.hash(body.password, SALT_ROUNDS);
    }

    const updated = await TechnicianModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/technicians/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await TechnicianModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Técnico no encontrado.'));
    }

    // Un técnico no puede eliminarse a sí mismo
    if (req.user.id === id) {
      return next(createHttpError(400, 'No puedes eliminar tu propio usuario.'));
    }

    await TechnicianModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Técnico eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getAll, getById, create, update, remove };
