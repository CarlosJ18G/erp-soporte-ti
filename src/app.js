'use strict';

const { errorHandler, notFound } = require('./middlewares/error.middleware');

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const app = express();

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API operativa.',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ─── Rutas de la API ──────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/clients',     require('./routes/client.routes'));
app.use('/api/technicians', require('./routes/technician.routes'));
app.use('/api/assets',      require('./routes/asset.routes'));
app.use('/api/tickets',        require('./routes/ticket.routes'));
app.use('/api/service-orders', require('./routes/serviceOrder.routes'));
app.use('/api/work-logs',      require('./routes/workLog.routes'));

// ─── Manejo de errores (debe ir al final) ─────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
