import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { validarHorario } from '../utilidades/horarios.js';
import * as reportes from '../servicios/reportes.js';

const prisma = new PrismaClient();

// HORARIO DE ATENCIÓN (solo el de SU sucursal)
//
// La sucursal se toma del token y nunca del cuerpo de la petición: así un gerente
// no puede modificar el horario de otra sucursal aunque mande su id a mano.

export const obtenerHorario = async (req, res) => {
  try {
    const sucursal = await prisma.sucursal.findUnique({
      where: { id: req.sucursalId },
      select: { id: true, nombre: true, horario: true }
    });
    if (!sucursal) return res.status(404).json({ error: 'Sucursal no encontrada' });
    res.json(sucursal);
  } catch (error) {
    console.error('Error al obtener el horario:', error);
    res.status(500).json({ error: 'Error al obtener el horario' });
  }
};

export const actualizarHorario = async (req, res) => {
  try {
    const revision = validarHorario(req.body?.horario);
    if (!revision.valido) return res.status(400).json({ error: revision.error });

    const sucursal = await prisma.sucursal.update({
      where: { id: req.sucursalId },
      data: { horario: revision.horario },
      select: { id: true, nombre: true, horario: true }
    });

    // Los tótems y la caja de esta sucursal actualizan su copia sin recargar
    req.app.get('io')?.to(sucursal.id).emit('horario-actualizado', revision.horario);

    res.json(sucursal);
  } catch (error) {
    console.error('Error al actualizar el horario:', error);
    res.status(500).json({ error: 'Error al actualizar el horario' });
  }
};

// GESTIÓN DE PERSONAL (Solo para la sucursal del Gerente)

export const obtenerPersonal = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;

    const personal = await prisma.usuario.findMany({
      where: {
        sucursalId,
        rol: { in: ['CAJERO', 'COCINERO', 'TOTEM'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(personal);
  } catch (error) {
    console.error('Error al obtener personal:', error);
    res.status(500).json({ error: 'Error al obtener el personal' });
  }
};

export const crearEmpleado = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { nombre, correo, contrasena, rol } = req.body;

    if (!nombre || !correo || !contrasena || !rol) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

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

    const rolesPermitidos = ['CAJERO', 'COCINERO'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: 'Solo puedes crear empleados con rol CAJERO o COCINERO' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const empleado = await prisma.usuario.create({
      data: { nombre: nombreTrim, correo: correoLower, contrasena: hash, rol, sucursalId }
    });

    res.status(201).json(empleado);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }
    console.error('Error al crear empleado:', error);
    res.status(500).json({ error: 'Error al crear el empleado' });
  }
};

// El gerente SOLO puede gestionar a su personal operativo. Nunca a otro gerente,
// ni a un admin, ni al tótem. (Un gerente sin sucursal no gestiona a nadie: evita
// que un gerente huérfano —sucursalId null— caiga sobre los admin, que también son null.)
const ROLES_GESTIONABLES = ['CAJERO', 'COCINERO'];

export const cambiarRolEmpleado = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { id } = req.params;
    const { rol } = req.body;

    if (!sucursalId) {
      return res.status(403).json({ error: 'No tienes una sucursal asignada' });
    }
    if (!ROLES_GESTIONABLES.includes(rol)) {
      return res.status(403).json({ error: 'Solo puedes asignar roles CAJERO o COCINERO' });
    }

    // Verificar que el empleado pertenece a esta sucursal
    const empleado = await prisma.usuario.findFirst({ where: { id, sucursalId } });
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado en esta sucursal' });
    }

    // Solo se puede tocar a cajeros y cocineros. Esto protege de un solo golpe al
    // tótem (terminal), a otros gerentes y a los administradores.
    if (!ROLES_GESTIONABLES.includes(empleado.rol)) {
      return res.status(403).json({ error: 'Solo puedes cambiar el rol de cajeros y cocineros' });
    }

    const actualizado = await prisma.usuario.update({ where: { id }, data: { rol } });
    res.json(actualizado);
  } catch (error) {
    console.error('Error al cambiar rol:', error);
    res.status(500).json({ error: 'Error al cambiar el rol del empleado' });
  }
};

export const eliminarEmpleado = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { id } = req.params;

    if (!sucursalId) {
      return res.status(403).json({ error: 'No tienes una sucursal asignada' });
    }

    const empleado = await prisma.usuario.findFirst({ where: { id, sucursalId } });
    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado en esta sucursal' });
    }

    // Solo cajeros y cocineros. Protege al tótem, a otros gerentes y a los admin.
    if (!ROLES_GESTIONABLES.includes(empleado.rol)) {
      return res.status(403).json({ error: 'Solo puedes dar de baja a cajeros y cocineros' });
    }

    await prisma.usuario.delete({ where: { id } });
    res.json({ mensaje: 'Empleado dado de baja correctamente' });
  } catch (error) {
    console.error('Error al eliminar empleado:', error);
    res.status(500).json({ error: 'Error al dar de baja al empleado' });
  }
};

// REPORTES LOCALES (Solo de la sucursal del Gerente)

export const reporteLocal = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;

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

    // Solo pedidos ya cobrados cuentan como venta (los del tótem "POR_COBRAR" no)
    const pedidosHoy = await prisma.pedido.findMany({
      where: { sucursalId, createdAt: { gte: fechaBase, lte: fechaFin }, estado: { not: 'POR_COBRAR' } },
      include: {
        items: { include: { producto: { select: { nombre: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalVentas = pedidosHoy.reduce((sum, p) => sum + p.montoTotal, 0);
    const totalPOS = pedidosHoy.filter(p => p.origen === 'POS').length;
    const totalTotem = pedidosHoy.filter(p => p.origen === 'TOTEM').length;

    // Desglose del DINERO (para el reporte): por canal y por método de pago
    const suma = (arr) => arr.reduce((s, p) => s + p.montoTotal, 0);
    const ventasPOS = suma(pedidosHoy.filter(p => p.origen === 'POS'));
    const ventasTotem = suma(pedidosHoy.filter(p => p.origen === 'TOTEM'));
    const ventasEfectivo = suma(pedidosHoy.filter(p => p.metodoPago === 'efectivo'));
    const ventasQR = suma(pedidosHoy.filter(p => p.metodoPago === 'qr'));
    const ticketPromedio = pedidosHoy.length ? totalVentas / pedidosHoy.length : 0;

    // Producto más vendido
    const conteoProductos = {};
    pedidosHoy.forEach(p => {
      p.items.forEach(item => {
        const nombre = item.producto.nombre;
        conteoProductos[nombre] = (conteoProductos[nombre] || 0) + item.cantidad;
      });
    });

    const productoTop = Object.entries(conteoProductos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }));

    // Ventas por hora (para gráfico de línea)
    const ventasPorHora = Array.from({ length: 24 }, (_, h) => {
      const pedidosHora = pedidosHoy.filter(p => new Date(p.createdAt).getHours() === h);
      return { hora: h, total: pedidosHora.reduce((sum, p) => sum + p.montoTotal, 0), pedidos: pedidosHora.length };
    });

    const sucursal = await prisma.sucursal.findUnique({
      where: { id: sucursalId },
      select: { nombre: true, ubicacion: true }
    });

    res.json({
      sucursal,
      fecha: fechaBase.toISOString().split('T')[0],
      resumen: {
        totalVentas,
        totalPedidos: pedidosHoy.length,
        pedidosPOS: totalPOS,
        pedidosTotem: totalTotem,
        // Dinero desglosado (para el reporte detallado)
        ventasPOS,
        ventasTotem,
        ventasEfectivo,
        ventasQR,
        ticketPromedio
      },
      productoTop,
      ventasPorHora,
      ultimosPedidos: pedidosHoy.slice(0, 12)
    });
  } catch (error) {
    console.error('Error en reporte local:', error);
    res.status(500).json({ error: 'Error al generar el reporte local' });
  }
};

// ============================================================
//  REPORTES AVANZADOS (de SU sucursal)
// ============================================================

// A · Detalle de un pedido: quién atendió, qué pidió y qué insumos consumió.
export const reporteDetallePedido = async (req, res) => {
  try {
    const detalle = await reportes.detallePedido(req.params.id, { sucursalId: req.sucursalId });
    if (!detalle) return res.status(404).json({ error: 'Pedido no encontrado en tu sucursal' });
    res.json(detalle);
  } catch (error) {
    console.error('Error en detalle de pedido:', error);
    res.status(500).json({ error: 'Error al obtener el detalle del pedido' });
  }
};

// B · Inventario por receta: stock por insumo y cuántos platos rinde.
export const reporteInventarioReceta = async (req, res) => {
  try {
    const { desde, hasta } = reportes.parsePeriodo(req.query);
    const data = await reportes.inventarioPorReceta(req.sucursalId, { desde, hasta });
    res.json({ desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0], ...data });
  } catch (error) {
    console.error('Error en reporte de inventario:', error);
    res.status(500).json({ error: 'Error al generar el reporte de inventario' });
  }
};

// Lista de proveedores (catálogo maestro global) para elegir al reponer stock.
// El gerente solo lee: el alta/edición la hace el admin.
export const listarProveedoresGerente = async (req, res) => {
  try {
    const proveedores = await prisma.proveedor.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true, nombre: true, rubro: true,
        // Solo los insumos de SU sucursal: con eso la pantalla filtra qué
        // proveedor puede reponer cada insumo.
        insumos: { where: { sucursalId: req.sucursalId }, select: { id: true } },
      },
    });
    res.json(proveedores.map((p) => ({
      id: p.id, nombre: p.nombre, rubro: p.rubro,
      insumoIds: p.insumos.map((i) => i.id),
    })));
  } catch (error) {
    console.error('Error al listar proveedores (gerente):', error);
    res.status(500).json({ error: 'Error al listar los proveedores' });
  }
};

// C · Ventas y pagos por periodo (tótem vs caja, efectivo vs QR).
export const reporteVentasPagos = async (req, res) => {
  try {
    const { desde, hasta } = reportes.parsePeriodo(req.query);
    const data = await reportes.ventasYPagos({ sucursalId: req.sucursalId, desde, hasta });
    res.json({ desde: desde.toISOString().split('T')[0], hasta: hasta.toISOString().split('T')[0], ...data });
  } catch (error) {
    console.error('Error en reporte de ventas y pagos:', error);
    res.status(500).json({ error: 'Error al generar el reporte de ventas y pagos' });
  }
};
