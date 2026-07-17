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
