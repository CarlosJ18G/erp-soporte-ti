'use strict';

const TicketModel         = require('../models/ticket.model');
const ServiceOrderModel   = require('../models/serviceOrder.model');
const ClientModel         = require('../models/client.model');
const AssetModel          = require('../models/asset.model');
const TechnicianModel     = require('../models/technician.model');
const prisma              = require('../config/database');
const { createHttpError } = require('../middlewares/error.middleware');
const { matchedData }     = require('express-validator');

const normalizeText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const includesAny = (text, keywords = []) => keywords.some((k) => text.includes(k));

const SPECIALTY_RULES = [
  { key: 'SOPORTE_HARDWARE', keywords: ['hardware', 'ram', 'disco', 'ssd', 'hdd', 'fuente', 'placa', 'pantalla', 'teclado', 'mouse', 'cpu', 'calienta', 'no enciende'] },
  { key: 'SOPORTE_SOFTWARE', keywords: ['software', 'instalar', 'error', 'aplicacion', 'programa', 'licencia', 'actualizacion'] },
  { key: 'REDES_Y_CONECTIVIDAD', keywords: ['red', 'internet', 'wifi', 'lan', 'conexion', 'conectividad', 'switch', 'router'] },
  { key: 'SERVIDORES', keywords: ['servidor', 'dominio', 'vm', 'virtual', 'hyper-v', 'backup server'] },
  { key: 'BASES_DE_DATOS', keywords: ['base de datos', 'sql', 'postgres', 'mysql', 'consulta', 'db'] },
  { key: 'SEGURIDAD_INFORMATICA', keywords: ['seguridad', 'virus', 'malware', 'firewall', 'ransomware', 'acceso no autorizado'] },
  { key: 'SISTEMAS_OPERATIVOS', keywords: ['windows', 'linux', 'sistema operativo', 'kernel', 'boot', 'arranque'] },
  { key: 'CORREO_Y_COLABORACION', keywords: ['correo', 'email', 'outlook', 'exchange', 'teams', 'calendario'] },
  { key: 'MESA_DE_AYUDA', keywords: ['soporte', 'ticket', 'usuario', 'ayuda', 'incidencia'] },
  { key: 'TELEFONIA_IP', keywords: ['telefono', 'telefonia', 'voip', 'pbx', 'anexo', 'llamada'] },
];

const isAdminUser = (user) => user?.rol === 'ADMIN';
const isClientUser = (user) => user?.type === 'CLIENT';
const isTechnicianUser = (user) => user?.type === 'TECHNICIAN';
const canTechnicianAccessTicket = (user, ticket) => ticket?.tecnicoAsignadoId === user?.id;

const generarNumeroTicket = async (db = prisma) => {
  const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const prefijo = `T-${fecha}-`;

  const ultimoTicket = await db.ticket.findFirst({
    where: { numero: { startsWith: prefijo } },
    orderBy: { numero: 'desc' },
    select: { numero: true },
  });

  const correlativoActual = ultimoTicket?.numero ? Number(ultimoTicket.numero.split('-').pop()) : 0;
  const correlativo = String(correlativoActual + 1).padStart(4, '0');
  return `T-${fecha}-${correlativo}`;
};

const isNumeroUniqueError = (error) => error?.code === 'P2002';

const parseSuggestedOrderType = (descripcion = '') => {
  const text = String(descripcion || '');
  const match = text.match(/\[Tipo de orden sugerido:\s*([^\]]+)\]/i);
  if (!match?.[1]) return null;

  const normalized = match[1]
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

  const allowed = new Set([
    'DIAGNOSTICO', 'REPARACION', 'INSTALACION', 'CONFIGURACION', 'MANTENIMIENTO', 'CONSULTA', 'OTRO',
    'CORRECTIVO', 'PREVENTIVO', 'CONSULTORIA',
  ]);

  return allowed.has(normalized) ? normalized : null;
};

const pickBestTechnician = async ({ titulo, descripcion, categoria, activoNombre, activoTipo }) => {
  const technicians = await TechnicianModel.findAssignable();
  if (!technicians.length) return null;

  const loadMap = await TechnicianModel.getTicketLoadMap(technicians.map((t) => t.id));
  const issueText = normalizeText(`${titulo} ${descripcion ?? ''} ${categoria ?? ''} ${activoNombre ?? ''} ${activoTipo ?? ''}`);

  let best = null;

  for (const tech of technicians) {
    const specialty = normalizeText(tech.especialidad ?? '');
    let score = 0;

    for (const rule of SPECIALTY_RULES) {
      const ruleKey = normalizeText(rule.key.replace(/_/g, ' '));
      if (!specialty.includes(ruleKey) && !specialty.includes(normalizeText(rule.key))) continue;
      score += includesAny(issueText, rule.keywords) ? 30 : 8;
    }

    // Afinidad extra por coincidencia directa de términos de especialidad personalizados.
    for (const token of specialty.split(/[_\s]+/).filter((x) => x.length >= 4)) {
      if (issueText.includes(token)) score += 2;
    }

    const load = loadMap.get(tech.id) ?? 0;
    score -= load * 2;

    if (!best || score > best.score || (score === best.score && load < best.load)) {
      best = { tech, score, load };
    }
  }

  return best?.tech ?? technicians[0];
};

const hasAssetFinalizationRecorded = async (ticketId) => {
  const orden = await prisma.serviceOrder.findUnique({
    where: { ticketId },
    select: { notas: true },
  });

  return Boolean(orden?.notas && orden.notas.includes('Activos del ticket:'));
};

const autoCloseResolvedTickets = async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const candidates = await prisma.ticket.findMany({
    where: {
      deletedAt: null,
      estado: 'RESUELTO',
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      activoId: true,
      cantidadActivosAfectados: true,
    },
  });

  const closableIds = [];
  for (const ticket of candidates) {
    const requiereFinalizacionActivos = Boolean(ticket.activoId && ticket.cantidadActivosAfectados);
    if (!requiereFinalizacionActivos) {
      closableIds.push(ticket.id);
      continue;
    }

    const finalizacionRegistrada = await hasAssetFinalizationRecorded(ticket.id);
    if (finalizacionRegistrada) {
      closableIds.push(ticket.id);
    }
  }

  if (closableIds.length > 0) {
    await prisma.ticket.updateMany({
      where: { id: { in: closableIds } },
      data: { estado: 'CERRADO' },
    });
  }
};

/**
 * Controlador del módulo Ticket.
 * Valida la coherencia referencial antes de persistir:
 *  - El cliente debe existir.
 *  - El activo (si se especifica) debe pertenecer a la empresa del cliente.
 *  - El técnico asignado (si se especifica) debe existir y estar activo.
 */

// GET /api/tickets
const getAll = async (req, res, next) => {
  try {
    await autoCloseResolvedTickets();

    const { estado, prioridad, clienteId, tecnicoAsignadoId, mostrarCerrados } = req.query;
    const isAdmin = isAdminUser(req.user);
    const isClient = isClientUser(req.user);
    const includeClosed = String(mostrarCerrados).toLowerCase() === 'true';
    const adminIncluyeCerrados = isAdmin && String(mostrarCerrados).toLowerCase() === 'true';
    const adminConFiltros = isAdmin && Boolean(estado || prioridad || clienteId || tecnicoAsignadoId);

    // Alcance por rol: ADMIN ve todo; TECNICO solo sus tickets asignados.
    const filters = { estado, prioridad, clienteId, tecnicoAsignadoId };
    if (isClient) {
      filters.clienteId = req.user.id;
      delete filters.tecnicoAsignadoId;
      if (!estado && !includeClosed) {
        filters.estadoNot = 'CERRADO';
      }
    } else if (!isAdmin) {
      filters.tecnicoAsignadoId = req.user.id;
      if (!estado || estado === 'CERRADO') {
        delete filters.estado;
        filters.estadoNot = 'CERRADO';
      }
    }

    // Por defecto se ocultan tickets cerrados en el listado.
    // Admin puede incluirlos usando ?mostrarCerrados=true
    // o aplicando cualquier filtro de búsqueda.
    if (isAdmin && !adminConFiltros && !estado && !adminIncluyeCerrados) {
      filters.estadoNot = 'CERRADO';
    }

    const tickets = await TicketModel.findAll(filters);
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

// GET /api/tickets/:id
const getById = async (req, res, next) => {
  try {
    await autoCloseResolvedTickets();

    const ticket = await TicketModel.findById(req.params.id);
    if (!ticket) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    if (!isAdminUser(req.user)) {
      if (isClientUser(req.user) && ticket.clienteId !== req.user.id) {
        return next(createHttpError(403, 'No tienes permisos para ver este ticket.'));
      }

      if (isTechnicianUser(req.user) && !canTechnicianAccessTicket(req.user, ticket)) {
        return next(createHttpError(403, 'No tienes permisos para ver este ticket.'));
      }
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// POST /api/tickets
const create = async (req, res, next) => {
  try {
    const body = matchedData(req);
    let activo = null;

    if (req.user?.type === 'CLIENT') {
      body.clienteId = req.user.id;
      delete body.tecnicoAsignadoId;
    }

    // Verificar cliente
    const cliente = await ClientModel.findById(body.clienteId);
    if (!cliente) {
      return next(createHttpError(404, 'El cliente especificado no existe.'));
    }

    // Verificar activo y que pertenece a la empresa del cliente
    if (body.activoId) {
      activo = await AssetModel.findById(body.activoId);
      if (!activo) {
        return next(createHttpError(404, 'El activo especificado no existe.'));
      }
      if (activo.empresa !== cliente.empresa) {
        return next(createHttpError(400, 'El activo no pertenece a la empresa del cliente indicado.'));
      }

      if (!body.cantidadActivosAfectados) {
        body.cantidadActivosAfectados = 1;
      }

      if (Number(body.cantidadActivosAfectados) > Number(activo.cantidad)) {
        return next(createHttpError(400, `La cantidad de activos afectados no puede ser mayor a ${activo.cantidad}.`));
      }
    } else {
      delete body.cantidadActivosAfectados;
    }

    // Verificar técnico asignado
    if (body.tecnicoAsignadoId) {
      const tecnico = await TechnicianModel.findById(body.tecnicoAsignadoId);
      if (!tecnico) {
        return next(createHttpError(404, 'El técnico especificado no existe.'));
      }
    } else {
      const tecnicoSugerido = await pickBestTechnician({
        titulo: body.titulo,
        descripcion: body.descripcion,
        categoria: body.categoria,
        activoNombre: activo?.nombre,
        activoTipo: activo?.tipo,
      });

      if (tecnicoSugerido) {
        body.tecnicoAsignadoId = tecnicoSugerido.id;
      }
    }

    if (!body.tecnicoAsignadoId) {
      return next(createHttpError(400, 'No hay técnicos disponibles para asignar el ticket en este momento.'));
    }

    let createdTicketId = null;
    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      try {
        await prisma.$transaction(async (tx) => {
          const numero = await generarNumeroTicket(tx);
          const createdTicket = await tx.ticket.create({ data: { ...body, numero } });
          createdTicketId = createdTicket.id;

          if (body.activoId) {
            const cantidadAfectada = Number(body.cantidadActivosAfectados || 1);
            const activoActual = await tx.asset.findUnique({ where: { id: body.activoId } });

            if (!activoActual || activoActual.deletedAt) {
              throw createHttpError(404, 'El activo seleccionado no existe.');
            }

            if (activoActual.estado !== 'OPERATIVO') {
              throw createHttpError(400, 'Solo se pueden enviar a reparación activos en estado OPERATIVO.');
            }

            if (cantidadAfectada > activoActual.cantidad) {
              throw createHttpError(400, `La cantidad afectada no puede ser mayor a ${activoActual.cantidad}.`);
            }

            // Caso 1: toda la cantidad pasa a reparación.
            // Si ya existe el mismo activo en reparación, consolidar cantidades.
            if (cantidadAfectada === activoActual.cantidad) {
              const activoReparacionExistente = await tx.asset.findFirst({
                where: {
                  deletedAt: null,
                  id: { not: activoActual.id },
                  empresa: activoActual.empresa,
                  nombre: activoActual.nombre,
                  tipo: activoActual.tipo,
                  marca: activoActual.marca,
                  modelo: activoActual.modelo,
                  estado: 'EN_REPARACION',
                },
              });

              if (activoReparacionExistente) {
                await tx.asset.update({
                  where: { id: activoReparacionExistente.id },
                  data: { cantidad: { increment: cantidadAfectada } },
                });

                await tx.asset.update({
                  where: { id: activoActual.id },
                  data: { deletedAt: new Date() },
                });
              } else {
                await tx.asset.update({
                  where: { id: body.activoId },
                  data: { estado: 'EN_REPARACION' },
                });
              }

              return;
            }

            // Caso 2: split de inventario entre operativo y en reparación.
            await tx.asset.update({
              where: { id: body.activoId },
              data: { cantidad: { decrement: cantidadAfectada } },
            });

            const activoReparacion = await tx.asset.findFirst({
              where: {
                deletedAt: null,
                empresa: activoActual.empresa,
                nombre: activoActual.nombre,
                tipo: activoActual.tipo,
                marca: activoActual.marca,
                modelo: activoActual.modelo,
                estado: 'EN_REPARACION',
              },
            });

            if (activoReparacion) {
              await tx.asset.update({
                where: { id: activoReparacion.id },
                data: { cantidad: { increment: cantidadAfectada } },
              });
            } else {
              await tx.asset.create({
                data: {
                  nombre: activoActual.nombre,
                  tipo: activoActual.tipo,
                  marca: activoActual.marca,
                  modelo: activoActual.modelo,
                  descripcion: activoActual.descripcion,
                  fechaAdquisicion: activoActual.fechaAdquisicion,
                  estado: 'EN_REPARACION',
                  empresa: activoActual.empresa,
                  cantidad: cantidadAfectada,
                  clienteId: activoActual.clienteId,
                  // numeroSerie se deja null para evitar colisión de unicidad.
                  numeroSerie: null,
                },
              });
            }
          }
        });

        break;
      } catch (error) {
        if (!isNumeroUniqueError(error) || attempt === maxRetries - 1) throw error;
      }
    }

    const ticket = await TicketModel.findById(createdTicketId);
    res.status(201).json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tickets/:id
const update = async (req, res, next) => {
  try {
    if (isClientUser(req.user)) {
      return next(createHttpError(403, 'No tienes permisos para actualizar tickets.'));
    }

    const { id } = req.params;
    const body    = matchedData(req, { includeOptionals: false });

    const existing = await TicketModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    if (!isAdminUser(req.user)) {
      if (!isTechnicianUser(req.user) || !canTechnicianAccessTicket(req.user, existing)) {
        return next(createHttpError(403, 'No tienes permisos para actualizar este ticket.'));
      }
    }

    // Determinar clienteId vigente (el nuevo si se envía, el actual si no)
    const clienteId = body.clienteId ?? existing.clienteId;

    if (body.clienteId) {
      const cliente = await ClientModel.findById(body.clienteId);
      if (!cliente) {
        return next(createHttpError(404, 'El cliente especificado no existe.'));
      }
    }

    if (body.activoId) {
      const activo = await AssetModel.findById(body.activoId);
      if (!activo) {
        return next(createHttpError(404, 'El activo especificado no existe.'));
      }

      const cliente = await ClientModel.findById(clienteId);
      if (!cliente) {
        return next(createHttpError(404, 'El cliente especificado no existe.'));
      }

      if (activo.empresa !== cliente.empresa) {
        return next(createHttpError(400, 'El activo no pertenece a la empresa del cliente indicado.'));
      }

      if (body.cantidadActivosAfectados && Number(body.cantidadActivosAfectados) > Number(activo.cantidad)) {
        return next(createHttpError(400, `La cantidad de activos afectados no puede ser mayor a ${activo.cantidad}.`));
      }
    } else if (Object.prototype.hasOwnProperty.call(body, 'cantidadActivosAfectados')) {
      delete body.cantidadActivosAfectados;
    }

    if (body.tecnicoAsignadoId) {
      const tecnico = await TechnicianModel.findById(body.tecnicoAsignadoId);
      if (!tecnico) {
        return next(createHttpError(404, 'El técnico especificado no existe.'));
      }
    }

    const updated = await TicketModel.update(id, body);
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tickets/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const isAdmin = req.user?.rol === 'ADMIN';
    const isTechnician = req.user?.type === 'TECHNICIAN';

    if (req.user?.type === 'CLIENT') {
      return next(createHttpError(403, 'No tienes permisos para cambiar el estado de tickets.'));
    }

    if (!isAdmin && !isTechnician) {
      return next(createHttpError(403, 'No tienes permisos para cambiar el estado de tickets.'));
    }

    const { id }   = req.params;
    const {
      estado,
      activoEstadoFinal,
      activoFueReemplazado,
      activosFinalizacion,
      notaFinalizacion,
    } = matchedData(req);
    const repuestos = Array.isArray(req.body.repuestos) ? req.body.repuestos : [];

    const existing = await TicketModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    if (!isAdmin && existing.tecnicoAsignadoId !== req.user.id) {
      return next(createHttpError(403, 'Solo puedes cambiar el estado de tickets asignados a ti.'));
    }

    // Regla de negocio: un ticket cerrado no puede reabrirse
    if (existing.estado === 'CERRADO') {
      if (estado === 'ABIERTO') {
        if (!isAdmin) {
          return next(createHttpError(403, 'Solo un administrador puede reabrir tickets cerrados.'));
        }

        const updated = await TicketModel.update(id, { estado });
        return res.status(200).json({ success: true, data: updated });
      }

      return next(createHttpError(400, 'Un ticket cerrado solo puede reabrirse a ABIERTO por un administrador.'));
    }

    if (estado !== existing.estado) {
      if (estado === 'CERRADO') {
        if (!isAdmin) {
          return next(createHttpError(403, 'Solo un administrador puede cerrar tickets.'));
        }

        if (existing.estado !== 'RESUELTO') {
          return next(createHttpError(400, 'Solo se puede cerrar manualmente un ticket en estado RESUELTO.'));
        }

        const requiereFinalizacionActivos = Boolean(existing.activoId && existing.cantidadActivosAfectados);
        if (requiereFinalizacionActivos) {
          const finalizacionRegistrada = await hasAssetFinalizationRecorded(existing.id);
          if (!finalizacionRegistrada) {
            return next(
              createHttpError(
                400,
                'No se puede cerrar este ticket porque los activos asociados no tienen finalización registrada (OPERATIVO o DADO_DE_BAJA).',
              ),
            );
          }
        }
      } else {
        const allowedTransitions = {
          ABIERTO: ['EN_PROGRESO'],
          EN_PROGRESO: ['EN_ESPERA', 'RESUELTO'],
          EN_ESPERA: ['EN_PROGRESO'],
          RESUELTO: [],
        };

        const allowed = allowedTransitions[existing.estado] || [];
        if (!allowed.includes(estado)) {
          return next(
            createHttpError(
              400,
              `Transición inválida de estado: ${existing.estado} -> ${estado}.`,
            ),
          );
        }
      }
    }

    const orden = await ServiceOrderModel.findByTicketId(existing.id);

    if (estado === 'EN_PROGRESO') {
      if (!existing.tecnicoAsignadoId) {
        return next(createHttpError(400, 'El ticket no tiene técnico asignado para iniciar.'));
      }

      if (!orden) {
        const tipoSugerido = parseSuggestedOrderType(existing.descripcion);
        const nuevaOrden = await ServiceOrderModel.create({
          ticketId: existing.id,
          tecnicoId: existing.tecnicoAsignadoId,
          tipo: tipoSugerido || 'DIAGNOSTICO',
          descripcion: existing.descripcion,
          fechaInicio: existing.createdAt,
        });
        await ServiceOrderModel.update(nuevaOrden.id, { estado: 'EN_PROGRESO' });
      } else {
        await ServiceOrderModel.update(orden.id, { estado: 'EN_PROGRESO' });
      }
    }

    if (estado === 'RESUELTO' && orden) {
      await ServiceOrderModel.completarConRepuestos(orden.id, existing.id, repuestos);
    }

    const notasFinalizacion = [];

    if (estado === 'RESUELTO' && existing.activoId && existing.cantidadActivosAfectados) {
      const activoBase = await AssetModel.findById(existing.activoId);
      if (!activoBase) {
        return next(createHttpError(404, 'No se encontró el activo asociado al ticket.'));
      }

      const cantidadAfectada = Number(existing.cantidadActivosAfectados || 0);
      if (cantidadAfectada <= 0) {
        return next(createHttpError(400, 'La cantidad de activos afectados es inválida.'));
      }

      let activosResueltos = [];

      if (Array.isArray(activosFinalizacion) && activosFinalizacion.length > 0) {
        if (activosFinalizacion.length !== cantidadAfectada) {
          return next(createHttpError(400, `Debes indicar la finalización de ${cantidadAfectada} activo(s).`));
        }

        activosResueltos = activosFinalizacion.map((item, index) => {
          if (!item?.estadoFinal) {
            throw createHttpError(400, `Falta estado final en el activo #${index + 1}.`);
          }

          if (item.estadoFinal === 'DADO_DE_BAJA' && typeof item.fueReemplazado !== 'boolean') {
            throw createHttpError(400, `Debes indicar si el activo #${index + 1} fue reemplazado.`);
          }

          let reemplazoTipo = null;
          let activoReemplazo = null;

          if (item.estadoFinal === 'DADO_DE_BAJA' && item.fueReemplazado === true) {
            if (!item.reemplazoTipo) {
              throw createHttpError(400, `Debes indicar si el activo #${index + 1} fue reemplazado por uno igual o diferente.`);
            }

            reemplazoTipo = item.reemplazoTipo;

            if (reemplazoTipo === 'DIFERENTE') {
              if (!item.activoReemplazo?.nombre || !item.activoReemplazo?.tipo) {
                throw createHttpError(400, `Debes indicar el activo de reemplazo para el activo #${index + 1}.`);
              }

              activoReemplazo = {
                nombre: item.activoReemplazo.nombre,
                tipo: item.activoReemplazo.tipo,
                marca: item.activoReemplazo.marca || null,
                modelo: item.activoReemplazo.modelo || null,
                numeroSerie: item.activoReemplazo.numeroSerie || null,
                descripcion: item.activoReemplazo.descripcion || null,
              };

              if (!activoReemplazo.numeroSerie) {
                throw createHttpError(400, `Debes indicar el numero de serie para el activo de reemplazo #${index + 1}.`);
              }
            }
          }

          return {
            estadoFinal: item.estadoFinal,
            fueReemplazado: item.estadoFinal === 'DADO_DE_BAJA' ? item.fueReemplazado : null,
            reemplazoTipo,
            activoReemplazo,
          };
        });
      } else {
        if (!activoEstadoFinal) {
          return next(createHttpError(400, 'Debes indicar el estado final del activo (OPERATIVO o DADO_DE_BAJA).'));
        }

        if (activoEstadoFinal === 'DADO_DE_BAJA' && typeof activoFueReemplazado !== 'boolean') {
          return next(createHttpError(400, 'Debes indicar si el activo dado de baja fue reemplazado.'));
        }

        activosResueltos = Array.from({ length: cantidadAfectada }).map(() => ({
          estadoFinal: activoEstadoFinal,
          fueReemplazado: activoEstadoFinal === 'DADO_DE_BAJA' ? activoFueReemplazado : null,
          reemplazoTipo: activoEstadoFinal === 'DADO_DE_BAJA' && activoFueReemplazado ? 'IGUAL' : null,
          activoReemplazo: null,
        }));
      }

      const cantidadOperativos = activosResueltos.filter((a) => a.estadoFinal === 'OPERATIVO').length;
      const cantidadBaja = activosResueltos.filter((a) => a.estadoFinal === 'DADO_DE_BAJA').length;
      const bajaReemplazados = activosResueltos.filter((a) => a.estadoFinal === 'DADO_DE_BAJA' && a.fueReemplazado === true).length;
      const bajaNoReemplazados = activosResueltos.filter((a) => a.estadoFinal === 'DADO_DE_BAJA' && a.fueReemplazado === false).length;
      const bajaReemplazoIgual = activosResueltos.filter(
        (a) => a.estadoFinal === 'DADO_DE_BAJA' && a.fueReemplazado === true && a.reemplazoTipo === 'IGUAL',
      ).length;
      const bajasConReemplazoDiferente = activosResueltos.filter(
        (a) => a.estadoFinal === 'DADO_DE_BAJA' && a.fueReemplazado === true && a.reemplazoTipo === 'DIFERENTE' && a.activoReemplazo,
      );

      await prisma.$transaction(async (tx) => {
        const activoReparacion = await tx.asset.findFirst({
          where: {
            deletedAt: null,
            empresa: activoBase.empresa,
            nombre: activoBase.nombre,
            tipo: activoBase.tipo,
            marca: activoBase.marca,
            modelo: activoBase.modelo,
            estado: 'EN_REPARACION',
          },
          orderBy: { createdAt: 'asc' },
        });

        if (!activoReparacion || activoReparacion.cantidad < cantidadAfectada) {
          throw createHttpError(400, 'No hay suficientes activos en reparación para cerrar este ticket.');
        }

        if (activoReparacion.cantidad === cantidadAfectada) {
          await tx.asset.update({
            where: { id: activoReparacion.id },
            data: { deletedAt: new Date() },
          });
        } else {
          await tx.asset.update({
            where: { id: activoReparacion.id },
            data: { cantidad: { decrement: cantidadAfectada } },
          });
        }

        const aplicarMovimiento = async (estadoDestino, cantidad) => {
          if (!cantidad || cantidad <= 0) return;

          const activoDestino = await tx.asset.findFirst({
            where: {
              deletedAt: null,
              empresa: activoBase.empresa,
              nombre: activoBase.nombre,
              tipo: activoBase.tipo,
              marca: activoBase.marca,
              modelo: activoBase.modelo,
              estado: estadoDestino,
            },
          });

          if (activoDestino) {
            await tx.asset.update({
              where: { id: activoDestino.id },
              data: { cantidad: { increment: cantidad } },
            });
            return;
          }

          await tx.asset.create({
            data: {
              nombre: activoBase.nombre,
              tipo: activoBase.tipo,
              marca: activoBase.marca,
              modelo: activoBase.modelo,
              descripcion: activoBase.descripcion,
              fechaAdquisicion: activoBase.fechaAdquisicion,
              estado: estadoDestino,
              empresa: activoBase.empresa,
              cantidad,
              clienteId: activoBase.clienteId,
              numeroSerie: null,
            },
          });
        };

        await aplicarMovimiento('OPERATIVO', cantidadOperativos);
        await aplicarMovimiento('DADO_DE_BAJA', cantidadBaja);

        const aplicarReemplazoOperativo = async (definicion, cantidad) => {
          if (!cantidad || cantidad <= 0) return;

          let activoDestino = null;

          if (definicion.numeroSerie) {
            activoDestino = await tx.asset.findFirst({
              where: {
                deletedAt: null,
                numeroSerie: definicion.numeroSerie,
              },
            });
          } else {
            activoDestino = await tx.asset.findFirst({
              where: {
                deletedAt: null,
                empresa: activoBase.empresa,
                nombre: definicion.nombre,
                tipo: definicion.tipo,
                marca: definicion.marca,
                modelo: definicion.modelo,
                estado: 'OPERATIVO',
              },
            });
          }

          if (activoDestino) {
            await tx.asset.update({
              where: { id: activoDestino.id },
              data: { cantidad: { increment: cantidad } },
            });
            return;
          }

          await tx.asset.create({
            data: {
              nombre: definicion.nombre,
              tipo: definicion.tipo,
              marca: definicion.marca,
              modelo: definicion.modelo,
              descripcion: definicion.descripcion,
              fechaAdquisicion: new Date(),
              estado: 'OPERATIVO',
              empresa: activoBase.empresa,
              cantidad,
              clienteId: activoBase.clienteId,
              numeroSerie: definicion.numeroSerie || null,
            },
          });
        };

        if (bajaReemplazoIgual > 0) {
          await aplicarReemplazoOperativo({
            nombre: activoBase.nombre,
            tipo: activoBase.tipo,
            marca: activoBase.marca,
            modelo: activoBase.modelo,
            numeroSerie: null,
            descripcion: activoBase.descripcion,
          }, bajaReemplazoIgual);
        }

        const reemplazosDiferentesAgrupados = bajasConReemplazoDiferente.reduce((acc, item) => {
          const def = item.activoReemplazo;
          const key = JSON.stringify({
            nombre: def.nombre,
            tipo: def.tipo,
            marca: def.marca || null,
            modelo: def.modelo || null,
            numeroSerie: def.numeroSerie || null,
            descripcion: def.descripcion || null,
          });

          const actual = acc.get(key) || {
            nombre: def.nombre,
            tipo: def.tipo,
            marca: def.marca || null,
            modelo: def.modelo || null,
            numeroSerie: def.numeroSerie || null,
            descripcion: def.descripcion || null,
            cantidad: 0,
          };

          actual.cantidad += 1;
          acc.set(key, actual);
          return acc;
        }, new Map());

        for (const item of reemplazosDiferentesAgrupados.values()) {
          await aplicarReemplazoOperativo(item, item.cantidad);
        }
      });

      const detallesFinalizacion = [
        `Activo finalizado: ${activoBase.nombre} (${cantidadAfectada})`,
        `Operativos: ${cantidadOperativos}`,
        `Dado de baja: ${cantidadBaja}`,
      ];

      if (cantidadBaja > 0) {
        detallesFinalizacion.push(`Baja reemplazados: ${bajaReemplazados}`);
        detallesFinalizacion.push(`Baja no reemplazados: ${bajaNoReemplazados}`);
        detallesFinalizacion.push(`Reemplazo igual: ${bajaReemplazoIgual}`);
        detallesFinalizacion.push(`Reemplazo diferente: ${bajasConReemplazoDiferente.length}`);

        if (bajasConReemplazoDiferente.length > 0) {
          const resumenDiferentes = bajasConReemplazoDiferente.reduce((acc, item) => {
            const nombre = item.activoReemplazo?.nombre || 'SIN_NOMBRE';
            const actual = acc.get(nombre) || 0;
            acc.set(nombre, actual + 1);
            return acc;
          }, new Map());

          for (const [nombre, cantidad] of resumenDiferentes.entries()) {
            detallesFinalizacion.push(`- Reemplazo diferente '${nombre}': ${cantidad}`);
          }
        }
      }

      notasFinalizacion.push(`Activos del ticket:\n- ${detallesFinalizacion.join('\n- ')}`);
    }

    if (estado === 'RESUELTO' && typeof notaFinalizacion === 'string' && notaFinalizacion.trim()) {
      notasFinalizacion.push(`Nota adicional de cierre:\n${notaFinalizacion.trim()}`);
    }

    if (estado === 'RESUELTO' && orden && notasFinalizacion.length > 0) {
      const ordenActual = await prisma.serviceOrder.findUnique({
        where: { id: orden.id },
        select: { id: true, notas: true },
      });

      if (ordenActual) {
        const bloqueNotas = notasFinalizacion.join('\n\n');
        const notasActualizadas = ordenActual.notas
          ? `${ordenActual.notas}\n\n${bloqueNotas}`
          : bloqueNotas;

        await prisma.serviceOrder.update({
          where: { id: ordenActual.id },
          data: { notas: notasActualizadas },
        });
      }
    }

    const updated = await TicketModel.update(id, { estado });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tickets/:id
const remove = async (req, res, next) => {
  try {
    if (isClientUser(req.user)) {
      return next(createHttpError(403, 'No tienes permisos para eliminar tickets.'));
    }

    const { id } = req.params;

    const existing = await TicketModel.findById(id);
    if (!existing) {
      return next(createHttpError(404, 'Ticket no encontrado.'));
    }

    if (!isAdminUser(req.user)) {
      if (!isTechnicianUser(req.user) || !canTechnicianAccessTicket(req.user, existing)) {
        return next(createHttpError(403, 'No tienes permisos para eliminar este ticket.'));
      }
    }

    await TicketModel.softDelete(id);
    res.status(200).json({ success: true, message: 'Ticket cerrado y eliminado correctamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, updateStatus, remove };
