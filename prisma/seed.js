'use strict';

/**
 * Seed inicial: crea el técnico administrador por defecto.
 * Ejecutar con: npm run db:seed
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma  = require('../src/config/database');

const seed = async () => {
  console.log('Iniciando seed...');

  const email = 'admin@soporte.com';

  const existing = await prisma.technician.findFirst({ where: { email } });
  if (existing) {
    console.log(`El técnico '${email}' ya existe. Seed omitido.`);
    return;
  }

  const password = await bcrypt.hash('Admin1234!', 10);

  const admin = await prisma.technician.create({
    data: {
      nombre:       'Admin',
      apellido:     'Sistema',
      email,
      password,
      especialidad: 'Administración',
      rol:          'ADMIN',
    },
    select: {
      id:    true,
      email: true,
      rol:   true,
    },
  });

  console.log('✔  Técnico administrador creado:');
  console.log(`   Email    : ${admin.email}`);
  console.log(`   Password : Admin1234!`);
  console.log(`   Rol      : ${admin.rol}`);
};

seed()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
