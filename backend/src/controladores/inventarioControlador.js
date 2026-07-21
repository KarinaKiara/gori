import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Avisa a las pantallas de la sucursal que cambió el stock de unos insumos.
// Lo escuchan la caja y el tótem para quitar o poner el cartel de "Agotado" sin
// que nadie recargue. Antes solo se emitía al VENDER, así que una reposición del
// gerente no llegaba: el plato seguía viéndose agotado hasta el refresco siguiente.
const avisarStock = (req, sucursalId, insumos) => {
  const io = req.app.get('io');
  if (!io || !insumos?.length) return;
  io.to(sucursalId).emit('inventario-actualizado', insumos.map(i => ({
    id: i.id, nombre: i.nombre, unidad: i.unidad,
    stockActual: i.stockActual, stockMinimo: i.stockMinimo
  })));
};

// ============================================================
//  GESTIÓN DE INSUMOS (por sucursal del Gerente)
// ============================================================

export const listarInsumos = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const insumos = await prisma.insumo.findMany({
      where: { sucursalId },
      orderBy: { nombre: 'asc' }
    });
    res.json(insumos);
  } catch (error) {
    console.error('Error al listar insumos:', error);
    res.status(500).json({ error: 'Error al obtener los insumos' });
  }
};

export const crearInsumo = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { nombre, unidad, stockActual, stockMinimo } = req.body;

    if (!nombre?.trim() || !unidad?.trim()) {
      return res.status(400).json({ error: 'El nombre y la unidad son requeridos' });
    }
    const stockIni = parseFloat(stockActual) || 0;
    const minimo = parseFloat(stockMinimo) || 0;
    if (stockIni < 0 || minimo < 0) {
      return res.status(400).json({ error: 'El stock y el mínimo no pueden ser negativos' });
    }

    const insumo = await prisma.insumo.create({
      data: { sucursalId, nombre: nombre.trim(), unidad: unidad.trim(), stockActual: stockIni, stockMinimo: minimo }
    });

    // Movimiento de stock inicial (si aplica)
    if (stockIni > 0) {
      await prisma.movimientoInventario.create({
        data: { sucursalId, insumoId: insumo.id, tipo: 'ENTRADA_REPOSICION', cantidad: stockIni, stockAntes: 0, stockDespues: stockIni, motivo: 'Stock inicial' }
      });
    }

    res.status(201).json(insumo);
  } catch (error) {
    console.error('Error al crear insumo:', error);
    res.status(500).json({ error: 'Error al crear el insumo' });
  }
};

export const actualizarInsumo = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { id } = req.params;
    const { nombre, unidad, stockMinimo, stockActual, agregar, motivo } = req.body;

    const insumo = await prisma.insumo.findFirst({ where: { id, sucursalId } });
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado en esta sucursal' });

    const data = {};
    if (nombre !== undefined) data.nombre = String(nombre).trim();
    if (unidad !== undefined) data.unidad = String(unidad).trim();
    if (stockMinimo !== undefined) data.stockMinimo = parseFloat(stockMinimo) || 0;

    // REPOSICIÓN ("agregar"): el servidor suma sobre el stock real del momento.
    // Es la vía correcta para comprar materia prima: si hubo ventas mientras el
    // gerente tenía la pantalla abierta, NO se pierden.
    if (agregar !== undefined) {
      const cant = parseFloat(agregar);
      if (!(cant > 0)) return res.status(400).json({ error: 'La cantidad a reponer debe ser mayor a 0' });

      
      const actualizado = await prisma.insumo.update({
        where: { id },
        data: { ...data, stockActual: { increment: cant } }
      });
      await prisma.movimientoInventario.create({
        data: {
          sucursalId, insumoId: id, tipo: 'ENTRADA_REPOSICION',
          cantidad: cant,
          stockAntes: actualizado.stockActual - cant,
          stockDespues: actualizado.stockActual,
          motivo: motivo || 'Reposición de stock'
        }
      });
      avisarStock(req, sucursalId, [actualizado]);
      return res.json(actualizado);
    }

    // AJUSTE MANUAL (stockActual): fija un valor absoluto (inventario físico/corrección).
    let movimiento = null;
    if (stockActual !== undefined && parseFloat(stockActual) !== insumo.stockActual) {
      const nuevo = parseFloat(stockActual) || 0;
      if (nuevo < 0) return res.status(400).json({ error: 'El stock no puede ser negativo' });
      const delta = nuevo - insumo.stockActual;
      data.stockActual = nuevo;
      movimiento = {
        sucursalId, insumoId: id,
        tipo: delta > 0 ? 'ENTRADA_REPOSICION' : 'AJUSTE_MANUAL',
        cantidad: Math.abs(delta), stockAntes: insumo.stockActual, stockDespues: nuevo,
        motivo: motivo || (delta > 0 ? 'Reposición de stock' : 'Ajuste manual')
      };
    }

    const actualizado = await prisma.insumo.update({ where: { id }, data });
    if (movimiento) await prisma.movimientoInventario.create({ data: movimiento });

    if (movimiento) avisarStock(req, sucursalId, [actualizado]);
    res.json(actualizado);
  } catch (error) {
    console.error('Error al actualizar insumo:', error);
    res.status(500).json({ error: 'Error al actualizar el insumo' });
  }
};

export const eliminarInsumo = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { id } = req.params;

    const insumo = await prisma.insumo.findFirst({ where: { id, sucursalId } });
    if (!insumo) return res.status(404).json({ error: 'Insumo no encontrado en esta sucursal' });

    const enRecetas = await prisma.recetaInsumo.count({ where: { insumoId: id } });
    if (enRecetas > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: el insumo se usa en una o más recetas' });
    }
    const conHistorial = await prisma.movimientoInventario.count({ where: { insumoId: id } });
    if (conHistorial > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: el insumo tiene movimientos registrados' });
    }

    await prisma.insumo.delete({ where: { id } });
    res.json({ mensaje: 'Insumo eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar insumo:', error);
    res.status(500).json({ error: 'Error al eliminar el insumo' });
  }
};

// ── COMPRA DE POLLOS ENTEROS ──
// El gerente compra pollos enteros y el sistema los "despieza" solo: por cada pollo
// suma las presas que salen de él (por defecto 2 de cada una: 2 piernas, 2 alas, etc.).
// Cada presa se repone de forma atómica y queda registrada como movimiento.
export const comprarPollos = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { cantidadPollos, distribucion } = req.body;

    const pollos = parseInt(cantidadPollos, 10);
    if (!(pollos > 0)) return res.status(400).json({ error: 'La cantidad de pollos debe ser un número mayor a 0' });
    if (!Array.isArray(distribucion) || !distribucion.length) {
      return res.status(400).json({ error: 'No hay presas registradas para repartir el pollo' });
    }

    const actualizados = []; // para avisar a la caja y al tótem al terminar
    const resultado = await prisma.$transaction(async (tx) => {
      const salidas = [];
      for (const d of distribucion) {
        const porPollo = parseInt(d.porPollo, 10);
        if (!(porPollo > 0)) continue; // presa que no sale de este pollo: se omite
        // Solo presas de ESTA sucursal (aislamiento multi-tenant)
        const insumo = await tx.insumo.findFirst({ where: { id: d.insumoId, sucursalId } });
        if (!insumo) continue;
        const total = pollos * porPollo;
        const actualizado = await tx.insumo.update({
          where: { id: insumo.id },
          data: { stockActual: { increment: total } }
        });
        await tx.movimientoInventario.create({
          data: {
            sucursalId, insumoId: insumo.id, tipo: 'ENTRADA_REPOSICION',
            cantidad: total,
            stockAntes: actualizado.stockActual - total,
            stockDespues: actualizado.stockActual,
            motivo: `Despiece de ${pollos} pollo(s) entero(s)`
          }
        });
        salidas.push({ insumo: insumo.nombre, agregado: total, stock: actualizado.stockActual });
        actualizados.push(actualizado);
      }
      return salidas;
    });

    avisarStock(req, sucursalId, actualizados);

    if (!resultado.length) return res.status(400).json({ error: 'No se repuso ninguna presa (revisa las cantidades por pollo)' });
    res.json({ pollos, presas: resultado });
  } catch (error) {
    console.error('Error al comprar pollos:', error);
    res.status(500).json({ error: 'Error al registrar la compra de pollos' });
  }
};

// ============================================================
//  RECETAS (maestro-detalle: producto -> insumos con cantidad)
// ============================================================

export const listarProductos = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const productos = await prisma.producto.findMany({
      where: { sucursalId },
      orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
      include: { receta: { include: { insumos: true } } }
    });
    res.json(productos);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
};

export const obtenerReceta = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { productoId } = req.params;
    const producto = await prisma.producto.findFirst({
      where: { id: productoId, sucursalId },
      include: { receta: { include: { insumos: { include: { insumo: true } } } } }
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado en esta sucursal' });
    res.json(producto.receta || { productoId, insumos: [] });
  } catch (error) {
    console.error('Error al obtener receta:', error);
    res.status(500).json({ error: 'Error al obtener la receta' });
  }
};

export const guardarReceta = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const { productoId } = req.params;
    const { insumos } = req.body; // [{ insumoId, cantidad }]

    const producto = await prisma.producto.findFirst({ where: { id: productoId, sucursalId } });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado en esta sucursal' });

    const detalle = (Array.isArray(insumos) ? insumos : [])
      .filter(i => i.insumoId && parseFloat(i.cantidad) > 0)
      .map(i => ({ insumoId: i.insumoId, cantidad: parseFloat(i.cantidad) }));

    const receta = await prisma.$transaction(async (tx) => {
      let r = await tx.receta.findUnique({ where: { productoId } });
      if (!r) {
        r = await tx.receta.create({ data: { productoId, sucursalId } });
      } else {
        await tx.recetaInsumo.deleteMany({ where: { recetaId: r.id } });
      }
      if (detalle.length) {
        await tx.recetaInsumo.createMany({ data: detalle.map(d => ({ recetaId: r.id, ...d })) });
      }
      return tx.receta.findUnique({ where: { id: r.id }, include: { insumos: { include: { insumo: true } } } });
    });

    res.json(receta);
  } catch (error) {
    console.error('Error al guardar receta:', error);
    res.status(500).json({ error: 'Error al guardar la receta' });
  }
};

// ============================================================
//  ALERTAS Y REPORTES
// ============================================================

export const alertasStock = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    const insumos = await prisma.insumo.findMany({ where: { sucursalId }, orderBy: { nombre: 'asc' } });
    const bajos = insumos.filter(i => i.stockActual <= i.stockMinimo);
    res.json(bajos);
  } catch (error) {
    console.error('Error en alertas de stock:', error);
    res.status(500).json({ error: 'Error al obtener las alertas de stock' });
  }
};

export const reporteConsumo = async (req, res) => {
  try {
    const sucursalId = req.sucursalId;
    // Periodo: ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (default: últimos 7 días)
    const hasta = req.query.hasta ? new Date(req.query.hasta + 'T23:59:59') : new Date();
    const desde = req.query.desde ? new Date(req.query.desde + 'T00:00:00') : new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const movimientos = await prisma.movimientoInventario.findMany({
      where: { sucursalId, tipo: 'SALIDA_PEDIDO', createdAt: { gte: desde, lte: hasta } },
      include: { insumo: true }
    });

    const porInsumo = {};
    for (const m of movimientos) {
      if (!porInsumo[m.insumoId]) {
        porInsumo[m.insumoId] = { insumo: m.insumo.nombre, unidad: m.insumo.unidad, totalConsumido: 0, salidas: 0 };
      }
      porInsumo[m.insumoId].totalConsumido += m.cantidad;
      porInsumo[m.insumoId].salidas += 1;
    }
    const consumo = Object.values(porInsumo).sort((a, b) => b.totalConsumido - a.totalConsumido);

    res.json({
      desde: desde.toISOString().split('T')[0],
      hasta: hasta.toISOString().split('T')[0],
      totalMovimientos: movimientos.length,
      consumo
    });
  } catch (error) {
    console.error('Error en reporte de consumo:', error);
    res.status(500).json({ error: 'Error al generar el reporte de consumo' });
  }
};

// ============================================================
//  MOTOR DE DESCUENTO (usado por el controlador de pedidos)
// ============================================================

// Descuenta los insumos del inventario según las recetas de los productos del pedido.
// Política: "permitir y alertar" -> nunca bloquea la venta; devuelve las alertas de stock bajo/agotado.
// Recibe "io" para avisar EN VIVO al panel del gerente: el stock se descuenta solo
// y su pantalla se actualiza sin que tenga que refrescar.
export const descontarInventarioPorPedido = async (pedido, io = null) => {
  const alertas = [];
  const actualizados = []; // insumos tocados, para enviarlos por socket
  const items = await prisma.itemPedido.findMany({
    where: { pedidoId: pedido.id },
    include: { producto: { include: { receta: { include: { insumos: true } } } } }
  });
  // Acumular el consumo total por insumo 
  const consumo = new Map(); 
  for (const item of items) {
    const receta = item.producto?.receta;
    if (!receta) continue; 
    for (const ri of receta.insumos) {
      consumo.set(ri.insumoId, (consumo.get(ri.insumoId) || 0) + ri.cantidad * item.cantidad);
    }
  }
  if (consumo.size === 0) return alertas;

  await prisma.$transaction(async (tx) => {
    for (const [insumoId, cantidad] of consumo) {
      const insumo = await tx.insumo.findUnique({ where: { id: insumoId } });
      if (!insumo) continue;
      const stockAntes = insumo.stockActual;
      const stockDespues = stockAntes - cantidad;

      await tx.insumo.update({ where: { id: insumoId }, data: { stockActual: stockDespues } });
      await tx.movimientoInventario.create({
        data: { sucursalId: insumo.sucursalId, insumoId, tipo: 'SALIDA_PEDIDO', cantidad, stockAntes, stockDespues, pedidoId: pedido.id }
      });

      // Fila ya actualizada, tal como debe verse en el panel del gerente.
      actualizados.push({
        id: insumoId, nombre: insumo.nombre, unidad: insumo.unidad,
        stockActual: stockDespues, stockMinimo: insumo.stockMinimo
      });

      if (stockDespues <= insumo.stockMinimo) {
        alertas.push({
          insumo: insumo.nombre, unidad: insumo.unidad,
          stockActual: stockDespues, stockMinimo: insumo.stockMinimo,
          agotado: stockDespues <= 0
        });
      }
    }
  });

  // Aviso en vivo al panel de inventario de esa sucursal (fuera de la transacción,
  // para no emitir cambios que todavía podrían revertirse).
  if (io && actualizados.length > 0) {
    io.to(pedido.sucursalId).emit('inventario-actualizado', actualizados);
  }

  return alertas;
};
