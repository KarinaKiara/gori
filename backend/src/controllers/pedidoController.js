import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearPedido = async (req, res) => {
  try {
    const { items, montoTotal } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Faltan datos requeridos (items)' });
    }

    // Usar la información del Guardián (Token JWT)
    // Si es ADMIN, no tiene sucursalId en el token, así que debe mandarlo en el body (o usar uno por defecto)
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
        precio: parseFloat(item.precio) || 0
      };
    }));

    // Crear el pedido en la base de datos
    const nuevoPedido = await prisma.pedido.create({
      data: {
        sucursalId: finalSucursalId,
        montoTotal: parseFloat(montoTotal) || 0,
        estado: 'PENDIENTE',
        origen: origen,
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

    // Obtener la instancia de socket.io
    // avisa a la cocina que hay una nueva orden
    const io = req.app.get('io');
    if (io) {
      io.to(finalSucursalId).emit('pedido-recibido', nuevoPedido);
    }

    res.status(201).json(nuevoPedido);
  } catch (error) {
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
    // Si no es admin, filtramos por su sucursal
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
