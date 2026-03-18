'use strict';

require('dotenv').config();
const app    = require('./app');
const prisma = require('./config/database');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    // Verificar conexión a la base de datos antes de levantar el servidor.
    await prisma.$connect();
    console.log('✔  Conexión a PostgreSQL establecida.');

    app.listen(PORT, () => {
      console.log(`✔  Servidor corriendo en http://localhost:${PORT}`);
      console.log(`   Entorno : ${process.env.NODE_ENV || 'development'}`);
      console.log(`   Health  : http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('✘  Error al iniciar el servidor:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Liberar conexiones al cerrar
process.on('SIGINT',  async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

start();
