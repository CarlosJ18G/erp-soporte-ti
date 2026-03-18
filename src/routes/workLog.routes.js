'use strict';

const { Router }                                  = require('express');
const { body, param, query, validationResult }    = require('express-validator');
const { getAll, getById, create, update, remove } = require('../controllers/workLog.controller');
const { authenticate }                            = require('../middlewares/auth.middleware');

const router = Router();

router.use(authenticate);

// ─── Middleware de validación ─────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación.',
      errors:  errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ─── Valores permitidos ───────────────────────────────────────────────────────
const ACTIVIDADES = ['DIAGNOSTICO', 'REPARACION', 'INSTALACION', 'CONFIGURACION', 'MANTENIMIENTO', 'CONSULTA', 'OTRO'];

// ─── Reglas reutilizables ─────────────────────────────────────────────────────
const uuidParam = param('id')
  .isUUID().withMessage('El parámetro id debe ser un UUID válido.');

const bodyRules = {
  descripcion:     body('descripcion').trim().notEmpty().withMessage('La descripción es requerida.'),
  horasTrabajadas: body('horasTrabajadas')
                     .notEmpty().withMessage('Las horas trabajadas son requeridas.')
                     .isFloat({ min: 0.01, max: 24 })
                     .withMessage('Las horas trabajadas deben estar entre 0.01 y 24.'),
  fecha:           body('fecha')
                     .notEmpty().withMessage('La fecha es requerida.')
                     .isISO8601().withMessage('La fecha debe tener formato ISO 8601 (YYYY-MM-DD).'),
  tipoActividad:   body('tipoActividad').optional()
                                         .isIn(ACTIVIDADES)
                                         .withMessage(`Tipo de actividad inválido. Valores: ${ACTIVIDADES.join(', ')}.`),
  interno:         body('interno').optional()
                                   .isBoolean().withMessage('El campo interno debe ser true o false.'),
  ordenServicioId: body('ordenServicioId')
                     .notEmpty().withMessage('El ordenServicioId es requerido.')
                     .isUUID().withMessage('El ordenServicioId debe ser un UUID válido.'),
  tecnicoId:       body('tecnicoId').optional()
                                     .isUUID().withMessage('El tecnicoId debe ser un UUID válido.'),
};

// ─── Rutas ────────────────────────────────────────────────────────────────────

// GET /api/work-logs?ordenServicioId=&tecnicoId=&fecha=
router.get(
  '/',
  [
    query('ordenServicioId').optional().isUUID().withMessage('ordenServicioId debe ser un UUID válido.'),
    query('tecnicoId').optional().isUUID().withMessage('tecnicoId debe ser un UUID válido.'),
    query('fecha').optional().isISO8601().withMessage('fecha debe tener formato ISO 8601 (YYYY-MM-DD).'),
    validate,
  ],
  getAll,
);

// GET /api/work-logs/:id
router.get('/:id', [uuidParam, validate], getById);

// POST /api/work-logs
router.post(
  '/',
  [
    bodyRules.descripcion,
    bodyRules.horasTrabajadas,
    bodyRules.fecha,
    bodyRules.tipoActividad,
    bodyRules.interno,
    bodyRules.ordenServicioId,
    bodyRules.tecnicoId,
    validate,
  ],
  create,
);

// PUT /api/work-logs/:id
router.put(
  '/:id',
  [
    uuidParam,
    bodyRules.descripcion.optional(),
    body('horasTrabajadas').optional()
                            .isFloat({ min: 0.01, max: 24 })
                            .withMessage('Las horas trabajadas deben estar entre 0.01 y 24.'),
    body('fecha').optional().isISO8601().withMessage('La fecha debe tener formato ISO 8601 (YYYY-MM-DD).'),
    bodyRules.tipoActividad,
    bodyRules.interno,
    validate,
  ],
  update,
);

// DELETE /api/work-logs/:id
router.delete('/:id', [uuidParam, validate], remove);

module.exports = router;
