'use strict';

require('dotenv').config();
const prisma = require('../src/config/database');

const PARTS = [
  // COMPUTADORA
  { codigo: 'PC-SSD-256', nombre: 'SSD SATA 2.5 256GB', precio: 35.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con COMPUTADORA y LAPTOP' },
  { codigo: 'PC-SSD-512', nombre: 'SSD SATA 2.5 512GB', precio: 58.0, stock: 15, stockMinimo: 4, descripcion: 'Compatible con COMPUTADORA y LAPTOP' },
  { codigo: 'PC-RAM-DDR4-8', nombre: 'Memoria RAM DDR4 8GB', precio: 28.0, stock: 30, stockMinimo: 8, descripcion: 'Compatible con COMPUTADORA' },
  { codigo: 'PC-RAM-DDR4-16', nombre: 'Memoria RAM DDR4 16GB', precio: 52.0, stock: 20, stockMinimo: 6, descripcion: 'Compatible con COMPUTADORA' },
  { codigo: 'PC-PSU-500W', nombre: 'Fuente de poder 500W', precio: 42.0, stock: 10, stockMinimo: 3, descripcion: 'Compatible con COMPUTADORA' },
  { codigo: 'PC-FAN-120', nombre: 'Ventilador gabinete 120mm', precio: 9.0, stock: 40, stockMinimo: 10, descripcion: 'Compatible con COMPUTADORA' },
  { codigo: 'PC-CPU-COOLER', nombre: 'Disipador de CPU universal', precio: 18.0, stock: 12, stockMinimo: 4, descripcion: 'Compatible con COMPUTADORA' },
  { codigo: 'PC-MB-H610', nombre: 'Tarjeta madre H610', precio: 95.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con COMPUTADORA' },

  // LAPTOP
  { codigo: 'LT-BAT-45WH', nombre: 'Bateria laptop 45Wh', precio: 44.0, stock: 16, stockMinimo: 4, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-BAT-60WH', nombre: 'Bateria laptop 60Wh', precio: 55.0, stock: 12, stockMinimo: 3, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-KB-14', nombre: 'Teclado laptop 14 pulgadas', precio: 24.0, stock: 14, stockMinimo: 4, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-KB-15', nombre: 'Teclado laptop 15.6 pulgadas', precio: 27.0, stock: 14, stockMinimo: 4, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-SCR-14', nombre: 'Pantalla laptop 14 pulgadas', precio: 89.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-SCR-156', nombre: 'Pantalla laptop 15.6 pulgadas', precio: 104.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-DC-JACK', nombre: 'Conector de carga DC Jack', precio: 7.0, stock: 25, stockMinimo: 6, descripcion: 'Compatible con LAPTOP' },
  { codigo: 'LT-HINGE-SET', nombre: 'Juego de bisagras laptop', precio: 16.0, stock: 10, stockMinimo: 3, descripcion: 'Compatible con LAPTOP' },

  // SERVIDOR
  { codigo: 'SV-RAM-ECC-16', nombre: 'Memoria RAM ECC 16GB', precio: 78.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-RAM-ECC-32', nombre: 'Memoria RAM ECC 32GB', precio: 145.0, stock: 10, stockMinimo: 3, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-SSD-960', nombre: 'SSD Enterprise 960GB', precio: 175.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-HDD-2TB', nombre: 'HDD Nearline 2TB', precio: 82.0, stock: 12, stockMinimo: 3, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-RAID-BAT', nombre: 'Bateria controladora RAID', precio: 38.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-PSU-750W', nombre: 'Fuente redundante 750W', precio: 130.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-FAN-HOTSWAP', nombre: 'Ventilador hot-swap servidor', precio: 25.0, stock: 14, stockMinimo: 4, descripcion: 'Compatible con SERVIDOR' },
  { codigo: 'SV-NIC-10G', nombre: 'Tarjeta de red 10GbE', precio: 120.0, stock: 6, stockMinimo: 2, descripcion: 'Compatible con SERVIDOR' },

  // IMPRESORA
  { codigo: 'PR-TONER-BK', nombre: 'Toner negro estandar', precio: 48.0, stock: 30, stockMinimo: 8, descripcion: 'Compatible con IMPRESORA LASER' },
  { codigo: 'PR-TONER-C', nombre: 'Toner cian estandar', precio: 55.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con IMPRESORA LASER' },
  { codigo: 'PR-TONER-M', nombre: 'Toner magenta estandar', precio: 55.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con IMPRESORA LASER' },
  { codigo: 'PR-TONER-Y', nombre: 'Toner amarillo estandar', precio: 55.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con IMPRESORA LASER' },
  { codigo: 'PR-DRUM-UNIT', nombre: 'Unidad de tambor', precio: 79.0, stock: 12, stockMinimo: 3, descripcion: 'Compatible con IMPRESORA' },
  { codigo: 'PR-FUSER-220', nombre: 'Unidad fusora 220V', precio: 110.0, stock: 7, stockMinimo: 2, descripcion: 'Compatible con IMPRESORA LASER' },
  { codigo: 'PR-ROLLER-PICK', nombre: 'Rodillo de arrastre papel', precio: 12.0, stock: 25, stockMinimo: 6, descripcion: 'Compatible con IMPRESORA' },
  { codigo: 'PR-MAINT-KIT', nombre: 'Kit de mantenimiento impresora', precio: 95.0, stock: 9, stockMinimo: 3, descripcion: 'Compatible con IMPRESORA' },

  // UPS
  { codigo: 'UPS-BAT-12V7AH', nombre: 'Bateria UPS 12V 7Ah', precio: 22.0, stock: 35, stockMinimo: 10, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-BAT-12V9AH', nombre: 'Bateria UPS 12V 9Ah', precio: 28.0, stock: 25, stockMinimo: 7, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-BAT-12V12AH', nombre: 'Bateria UPS 12V 12Ah', precio: 35.0, stock: 20, stockMinimo: 6, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-FAN-80', nombre: 'Ventilador UPS 80mm', precio: 8.0, stock: 18, stockMinimo: 5, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-FUSE-10A', nombre: 'Fusible UPS 10A', precio: 3.0, stock: 60, stockMinimo: 20, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-FUSE-15A', nombre: 'Fusible UPS 15A', precio: 3.5, stock: 55, stockMinimo: 20, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-RELAY-12V', nombre: 'Rele UPS 12V', precio: 6.0, stock: 22, stockMinimo: 6, descripcion: 'Compatible con UPS' },
  { codigo: 'UPS-CHARGER-MOD', nombre: 'Modulo cargador UPS', precio: 42.0, stock: 10, stockMinimo: 3, descripcion: 'Compatible con UPS' },

  // SWITCH
  { codigo: 'SW-PSU-54V', nombre: 'Fuente switch 54V', precio: 65.0, stock: 12, stockMinimo: 3, descripcion: 'Compatible con SWITCH' },
  { codigo: 'SW-FAN-40', nombre: 'Ventilador switch 40mm', precio: 7.0, stock: 30, stockMinimo: 8, descripcion: 'Compatible con SWITCH' },
  { codigo: 'SW-SFP-1G-SX', nombre: 'Modulo SFP 1G SX', precio: 24.0, stock: 25, stockMinimo: 6, descripcion: 'Compatible con SWITCH y ROUTER' },
  { codigo: 'SW-SFP-1G-LX', nombre: 'Modulo SFP 1G LX', precio: 29.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con SWITCH y ROUTER' },
  { codigo: 'SW-SFP-10G-SR', nombre: 'Modulo SFP+ 10G SR', precio: 54.0, stock: 14, stockMinimo: 4, descripcion: 'Compatible con SWITCH y ROUTER' },
  { codigo: 'SW-RJ45-PORT', nombre: 'Puerto RJ45 de reemplazo', precio: 5.0, stock: 40, stockMinimo: 10, descripcion: 'Compatible con SWITCH' },
  { codigo: 'SW-HEATSINK', nombre: 'Disipador para switch', precio: 11.0, stock: 15, stockMinimo: 4, descripcion: 'Compatible con SWITCH' },
  { codigo: 'SW-MGMT-BRD', nombre: 'Tarjeta de gestion switch', precio: 72.0, stock: 8, stockMinimo: 2, descripcion: 'Compatible con SWITCH' },

  // ROUTER
  { codigo: 'RTR-PSU-12V', nombre: 'Fuente router 12V', precio: 14.0, stock: 25, stockMinimo: 7, descripcion: 'Compatible con ROUTER' },
  { codigo: 'RTR-PSU-24V', nombre: 'Fuente router 24V', precio: 19.0, stock: 20, stockMinimo: 6, descripcion: 'Compatible con ROUTER' },
  { codigo: 'RTR-ANT-5DBI', nombre: 'Antena 5dBi', precio: 6.0, stock: 45, stockMinimo: 12, descripcion: 'Compatible con ROUTER inalambrico' },
  { codigo: 'RTR-ANT-8DBI', nombre: 'Antena 8dBi', precio: 9.0, stock: 35, stockMinimo: 10, descripcion: 'Compatible con ROUTER inalambrico' },
  { codigo: 'RTR-LTE-MOD', nombre: 'Modulo LTE router', precio: 85.0, stock: 9, stockMinimo: 3, descripcion: 'Compatible con ROUTER' },
  { codigo: 'RTR-SFP-1G', nombre: 'Modulo SFP 1G', precio: 24.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con ROUTER y SWITCH' },
  { codigo: 'RTR-FAN-40', nombre: 'Ventilador router 40mm', precio: 7.0, stock: 20, stockMinimo: 5, descripcion: 'Compatible con ROUTER' },
  { codigo: 'RTR-FLASH-16', nombre: 'Memoria flash 16GB', precio: 12.0, stock: 18, stockMinimo: 5, descripcion: 'Compatible con ROUTER' },

  // FIREWALL
  { codigo: 'FW-PSU-60W', nombre: 'Fuente firewall 60W', precio: 34.0, stock: 12, stockMinimo: 3, descripcion: 'Compatible con FIREWALL' },
  { codigo: 'FW-NIC-4PORT', nombre: 'Tarjeta NIC 4 puertos', precio: 95.0, stock: 10, stockMinimo: 3, descripcion: 'Compatible con FIREWALL' },
  { codigo: 'FW-SSD-128', nombre: 'SSD 128GB para firewall', precio: 22.0, stock: 16, stockMinimo: 4, descripcion: 'Compatible con FIREWALL' },
  { codigo: 'FW-RAM-8', nombre: 'Memoria RAM 8GB para firewall', precio: 26.0, stock: 16, stockMinimo: 4, descripcion: 'Compatible con FIREWALL' },
  { codigo: 'FW-RAM-16', nombre: 'Memoria RAM 16GB para firewall', precio: 49.0, stock: 12, stockMinimo: 3, descripcion: 'Compatible con FIREWALL' },
  { codigo: 'FW-FAN-40', nombre: 'Ventilador firewall 40mm', precio: 7.0, stock: 18, stockMinimo: 5, descripcion: 'Compatible con FIREWALL' },
  { codigo: 'FW-CMOS-BAT', nombre: 'Bateria CMOS CR2032', precio: 2.0, stock: 80, stockMinimo: 20, descripcion: 'Compatible con FIREWALL y SERVIDOR' },
  { codigo: 'FW-MAINT-KIT', nombre: 'Kit mantenimiento firewall', precio: 31.0, stock: 10, stockMinimo: 3, descripcion: 'Compatible con FIREWALL' },
];

const seedSpareParts = async () => {
  console.log('Iniciando carga de repuestos...');

  let created = 0;
  let updated = 0;

  for (const item of PARTS) {
    const exists = await prisma.sparePart.findUnique({ where: { codigo: item.codigo } });

    await prisma.sparePart.upsert({
      where: { codigo: item.codigo },
      update: {
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: item.precio,
        stock: item.stock,
        stockMinimo: item.stockMinimo,
        activo: true,
        deletedAt: null,
      },
      create: {
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: item.precio,
        stock: item.stock,
        stockMinimo: item.stockMinimo,
        activo: true,
      },
    });

    if (exists) updated += 1;
    else created += 1;
  }

  console.log('Carga de repuestos finalizada.');
  console.log(`Creados : ${created}`);
  console.log(`Actualizados : ${updated}`);
  console.log(`Total catalogo : ${PARTS.length}`);
};

seedSpareParts()
  .catch((error) => {
    console.error('Error cargando repuestos:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
