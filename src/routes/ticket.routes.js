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
  clienteId:         body('clienteId').custom((value, { req }) => {
                                       if (req.user?.type === 'CLIENT') return true;
                                       if (!value) throw new Error('El clienteId es requerido.');
                                       const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                                       if (!uuidRegex.test(String(value))) {
                                         throw new Error('El clienteId debe ser un UUID válido.');
                                       }
                                       return true;
                                     }),
  activoId:          body('activoId').optional({ nullable: true })
                                      .isUUID().withMessage('El activoId debe ser un UUID válido.'),
  cantidadActivosAfectados: body('cantidadActivosAfectados').optional({ nullable: true })
                             .isInt({ min: 1 }).withMessage('cantidadActivosAfectados debe ser un entero mayor o igual a 1.'),
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
    bodyRules.cantidadActivosAfectados,
    body('cantidadActivosAfectados').custom((value, { req }) => {
      if (value === undefined || value === null || value === '') return true;
      if (!req.body.activoId) {
        throw new Error('Debe seleccionar un activo para indicar cantidad de activos afectados.');
      }
      return true;
    }),
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
    bodyRules.cantidadActivosAfectados,
    body('cantidadActivosAfectados').custom((value, { req }) => {
      if (value === undefined || value === null || value === '') return true;
      if (!req.body.activoId) {
        throw new Error('Debe seleccionar un activo para indicar cantidad de activos afectados.');
      }
      return true;
    }),
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
    body('activoEstadoFinal').optional()
      .isIn(['OPERATIVO', 'DADO_DE_BAJA']).withMessage('activoEstadoFinal inválido. Valores: OPERATIVO, DADO_DE_BAJA.'),
    body('activoFueReemplazado').optional().isBoolean().withMessage('activoFueReemplazado debe ser booleano.').toBoolean(),
    body('activosFinalizacion').optional().isArray({ min: 1 }).withMessage('activosFinalizacion debe ser un arreglo con al menos un elemento.'),
    body('activosFinalizacion.*.estadoFinal').optional()
      .isIn(['OPERATIVO', 'DADO_DE_BAJA']).withMessage('estadoFinal inválido. Valores: OPERATIVO, DADO_DE_BAJA.'),
    body('activosFinalizacion.*.fueReemplazado').optional().isBoolean().withMessage('fueReemplazado debe ser booleano.').toBoolean(),
    body('activosFinalizacion.*.reemplazoTipo').optional()
      .isIn(['IGUAL', 'DIFERENTE']).withMessage('reemplazoTipo inválido. Valores: IGUAL, DIFERENTE.'),
    body('activosFinalizacion.*.activoReemplazo.nombre').optional().trim().isLength({ min: 2, max: 120 }).withMessage('activoReemplazo.nombre inválido.'),
    body('activosFinalizacion.*.activoReemplazo.tipo').optional()
      .isIn(['COMPUTADORA','LAPTOP','SERVIDOR','IMPRESORA','UPS','SWITCH','ROUTER','FIREWALL','OTRO'])
      .withMessage('activoReemplazo.tipo inválido.'),
    body('activosFinalizacion.*.activoReemplazo.marca').optional({ nullable: true }).trim().isLength({ max: 80 }).withMessage('activoReemplazo.marca inválida.'),
    body('activosFinalizacion.*.activoReemplazo.modelo').optional({ nullable: true }).trim().isLength({ max: 120 }).withMessage('activoReemplazo.modelo inválido.'),
    body('activosFinalizacion.*.activoReemplazo.numeroSerie').optional().trim().isLength({ min: 4, max: 120 }).withMessage('activoReemplazo.numeroSerie inválido.'),
    body('activosFinalizacion.*.activoReemplazo.descripcion').optional({ nullable: true }).trim().isLength({ max: 500 }).withMessage('activoReemplazo.descripcion inválida.'),
    body('repuestos').optional().isArray().withMessage('repuestos debe ser un arreglo.'),
    body('repuestos.*.repuestoId').optional().isUUID().withMessage('repuestoId debe ser un UUID válido.'),
    body('repuestos.*.cantidad').optional().isInt({ min: 1 }).withMessage('cantidad debe ser un entero mayor o igual a 1.'),
    body('notaFinalizacion').optional().trim().isLength({ max: 2000 }).withMessage('notaFinalizacion no puede exceder 2000 caracteres.'),
    validate,
  ],
  updateStatus,
);

// DELETE /api/tickets/:id
router.delete('/:id', [uuidParam, validate], remove);

module.exports = router;
