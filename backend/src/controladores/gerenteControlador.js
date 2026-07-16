import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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

export const cambiarRolEmpleado = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { id } = req.params;
    const { rol } = req.body;

    const rolesPermitidos = ['CAJERO', 'COCINERO'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: 'Solo puedes asignar roles CAJERO o COCINERO' });
    }

    // Verificar que el empleado pertenece a esta sucursal
    const empleado = await prisma.usuario.findFirst({
      where: { id, sucursalId }
    });

    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado en esta sucursal' });
    }

    // El tótem no es una persona: es la terminal de autoservicio. Si le cambian el rol,
    // la sucursal se queda sin tótem.
    if (empleado.rol === 'TOTEM') {
      return res.status(403).json({ error: 'El tótem es la terminal de autoservicio, no se le puede cambiar el rol' });
    }

    const actualizado = await prisma.usuario.update({
      where: { id },
      data: { rol }
    });

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

    const empleado = await prisma.usuario.findFirst({
      where: { id, sucursalId }
    });

    if (!empleado) {
      return res.status(404).json({ error: 'Empleado no encontrado en esta sucursal' });
    }

    // Proteger la terminal de autoservicio: si se borra, el tótem de la sucursal
    // se queda sin poder autenticarse y deja de tomar pedidos.
    if (empleado.rol === 'TOTEM') {
      return res.status(403).json({ error: 'El tótem es la terminal de autoservicio, no se puede dar de baja' });
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
    } else {
      fechaBase = new Date();
      fechaBase.setHours(0, 0, 0, 0);
    }
    const fechaFin = new Date(fechaBase);
    fechaFin.setHours(23, 59, 59, 999);

    const pedidosHoy = await prisma.pedido.findMany({
      where: { sucursalId, createdAt: { gte: fechaBase, lte: fechaFin } },
      include: {
        items: { include: { producto: { select: { nombre: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const totalVentas = pedidosHoy.reduce((sum, p) => sum + p.montoTotal, 0);
    const totalPOS = pedidosHoy.filter(p => p.origen === 'POS').length;
    const totalTotem = pedidosHoy.filter(p => p.origen === 'TOTEM').length;

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
        pedidosTotem: totalTotem
      },
      productoTop,
      ventasPorHora,
      ultimosPedidos: pedidosHoy.slice(0, 8)
    });
  } catch (error) {
    console.error('Error en reporte local:', error);
    res.status(500).json({ error: 'Error al generar el reporte local' });
  }
};
