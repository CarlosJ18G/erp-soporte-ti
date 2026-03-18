'use strict';

const { Router }                                       = require('express');
const { body, param, validationResult }                = require('express-validator');
const { getAll, getById, create, update, remove }      = require('../controllers/technician.controller');
const { authenticate, isAdmin }                        = require('../middlewares/auth.middleware');

const router = Router();

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

const bodyRules = {
  nombre:       body('nombre').trim().notEmpty().withMessage('El nombre es requerido.')
                               .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  apellido:     body('apellido').trim().notEmpty().withMessage('El apellido es requerido.')
                                 .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  email:        body('email').trim().notEmpty().withMessage('El email es requerido.')
                              .isEmail().withMessage('Debe ser un email válido.')
                              .normalizeEmail(),
  password:     body('password').notEmpty().withMessage('La contraseña es requerida.')
                                 .isLength({ min: 8 }).withMessage('Mínimo 8 caracteres.'),
  telefono:     body('telefono').optional({ nullable: true }).trim()
                                 .isLength({ max: 20 }).withMessage('Máximo 20 caracteres.'),
  especialidad: body('especialidad').optional({ nullable: true }).trim()
                                     .isLength({ max: 100 }).withMessage('Máximo 100 caracteres.'),
  rol:          body('rol').optional()
                            .isIn(['ADMIN', 'TECNICO']).withMessage("El rol debe ser 'ADMIN' o 'TECNICO'."),
};

// ─── Todas las rutas requieren autenticación ──────────────────────────────────
router.use(authenticate);

// GET /api/technicians
router.get('/', getAll);

// GET /api/technicians/:id
router.get('/:id', [uuidParam, validate], getById);

// POST /api/technicians  — solo ADMIN
router.post(
  '/',
  isAdmin,
  [
    bodyRules.nombre,
    bodyRules.apellido,
    bodyRules.email,
    bodyRules.password,
    bodyRules.telefono,
    bodyRules.especialidad,
    bodyRules.rol,
    validate,
  ],
  create
);

// PUT /api/technicians/:id  — solo ADMIN
router.put(
  '/:id',
  isAdmin,
  [
    uuidParam,
    bodyRules.nombre.optional(),
    bodyRules.apellido.optional(),
    bodyRules.email.optional(),
    body('password').optional().isLength({ min: 8 }).withMessage('Mínimo 8 caracteres.'),
    bodyRules.telefono,
    bodyRules.especialidad,
    bodyRules.rol,
    validate,
  ],
  update
);

// DELETE /api/technicians/:id  — solo ADMIN
router.delete('/:id', isAdmin, [uuidParam, validate], remove);

module.exports = router;
