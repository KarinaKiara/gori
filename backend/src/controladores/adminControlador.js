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
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

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
        data: { nombre, ubicacion: ubicacion || '', horario: revision.horario }
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
    if (nombre !== undefined) data.nombre = nombre.trim();
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

    if (pedidos || productos || insumos || usuarios) {
      const partes = [];
      if (pedidos) partes.push(`${pedidos} pedido(s)`);
      if (usuarios) partes.push(`${usuarios} usuario(s)`);
      if (productos) partes.push(`${productos} producto(s)`);
      if (insumos) partes.push(`${insumos} insumo(s)`);
      return res.status(409).json({
        error: `No se puede eliminar: la sucursal tiene ${partes.join(', ')}. Reasigna o elimina esos datos primero.`
      });
    }

    await prisma.sucursal.delete({ where: { id } });
    res.json({ mensaje: 'Sucursal eliminada correctamente' });
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
    // Soporte para filtro de fecha: ?fecha=YYYY-MM-DD (default: hoy)
    let fechaBase;
    if (req.query.fecha) {
      fechaBase = new Date(req.query.fecha + 'T00:00:00');
      if (isNaN(fechaBase.getTime())) {
        return res.status(400).json({ error: 'Fecha inválida' });
      }
    } else {
      fechaBase = new Date();
      fechaBase.setHours(0, 0, 0, 0);
    }
    const fechaFin = new Date(fechaBase);
    fechaFin.setHours(23, 59, 59, 999);

    // Un pedido cuenta como VENTA solo cuando ya se cobró. Los del tótem nacen
    // "POR_COBRAR" (aún sin pagar) y no deben sumar a los ingresos.
    const rangoFecha = { createdAt: { gte: fechaBase, lte: fechaFin } };
    const soloCobrados = { estado: { not: 'POR_COBRAR' } };

    const pedidosHoy = await prisma.pedido.findMany({
      where: { ...rangoFecha, ...soloCobrados },
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

    // Ventas por sucursal agrupado
    const sucursales = await prisma.sucursal.findMany({
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
      where: { ...rangoFecha, ...soloCobrados },
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        sucursal: { select: { nombre: true } },
        items: { include: { producto: { select: { nombre: true } } } }
      }
    });

    res.json({
      fecha: fechaBase.toISOString().split('T')[0],
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
