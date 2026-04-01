'use strict';

const { Router }                                              = require('express');
const { body, param, query, validationResult }               = require('express-validator');
const { getAll, getById, create, update, updateStatus, remove } = require('../controllers/serviceOrder.controller');
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
const ESTADOS = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'];
const TIPOS   = [
  'DIAGNOSTICO', 'REPARACION', 'INSTALACION', 'CONFIGURACION', 'MANTENIMIENTO', 'CONSULTA', 'OTRO',
  'CORRECTIVO', 'PREVENTIVO', 'CONSULTORIA',
];

// ─── Reglas reutilizables ─────────────────────────────────────────────────────
const uuidParam = param('id')
  .isUUID().withMessage('El parámetro id debe ser un UUID válido.');

const bodyRules = {
  descripcion:   body('descripcion').optional({ nullable: true }).trim(),
  tipo:          body('tipo').optional()
                              .isIn(TIPOS).withMessage(`Tipo inválido. Valores: ${TIPOS.join(', ')}.`),
  fechaInicio:   body('fechaInicio').optional({ nullable: true })
                                     .isISO8601().withMessage('fechaInicio debe ser formato ISO 8601.'),
  fechaFin:      body('fechaFin').optional({ nullable: true })
                                  .isISO8601().withMessage('fechaFin debe ser formato ISO 8601.'),
  costoFinal:    body('costoFinal').optional({ nullable: true })
                                    .isFloat({ min: 0 }).withMessage('costoFinal debe ser un número positivo.'),
  notas:         body('notas').optional({ nullable: true }).trim(),
  ticketId:      body('ticketId').notEmpty().withMessage('El ticketId es requerido.')
                                  .isUUID().withMessage('El ticketId debe ser un UUID válido.'),
  tecnicoId:     body('tecnicoId').notEmpty().withMessage('El tecnicoId es requerido.')
                                   .isUUID().withMessage('El tecnicoId debe ser un UUID válido.'),
};

// ─── Rutas ────────────────────────────────────────────────────────────────────

// GET /api/service-orders?estado=&tipo=&tecnicoId=
router.get(
  '/',
  [
    query('estado').optional().isIn(ESTADOS).withMessage('estado inválido.'),
    query('tipo').optional().isIn(TIPOS).withMessage('tipo inválido.'),
    query('tecnicoId').optional().isUUID().withMessage('tecnicoId debe ser un UUID válido.'),
    validate,
  ],
  getAll,
);

// GET /api/service-orders/:id  (incluye WorkLogs)
router.get('/:id', [uuidParam, validate], getById);

// POST /api/service-orders
router.post(
  '/',
  [
    bodyRules.descripcion,
    bodyRules.tipo,
    bodyRules.notas,
    bodyRules.ticketId,
    body('tecnicoId').optional().isUUID().withMessage('El tecnicoId debe ser un UUID válido.'),
    validate,
  ],
  create,
);

// PUT /api/service-orders/:id
router.put(
  '/:id',
  [
    uuidParam,
    bodyRules.descripcion,
    bodyRules.tipo,
    bodyRules.fechaInicio,
    bodyRules.fechaFin,
    bodyRules.costoFinal,
    bodyRules.notas,
    body('tecnicoId').optional().isUUID().withMessage('tecnicoId debe ser un UUID válido.'),
    validate,
  ],
  update,
);

// PATCH /api/service-orders/:id/status
router.patch(
  '/:id/status',
  [
    uuidParam,
    body('estado').notEmpty().withMessage('El estado es requerido.')
                  .isIn(ESTADOS).withMessage(`Estado inválido. Valores: ${ESTADOS.join(', ')}.`),
    body('repuestos').optional().isArray().withMessage('repuestos debe ser un arreglo.'),
    body('repuestos.*.repuestoId').optional().isUUID().withMessage('repuestos.repuestoId debe ser un UUID válido.'),
    body('repuestos.*.cantidad').optional().isInt({ min: 1 }).withMessage('repuestos.cantidad debe ser un entero mayor a 0.'),
    validate,
  ],
  updateStatus,
);

// DELETE /api/service-orders/:id
router.delete('/:id', [uuidParam, validate], remove);

module.exports = router;
