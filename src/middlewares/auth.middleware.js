'use strict';

const jwt            = require('jsonwebtoken');
const TechnicianModel = require('../models/technician.model');
const ClientModel     = require('../models/client.model');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_inseguro';

/**
 * Middleware de autenticación.
 * Verifica el token JWT del header Authorization: Bearer <token>.
 * Adjunta el técnico autenticado a req.user para uso en controllers.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. Se requiere token de autenticación.',
      });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded?.type === 'CLIENT') {
      const client = await ClientModel.findById(decoded.id);
      if (!client || !client.activo) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o cliente inactivo.',
        });
      }

      req.user = { ...client, type: 'CLIENT' };
      return next();
    }

    // Verificar que el técnico aún existe y está activo
    const technician = await TechnicianModel.findById(decoded.id);
    if (!technician || !technician.activo) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o usuario inactivo.',
      });
    }

    req.user = { ...technician, type: 'TECHNICIAN' };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de autorización.
 * Verifica que el usuario autenticado tenga rol ADMIN.
 * Debe usarse DESPUÉS de authenticate.
 */
const isAdmin = (req, res, next) => {
  if (req.user?.rol === 'ADMIN') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado. Se requiere rol de administrador.',
  });
};

module.exports = { authenticate, isAdmin };
