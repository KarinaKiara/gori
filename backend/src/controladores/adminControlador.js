import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
    const { nombre, ubicacion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });

    const sucursal = await prisma.sucursal.create({
      data: { nombre, ubicacion: ubicacion || '' }
    });
    res.status(201).json(sucursal);
  } catch (error) {
    console.error('Error al crear sucursal:', error);
    res.status(500).json({ error: 'Error al crear la sucursal' });
  }
};

export const editarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, ubicacion } = req.body;

    const sucursal = await prisma.sucursal.update({
      where: { id },
      data: { nombre, ubicacion }
    });
    res.json(sucursal);
  } catch (error) {
    console.error('Error al editar sucursal:', error);
    res.status(500).json({ error: 'Error al editar la sucursal' });
  }
};

export const eliminarSucursal = async (req, res) => {
  try {
    const { id } = req.params;
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
    } else {
      fechaBase = new Date();
      fechaBase.setHours(0, 0, 0, 0);
    }
    const fechaFin = new Date(fechaBase);
    fechaFin.setHours(23, 59, 59, 999);

    const pedidosHoy = await prisma.pedido.findMany({
      where: { createdAt: { gte: fechaBase, lte: fechaFin } },
      include: { sucursal: { select: { nombre: true } } }
    });

    const totalVentasHoy = pedidosHoy.reduce((sum, p) => sum + p.montoTotal, 0);
    const totalPedidosHoy = pedidosHoy.length;

    // Ventas por sucursal agrupado
    const sucursales = await prisma.sucursal.findMany({
      include: {
        pedidos: { where: { createdAt: { gte: fechaBase, lte: fechaFin } } },
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

    // Últimos pedidos globales
    const ultimosPedidos = await prisma.pedido.findMany({
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
        pedidosTotem: pedidosHoy.filter(p => p.origen === 'TOTEM').length
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
