import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const NARANJA = [255, 69, 0]
const OSCURO = [10, 34, 52]

// autoTable (a diferencia de doc.text) no maneja bien los acentos con las fuentes estándar,
// así que dentro de las TABLAS transliteramos los acentos (á->a, ú->u, ñ->n) con un mapa explícito.
const MAPA_ACENTOS = {
  'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n',
  'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'Ü': 'U', 'Ñ': 'N', '°': ''
}
const limpiar = (s) => String(s ?? '').replace(/[áéíóúüñÁÉÍÓÚÜÑ°]/g, (c) => MAPA_ACENTOS[c] ?? '')

// Dibuja una tabla limpiando el texto de sus celdas
function tabla(doc, opts) {
  autoTable(doc, {
    ...opts,
    head: (opts.head || []).map(fila => fila.map(limpiar)),
    body: (opts.body || []).map(fila => fila.map(limpiar)),
    margin: { bottom: 20, ...(opts.margin || {}) }, // deja aire para el pie de página
  })
}

// Pie de página formal en TODAS las páginas: línea, marca y "Página X de Y"
function pieDePagina(doc) {
  const total = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...NARANJA); doc.setLineWidth(0.4)
    doc.line(14, h - 12, w - 14, h - 12)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(130, 130, 130)
    doc.text('Gori Chicken - Sistema de Gestion de Pedidos e Inventario', 14, h - 7)
    doc.setTextColor(...NARANJA); doc.setFont('helvetica', 'bold')
    doc.text(`Pagina ${i} de ${total}`, w - 14, h - 7, { align: 'right' })
  }
}

// Encabezado de marca para todos los reportes
function encabezado(doc, titulo, sucursal, subtitulo) {
  doc.setFillColor(...OSCURO)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setFillColor(...NARANJA)
  doc.rect(0, 28, 210, 2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text('GORI CHICKEN', 14, 13)
  doc.setTextColor(...NARANJA); doc.setFontSize(11)
  doc.text(titulo, 14, 21)

  doc.setTextColor(220, 220, 220); doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  doc.text(String(sucursal || ''), 196, 11, { align: 'right' })
  doc.text(String(subtitulo || ''), 196, 17, { align: 'right' })
  doc.text('Generado: ' + new Date().toLocaleString('es-BO'), 196, 23, { align: 'right' })
}

function tituloSeccion(doc, texto, y) {
  doc.setTextColor(...OSCURO); doc.setFont('helvetica', 'bold'); doc.setFontSize(13)
  doc.text(texto, 14, y)
}

const finY = (doc, def) => (doc.lastAutoTable ? doc.lastAutoTable.finalY : def)

// Formatea un número como moneda boliviana: 12345.6 -> "Bs. 12,345.60"
const VERDE = [22, 163, 74]
function bs(n) {
  const v = Number(n) || 0
  return 'Bs. ' + v.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Recuadro destacado con el INGRESO TOTAL (lo primero que se ve en el reporte)
function recuadroIngresos(doc, monto, subtitulo, y) {
  const w = 182
  doc.setFillColor(...OSCURO); doc.roundedRect(14, y, w, 26, 3, 3, 'F')
  doc.setFillColor(...VERDE); doc.roundedRect(14, y, 4, 26, 2, 2, 'F')
  doc.setTextColor(200, 210, 205); doc.setFont('helvetica', 'bold'); doc.setFontSize(9)
  doc.text('INGRESO TOTAL', 24, y + 9)
  doc.setTextColor(120, 230, 160); doc.setFont('helvetica', 'bold'); doc.setFontSize(20)
  doc.text(bs(monto), 24, y + 20)
  if (subtitulo) {
    doc.setTextColor(180, 190, 185); doc.setFont('helvetica', 'normal'); doc.setFontSize(8)
    doc.text(subtitulo, 196, y + 20, { align: 'right' })
  }
  return y + 26
}

// ── Reporte de VENTAS (desde el dashboard del gerente) ──
export function exportarReporteVentas(reporte) {
  const doc = new jsPDF()
  const r = reporte.resumen || {}
  encabezado(doc, 'Reporte de Ventas', reporte.sucursal?.nombre, 'Fecha: ' + (reporte.fecha || ''))

  // 1) INGRESO TOTAL destacado
  let y = recuadroIngresos(doc, r.totalVentas, `${r.totalPedidos ?? 0} pedidos cobrados`, 36)

  // 2) Desglose del dinero: por canal y por método de pago
  tituloSeccion(doc, 'Detalle de ingresos', y + 12)
  tabla(doc, {
    startY: y + 16,
    head: [['Concepto', 'Monto', 'Pedidos']],
    body: [
      ['Ventas en Caja (mostrador)', bs(r.ventasPOS), String(r.pedidosPOS ?? 0)],
      ['Ventas por Totem (autoservicio)', bs(r.ventasTotem), String(r.pedidosTotem ?? 0)],
      ['— Pagado en efectivo', bs(r.ventasEfectivo), ''],
      ['— Pagado por QR', bs(r.ventasQR), ''],
      ['— Otro / no registrado', bs(r.ventasOtro), ''],
      ['Ticket promedio por pedido', bs(r.ticketPromedio), ''],
    ],
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' } },
    didParseCell: (d) => {
      if (d.section === 'body') {
        const t = d.row.raw[0]
        if (t === 'Ticket promedio por pedido') { d.cell.styles.fillColor = [245, 245, 245]; d.cell.styles.fontStyle = 'bold' }
        if (typeof t === 'string' && t.startsWith('—')) d.cell.styles.textColor = [110, 110, 110]
      }
    },
  })

  if (reporte.productoTop?.length) {
    tituloSeccion(doc, 'Productos mas vendidos', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['#', 'Producto', 'Cantidad']],
      body: reporte.productoTop.map((p, i) => [i + 1, p.nombre, p.cantidad]),
      theme: 'striped', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
      columnStyles: { 0: { halign: 'center', cellWidth: 12 }, 2: { halign: 'center' } },
    })
  }

  if (reporte.ultimosPedidos?.length) {
    tituloSeccion(doc, 'Detalle de pedidos cobrados', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Turno', 'Hora', 'Canal', 'Metodo', 'Monto']],
      body: reporte.ultimosPedidos.map(p => [
        p.numeroPedido ?? '-',
        new Date(p.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        p.origen === 'TOTEM' ? 'Totem' : 'Caja',
        p.metodoPago === 'qr' ? 'QR' : p.metodoPago === 'efectivo' ? 'Efectivo' : '-',
        bs(p.montoTotal),
      ]),
      foot: [['', '', '', 'TOTAL', bs(r.totalVentas)]],
      theme: 'grid', headStyles: { fillColor: NARANJA }, footStyles: { fillColor: OSCURO, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 },
      columnStyles: { 0: { halign: 'center' }, 4: { halign: 'right', fontStyle: 'bold' } },
    })
  }

  pieDePagina(doc)
  doc.save(`Reporte-Ventas-${reporte.sucursal?.nombre || ''}-${reporte.fecha || 'hoy'}.pdf`)
}

// ── Reporte GLOBAL (dashboard del Admin: todas las sucursales) ──
export function exportarReporteGlobal(reporte) {
  const doc = new jsPDF()
  const r = reporte.resumen || {}
  encabezado(doc, 'Reporte Global', 'Todas las sucursales', 'Fecha: ' + (reporte.fecha || 'Hoy'))

  // 1) INGRESO TOTAL destacado
  let y = recuadroIngresos(doc, r.totalVentasHoy, `${r.totalPedidosHoy ?? 0} pedidos · ${r.totalSucursales ?? 0} sucursales`, 36)

  // 2) Desglose del dinero
  tituloSeccion(doc, 'Detalle de ingresos', y + 12)
  tabla(doc, {
    startY: y + 16,
    head: [['Concepto', 'Monto', 'Pedidos']],
    body: [
      ['Ventas en Caja (mostrador)', bs(r.ventasPOS), String(r.pedidosPOS ?? 0)],
      ['Ventas por Totem (autoservicio)', bs(r.ventasTotem), String(r.pedidosTotem ?? 0)],
      ['— Pagado en efectivo', bs(r.ventasEfectivo), ''],
      ['— Pagado por QR', bs(r.ventasQR), ''],
      ['— Otro / no registrado', bs(r.ventasOtro), ''],
      ['Ticket promedio por pedido', bs(r.ticketPromedio), ''],
    ],
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' } },
    didParseCell: (d) => {
      if (d.section === 'body') {
        const t = d.row.raw[0]
        if (t === 'Ticket promedio por pedido') { d.cell.styles.fillColor = [245, 245, 245]; d.cell.styles.fontStyle = 'bold' }
        if (typeof t === 'string' && t.startsWith('—')) d.cell.styles.textColor = [110, 110, 110]
      }
    },
  })

  if (reporte.ventasPorSucursal?.length) {
    tituloSeccion(doc, 'Ventas por sucursal', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Sucursal', 'Ventas', 'Pedidos', 'Empleados']],
      body: reporte.ventasPorSucursal.map(s => [s.nombre, bs(s.ventasHoy), s.pedidosHoy ?? 0, s.totalEmpleados ?? 0]),
      foot: [['TOTAL', bs(r.totalVentasHoy), String(r.totalPedidosHoy ?? 0), '']],
      theme: 'striped', headStyles: { fillColor: NARANJA }, footStyles: { fillColor: OSCURO, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
    })
  }

  if (reporte.ultimosPedidos?.length) {
    tituloSeccion(doc, 'Ultimos pedidos', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Sucursal', 'Canal', 'Metodo', 'Monto', 'Fecha/Hora']],
      body: reporte.ultimosPedidos.map(p => [
        p.sucursal?.nombre || '',
        p.origen === 'TOTEM' ? 'Totem' : 'Caja',
        p.metodoPago === 'qr' ? 'QR' : p.metodoPago === 'efectivo' ? 'Efectivo' : '-',
        bs(p.montoTotal),
        new Date(p.createdAt).toLocaleString('es-BO'),
      ]),
      theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 9 },
      columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    })
  }

  pieDePagina(doc)
  doc.save(`Reporte-Global-${reporte.fecha || 'hoy'}.pdf`)
}

// ── Reporte de INVENTARIO (consumo + stock actual) ──
export function exportarReporteInventario({ sucursal, desde, hasta, consumo, insumos }) {
  const doc = new jsPDF()
  encabezado(doc, 'Reporte de Inventario', sucursal, `Consumo: ${desde} a ${hasta}`)

  tituloSeccion(doc, 'Consumo de insumos', 40)
  tabla(doc, {
    startY: 44,
    head: [['Insumo', 'Total consumido', 'Nro. salidas']],
    body: (consumo && consumo.length ? consumo : [{ insumo: 'Sin consumo en el periodo', unidad: '', totalConsumido: '', salidas: '' }])
      .map(c => [c.insumo, c.totalConsumido !== '' ? `${c.totalConsumido} ${c.unidad}` : '', c.salidas]),
    theme: 'striped', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
  })

  if (insumos?.length) {
    tituloSeccion(doc, 'Stock actual', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Insumo', 'Unidad', 'Stock actual', 'Stock mínimo', 'Estado']],
      body: insumos.map(i => [
        i.nombre, i.unidad, i.stockActual, i.stockMinimo,
        (Number(i.stockActual) <= Number(i.stockMinimo)) ? 'BAJO' : 'OK',
      ]),
      theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4 && data.cell.raw === 'BAJO') {
          data.cell.styles.textColor = [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

  pieDePagina(doc)
  doc.save(`Reporte-Inventario-${desde}_a_${hasta}.pdf`)
}

// Formatea una cantidad de insumo (respeta decimales solo si los tiene)
const cant = (n) => (n == null ? '-' : (Number.isInteger(n) ? String(n) : String(parseFloat(Number(n).toFixed(3)))))

// ── C · Reporte de VENTAS Y PAGOS por periodo (gerente o admin) ──
export function exportarVentasPagos(data, contexto) {
  const doc = new jsPDF()
  const ctx = contexto || data.sucursalNombre || 'Todas las sucursales'
  encabezado(doc, 'Reporte de Ventas y Pagos', ctx, `Periodo: ${data.desde} a ${data.hasta}`)

  let y = recuadroIngresos(doc, data.totalVentas, `${data.totalPedidos ?? 0} pedidos · ticket ${bs(data.ticketPromedio)}`, 36)

  // Por canal de venta
  tituloSeccion(doc, 'Ventas por canal', y + 12)
  tabla(doc, {
    startY: y + 16,
    head: [['Canal', 'Pedidos', 'Monto']],
    body: [
      ['Totem (autoservicio)', String(data.canal?.totem?.cantidad ?? 0), bs(data.canal?.totem?.monto)],
      ['Caja (mostrador)', String(data.canal?.caja?.cantidad ?? 0), bs(data.canal?.caja?.monto)],
    ],
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
  })

  // Por método de pago
  tituloSeccion(doc, 'Ventas por metodo de pago', finY(doc, 44) + 12)
  tabla(doc, {
    startY: finY(doc, 44) + 16,
    head: [['Metodo', 'Pedidos', 'Monto']],
    body: [
      ['Efectivo', String(data.pago?.efectivo?.cantidad ?? 0), bs(data.pago?.efectivo?.monto)],
      ['QR', String(data.pago?.qr?.cantidad ?? 0), bs(data.pago?.qr?.monto)],
    ],
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
  })

  // Comparativa por sucursal (solo global)
  if (data.porSucursal?.length) {
    tituloSeccion(doc, 'Ventas por sucursal', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Sucursal', 'Pedidos', 'Monto']],
      body: data.porSucursal.map(s => [s.nombre, String(s.cantidad), bs(s.monto)]),
      foot: [['TOTAL', String(data.totalPedidos ?? 0), bs(data.totalVentas)]],
      theme: 'striped', headStyles: { fillColor: NARANJA }, footStyles: { fillColor: OSCURO, textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10 }, columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
    })
  }

  // Detalle por día
  if (data.serieDiaria?.length) {
    tituloSeccion(doc, 'Ventas por dia', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Dia', 'Monto']],
      body: data.serieDiaria.map(d => [d.dia, bs(d.monto)]),
      theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    })
  }

  pieDePagina(doc)
  doc.save(`Reporte-VentasPagos-${data.desde}_a_${data.hasta}.pdf`)
}

// ── B · Reporte de STOCK POR RECETA (insumos + cuántos platos rinde) ──
export function exportarStockPorReceta(data, contexto) {
  const doc = new jsPDF()
  const ctx = contexto || data.sucursalNombre || ''
  encabezado(doc, 'Reporte de Stock por Receta', ctx, `Consumo: ${data.desde || ''} a ${data.hasta || ''}`)

  // Resumen
  const rs = data.resumen || {}
  doc.setTextColor(...OSCURO); doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(`Insumos: ${rs.totalInsumos ?? 0}   |   Bajo el minimo: ${rs.bajoMinimo ?? 0}   |   Platos agotados: ${rs.productosAgotados ?? 0}`, 14, 38)

  tituloSeccion(doc, 'Stock de insumos', 46)
  tabla(doc, {
    startY: 50,
    head: [['Insumo', 'Stock actual', 'Minimo', 'Consumido', 'Estado']],
    body: (data.insumos || []).map(i => [
      i.nombre, `${cant(i.stockActual)} ${i.unidad}`, cant(i.stockMinimo),
      `${cant(i.consumido)} ${i.unidad}`, i.bajoMinimo ? 'BAJO' : 'OK',
    ]),
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'center' } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 4 && d.cell.raw === 'BAJO') {
        d.cell.styles.textColor = [220, 38, 38]; d.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const conReceta = (data.productos || []).filter(p => p.tieneReceta)
  tituloSeccion(doc, 'Cuantos platos rinde el stock', finY(doc, 50) + 12)
  tabla(doc, {
    startY: finY(doc, 50) + 16,
    head: [['Producto', 'Categoria', 'Rinde (platos)']],
    body: conReceta.map(p => [p.nombre, p.categoria, p.rinde == null ? '-' : String(p.rinde)]),
    theme: 'striped', headStyles: { fillColor: NARANJA }, styles: { fontSize: 9 },
    columnStyles: { 2: { halign: 'center', fontStyle: 'bold' } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === 2 && d.cell.raw === '0') {
        d.cell.styles.textColor = [220, 38, 38]; d.cell.styles.fontStyle = 'bold'
      }
    },
  })

  pieDePagina(doc)
  doc.save(`Reporte-StockPorReceta-${(ctx || 'sucursal').replace(/[^\w]+/g, '_')}.pdf`)
}

// ── A · Detalle de UNA venta (quién atendió, qué pidió, consumo de insumos) ──
export function exportarDetallePedido(d) {
  const doc = new jsPDF()
  encabezado(doc, 'Detalle de la Venta', d.sucursal || '', `Pedido ${d.numeroPedido ? '#' + d.numeroPedido : ''}`)

  // Datos generales
  tituloSeccion(doc, 'Datos de la venta', 40)
  tabla(doc, {
    startY: 44,
    head: [['Dato', 'Valor']],
    body: [
      ['Canal', d.canal || '-'],
      ['Metodo de pago', d.metodoPago || '-'],
      ['Quien atendio', d.atendio || '-'],
      ['Fecha y hora', d.fecha ? new Date(d.fecha).toLocaleString('es-BO') : '-'],
      ['Monto total', bs(d.montoTotal)],
    ],
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 }, 1: { halign: 'left' } },
  })

  // Qué pidió
  tituloSeccion(doc, 'Productos del pedido', finY(doc, 44) + 12)
  tabla(doc, {
    startY: finY(doc, 44) + 16,
    head: [['Cant.', 'Producto', 'Detalle', 'Precio']],
    body: (d.items || []).map(it => [String(it.cantidad), it.producto, it.detalle || '', bs(it.precio)]),
    foot: [['', '', 'TOTAL', bs(d.montoTotal)]],
    theme: 'grid', headStyles: { fillColor: NARANJA }, footStyles: { fillColor: OSCURO, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10 },
    columnStyles: { 0: { halign: 'center', cellWidth: 16 }, 3: { halign: 'right', fontStyle: 'bold' } },
  })

  // Consumo exacto de insumos
  tituloSeccion(doc, 'Consumo de inventario de este pedido', finY(doc, 44) + 12)
  tabla(doc, {
    startY: finY(doc, 44) + 16,
    head: [['Insumo', 'Cantidad descontada']],
    body: (d.consumoInsumos?.length ? d.consumoInsumos : [{ insumo: 'Sin receta (no descuenta insumos)', unidad: '', cantidad: '' }])
      .map(c => [c.insumo, c.cantidad !== '' ? `- ${cant(c.cantidad)} ${c.unidad}` : '']),
    theme: 'striped', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    columnStyles: { 1: { halign: 'right', textColor: VERDE, fontStyle: 'bold' } },
  })

  pieDePagina(doc)
  doc.save(`Detalle-Pedido-${d.numeroPedido || d.id?.slice(0, 6) || ''}.pdf`)
}
