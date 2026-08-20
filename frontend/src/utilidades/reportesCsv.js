// Exporta los reportes a Excel (formato CSV que Excel abre directo).
// Se usa ';' como separador y coma decimal para que Excel en español lo lea
// bien en columnas, y un BOM UTF-8 para que respete los acentos y la ñ.

const money = (n) => (Number(n) || 0).toFixed(2).replace('.', ',');
const num = (n) => (n == null ? '' : String(n).replace('.', ','));

// Escapa un campo para CSV: entre comillas y duplicando las comillas internas.
function campo(v) {
  const s = String(v ?? '');
  return `"${s.replace(/"/g, '""')}"`;
}
// Convierte filas (arrays) a texto CSV con separador ';'.
function aCsv(filas) {
  return filas.map((f) => f.map(campo).join(';')).join('\r\n');
}

// Dispara la descarga de un archivo .csv (con BOM para Excel).
function descargarCsv(nombre, filas) {
  const contenido = '﻿' + aCsv(filas);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre.endsWith('.csv') ? nombre : `${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── C · Ventas y pagos ──
export function excelVentasPagos(data, contexto) {
  const ctx = contexto || data.sucursalNombre || 'Todas las sucursales';
  const f = [];
  f.push(['Reporte de Ventas y Pagos', ctx]);
  f.push(['Periodo', data.desde, data.hasta]);
  f.push([]);
  f.push(['Resumen']);
  f.push(['Total ventas (Bs)', money(data.totalVentas)]);
  f.push(['Pedidos', data.totalPedidos ?? 0]);
  f.push(['Ticket promedio (Bs)', money(data.ticketPromedio)]);
  f.push([]);
  f.push(['Por canal de venta', 'Pedidos', 'Monto (Bs)']);
  f.push(['Tótem (autoservicio)', data.canal?.totem?.cantidad ?? 0, money(data.canal?.totem?.monto)]);
  f.push(['Caja (mostrador)', data.canal?.caja?.cantidad ?? 0, money(data.canal?.caja?.monto)]);
  f.push([]);
  f.push(['Por método de pago', 'Pedidos', 'Monto (Bs)']);
  f.push(['Efectivo', data.pago?.efectivo?.cantidad ?? 0, money(data.pago?.efectivo?.monto)]);
  f.push(['QR', data.pago?.qr?.cantidad ?? 0, money(data.pago?.qr?.monto)]);
  if (data.porSucursal?.length) {
    f.push([]);
    f.push(['Por sucursal', 'Pedidos', 'Monto (Bs)']);
    data.porSucursal.forEach((s) => f.push([s.nombre, s.cantidad, money(s.monto)]));
  }
  if (data.serieDiaria?.length) {
    f.push([]);
    f.push(['Ventas por día', 'Monto (Bs)']);
    data.serieDiaria.forEach((d) => f.push([d.dia, money(d.monto)]));
    const totalDias = data.serieDiaria.reduce((s, d) => s + (Number(d.monto) || 0), 0);
    f.push(['TOTAL', money(totalDias)]);
  }
  descargarCsv(`Reporte-VentasPagos-${data.desde}_a_${data.hasta}`, f);
}

// ── B · Stock por receta ──
export function excelStockPorReceta(data, contexto) {
  const ctx = contexto || data.sucursalNombre || 'Sucursal';
  const f = [];
  f.push(['Reporte de Stock por Receta', ctx]);
  if (data.desde) f.push(['Consumo', data.desde, data.hasta]);
  f.push([]);
  f.push(['Stock de insumos']);
  f.push(['Insumo', 'Stock actual', 'Unidad', 'Mínimo', 'Consumido', 'Estado']);
  (data.insumos || []).forEach((i) =>
    f.push([i.nombre, num(i.stockActual), i.unidad, num(i.stockMinimo), num(i.consumido), i.bajoMinimo ? 'BAJO' : 'OK'])
  );
  f.push([]);
  f.push(['Cuántos platos rinde el stock']);
  f.push(['Producto', 'Tipo', 'Rinde (platos)']);
  (data.productos || []).filter((p) => p.tieneReceta).forEach((p) =>
    f.push([p.nombre, p.categoria, p.rinde == null ? '' : p.rinde])
  );
  descargarCsv(`Reporte-StockPorReceta-${(ctx || 'sucursal').replace(/[^\w]+/g, '_')}`, f);
}

// ── A · Detalle de una venta ──
export function excelDetallePedido(d) {
  const f = [];
  f.push(['Detalle de la Venta', d.numeroPedido ? `Pedido #${d.numeroPedido}` : '']);
  f.push(['Sucursal', d.sucursal || '']);
  f.push(['Canal', d.canal || '']);
  f.push(['Método de pago', d.metodoPago || '']);
  f.push(['Quién atendió', d.atendio || '']);
  f.push(['Fecha y hora', d.fecha ? new Date(d.fecha).toLocaleString('es-BO') : '']);
  f.push(['Monto total (Bs)', money(d.montoTotal)]);
  f.push([]);
  f.push(['Productos del pedido']);
  f.push(['Cantidad', 'Producto', 'Detalle', 'Precio (Bs)']);
  (d.items || []).forEach((it) => f.push([it.cantidad, it.producto, it.detalle || '', money(it.precio)]));
  f.push([]);
  f.push(['Consumo de inventario de este pedido']);
  f.push(['Insumo', 'Cantidad descontada', 'Unidad']);
  (d.consumoInsumos || []).forEach((c) => f.push([c.insumo, num(c.cantidad), c.unidad]));
  descargarCsv(`Detalle-Pedido-${d.numeroPedido || (d.id || '').slice(0, 6)}`, f);
}
