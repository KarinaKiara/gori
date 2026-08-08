/**
 * Datos de demostración: pedidos del 21/07/2026 para Sucursal 1 y Sucursal 2.
 * Sirve para evidenciar el aislamiento multi-tenant (cada gerente ve solo lo suyo).
 *
 * Además limpia los pedidos basura que dejaron las pruebas de rendimiento.
 *
 *   node sembrarDemo.mjs              → simulacro (no escribe nada)
 *   node sembrarDemo.mjs --confirmar  → aplica los cambios
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const APLICAR = process.argv.includes('--confirmar');
const FECHA = '2026-07-21';                 // ayer
const PREFIJOS_PRUEBA = ['CARGA-', 'OFFLINE-', 'SUC2-', 'PRUEBA-'];

// Pedidos a crear por sucursal: [hora, minuto, origen, metodoPago, [ [nombreParcial, cantidad], ... ] ]
const GUION = {
  1: [
    [12, 15, 'POS',   'efectivo', [['Cuarto (Brasa)', 2]]],
    [13,  5, 'TOTEM', 'qr',       [['Octavo (Brasa)', 1], ['Papas Rústicas', 1]]],
    [13, 40, 'POS',   'efectivo', [['Medio Pollo c/guarnición (Brasa)', 1]]],
    [19, 20, 'TOTEM', 'efectivo', [['Cuarto (Broaster)', 2]]],
    [20,  5, 'POS',   'qr',       [['Pollo Entero c/guarnición (Brasa)', 1]]],
    [20, 45, 'TOTEM', 'efectivo', [['Trica (Brasa)', 1], ['Papas Rústicas', 1]]],
  ],
  2: [
    [12, 30, 'POS',   'efectivo', [['Octavo (Brasa)', 3]]],
    [14, 10, 'TOTEM', 'qr',       [['Cuarto (Brasa)', 1]]],
    [19, 50, 'POS',   'efectivo', [['Medio Pollo s/guarnición (Broaster)', 2]]],
    [21,  0, 'TOTEM', 'qr',       [['Cuarto (Broaster)', 1], ['Papas Rústicas', 2]]],
  ],
};

const fechaHora = (h, m) => new Date(`${FECHA}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);

async function main() {
  console.log(`\n═══ DATOS DE DEMOSTRACIÓN · ${FECHA} ═══`);
  console.log(APLICAR ? 'MODO: aplicando cambios\n' : 'MODO: SIMULACRO (usá --confirmar para aplicar)\n');

  // ── 1. Limpieza de los pedidos de prueba ──────────────────
  const basura = await prisma.pedido.findMany({
    where: { OR: PREFIJOS_PRUEBA.map((p) => ({ clienteRef: { startsWith: p } })) },
    select: { id: true },
  });
  console.log(`▸ Pedidos de prueba a eliminar: ${basura.length}`);
  if (APLICAR && basura.length) {
    const ids = basura.map((b) => b.id);
    await prisma.movimientoInventario.deleteMany({ where: { pedidoId: { in: ids } } });
    await prisma.itemPedido.deleteMany({ where: { pedidoId: { in: ids } } });
    await prisma.pedido.deleteMany({ where: { id: { in: ids } } });
    console.log('  ✔ eliminados');
  }

  // ── 2. Sucursales ordenadas ───────────────────────────────
  const sucursales = await prisma.sucursal.findMany({ orderBy: { createdAt: 'asc' } });
  if (sucursales.length < 2) { console.log('✘ Se necesitan al menos 2 sucursales.'); return; }

  let totalCreados = 0;

  for (const [indice, guion] of Object.entries(GUION)) {
    const suc = sucursales[Number(indice) - 1];
    if (!suc) continue;
    console.log(`\n▸ ${suc.nombre} (${suc.ubicacion || 's/ubicación'})`);

    // Evitar duplicar si ya se sembró antes
    const yaHay = await prisma.pedido.count({
      where: { sucursalId: suc.id, clienteRef: { startsWith: 'DEMO-' } },
    });
    if (yaHay > 0) { console.log(`  · ya tiene ${yaHay} pedidos DEMO, se omite`); continue; }

    const cajero = await prisma.usuario.findFirst({ where: { sucursalId: suc.id, rol: 'CAJERO' } });
    const productos = await prisma.producto.findMany({ where: { sucursalId: suc.id } });
    const buscar = (n) => productos.find((p) => p.nombre === n) || productos.find((p) => p.nombre.includes(n));

    let turno = 1;
    for (const linea of guion) {
      const [h, m, origen, metodoPago, articulos] = linea;
      const creado = fechaHora(h, m);

      const items = [];
      let monto = 0;
      for (const [nombre, cant] of articulos) {
        const prod = buscar(nombre);
        if (!prod) { console.log(`  ⚠ no existe el plato "${nombre}", se omite`); continue; }
        items.push({ productoId: prod.id, cantidad: cant, precio: prod.precio });
        monto += prod.precio * cant;
      }
      if (!items.length) continue;

      const etiqueta = `${creado.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} · ${origen.padEnd(5)} · ${metodoPago.padEnd(8)} · Bs ${monto.toFixed(2)}`;
      console.log(`  ${APLICAR ? '+' : '·'} Turno ${turno}  ${etiqueta}`);

      if (APLICAR) {
        const pedido = await prisma.pedido.create({
          data: {
            sucursalId: suc.id,
            montoTotal: monto,
            estado: 'LISTO',
            origen,
            metodoPago,
            numeroPedido: turno,
            clienteRef: `DEMO-${suc.id.slice(0, 6)}-${turno}`,
            usuarioId: origen === 'POS' ? cajero?.id ?? null : null,
            createdAt: creado,
            updatedAt: creado,
            items: { create: items },
          },
        });

        // Consumo de inventario según la receta (para que la venta sea coherente)
        for (const it of items) {
          const receta = await prisma.receta.findUnique({
            where: { productoId: it.productoId },
            include: { insumos: true },
          });
          if (!receta) continue;
          for (const ri of receta.insumos) {
            const insumo = await prisma.insumo.findUnique({ where: { id: ri.insumoId } });
            if (!insumo) continue;
            const usa = ri.cantidad * it.cantidad;
            const antes = insumo.stockActual;
            const despues = Math.max(0, +(antes - usa).toFixed(3));
            await prisma.insumo.update({ where: { id: insumo.id }, data: { stockActual: despues } });
            await prisma.movimientoInventario.create({
              data: {
                sucursalId: suc.id, insumoId: insumo.id, pedidoId: pedido.id,
                tipo: 'SALIDA_PEDIDO', cantidad: usa,
                stockAntes: antes, stockDespues: despues,
                motivo: `Venta turno ${turno}`, createdAt: creado,
              },
            });
          }
        }
        totalCreados++;
      } else { totalCreados++; }
      turno++;
    }
  }

  console.log(`\n${APLICAR ? '✔ Creados' : 'Se crearían'} ${totalCreados} pedidos con fecha ${FECHA}.`);
  if (!APLICAR) console.log('Ejecutá:  node sembrarDemo.mjs --confirmar\n');
}

main()
  .catch((e) => { console.error('✘', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
