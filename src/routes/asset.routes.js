'use strict';

const { Router }                                  = require('express');
const { body, param, query, validationResult }    = require('express-validator');
const { getAll, getById, create, update, remove } = require('../controllers/asset.controller');
const { authenticate }                            = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de activos requieren autenticación
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

// ─── Reglas reutilizables ─────────────────────────────────────────────────────
const uuidParam = param('id')
  .isUUID().withMessage('El parámetro id debe ser un UUID válido.');

const TIPOS_VALIDOS  = ['COMPUTADORA', 'LAPTOP', 'SERVIDOR', 'IMPRESORA', 'UPS', 'SWITCH', 'ROUTER', 'FIREWALL', 'OTRO'];
const ESTADOS_VALIDOS = ['OPERATIVO', 'EN_REPARACION', 'DADO_DE_BAJA'];

const bodyRules = {
  nombre:          body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
                                  .isLength({ max: 150 }).withMessage('Máximo 150 caracteres.'),
  tipo:            body('tipo').notEmpty().withMessage('El tipo es requerido.')
                                .isIn(TIPOS_VALIDOS).withMessage(`Tipo inválido. Valores: ${TIPOS_VALIDOS.join(', ')}.`),
  marca:           body('marca').optional({ nullable: true }).trim()
                                 .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  modelo:          body('modelo').optional({ nullable: true }).trim()
                                  .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  numeroSerie:     body('numeroSerie').optional({ nullable: true }).trim()
                                      .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  descripcion:     body('descripcion').optional({ nullable: true }).trim(),
  fechaAdquisicion: body('fechaAdquisicion').optional({ nullable: true })
                                             .isISO8601().withMessage('La fecha debe tener formato ISO 8601 (YYYY-MM-DD).'),
  estado:          body('estado').optional()
                                  .isIn(ESTADOS_VALIDOS).withMessage(`Estado inválido. Valores: ${ESTADOS_VALIDOS.join(', ')}.`),
  empresa:         body('empresa').trim().notEmpty().withMessage('La empresa es requerida.')
                                  .isLength({ max: 150 }).withMessage('Máximo 150 caracteres.'),
  cantidad:        body('cantidad').notEmpty().withMessage('La cantidad es requerida.')
                                   .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero mayor o igual a 1.'),
};

// ─── Rutas ────────────────────────────────────────────────────────────────────

// GET /api/assets?empresa=&tipo=&estado=
router.get(
  '/',
  [
    query('empresa').optional().trim().isLength({ max: 150 }).withMessage('empresa inválida.'),
    query('tipo').optional().isIn(TIPOS_VALIDOS).withMessage('tipo inválido.'),
    query('estado').optional().isIn(ESTADOS_VALIDOS).withMessage('estado inválido.'),
    validate,
  ],
  getAll,
);

// GET /api/assets/:id
router.get('/:id', [uuidParam, validate], getById);

// POST /api/assets
router.post(
  '/',
  [
    bodyRules.nombre,
    bodyRules.tipo,
    bodyRules.marca,
    bodyRules.modelo,
    bodyRules.numeroSerie,
    bodyRules.descripcion,
    bodyRules.fechaAdquisicion,
    bodyRules.empresa,
    bodyRules.cantidad,
    validate,
  ],
  create,
);

// PUT /api/assets/:id
router.put(
  '/:id',
  [
    uuidParam,
    bodyRules.nombre.optional(),
    bodyRules.tipo.optional(),
    bodyRules.marca,
    bodyRules.modelo,
    bodyRules.numeroSerie,
    bodyRules.descripcion,
    bodyRules.fechaAdquisicion,
    bodyRules.estado,
    body('empresa').optional().trim().isLength({ max: 150 }).withMessage('Máximo 150 caracteres.'),
    body('cantidad').optional().isInt({ min: 1 }).withMessage('La cantidad debe ser un entero mayor o igual a 1.'),
    validate,
  ],
  update,
);

// DELETE /api/assets/:id
router.delete('/:id', [uuidParam, validate], remove);

module.exports = router;
