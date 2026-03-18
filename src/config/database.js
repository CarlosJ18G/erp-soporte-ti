'use strict';

const { PrismaClient } = require('@prisma/client');

// Singleton: una única instancia de PrismaClient en toda la aplicación.
// Evita agotar el pool de conexiones en entornos de desarrollo con hot-reload.
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // En desarrollo, reutilizar la instancia guardada en global para evitar
  // múltiples instancias con nodemon.
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
