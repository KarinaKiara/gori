// Lógica compartida de los reportes avanzados (la usan el gerente y el admin).
//
// Se separa acá para que el reporte de una sucursal (gerente) y el global
// (admin) usen exactamente el mismo cálculo y no se dupliquen fórmulas.
//
//   A. detallePedido        -> quién atendió, qué pidió y qué insumos consumió
//   B. inventarioPorReceta  -> stock por insumo y cuántos platos rinde
//   C. ventasYPagos         -> tótem vs caja y efectivo vs QR por periodo

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Lee ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD. Por defecto, los últimos 7 días.
export function parsePeriodo(query = {}) {
  const hasta = query.hasta ? new Date(query.hasta + 'T23:59:59') : new Date();
  const desde = query.desde ? new Date(query.desde + 'T00:00:00') : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  return { desde, hasta };
}
const soloFecha = (d) => (d instanceof Date ? d.toISOString().split('T')[0] : d);

// ── A. Detalle de un pedido ──────────────────────────────────────────
// Si se pasa `sucursalId`, solo devuelve el pedido si pertenece a esa
// sucursal (aislamiento del gerente). El admin lo llama sin sucursalId.
export async function detallePedido(pedidoId, { sucursalId = null } = {}) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: {
      sucursal: { select: { nombre: true } },
      usuario: { select: { nombre: true, rol: true } },
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });
  if (!pedido) return null;
  if (sucursalId && pedido.sucursalId !== sucursalId) return null;

  // Consumo EXACTO de insumos de este pedido, tomado del kardex.
  const movimientos = await prisma.movimientoInventario.findMany({
    where: { pedidoId: pedido.id, tipo: 'SALIDA_PEDIDO' },
    include: { insumo: { select: { nombre: true, unidad: true } } },
    orderBy: { cantidad: 'desc' },
  });

  const esTotem = pedido.origen === 'TOTEM';
  return {
    id: pedido.id,
    sucursal: pedido.sucursal?.nombre || '—',
    numeroPedido: pedido.numeroPedido,
    fecha: pedido.createdAt,
    estado: pedido.estado,
    canal: esTotem ? 'Tótem (autoservicio)' : 'Caja',
    metodoPago: pedido.metodoPago || '—',
    atendio: pedido.usuario?.nombre || (esTotem ? 'Autoservicio (Tótem)' : '—'),
    montoTotal: pedido.montoTotal,
    items: pedido.items.map((i) => ({
      producto: i.producto?.nombre || '—',
      cantidad: i.cantidad,
      precio: i.precio,
      detalle: i.detalle || null,
    })),
    consumoInsumos: movimientos.map((m) => ({
      insumo: m.insumo?.nombre || '—',
      unidad: m.insumo?.unidad || '',
      cantidad: m.cantidad,
    })),
  };
}

// ── B. Inventario por receta (de UNA sucursal) ───────────────────────
export async function inventarioPorReceta(sucursalId, { desde, hasta } = {}) {
  const suc = await prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { nombre: true } });
  const insumos = await prisma.insumo.findMany({
    where: { sucursalId },
    orderBy: { nombre: 'asc' },
  });

  // Consumo por insumo en el periodo (salidas por pedido).
  const whereMov = { sucursalId, tipo: 'SALIDA_PEDIDO' };
  if (desde || hasta) {
    whereMov.createdAt = {};
    if (desde) whereMov.createdAt.gte = desde;
    if (hasta) whereMov.createdAt.lte = hasta;
  }
  const movimientos = await prisma.movimientoInventario.findMany({ where: whereMov });
  const consumoPorInsumo = {};
  for (const m of movimientos) {
    consumoPorInsumo[m.insumoId] = (consumoPorInsumo[m.insumoId] || 0) + m.cantidad;
  }

  const insumosReporte = insumos.map((i) => ({
    nombre: i.nombre,
    unidad: i.unidad,
    stockActual: i.stockActual,
    stockMinimo: i.stockMinimo,
    consumido: consumoPorInsumo[i.id] || 0,
    bajoMinimo: i.stockActual <= i.stockMinimo,
  }));

  // Cuántos platos rinde el stock actual (el insumo que se agota primero manda).
  const productos = await prisma.producto.findMany({
    where: { sucursalId },
    include: { receta: { include: { insumos: { include: { insumo: true } } } } },
    orderBy: { nombre: 'asc' },
  });
  const productosReporte = productos.map((p) => {
    const ingredientes = p.receta?.insumos || [];
    let rinde = null;
    if (ingredientes.length) {
      rinde = Infinity;
      for (const ri of ingredientes) {
        const stock = ri.insumo?.stockActual ?? 0;
        const n = ri.cantidad > 0 ? Math.floor(stock / ri.cantidad) : Infinity;
        if (n < rinde) rinde = n;
      }
      rinde = rinde === Infinity ? null : rinde;
    }
    return {
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      activo: p.estaDisponible,
      tieneReceta: ingredientes.length > 0,
      rinde,
    };
  });

  return {
    sucursalNombre: suc?.nombre || null,
    insumos: insumosReporte,
    productos: productosReporte,
    resumen: {
      totalInsumos: insumos.length,
      bajoMinimo: insumosReporte.filter((i) => i.bajoMinimo).length,
      productosAgotados: productosReporte.filter((p) => p.tieneReceta && p.rinde === 0).length,
    },
  };
}

// ── C. Ventas y pagos por periodo ────────────────────────────────────
// `sucursalId` null = todas (admin). Un pedido cuenta como venta solo si ya
// se cobró (los del tótem nacen POR_COBRAR y no suman hasta pasar por caja).
export async function ventasYPagos({ sucursalId = null, desde, hasta } = {}) {
  const where = { estado: { not: 'POR_COBRAR' }, createdAt: {} };
  if (sucursalId) where.sucursalId = sucursalId;
  if (desde) where.createdAt.gte = desde;
  if (hasta) where.createdAt.lte = hasta;

  const pedidos = await prisma.pedido.findMany({
    where,
    include: { sucursal: { select: { nombre: true } } },
  });

  const suma = (arr) => arr.reduce((s, p) => s + p.montoTotal, 0);
  const total = suma(pedidos);
  const totem = pedidos.filter((p) => p.origen === 'TOTEM');
  const caja = pedidos.filter((p) => p.origen === 'POS');
  const efectivo = pedidos.filter((p) => p.metodoPago === 'efectivo');
  const qr = pedidos.filter((p) => p.metodoPago === 'qr');

  const porDia = {};
  for (const p of pedidos) {
    const dia = soloFecha(p.createdAt);
    porDia[dia] = (porDia[dia] || 0) + p.montoTotal;
  }
  const serieDiaria = Object.entries(porDia).sort().map(([dia, monto]) => ({ dia, monto }));

  const resultado = {
    totalVentas: total,
    totalPedidos: pedidos.length,
    ticketPromedio: pedidos.length ? total / pedidos.length : 0,
    canal: {
      totem: { cantidad: totem.length, monto: suma(totem) },
      caja: { cantidad: caja.length, monto: suma(caja) },
    },
    pago: {
      efectivo: { cantidad: efectivo.length, monto: suma(efectivo) },
      qr: { cantidad: qr.length, monto: suma(qr) },
    },
    serieDiaria,
  };

  // Vista global (admin sin filtro): comparativa por sucursal.
  if (!sucursalId) {
    const porSuc = {};
    for (const p of pedidos) {
      const nombre = p.sucursal?.nombre || '—';
      if (!porSuc[nombre]) porSuc[nombre] = { nombre, cantidad: 0, monto: 0 };
      porSuc[nombre].cantidad += 1;
      porSuc[nombre].monto += p.montoTotal;
    }
    resultado.porSucursal = Object.values(porSuc).sort((a, b) => b.monto - a.monto);
    resultado.sucursalNombre = null; // todas
  } else {
    const suc = await prisma.sucursal.findUnique({ where: { id: sucursalId }, select: { nombre: true } });
    resultado.sucursalNombre = suc?.nombre || null;
  }
  return resultado;
}
