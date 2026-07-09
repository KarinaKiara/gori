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
  })
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

// ── Reporte de VENTAS (desde el dashboard del gerente) ──
export function exportarReporteVentas(reporte) {
  const doc = new jsPDF()
  encabezado(doc, 'Reporte de Ventas', reporte.sucursal?.nombre, 'Fecha: ' + (reporte.fecha || ''))

  tituloSeccion(doc, 'Resumen', 40)
  tabla(doc, {
    startY: 44,
    head: [['Indicador', 'Valor']],
    body: [
      ['Ventas totales', 'Bs. ' + (reporte.resumen?.totalVentas?.toFixed(2) ?? '0.00')],
      ['Total de pedidos', String(reporte.resumen?.totalPedidos ?? 0)],
      ['Pedidos por Caja (POS)', String(reporte.resumen?.pedidosPOS ?? 0)],
      ['Pedidos por Tótem', String(reporte.resumen?.pedidosTotem ?? 0)],
    ],
    theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
  })

  if (reporte.productoTop?.length) {
    tituloSeccion(doc, 'Productos más vendidos', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['#', 'Producto', 'Cantidad']],
      body: reporte.productoTop.map((p, i) => [i + 1, p.nombre, p.cantidad]),
      theme: 'striped', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    })
  }

  if (reporte.ultimosPedidos?.length) {
    tituloSeccion(doc, 'Últimos pedidos', finY(doc, 44) + 12)
    tabla(doc, {
      startY: finY(doc, 44) + 16,
      head: [['Hora', 'Origen', 'Monto']],
      body: reporte.ultimosPedidos.map(p => [
        new Date(p.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }),
        p.origen,
        'Bs. ' + (p.montoTotal ?? 0).toFixed(2),
      ]),
      theme: 'grid', headStyles: { fillColor: NARANJA }, styles: { fontSize: 10 },
    })
  }

  doc.save(`Reporte-Ventas-${reporte.fecha || 'hoy'}.pdf`)
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

  doc.save(`Reporte-Inventario-${desde}_a_${hasta}.pdf`)
}
