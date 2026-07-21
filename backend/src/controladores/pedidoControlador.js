import { PrismaClient } from '@prisma/client';
import { descontarInventarioPorPedido } from './inventarioControlador.js';
import { sucursalAbierta, ensaladaDisponible } from '../utilidades/horarios.js';

const prisma = new PrismaClient();

export const crearPedido = async (req, res) => {
  try {
    // El monto y el número de turno NO se leen del cuerpo: los calcula el servidor
    // (ver montoServidor y la asignación de turno más abajo).
    const { items, clienteRef, metodoPago } = req.body;

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

    // ── Revalidar el HORARIO en el servidor (solo pedidos del tótem/cliente) ──
    // No se confía en el reloj del cliente: se puede cambiar la hora del celular.
    if (origen === 'TOTEM') {
      const sucursal = await prisma.sucursal.findUnique({ where: { id: finalSucursalId } });
      const estado = sucursalAbierta(sucursal);
      if (!estado.abierta) {
        return res.status(409).json({ error: estado.motivo || 'La sucursal está cerrada en este momento' });
      }
      // La ensalada tiene su propio horario (12:00-21:00)
      const pideEnsalada = items.some(it => (it.nombre || '').toLowerCase().includes('ensalada'));
      if (pideEnsalada && !ensaladaDisponible()) {
        return res.status(409).json({ error: 'La ensalada solo está disponible de 12:00 a 21:00' });
      }
    }

    // ── Validar y mapear cada item usando SIEMPRE los datos reales de la BD ──
    // Nada de precios ni montos del cliente: el servidor manda.
    const itemsConUUID = [];
    for (const item of items) {
      // #3: el producto DEBE existir en esta sucursal (ya no se crean "fantasmas")
      const productoReal = await prisma.producto.findFirst({
        where: { nombre: item.nombre || '', sucursalId: finalSucursalId }
      });
      if (!productoReal) {
        return res.status(400).json({ error: `Producto no válido: "${item.nombre || '—'}"` });
      }
      // El gerente puede desactivar un plato en su sucursal (p.ej. un local que solo
      // vende brasa). Las presas y guarniciones incluidas nunca se bloquean: son
      // parte de otro plato, no se piden sueltas.
      const esIncluidoItem = item.detalle === 'presa' || item.detalle === 'guarnición';
      if (!productoReal.estaDisponible && !esIncluidoItem) {
        return res.status(409).json({ error: `"${productoReal.nombre}" no está disponible en esta sucursal` });
      }

      // #2: cantidad válida (entero, entre 1 y 100)
      const cantidad = parseInt(item.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
        return res.status(400).json({ error: 'Cantidad no válida en el pedido' });
      }

      // #1: el PRECIO lo pone el servidor. Presas y guarniciones van incluidas (Bs 0);
      //     los demás toman el precio real del producto en la base de datos.
      const esIncluido = item.detalle === 'presa' || item.detalle === 'guarnición';
      const precioReal = esIncluido ? 0 : productoReal.precio;

      itemsConUUID.push({
        productoId: productoReal.id,
        cantidad,
        precio: precioReal,
        detalle: item.detalle || null
      });
    }

    // ── Verificar que haya insumos suficientes ANTES de aceptar el pedido ──
    // Se bloquea aquí, al crear, y no al cobrar: si un pedido del tótem se
    // aceptara sin stock, la caja quedaría con una comanda que no puede cobrar.
    // Se suma el consumo de todas las recetas y se compara con el stock real.
    const consumo = new Map(); // insumoId -> cantidad total que pide este pedido
    for (const it of itemsConUUID) {
      const receta = await prisma.receta.findUnique({
        where: { productoId: it.productoId },
        include: { insumos: { include: { insumo: { select: { nombre: true } } } } }
      });
      if (!receta) continue; // productos sin receta (bebidas) no consumen inventario
      for (const ri of receta.insumos) {
        const previo = consumo.get(ri.insumoId) || { cantidad: 0, nombre: ri.insumo.nombre };
        previo.cantidad += ri.cantidad * it.cantidad;
        consumo.set(ri.insumoId, previo);
      }
    }
    for (const [insumoId, need] of consumo) {
      const insumo = await prisma.insumo.findUnique({ where: { id: insumoId }, select: { stockActual: true, unidad: true } });
      if (insumo && insumo.stockActual < need.cantidad) {
        return res.status(409).json({
          error: `No hay suficiente ${need.nombre} para preparar este pedido (quedan ${insumo.stockActual} ${insumo.unidad})`
        });
      }
    }

    // #1: el MONTO TOTAL lo calcula el servidor a partir de los precios reales.
    const montoServidor = itemsConUUID.reduce((s, it) => s + it.precio * it.cantidad, 0);

    // El tótem NO cobra: su pedido nace "POR_COBRAR" y espera a que la caja lo cobre.
    // La caja (POS) cobra al instante, así que su pedido nace "PENDIENTE" (ya va a cocina).
    const estadoInicial = origen === 'TOTEM' ? 'POR_COBRAR' : 'PENDIENTE';

    // #4: el Nº de TURNO lo asigna el SERVIDOR, igual que el precio y el monto.
    // Antes lo mandaba el dispositivo, pero cada uno lleva su contador en su propio
    // localStorage y no se ven entre sí: el tótem del local y el celular de cada
    // cliente empezaban todos en 1 y repetían turno. El servidor es el único que ve
    // todos los pedidos de la sucursal. Se reinicia cada día y es propio de cada local.
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);

    // Se asigna dentro de una transacción que ARRANCA bloqueando la fila de la sucursal
    // (SELECT ... FOR UPDATE). Sin ese bloqueo, dos pedidos simultáneos leen los dos el
    // mismo "último turno" y se llevan el mismo número: se comprobó en las pruebas de
    // carga (20 pedidos a la vez producían solo 2 turnos distintos). El bloqueo es por
    // sucursal, así que los locales no se estorban entre sí.
    const nuevoPedido = await prisma.$transaction(async (tx) => {
      // OJO con el nombre de la tabla: es `Sucursal`, con mayúscula, tal como lo crea
      // Prisma. MySQL en Windows no distingue mayúsculas (lower_case_table_names=1) y
      // "sucursal" pasaba en desarrollo, pero en Linux SÍ distingue (Render/Aiven usan 0)
      // y la consulta moría con "Table 'sucursal' doesn't exist". Como el error ocurría
      // dentro de la transacción, salía como un 500 genérico y NINGÚN pedido podía
      // crearse en producción. Va entre comillas para que quede explícito.
      await tx.$queryRaw`SELECT id FROM \`Sucursal\` WHERE id = ${finalSucursalId} FOR UPDATE`;

      const ultimo = await tx.pedido.findFirst({
        where: { sucursalId: finalSucursalId, createdAt: { gte: inicioDia } },
        orderBy: { numeroPedido: 'desc' },
        select: { numeroPedido: true }
      });
      const turno = (ultimo?.numeroPedido || 0) + 1;

      return tx.pedido.create({
        data: {
          sucursalId: finalSucursalId,
          montoTotal: montoServidor, // #1: calculado por el servidor, no por el cliente
          estado: estadoInicial,
          origen: origen,
          numeroPedido: turno,
          metodoPago: metodoPago || null,
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
    });

    const io = req.app.get('io');
    let alertasInventario = [];

    if (estadoInicial === 'PENDIENTE') {
      // Pedido de caja (ya pagado): descuenta inventario y va directo a cocina.
      try {
        alertasInventario = await descontarInventarioPorPedido(nuevoPedido, io);
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

// Estado de un pedido por su código (clienteRef): lo usa el CLIENTE para seguir su pedido
// en vivo (POR_COBRAR → PENDIENTE → EN PREPARACION → LISTO). A diferencia de buscar,
// devuelve el estado en cualquier fase (no solo POR_COBRAR).
export const estadoPedidoPorRef = async (req, res) => {
  try {
    const rol = req.rol;
    const sucursalId = req.sucursalId;
    let { clienteRef } = req.params;
    if (!clienteRef) return res.status(400).json({ error: 'Falta el código del pedido' });
    clienteRef = String(clienteRef).trim();
    if (clienteRef.includes(':')) clienteRef = clienteRef.split(':').pop();

    const pedido = await prisma.pedido.findUnique({
      where: { clienteRef },
      select: { estado: true, numeroPedido: true, sucursalId: true }
    });
    if (!pedido) return res.status(404).json({ error: 'No se encontró el pedido' });
    if (rol !== 'ADMIN' && pedido.sucursalId !== sucursalId) {
      return res.status(403).json({ error: 'El pedido es de otra sucursal' });
    }
    res.json({ estado: pedido.estado, numeroPedido: pedido.numeroPedido });
  } catch (error) {
    console.error('Error al consultar el estado del pedido:', error);
    return res.status(500).json({ error: 'Error al consultar el estado del pedido' });
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

    const io = req.app.get('io');

    // Recién al cobrar se descuenta el inventario (así no se descuenta si no se paga)
    let alertasInventario = [];
    try {
      alertasInventario = await descontarInventarioPorPedido(pedidoActualizado, io);
    } catch (errInv) {
      console.error('Error al descontar inventario (cobro):', errInv);
    }

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
