import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { validarHorario } from '../utilidades/horarios.js';
import { clonarCatalogo } from '../utilidades/clonarSucursal.js';
import * as reportes from '../servicios/reportes.js';

const prisma = new PrismaClient();

// GESTIÓN DE SUCURSALES
export const obtenerSucursales = async (req, res) => {
  try {
    const sucursales = await prisma.sucursal.findMany({
      include: {
        _count: { select: { usuarios: true, pedidos: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(sucursales);
  } catch (error) {
    console.error('Error al obtener sucursales:', error);
    res.status(500).json({ error: 'Error al obtener sucursales' });
  }
};

export const crearSucursal = async (req, res) => {
  try {
    const { nombre, ubicacion, horario, copiarDeId, contrasenaTotem } = req.body;
    const nombreTrim = String(nombre || '').trim();
    if (!nombreTrim) return res.status(400).json({ error: 'El nombre es requerido' });

    // No permitir dos sucursales con el mismo nombre (evita duplicados en los selectores).
    const sucDup = await prisma.sucursal.findFirst({ where: { nombre: nombreTrim } });
    if (sucDup) return res.status(409).json({ error: `Ya existe una sucursal llamada "${nombreTrim}"` });

    // El horario es obligatorio: una sucursal sin horario quedaría abierta las 24 horas.
    const revision = validarHorario(horario);
    if (!revision.valido) return res.status(400).json({ error: revision.error });

    // Sin catálogo la sucursal aparece en la lista pero no puede vender nada, así que
    // el alta copia el de una sucursal que ya funciona.
    if (!copiarDeId) {
      return res.status(400).json({ error: 'Elige de qué sucursal copiar el catálogo (insumos, platos y recetas)' });
    }
    const origen = await prisma.sucursal.findUnique({ where: { id: copiarDeId } });
    if (!origen) return res.status(400).json({ error: 'La sucursal que quieres copiar no existe' });

    if (!contrasenaTotem || String(contrasenaTotem).length < 6) {
      return res.status(400).json({ error: 'La contraseña del tótem debe tener al menos 6 caracteres' });
    }

    // Todo en una transacción: si algo falla no queda una sucursal a medio armar.
    const resultado = await prisma.$transaction(async (tx) => {
      const sucursal = await tx.sucursal.create({
        data: { nombre: nombreTrim, ubicacion: ubicacion || '', horario: revision.horario }
      });
      const copiado = await clonarCatalogo(tx, copiarDeId, sucursal.id, String(contrasenaTotem));
      return { sucursal, copiado };
    }, { timeout: 30000 });

    res.status(201).json({ ...resultado.sucursal, copiadoDe: origen.nombre, copiado: resultado.copiado });
  } catch (error) {
    console.error('Error al crear sucursal:', error);
    res.status(500).json({ error: 'Error al crear la sucursal' });
  }
};

export const editarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion, horario } = req.body;

    if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim())) {
      return res.status(400).json({ error: 'El nombre de la sucursal no puede quedar vacío' });
    }

    const existe = await prisma.sucursal.findUnique({ where: { id } });
    if (!existe) return res.status(404).json({ error: 'Sucursal no encontrada' });

    const data = {};
    if (nombre !== undefined) {
      const nombreTrim = nombre.trim();
      // No permitir renombrarla igual a OTRA sucursal existente.
      const sucDup = await prisma.sucursal.findFirst({ where: { nombre: nombreTrim, id: { not: id } } });
      if (sucDup) return res.status(409).json({ error: `Ya existe una sucursal llamada "${nombreTrim}"` });
      data.nombre = nombreTrim;
    }
    if (ubicacion !== undefined) data.ubicacion = ubicacion || '';
    if (horario !== undefined) {
      const revision = validarHorario(horario);
      if (!revision.valido) return res.status(400).json({ error: revision.error });
      data.horario = revision.horario;
    }

    const sucursal = await prisma.sucursal.update({ where: { id }, data });

    if (data.horario) {
      // Los tótems y la caja de esa sucursal actualizan su copia sin recargar
      req.app.get('io')?.to(sucursal.id).emit('horario-actualizado', data.horario);
    }

    res.json(sucursal);
  } catch (error) {
    console.error('Error al editar sucursal:', error);
    res.status(500).json({ error: 'Error al editar la sucursal' });
  }
};

export const eliminarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    // ?conDatos=1 borra también lo que cuelga de la sucursal (menú, insumos,
    // recetas, personal). Sirve para sacar sucursales de prueba, que nacen con
    // su menú y su inventario y por eso nunca quedan "vacías".
    const conDatos = req.query.conDatos === '1';

    const sucursal = await prisma.sucursal.findUnique({ where: { id } });
    if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' });

    // No borrar una sucursal con datos: dejaría usuarios huérfanos (sucursalId null),
    // y sus pedidos/productos/insumos romperían por llave foránea. Se exige vaciarla antes.
    const [pedidos, productos, insumos, usuarios] = await Promise.all([
      prisma.pedido.count({ where: { sucursalId: id } }),
      prisma.producto.count({ where: { sucursalId: id } }),
      prisma.insumo.count({ where: { sucursalId: id } }),
      prisma.usuario.count({ where: { sucursalId: id } }),
    ]);

    // Los pedidos son el historial de ventas: no se borran NUNCA por esta vía,
    // ni siquiera con conDatos=1. Una sucursal que ya vendió no se elimina.
    if (pedidos) {
      return res.status(409).json({
        error: `No se puede eliminar: la sucursal tiene ${pedidos} pedido(s) registrados. El historial de ventas no se borra.`,
        tienePedidos: true,
      });
    }

    if ((productos || insumos || usuarios) && !conDatos) {
      const partes = [];
      if (usuarios) partes.push(`${usuarios} usuario(s)`);
      if (productos) partes.push(`${productos} producto(s)`);
      if (insumos) partes.push(`${insumos} insumo(s)`);
      return res.status(409).json({
        error: `La sucursal tiene ${partes.join(', ')}. No registró ninguna venta, así que se puede eliminar junto con todos esos datos.`,
        // El panel usa esto para ofrecer el borrado completo con una segunda confirmación
        puedeBorrarConDatos: true,
        detalle: { usuarios, productos, insumos },
      });
    }

    if (!conDatos) {
      await prisma.sucursal.delete({ where: { id } });
      return res.json({ mensaje: 'Sucursal eliminada correctamente' });
    }

    // Borrado completo, en una transacción y respetando las llaves foráneas
    // (primero los hijos). Si algo falla, no se borra nada.
    const insumosDeLaSucursal = await prisma.insumo.findMany({ where: { sucursalId: id }, select: { id: true } });
    const insumoIds = insumosDeLaSucursal.map((i) => i.id);
    const recetasDeLaSucursal = await prisma.receta.findMany({ where: { sucursalId: id }, select: { id: true } });
    const recetaIds = recetasDeLaSucursal.map((r) => r.id);
    const comprasDeLaSucursal = await prisma.pedidoCompra.findMany({ where: { sucursalId: id }, select: { id: true } });
    const compraIds = comprasDeLaSucursal.map((c) => c.id);

    await prisma.$transaction(async (tx) => {
      await tx.movimientoInventario.deleteMany({ where: { sucursalId: id } });
      await tx.solicitudInsumo.deleteMany({ where: { sucursalId: id } });
      if (compraIds.length) await tx.pedidoCompraItem.deleteMany({ where: { pedidoCompraId: { in: compraIds } } });
      await tx.pedidoCompra.deleteMany({ where: { sucursalId: id } });
      if (recetaIds.length) await tx.recetaInsumo.deleteMany({ where: { recetaId: { in: recetaIds } } });
      await tx.receta.deleteMany({ where: { sucursalId: id } });
      await tx.producto.deleteMany({ where: { sucursalId: id } });
      if (insumoIds.length) await tx.insumoProveedor.deleteMany({ where: { insumoId: { in: insumoIds } } });
      await tx.insumo.deleteMany({ where: { sucursalId: id } });
      await tx.usuario.deleteMany({ where: { sucursalId: id } });
      await tx.sucursal.delete({ where: { id } });
    });

    res.json({
      mensaje: `Sucursal "${sucursal.nombre}" eliminada con todos sus datos`,
      borrado: { usuarios, productos, insumos, recetas: recetaIds.length },
    });
  } catch (error) {
    console.error('Error al eliminar sucursal:', error);
    res.status(500).json({ error: 'Error al eliminar la sucursal' });
  }
};

// GESTIÓN DE GERENTES

export const obtenerGerentes = async (req, res) => {
  try {
    const gerentes = await prisma.usuario.findMany({
      where: { rol: 'GERENTE' },
      include: { sucursal: { select: { id: true, nombre: true, ubicacion: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(gerentes);
  } catch (error) {
    console.error('Error al obtener gerentes:', error);
    res.status(500).json({ error: 'Error al obtener gerentes' });
  }
};

export const crearGerente = async (req, res) => {
  try {
    const { nombre, correo, contrasena, sucursalId } = req.body;
    if (!nombre || !correo || !contrasena || !sucursalId) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (typeof nombre !== 'string' || typeof correo !== 'string' || typeof contrasena !== 'string') {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    if (contrasena.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // La sucursal debe existir (si no, la llave foránea reventaría con un 500 confuso)
    const sucursalOk = await prisma.sucursal.findUnique({ where: { id: sucursalId } });
    if (!sucursalOk) return res.status(400).json({ error: 'La sucursal seleccionada no existe' });

    const nombreTrim = nombre.trim();
    if (nombreTrim.length < 3) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
    }
    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombreTrim)) {
      return res.status(400).json({ error: 'El nombre solo debe contener letras y espacios' });
    }
    if (/([a-zA-ZáéíóúÁÉÍÓÚñÑ])\1{3,}/.test(nombreTrim)) {
      return res.status(400).json({ error: 'El nombre no puede tener letras repetidas consecutivamente' });
    }
    if (/[bcdfghjklmnñpqrstvwxyzBCDFGHJKLMNÑPQRSTVWXYZ]{5}/.test(nombreTrim)) {
      return res.status(400).json({ error: 'El nombre ingresado es inválido (demasiadas consonantes juntas)' });
    }

    const correoLower = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLower)) {
      return res.status(400).json({ error: 'El formato del correo no es válido' });
    }
    if (!correoLower.endsWith('@gmail.com') && !correoLower.endsWith('@gorichicken.com')) {
      return res.status(400).json({ error: 'El correo debe terminar en @gmail.com o @gorichicken.com' });
    }

    // El correo es el identificador de login: no puede repetirse en NINGÚN usuario del sistema.
    const correoExiste = await prisma.usuario.findUnique({ where: { correo: correoLower } });
    if (correoExiste) return res.status(409).json({ error: 'Ese correo ya está registrado. Usá otro.' });

    const hash = await bcrypt.hash(contrasena, 10);
    const gerente = await prisma.usuario.create({
      data: { nombre: nombreTrim, correo: correoLower, contrasena: hash, rol: 'GERENTE', sucursalId },
      include: { sucursal: { select: { id: true, nombre: true } } }
    });

    res.status(201).json(gerente);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error al crear gerente:', error);
    res.status(500).json({ error: 'Error al crear el gerente' });
  }
};

// Editar un gerente: nombre, correo, contraseña (opcional) y/o sucursal. Solo se tocan
// los campos que llegan; la contraseña solo se cambia si se manda una nueva no vacía.
export const editarGerente = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, correo, contrasena, sucursalId } = req.body;

    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ error: 'Gerente no encontrado' });
    if (usuario.rol !== 'GERENTE') return res.status(403).json({ error: 'Este usuario no es un gerente' });

    const data = {};

    if (nombre !== undefined) {
      if (typeof nombre !== 'string') return res.status(400).json({ error: 'Datos inválidos' });
      const nombreTrim = nombre.trim();
      if (nombreTrim.length < 3) return res.status(400).json({ error: 'El nombre debe tener al menos 3 caracteres' });
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombreTrim)) return res.status(400).json({ error: 'El nombre solo debe contener letras y espacios' });
      if (/([a-zA-ZáéíóúÁÉÍÓÚñÑ])\1{3,}/.test(nombreTrim)) return res.status(400).json({ error: 'El nombre no puede tener letras repetidas consecutivamente' });
      if (/[bcdfghjklmnñpqrstvwxyzBCDFGHJKLMNÑPQRSTVWXYZ]{5}/.test(nombreTrim)) return res.status(400).json({ error: 'El nombre ingresado es inválido (demasiadas consonantes juntas)' });
      data.nombre = nombreTrim;
    }

    if (correo !== undefined) {
      if (typeof correo !== 'string') return res.status(400).json({ error: 'Datos inválidos' });
      const correoLower = correo.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLower)) return res.status(400).json({ error: 'El formato del correo no es válido' });
      if (!correoLower.endsWith('@gmail.com') && !correoLower.endsWith('@gorichicken.com')) return res.status(400).json({ error: 'El correo debe terminar en @gmail.com o @gorichicken.com' });
      const correoExiste = await prisma.usuario.findFirst({ where: { correo: correoLower, id: { not: id } } });
      if (correoExiste) return res.status(409).json({ error: 'Ese correo ya está registrado. Usá otro.' });
      data.correo = correoLower;
    }

    if (contrasena !== undefined && String(contrasena).length > 0) {
      if (String(contrasena).length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      data.contrasena = await bcrypt.hash(String(contrasena), 10);
    }

    if (sucursalId !== undefined) {
      const sucursalOk = await prisma.sucursal.findUnique({ where: { id: sucursalId } });
      if (!sucursalOk) return res.status(400).json({ error: 'La sucursal seleccionada no existe' });
      data.sucursalId = sucursalId;
    }

    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'No hay cambios para guardar' });

    const gerente = await prisma.usuario.update({
      where: { id }, data,
      include: { sucursal: { select: { id: true, nombre: true } } },
    });
    res.json(gerente);
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Ese correo ya está registrado. Usá otro.' });
    console.error('Error al editar gerente:', error);
    res.status(500).json({ error: 'Error al editar el gerente' });
  }
};

export const eliminarGerente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que exista y que sea realmente un GERENTE: con el id correcto,
    // este endpoint borraría a un ADMIN o al usuario TOTEM de una sucursal.
    const usuario = await prisma.usuario.findUnique({ where: { id } });
    if (!usuario) return res.status(404).json({ error: 'Gerente no encontrado' });
    if (usuario.rol !== 'GERENTE') {
      return res.status(403).json({ error: 'Este usuario no es un gerente' });
    }

    // Si tiene pedidos asociados (los tomó cuando fue cajero, etc.), la FK lo impide.
    const pedidos = await prisma.pedido.count({ where: { usuarioId: id } });
    if (pedidos > 0) {
      return res.status(409).json({ error: 'No se puede eliminar: el gerente tiene pedidos registrados a su nombre' });
    }

    await prisma.usuario.delete({ where: { id } });
    res.json({ mensaje: 'Gerente eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar gerente:', error);
    res.status(500).json({ error: 'Error al eliminar el gerente' });
  }
};

// REPORTES GLOBALES

export const reporteGlobal = async (req, res) => {
  try {
    // Soporte de fecha: ?desde=&hasta= (rango) o ?fecha= (un solo día). Default: hoy.
    const soloDia = (dt) => `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    let fechaBase, fechaFin, desdeStr, hastaStr;
    if (req.query.desde || req.query.hasta) {
      desdeStr = req.query.desde || req.query.hasta;
      hastaStr = req.query.hasta || req.query.desde;
      fechaBase = new Date(desdeStr + 'T00:00:00');
      fechaFin = new Date(hastaStr + 'T23:59:59.999');
      if (isNaN(fechaBase.getTime()) || isNaN(fechaFin.getTime())) {
        return res.status(400).json({ error: 'Fecha inválida' });
      }
    } else if (req.query.fecha) {
      desdeStr = hastaStr = req.query.fecha;
      fechaBase = new Date(req.query.fecha + 'T00:00:00');
      if (isNaN(fechaBase.getTime())) {
        return res.status(400).json({ error: 'Fecha inválida' });
      }
      fechaFin = new Date(fechaBase);
      fechaFin.setHours(23, 59, 59, 999);
    } else {
      fechaBase = new Date();
      fechaBase.setHours(0, 0, 0, 0);
      fechaFin = new Date(fechaBase);
      fechaFin.setHours(23, 59, 59, 999);
      desdeStr = hastaStr = soloDia(fechaBase);
    }

    // Filtro opcional por sucursal: ?sucursalId=... (sin él = todas las sucursales)
    const sucursalId = req.query.sucursalId || null;
    const filtroSuc = sucursalId ? { sucursalId } : {};

    // Un pedido cuenta como VENTA solo cuando ya se cobró. Los del tótem nacen
    // "POR_COBRAR" (aún sin pagar) y no deben sumar a los ingresos.
    const rangoFecha = { createdAt: { gte: fechaBase, lte: fechaFin } };
    const soloCobrados = { estado: { not: 'POR_COBRAR' } };

    const pedidosHoy = await prisma.pedido.findMany({
      where: { ...rangoFecha, ...soloCobrados, ...filtroSuc },
      include: { sucursal: { select: { nombre: true } } }
    });

    const totalVentasHoy = pedidosHoy.reduce((sum, p) => sum + p.montoTotal, 0);
    const totalPedidosHoy = pedidosHoy.length;

    // Desglose del DINERO para el reporte detallado
    const suma = (arr) => arr.reduce((s, p) => s + p.montoTotal, 0);
    const ventasPOS = suma(pedidosHoy.filter(p => p.origen === 'POS'));
    const ventasTotem = suma(pedidosHoy.filter(p => p.origen === 'TOTEM'));
    const ventasEfectivo = suma(pedidosHoy.filter(p => p.metodoPago === 'efectivo'));
    const ventasQR = suma(pedidosHoy.filter(p => p.metodoPago === 'qr'));
    const ticketPromedio = totalPedidosHoy ? totalVentasHoy / totalPedidosHoy : 0;

    // Ventas por sucursal agrupado (si hay filtro, solo esa sucursal)
    const sucursales = await prisma.sucursal.findMany({
      where: sucursalId ? { id: sucursalId } : {},
      include: {
        pedidos: { where: { ...rangoFecha, ...soloCobrados } },
        _count: { select: { usuarios: true } }
      }
    });

    const ventasPorSucursal = sucursales.map(s => ({
      id: s.id,
      nombre: s.nombre,
      ubicacion: s.ubicacion,
      ventasHoy: s.pedidos.reduce((sum, p) => sum + p.montoTotal, 0),
      pedidosHoy: s.pedidos.length,
      totalEmpleados: s._count.usuarios
    }));

    // Ventas por hora (para gráfico de línea temporal)
    const ventasPorHora = Array.from({ length: 24 }, (_, h) => {
      const pedidosH = pedidosHoy.filter(p => new Date(p.createdAt).getHours() === h);
      return { hora: h, total: pedidosH.reduce((sum, p) => sum + p.montoTotal, 0), pedidos: pedidosH.length };
    });

    // Últimos pedidos DEL DÍA seleccionado (antes ignoraba la fecha y mostraba los de hoy)
    const ultimosPedidos = await prisma.pedido.findMany({
      where: { ...rangoFecha, ...soloCobrados, ...filtroSuc },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        sucursal: { select: { nombre: true } },
        items: { include: { producto: { select: { nombre: true } } } }
      }
    });

    res.json({
      fecha: desdeStr,
      desde: desdeStr,
      hasta: hastaStr,
      sucursalId, // null = todas
      resumen: {
        totalVentasHoy,
        totalPedidosHoy,
        totalSucursales: sucursales.length,
        pedidosPOS: pedidosHoy.filter(p => p.origen === 'POS').length,
        pedidosTotem: pedidosHoy.filter(p => p.origen === 'TOTEM').length,
        // Dinero desglosado
        ventasPOS,
        ventasTotem,
        ventasEfectivo,
        ventasQR,
        ticketPromedio
      },
      ventasPorSucursal,
      ventasPorHora,
      ultimosPedidos
    });
  } catch (error) {
    console.error('Error en reporte global:', error);
    res.status(500).json({ error: 'Error al generar el reporte global' });
  }
};

// ============================================================
//  REPORTES AVANZADOS (todas las sucursales)
// ============================================================

// A · Detalle de cualquier pedido (el admin no está limitado a una sucursal).
export const reporteDetallePedidoAdmin = async (req, res) => {
  try {
    const detalle = await reportes.detallePedido(req.params.id, {});
    if (!detalle) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(detalle);
  } catch (error) {
    console.error('Error en detalle de pedido (admin):', error);
    res.status(500).json({ error: 'Error al obtener el detalle del pedido' });
  }
};

// B · Inventario por receta de una sucursal. Sin ?sucursalId devuelve la lista
// de sucursales para que la interfaz deje elegir cuál mirar.
export const reporteInventarioAdmin = async (req, res) => {
  try {
    const { sucursalId } = req.query;
    if (!sucursalId) {
      const sucursales = await prisma.sucursal.findMany({
        select: { id: true, nombre: true }, orderBy: { nombre: 'asc' },
      });
      return res.json({ requiereSeleccion: true, sucursales });
    }
    const { desde, hasta } = reportes.parsePeriodo(req.query);
    const data = await reportes.inventarioPorReceta(sucursalId, { desde, hasta });
    res.json({ desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0], ...data });
  } catch (error) {
    console.error('Error en reporte de inventario (admin):', error);
    res.status(500).json({ error: 'Error al generar el reporte de inventario' });
  }
};

// C · Ventas y pagos por periodo. Sin ?sucursalId = todas (con comparativa).
export const reporteVentasPagosAdmin = async (req, res) => {
  try {
    const { desde, hasta } = reportes.parsePeriodo(req.query);
    const sucursalId = req.query.sucursalId || null;
    const data = await reportes.ventasYPagos({ sucursalId, desde, hasta });
    res.json({ desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0], sucursalId, ...data });
  } catch (error) {
    console.error('Error en reporte de ventas y pagos (admin):', error);
    res.status(500).json({ error: 'Error al generar el reporte de ventas y pagos' });
  }
};

// ============================================================
//  GESTIÓN DE PROVEEDORES (catálogo maestro, lo mantiene el admin)
// ============================================================
// El proveedor es una entidad PASIVA: no tiene cuenta ni interfaz. El admin
// solo administra sus datos; el gerente lo referencia al reponer stock.

export const listarProveedores = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        // Insumos que este proveedor abastece (a través de la tabla de enlace).
        insumos: {
          include: { insumo: { select: { id: true, nombre: true, unidad: true, unidadPedido: true, factorConversion: true, sucursalId: true, sucursal: { select: { nombre: true } } } } },
        },
      },
    });
    // Se aplana la tabla de enlace para que el frontend reciba insumos[] directo.
    res.json(proveedores.map((p) => ({ ...p, insumos: p.insumos.map((ip) => ip.insumo) })));
  } catch (error) {
    console.error('Error al listar proveedores:', error);
    res.status(500).json({ error: 'Error al listar los proveedores' });
  }
};

// Catálogo de insumos de TODAS las sucursales, para que el admin marque cuáles
// abastece cada proveedor. Se etiqueta con la sucursal porque un mismo nombre de
// insumo (p. ej. "Cebolla") existe por separado en cada sucursal.
export const listarInsumosCatalogo = async (req, res) => {
  try {
    const insumos = await prisma.insumo.findMany({
      orderBy: [{ nombre: 'asc' }],
      select: { id: true, nombre: true, unidad: true, sucursalId: true, sucursal: { select: { nombre: true } } },
    });
    res.json(insumos);
  } catch (error) {
    console.error('Error al listar catálogo de insumos:', error);
    res.status(500).json({ error: 'Error al listar los insumos' });
  }
};

// ADMIN: eliminar un insumo de cualquier sucursal.
// Por defecto respeta los mismos candados que el panel del gerente: no se borra
// un insumo que esté en una receta o que tenga movimientos de kardex. Con
// ?conHistorial=1 se borra igual, arrastrando sus lineas de receta, sus
// movimientos y su enlace con proveedores. Es para insumos de prueba.
export const eliminarInsumoAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const conHistorial = req.query.conHistorial === '1';

    const insumo = await prisma.insumo.findUnique({
      where: { id },
      include: { sucursal: { select: { nombre: true } } },
    });
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado' });

    const [enRecetas, movimientos, enCompras] = await Promise.all([
      prisma.recetaInsumo.count({ where: { insumoId: id } }),
      prisma.movimientoInventario.count({ where: { insumoId: id } }),
      prisma.pedidoCompraItem.count({ where: { insumoId: id } }),
    ]);

    if ((enRecetas || movimientos || enCompras) && !conHistorial) {
      const partes = [];
      if (enRecetas) partes.push(`${enRecetas} receta(s)`);
      if (movimientos) partes.push(`${movimientos} movimiento(s) de kardex`);
      if (enCompras) partes.push(`${enCompras} linea(s) de compra`);
      return res.status(409).json({
        error: `El insumo "${insumo.nombre}" aparece en ${partes.join(', ')}.`,
        puedeBorrarConHistorial: true,
        detalle: { enRecetas, movimientos, enCompras },
      });
    }

    await prisma.$transaction(async (tx) => {
      if (conHistorial) {
        await tx.recetaInsumo.deleteMany({ where: { insumoId: id } });
        await tx.movimientoInventario.deleteMany({ where: { insumoId: id } });
        await tx.pedidoCompraItem.deleteMany({ where: { insumoId: id } });
        await tx.solicitudInsumo.deleteMany({ where: { insumoId: id } });
      }
      await tx.insumoProveedor.deleteMany({ where: { insumoId: id } });
      await tx.insumo.delete({ where: { id } });
    });

    res.json({
      mensaje: `Insumo "${insumo.nombre}" de ${insumo.sucursal?.nombre || 'su sucursal'} eliminado`,
      borrado: { enRecetas, movimientos, enCompras },
    });
  } catch (error) {
    console.error('Error al eliminar insumo (admin):', error);
    res.status(500).json({ error: 'Error al eliminar el insumo' });
  }
};

// Convierte el arreglo de insumoIds del formulario en filas de la tabla de enlace.
const insumoIdsAEnlace = (insumoIds) =>
  Array.isArray(insumoIds) ? insumoIds.filter((x) => typeof x === 'string' && x).map((id) => ({ insumoId: id })) : [];
// Aplana un proveedor con su tabla de enlace a { ...prov, insumos: [insumo...] }.
const aplanarProveedor = (p) => ({ ...p, insumos: (p.insumos || []).map((ip) => ip.insumo) });
const incluirInsumosProv = { insumos: { include: { insumo: { select: { id: true, nombre: true, unidad: true, sucursalId: true, sucursal: { select: { nombre: true } } } } } } };

// Valida los datos de un proveedor. Reglas:
//  - nombre: obligatorio, 2-60 caracteres, SIN números ni símbolos raros
//    (solo letras, espacios y . & - ' que aparecen en nombres de empresas).
//  - contacto: opcional; si viene, es un nombre de persona -> tampoco lleva números.
//  - telefono: opcional; si viene, solo dígitos y + - ( ) espacios, 7 a 15 dígitos.
function validarDatosProveedor({ nombre, contacto, telefono }, { nombreObligatorio = true } = {}) {
  const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ .&'\-]+$/;
  if (nombre !== undefined || nombreObligatorio) {
    const n = String(nombre ?? '').trim();
    if (!n) return 'El nombre del proveedor es obligatorio';
    if (n.length < 2) return 'El nombre es demasiado corto';
    if (n.length > 60) return 'El nombre es demasiado largo';
    if (/\d/.test(n)) return 'El nombre no puede contener números';
    if (!soloLetras.test(n)) return 'El nombre solo puede tener letras';
  }
  if (contacto) {
    const c = String(contacto).trim();
    if (/\d/.test(c)) return 'El contacto no puede contener números';
    if (!soloLetras.test(c)) return 'El contacto solo puede tener letras';
    if (c.length > 60) return 'El contacto es demasiado largo';
  }
  if (telefono) {
    const t = String(telefono).trim();
    if (!/^[0-9()+\-\s]+$/.test(t)) return 'El teléfono solo puede tener números';
    const digitos = t.replace(/\D/g, '');
    if (digitos.length < 7 || digitos.length > 15) return 'El teléfono debe tener entre 7 y 15 dígitos';
  }
  return null; // sin errores
}

export const crearProveedor = async (req, res) => {
  try {
    const { nombre, contacto, telefono, rubro, insumoIds } = req.body;
    const errorVal = validarDatosProveedor({ nombre, contacto, telefono });
    if (errorVal) return res.status(400).json({ error: errorVal });
    // No permitir dos proveedores con el mismo nombre (así no aparece repetido en las listas).
    const nombreLimpio = String(nombre).trim();
    const duplicado = await prisma.proveedor.findFirst({ where: { nombre: nombreLimpio } });
    if (duplicado) return res.status(409).json({ error: `Ya existe un proveedor llamado "${nombreLimpio}"` });
    const proveedor = await prisma.proveedor.create({
      data: {
        nombre: String(nombre).trim(),
        contacto: contacto ? String(contacto).trim() : null,
        telefono: telefono ? String(telefono).trim() : null,
        rubro: rubro ? String(rubro).trim() : null,
        insumos: { create: insumoIdsAEnlace(insumoIds) },
      },
      include: incluirInsumosProv,
    });
    res.status(201).json(aplanarProveedor(proveedor));
  } catch (error) {
    console.error('Error al crear proveedor:', error);
    res.status(500).json({ error: 'Error al crear el proveedor' });
  }
};

export const editarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, contacto, telefono, rubro, insumoIds } = req.body;
    const errorVal = validarDatosProveedor({ nombre, contacto, telefono }, { nombreObligatorio: false });
    if (errorVal) return res.status(400).json({ error: errorVal });
    const data = {};
    if (nombre !== undefined) {
      const nombreLimpio = String(nombre).trim();
      // No chocar con OTRO proveedor que ya tenga ese nombre.
      const duplicado = await prisma.proveedor.findFirst({ where: { nombre: nombreLimpio, NOT: { id } } });
      if (duplicado) return res.status(409).json({ error: `Ya existe un proveedor llamado "${nombreLimpio}"` });
      data.nombre = nombreLimpio;
    }
    if (contacto !== undefined) data.contacto = contacto ? String(contacto).trim() : null;
    if (telefono !== undefined) data.telefono = telefono ? String(telefono).trim() : null;
    if (rubro !== undefined) data.rubro = rubro ? String(rubro).trim() : null;
    // Reemplaza la lista completa: borra los enlaces actuales y crea los nuevos.
    if (insumoIds !== undefined) data.insumos = { deleteMany: {}, create: insumoIdsAEnlace(insumoIds) };

    const proveedor = await prisma.proveedor.update({
      where: { id }, data,
      include: incluirInsumosProv,
    });
    res.json(aplanarProveedor(proveedor));
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Proveedor no encontrado' });
    console.error('Error al editar proveedor:', error);
    res.status(500).json({ error: 'Error al editar el proveedor' });
  }
};

export const eliminarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    // Si ya tiene compras registradas, no se borra (rompería el historial/kardex).
    const usados = await prisma.movimientoInventario.count({ where: { proveedorId: id } });
    if (usados > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: el proveedor tiene compras registradas en el historial' });
    }
    await prisma.proveedor.delete({ where: { id } });
    res.json({ eliminado: true });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Proveedor no encontrado' });
    console.error('Error al eliminar proveedor:', error);
    res.status(500).json({ error: 'Error al eliminar el proveedor' });
  }
};
