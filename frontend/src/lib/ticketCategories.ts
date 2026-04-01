export interface TicketCategoryOption {
  value: string;
  label: string;
  description: string;
}

export const SERVICE_ORDER_ACTIVITY_OPTIONS = [
  { value: 'DIAGNOSTICO', label: 'Diagnostico' },
  { value: 'REPARACION', label: 'Reparacion' },
  { value: 'INSTALACION', label: 'Instalacion' },
  { value: 'CONFIGURACION', label: 'Configuracion' },
  { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'OTRO', label: 'Otro' },
] as const;

// Catalogo unico de categorias para tickets en toda la app.
export const TICKET_CATEGORIES: TicketCategoryOption[] = [
  {
    value: 'SOPORTE_HARDWARE',
    label: 'Soporte Hardware',
    description: 'Fallas fisicas de equipos: no enciende, pantalla, teclado, disco, memoria, sobrecalentamiento o piezas danadas.',
  },
  {
    value: 'SOPORTE_SOFTWARE',
    label: 'Soporte Software',
    description: 'Errores de aplicaciones, instalacion de programas, actualizaciones, licencias o problemas de configuracion.',
  },
  {
    value: 'REDES_Y_CONECTIVIDAD',
    label: 'Redes y Conectividad',
    description: 'Problemas de internet, Wi-Fi, red local, router, switch, caidas de enlace o baja conectividad.',
  },
  {
    value: 'SERVIDORES',
    label: 'Servidores',
    description: 'Incidencias en servidores fisicos o virtuales, dominio, servicios caidos, rendimiento o accesos.',
  },
  {
    value: 'BASES_DE_DATOS',
    label: 'Bases de Datos',
    description: 'Errores SQL, lentitud en consultas, conexiones a base de datos, respaldos o restauraciones.',
  },
  {
    value: 'SEGURIDAD_INFORMATICA',
    label: 'Seguridad Informatica',
    description: 'Eventos de seguridad: malware, accesos sospechosos, alertas de firewall o vulnerabilidades.',
  },
  {
    value: 'SISTEMAS_OPERATIVOS',
    label: 'Sistemas Operativos',
    description: 'Problemas de arranque, fallas de Windows/Linux, actualizaciones del sistema y configuraciones del SO.',
  },
  {
    value: 'CORREO_Y_COLABORACION',
    label: 'Correo y Colaboracion',
    description: 'Incidencias en correo corporativo, calendario, videollamadas, Teams u otras herramientas colaborativas.',
  },
  {
    value: 'MESA_DE_AYUDA',
    label: 'Mesa de Ayuda',
    description: 'Solicitudes generales de soporte que no encajan en otra categoria o requieren orientacion inicial.',
  },
  {
    value: 'TELEFONIA_IP',
    label: 'Telefonia IP',
    description: 'Problemas en extension telefonica, PBX, VoIP, calidad de llamadas o registro de dispositivos.',
  },
];
