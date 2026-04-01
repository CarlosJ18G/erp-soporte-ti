'use strict';

const { Prisma } = require('@prisma/client');

/**
 * Middleware para rutas no encontradas (404).
 * Debe registrarse ANTES de errorHandler y DESPUÉS de todas las rutas.
 */
const notFound = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Ruta '${req.method} ${req.originalUrl}' no encontrada.`,
  });
};

/**
 * Middleware global de manejo de errores.
 * Centraliza todas las respuestas de error de la aplicación.
 * Debe tener 4 parámetros para que Express lo reconozca como error handler.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log del error (en producción usar un logger como winston/pino)
  console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
    message: err.message,
    code: err.code,
  });

  // ── Errores de Prisma ──────────────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      // Violación de restricción única
      case 'P2002': {
        const field = err.meta?.target?.[0] ?? 'campo';
        return res.status(409).json({
          success: false,
          message: `Ya existe un registro con ese valor en el campo '${field}'.`,
        });
      }
      // Registro no encontrado al actualizar/eliminar
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'El registro no existe o ya fue eliminado.',
        });
      // Foreign key inválida
      case 'P2003':
        return res.status(400).json({
          success: false,
          message: 'La referencia a un recurso relacionado no es válida.',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Error en la operación de base de datos.',
          code: err.code,
        });
    }
  }

  // Prisma: error de validación del cliente (tipos incorrectos, etc.)
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: process.env.NODE_ENV === 'production'
        ? 'Los datos enviados no tienen el formato esperado.'
        : err.message,
    });
  }

  // ── Errores de JWT ─────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token inválido.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'El token ha expirado.' });
  }

  // ── JSON malformado ────────────────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON malformado en el cuerpo de la solicitud.' });
  }

  // ── Error HTTP con statusCode explícito ───────────────────────────────────
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // ── Error interno del servidor (500) ──────────────────────────────────────
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor.'
      : err.message,
  });
};

/**
 * Helper: crea un error HTTP con código de estado personalizado.
 * Uso: throw createHttpError(400, 'Mensaje de error');
 */
const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { notFound, errorHandler, createHttpError };
