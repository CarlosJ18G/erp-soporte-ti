'use strict';

const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middlewares/auth.middleware');
const { getAll, getById, create, update, remove } = require('../controllers/sparePart.controller');

const router = Router();

router.use(authenticate);

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Error de validación.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const uuidParam = param('id').isUUID().withMessage('El parámetro id debe ser un UUID válido.');

const bodyRules = {
  codigo: body('codigo').trim().notEmpty().withMessage('El código es requerido.'),
  nombre: body('nombre').trim().notEmpty().withMessage('El nombre es requerido.'),
  descripcion: body('descripcion').optional({ nullable: true }).trim(),
  precio: body('precio').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo.'),
  stock: body('stock').optional().isInt({ min: 0 }).withMessage('El stock debe ser un entero >= 0.'),
  stockMinimo: body('stockMinimo').optional().isInt({ min: 0 }).withMessage('stockMinimo debe ser un entero >= 0.'),
  activo: body('activo').optional().isBoolean().withMessage('activo debe ser booleano.'),
};

router.get(
  '/',
  [query('lowStock').optional().isBoolean().withMessage('lowStock debe ser booleano.'), validate],
  getAll,
);

router.get('/:id', [uuidParam, validate], getById);

router.post(
  '/',
  [
    bodyRules.codigo,
    bodyRules.nombre,
    bodyRules.descripcion,
    bodyRules.precio,
    bodyRules.stock,
    bodyRules.stockMinimo,
    bodyRules.activo,
    validate,
  ],
  create,
);

router.put(
  '/:id',
  [
    uuidParam,
    body('codigo').optional().trim().notEmpty().withMessage('El código no puede estar vacío.'),
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío.'),
    bodyRules.descripcion,
    body('precio').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo.'),
    bodyRules.stock,
    bodyRules.stockMinimo,
    bodyRules.activo,
    validate,
  ],
  update,
);

router.delete('/:id', [uuidParam, validate], remove);

module.exports = router;
