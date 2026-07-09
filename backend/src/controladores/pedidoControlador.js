import { PrismaClient } from '@prisma/client';
import { descontarInventarioPorPedido } from './inventarioControlador.js';

const prisma = new PrismaClient();

export const crearPedido = async (req, res) => {
  try {
    const { items, montoTotal, clienteRef } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Faltan datos requeridos (items)' });
    }

    // Idempotencia offline: si este pedido ya llegó antes (misma etiqueta única),
    // no lo creamos de nuevo; devolvemos el que ya existe.
    if (clienteRef) {
      const existente = await prisma.pedido.findUnique({
        where: { clienteRef },
        include: { items: { include: { producto: true } } }
      });
      if (existente) {
        return res.status(200).json({ ...existente, duplicado: true, alertasInventario: [] });
      }
    }

    // Usar la información del Guardián (Token JWT)
    // Si es ADMIN, no tiene sucursalId 
    let finalSucursalId = req.sucursalId;
    const usuarioId = req.usuarioId;
    const rol = req.rol;

    if (!finalSucursalId) {
      if (rol === 'ADMIN' && req.body.sucursalId) {
        finalSucursalId = req.body.sucursalId;
      } else if (rol === 'ADMIN') {
        // Si el admin no manda sucursalId, buscamos la primera para que no dé error
        const primeraSucursal = await prisma.sucursal.findFirst();
        finalSucursalId = primeraSucursal.id;
      } else {
        return res.status(403).json({ error: 'No tienes una sucursal asignada.' });
      }
    }

    const origen = rol === 'TOTEM' ? 'TOTEM' : 'POS';

    // Buscar los UUIDs reales de los productos basados en sus nombres
    const itemsConUUID = await Promise.all(items.map(async (item) => {
      let productoReal = await prisma.producto.findFirst({
        where: {
          nombre: item.nombre || 'Producto Desconocido',
          sucursalId: finalSucursalId
        }
      });

      // Si no existe, usamos un ID genérico o lo creamos para no romper el flujo
      if (!productoReal) {
        productoReal = await prisma.producto.create({
          data: {
            nombre: item.nombre || 'Producto Nuevo',
            precio: parseFloat(item.precio) || 0,
            categoria: 'General',
            sucursalId: finalSucursalId
          }
        });
      }

      return {
        productoId: productoReal.id,
        cantidad: parseInt(item.cantidad) || 1,
        precio: parseFloat(item.precio) || 0,
        detalle: item.detalle || null
      };
    }));

    // Crear el pedido en la base de datos
    const nuevoPedido = await prisma.pedido.create({
      data: {
        sucursalId: finalSucursalId,
        montoTotal: parseFloat(montoTotal) || 0,
        estado: 'PENDIENTE',
        origen: origen,
        clienteRef: clienteRef || null,
        usuarioId: rol !== 'TOTEM' ? usuarioId : null,
        items: {
          create: itemsConUUID
        }
      },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    });

    // Descontar el inventario según las recetas (no bloquea la venta; solo alerta)
    let alertasInventario = [];
    try {
      alertasInventario = await descontarInventarioPorPedido(nuevoPedido);
    } catch (errInv) {
      console.error('Error al descontar inventario (la venta continúa):', errInv);
    }

    // Obtener la instancia de socket.io
    const io = req.app.get('io');
    if (io) {
      // Emitir el evento a la sala de la sucursal específica
      io.to(finalSucursalId).emit('pedido-recibido', nuevoPedido);
      // Avisar a la sucursal si algún insumo quedó bajo el mínimo
      if (alertasInventario.length > 0) {
        io.to(finalSucursalId).emit('alerta-inventario', alertasInventario);
      }
    }

    res.status(201).json({ ...nuevoPedido, alertasInventario });
  } catch (error) {
    // Carrera de sincronización: si otro envío ya creó este pedido (misma etiqueta), lo devolvemos
    if (error.code === 'P2002' && req.body.clienteRef) {
      const existente = await prisma.pedido.findUnique({
        where: { clienteRef: req.body.clienteRef },
        include: { items: { include: { producto: true } } }
      });
      if (existente) return res.status(200).json({ ...existente, duplicado: true, alertasInventario: [] });
    }
    console.error('Error al crear pedido:', error);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
};

export const obtenerPedidosActivos = async (req, res) => {
  try {
    const rol = req.rol;
    const sucursalId = req.sucursalId;

    // Condición base
    let whereClause = {
      estado: {
        in: ['PENDIENTE', 'EN PREPARACION']
      }
    };

    // MAGIA MULTI-TENANT: Si no es admin, filtramos a la fuerza por su sucursal
    if (rol !== 'ADMIN') {
      whereClause.sucursalId = sucursalId;
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            producto: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos activos:', error);
    res.status(500).json({ error: 'Error al obtener los pedidos' });
  }
};

export const actualizarEstadoPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: { estado },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      }
    });

    // Notificar cambio de estado
    const io = req.app.get('io');
    if (io) {
      io.to(pedidoActualizado.sucursalId).emit('pedido-actualizado', pedidoActualizado);
    }

    res.json(pedidoActualizado);
  } catch (error) {
    console.error('Error al actualizar estado:', error);
    res.status(500).json({ error: 'Error al actualizar el estado del pedido' });
  }
};
