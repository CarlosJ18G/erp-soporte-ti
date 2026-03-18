'use strict';

const { Router }          = require('express');
const { body, validationResult } = require('express-validator');
const { login }           = require('../controllers/technician.controller');

const router = Router();

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

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .notEmpty().withMessage('El email es requerido.')
      .isEmail().withMessage('Debe ser un email válido.')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('La contraseña es requerida.'),
    validate,
  ],
  login
);

module.exports = router;
