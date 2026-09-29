/**
 * Limpieza de los datos generados por la prueba de estrés
 * ------------------------------------------------------------
 * Borra los pedidos cuya etiqueta (clienteRef) empieza en "ESTRES-", sus ítems
 * y los movimientos de inventario asociados, de modo que el kardex y los
 * reportes no queden contaminados con datos de prueba.
 *
 * Uso:
 *   node pruebas/limpiar-estres.mjs           (solo muestra qué borraría)
 *   node pruebas/limpiar-estres.mjs --borrar  (borra de verdad)
 *
 * Usa la base de datos configurada en backend/.env. Antes de apuntar a la base
 * de PRODUCCIÓN, verificá qué DATABASE_URL está activa: este script no pregunta
 * dos veces.
 */
import { readFileSync } from 'fs';
import { PrismaClient } from '../backend/node_modules/@prisma/client/index.js';

// backend/.env no se carga solo: este script vive fuera de backend/.
if (!process.env.DATABASE_URL) {
  try {
    for (const linea of readFileSync('backend/.env', 'utf8').split('\n')) {
      const m = linea.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    console.error('✘ No se pudo leer backend/.env. Ejecutá el script desde la raíz del proyecto.');
    process.exit(1);
  }
}

const BORRAR = process.argv.includes('--borrar');
const prisma = new PrismaClient();

const oculta = (url) => String(url || '').replace(/\/\/[^@]*@/, '//****@');
console.log(`\nBase de datos: ${oculta(process.env.DATABASE_URL)}`);
console.log(BORRAR ? 'Modo: BORRAR\n' : 'Modo: solo vista previa (agregá --borrar para ejecutar)\n');

const pedidos = await prisma.pedido.findMany({
  where: { clienteRef: { startsWith: 'ESTRES-' } },
  select: { id: true, clienteRef: true, createdAt: true },
});

if (!pedidos.length) {
  console.log('No hay pedidos de prueba de estrés. Nada que limpiar.\n');
  await prisma.$disconnect();
  process.exit(0);
}

const ids = pedidos.map((p) => p.id);
const items = await prisma.itemPedido.count({ where: { pedidoId: { in: ids } } });
const movimientosVenta = await prisma.movimientoInventario.count({ where: { pedidoId: { in: ids } } });
const movimientosRepo = await prisma.movimientoInventario.count({
  where: { motivo: 'Reposición para prueba de estrés' },
});

const fechas = pedidos.map((p) => p.createdAt).sort((a, b) => a - b);
console.log(`Pedidos de prueba          : ${pedidos.length}`);
console.log(`  desde                    : ${fechas[0].toLocaleString('es-BO')}`);
console.log(`  hasta                    : ${fechas[fechas.length - 1].toLocaleString('es-BO')}`);
console.log(`Ítems de esos pedidos      : ${items}`);
console.log(`Movimientos de salida      : ${movimientosVenta}`);
console.log(`Movimientos de reposición  : ${movimientosRepo}`);

if (!BORRAR) {
  console.log('\nNada fue borrado. Volvé a ejecutar con --borrar si los números son los esperados.\n');
  await prisma.$disconnect();
  process.exit(0);
}

// Devolver cada insumo al stock que tenía ANTES de la prueba. El dato está en
// el `stockAntes` de la primera reposición que hizo el script de estrés; hay
// que leerlo AHORA, porque el borrado de más abajo elimina esos movimientos.
// Como también se borran los pedidos de la prueba, restaurar ese valor deja el
// inventario exactamente como estaba.
const reposiciones = await prisma.movimientoInventario.findMany({
  where: { motivo: 'Reposición para prueba de estrés' },
  orderBy: { createdAt: 'asc' },
  select: { insumoId: true, stockAntes: true },
});
const stockPrevio = new Map();
for (const m of reposiciones) {
  if (!stockPrevio.has(m.insumoId)) stockPrevio.set(m.insumoId, m.stockAntes);
}

// El orden importa: los ítems y movimientos referencian al pedido.
const borrado = await prisma.$transaction([
  ...[...stockPrevio].map(([insumoId, stockActual]) =>
    prisma.insumo.update({ where: { id: insumoId }, data: { stockActual } })),
  prisma.movimientoInventario.deleteMany({ where: { pedidoId: { in: ids } } }),
  prisma.movimientoInventario.deleteMany({ where: { motivo: 'Reposición para prueba de estrés' } }),
  prisma.itemPedido.deleteMany({ where: { pedidoId: { in: ids } } }),
  prisma.pedido.deleteMany({ where: { id: { in: ids } } }),
]);

const n = stockPrevio.size;
console.log('\n✔ Borrado completo:');
console.log(`   insumos restaurados      : ${n}`);
console.log(`   movimientos de salida    : ${borrado[n].count}`);
console.log(`   movimientos de reposición: ${borrado[n + 1].count}`);
console.log(`   ítems                    : ${borrado[n + 2].count}`);
console.log(`   pedidos                  : ${borrado[n + 3].count}\n`);

if (!n) {
  console.log('Nota: no se hallaron movimientos de reposición de la prueba, así que');
  console.log('el stock no se restauró. Revisalo desde el panel del gerente.\n');
}

await prisma.$disconnect();
