'use strict';

const { Router }                                  = require('express');
const { body, param, validationResult }           = require('express-validator');
const { getAll, getById, create, update, remove } = require('../controllers/client.controller');

const router = Router();

// ─── Middleware para interceptar errores de validación ────────────────────────
// Se aplica después de las reglas de cada ruta.
// Si hay errores, responde 422 con el detalle sin llegar al controller.
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
  .isUUID()
  .withMessage('El parámetro id debe ser un UUID válido.');

const bodyRules = {
  nombre:   body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
                           .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  apellido: body('apellido').trim().notEmpty().withMessage('El apellido es requerido.')
                             .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  email:    body('email').trim().notEmpty().withMessage('El email es requerido.')
                          .isEmail().withMessage('Debe ser un email válido.')
                          .normalizeEmail(),
  telefono: body('telefono').optional({ nullable: true })
                             .trim()
                             .isLength({ max: 20 }).withMessage('Máximo 20 caracteres.'),
  empresa:  body('empresa').optional({ nullable: true })
                            .trim()
                            .isLength({ max: 150 }).withMessage('Máximo 150 caracteres.'),
  direccion: body('direccion').optional({ nullable: true }).trim(),
};

// ─── Rutas ────────────────────────────────────────────────────────────────────

// GET /api/clients
router.get('/', getAll);

// GET /api/clients/:id
router.get(
  '/:id',
  [uuidParam, validate],
  getById
);

// POST /api/clients
router.post(
  '/',
  [
    bodyRules.nombre,
    bodyRules.apellido,
    bodyRules.email,
    bodyRules.telefono,
    bodyRules.empresa,
    bodyRules.direccion,
    validate,
  ],
  create
);

// PUT /api/clients/:id
router.put(
  '/:id',
  [
    uuidParam,
    bodyRules.nombre.optional(),
    bodyRules.apellido.optional(),
    bodyRules.email.optional(),
    bodyRules.telefono,
    bodyRules.empresa,
    bodyRules.direccion,
    validate,
  ],
  update
);

// DELETE /api/clients/:id
router.delete(
  '/:id',
  [uuidParam, validate],
  remove
);

module.exports = router;
