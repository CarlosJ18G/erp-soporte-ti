'use strict';

const { Router }                                              = require('express');
const { body, param, query, validationResult }               = require('express-validator');
const { getAll, getById, create, update, updateStatus, remove } = require('../controllers/ticket.controller');
const { authenticate }                                        = require('../middlewares/auth.middleware');

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
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'];
const ESTADOS     = ['ABIERTO', 'EN_PROGRESO', 'EN_ESPERA', 'RESUELTO', 'CERRADO'];

// ─── Reglas reutilizables ─────────────────────────────────────────────────────
const uuidParam = param('id')
  .isUUID().withMessage('El parámetro id debe ser un UUID válido.');

const bodyRules = {
  titulo:      body('titulo').trim().notEmpty().withMessage('El título es requerido.')
                              .isLength({ max: 200 }).withMessage('Máximo 200 caracteres.'),
  descripcion: body('descripcion').trim().notEmpty().withMessage('La descripción es requerida.'),
  prioridad:   body('prioridad').optional()
                                 .isIn(PRIORIDADES).withMessage(`Prioridad inválida. Valores: ${PRIORIDADES.join(', ')}.`),
  estado:      body('estado').optional()
                               .isIn(ESTADOS).withMessage(`Estado inválido. Valores: ${ESTADOS.join(', ')}.`),
  categoria:   body('categoria').optional({ nullable: true }).trim()
                                  .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  fechaVencimiento: body('fechaVencimiento').optional({ nullable: true })
                                             .isISO8601().withMessage('La fecha debe tener formato ISO 8601.'),
  clienteId:         body('clienteId').notEmpty().withMessage('El clienteId es requerido.')
                                       .isUUID().withMessage('El clienteId debe ser un UUID válido.'),
  activoId:          body('activoId').optional({ nullable: true })
                                      .isUUID().withMessage('El activoId debe ser un UUID válido.'),
  tecnicoAsignadoId: body('tecnicoAsignadoId').optional({ nullable: true })
                                               .isUUID().withMessage('El tecnicoAsignadoId debe ser un UUID válido.'),
};

// ─── Rutas ────────────────────────────────────────────────────────────────────

// GET /api/tickets?estado=&prioridad=&clienteId=&tecnicoAsignadoId=
router.get(
  '/',
  [
    query('estado').optional().isIn(ESTADOS).withMessage('estado inválido.'),
    query('prioridad').optional().isIn(PRIORIDADES).withMessage('prioridad inválida.'),
    query('clienteId').optional().isUUID().withMessage('clienteId debe ser un UUID válido.'),
    query('tecnicoAsignadoId').optional().isUUID().withMessage('tecnicoAsignadoId debe ser un UUID válido.'),
    query('mostrarCerrados').optional().isBoolean().withMessage('mostrarCerrados debe ser booleano.'),
    validate,
  ],
  getAll,
);

// GET /api/tickets/:id
router.get('/:id', [uuidParam, validate], getById);

// POST /api/tickets
router.post(
  '/',
  [
    bodyRules.titulo,
    bodyRules.descripcion,
    bodyRules.prioridad,
    bodyRules.categoria,
    bodyRules.fechaVencimiento,
    bodyRules.clienteId,
    bodyRules.activoId,
    bodyRules.tecnicoAsignadoId,
    validate,
  ],
  create,
);

// PUT /api/tickets/:id
router.put(
  '/:id',
  [
    uuidParam,
    bodyRules.titulo.optional(),
    bodyRules.descripcion.optional(),
    bodyRules.prioridad,
    bodyRules.estado,
    bodyRules.categoria,
    bodyRules.fechaVencimiento,
    body('clienteId').optional().isUUID().withMessage('El clienteId debe ser un UUID válido.'),
    bodyRules.activoId,
    bodyRules.tecnicoAsignadoId,
    validate,
  ],
  update,
);

// PATCH /api/tickets/:id/status
router.patch(
  '/:id/status',
  [
    uuidParam,
    body('estado').notEmpty().withMessage('El estado es requerido.')
                  .isIn(ESTADOS).withMessage(`Estado inválido. Valores: ${ESTADOS.join(', ')}.`),
    validate,
  ],
  updateStatus,
);

// DELETE /api/tickets/:id
router.delete('/:id', [uuidParam, validate], remove);

module.exports = router;
