import { PrismaClient } from '@prisma/client';
import { descontarInventarioPorPedido } from './inventarioControlador.js';

const prisma = new PrismaClient();

export const crearPedido = async (req, res) => {
  try {
    const { items, montoTotal, clienteRef, numeroPedido } = req.body;

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

    // El tótem NO cobra: su pedido nace "POR_COBRAR" y espera a que la caja lo cobre.
    // La caja (POS) cobra al instante, así que su pedido nace "PENDIENTE" (ya va a cocina).
    const estadoInicial = origen === 'TOTEM' ? 'POR_COBRAR' : 'PENDIENTE';

    // Crear el pedido en la base de datos
    const nuevoPedido = await prisma.pedido.create({
      data: {
        sucursalId: finalSucursalId,
        montoTotal: parseFloat(montoTotal) || 0,
        estado: estadoInicial,
        origen: origen,
        numeroPedido: numeroPedido ? parseInt(numeroPedido) : null,
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

    const io = req.app.get('io');
    let alertasInventario = [];

    if (estadoInicial === 'PENDIENTE') {
      // Pedido de caja (ya pagado): descuenta inventario y va directo a cocina.
      try {
        alertasInventario = await descontarInventarioPorPedido(nuevoPedido);
      } catch (errInv) {
        console.error('Error al descontar inventario (la venta continúa):', errInv);
      }
      if (io) {
        io.to(finalSucursalId).emit('pedido-recibido', nuevoPedido);
        if (alertasInventario.length > 0) {
          io.to(finalSucursalId).emit('alerta-inventario', alertasInventario);
        }
      }
    } else {
      // Pedido del tótem: aún no se cobra ni se descuenta inventario.
      // Avisamos a la CAJA para que aparezca en su lista de "por cobrar".
      if (io) {
        io.to(finalSucursalId).emit('pedido-por-cobrar', nuevoPedido);
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

// Lista de pedidos del tótem que esperan cobro en caja (para la vista de Caja)
export const obtenerPedidosPorCobrar = async (req, res) => {
  try {
    const rol = req.rol;
    const sucursalId = req.sucursalId;

    let whereClause = { estado: 'POR_COBRAR' };
    // Multi-tenant: cada caja solo ve los pedidos por cobrar de SU sucursal
    if (rol !== 'ADMIN') {
      whereClause.sucursalId = sucursalId;
    }

    const pedidos = await prisma.pedido.findMany({
      where: whereClause,
      include: { items: { include: { producto: true } } },
      orderBy: { createdAt: 'asc' }
    });

    res.json(pedidos);
  } catch (error) {
    console.error('Error al obtener pedidos por cobrar:', error);
    return res.status(500).json({ error: 'Error al obtener los pedidos por cobrar' });
  }
};

// Buscar un pedido POR_COBRAR por su código (clienteRef del QR) para cargarlo en la caja
export const buscarPedidoPorRef = async (req, res) => {
  try {
    const rol = req.rol;
    const sucursalId = req.sucursalId;
    let { clienteRef } = req.params;
    if (!clienteRef) return res.status(400).json({ error: 'Falta el código del pedido' });
    clienteRef = String(clienteRef).trim();
    // Por si el QR trae un prefijo tipo "GORI:xxxx", nos quedamos con lo último
    if (clienteRef.includes(':')) clienteRef = clienteRef.split(':').pop();

    const pedido = await prisma.pedido.findUnique({
      where: { clienteRef },
      include: { items: { include: { producto: true } } }
    });
    if (!pedido) return res.status(404).json({ error: 'No se encontró un pedido con ese código' });
    if (rol !== 'ADMIN' && pedido.sucursalId !== sucursalId) {
      return res.status(403).json({ error: 'El pedido es de otra sucursal' });
    }
    if (pedido.estado !== 'POR_COBRAR') {
      return res.status(400).json({ error: 'Este pedido ya fue cobrado o no está pendiente' });
    }
    res.json(pedido);
  } catch (error) {
    console.error('Error al buscar pedido por código:', error);
    return res.status(500).json({ error: 'Error al buscar el pedido' });
  }
};

// La caja cobra un pedido del tótem: recién aquí se descuenta inventario y pasa a cocina
export const cobrarPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const rol = req.rol;
    const sucursalId = req.sucursalId;

    const pedido = await prisma.pedido.findUnique({ where: { id } });
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    // Multi-tenant: no se puede cobrar un pedido de otra sucursal
    if (rol !== 'ADMIN' && pedido.sucursalId !== sucursalId) {
      return res.status(403).json({ error: 'Este pedido es de otra sucursal' });
    }
    if (pedido.estado !== 'POR_COBRAR') {
      return res.status(400).json({ error: 'Este pedido ya fue cobrado o no está disponible' });
    }

    // Marcar como pagado → ahora sí entra a la cola de cocina
    const pedidoActualizado = await prisma.pedido.update({
      where: { id },
      data: { estado: 'PENDIENTE' },
      include: { items: { include: { producto: true } } }
    });

    // Recién al cobrar se descuenta el inventario (así no se descuenta si no se paga)
    let alertasInventario = [];
    try {
      alertasInventario = await descontarInventarioPorPedido(pedidoActualizado);
    } catch (errInv) {
      console.error('Error al descontar inventario (cobro):', errInv);
    }

    const io = req.app.get('io');
    if (io) {
      io.to(pedidoActualizado.sucursalId).emit('pedido-recibido', pedidoActualizado); // a cocina (KDS)
      io.to(pedidoActualizado.sucursalId).emit('pedido-cobrado', pedidoActualizado);  // a caja (quitar de la lista)
      if (alertasInventario.length > 0) {
        io.to(pedidoActualizado.sucursalId).emit('alerta-inventario', alertasInventario);
      }
    }

    res.json({ ...pedidoActualizado, alertasInventario });
  } catch (error) {
    console.error('Error al cobrar el pedido:', error);
    res.status(500).json({ error: 'Error al cobrar el pedido' });
  }
};
