// ─────────────────────────────────────────────────────────────
//  MIGRACIÓN SEGURA (NO borra datos): pasa el Ajo de gramos a dientes.
//
//  Convierte, en TODAS las sucursales:
//    - El insumo "Ajo" de unidad 'g' a 'diente'
//    - Su stock y las cantidades en las recetas (factor 3.75 g = 1 diente),
//      manteniendo el mismo rendimiento (para cuántos platos alcanza).
//
//  Cómo correrlo (PowerShell, dentro de la carpeta backend):
//    $env:DATABASE_URL="<tu URL de Aiven>"
//    node scripts/migrar-ajo-a-dientes.js
//
//  Es idempotente: si el Ajo ya está en dientes, no hace nada.
// ─────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const G_POR_DIENTE = 3.75; // en las recetas del seed, 1 diente ≈ 3.75 g

async function main() {
  const ajos = await prisma.insumo.findMany({ where: { nombre: 'Ajo' } });
  if (!ajos.length) { console.log('No hay insumo "Ajo". Nada que migrar.'); return; }

  let cambiados = 0, yaEstaban = 0, recetas = 0;

  for (const ajo of ajos) {
    if (ajo.unidad === 'diente') { yaEstaban++; continue; }

    // 1) Las recetas que usan este ajo: convertir su cantidad a dientes
    const usos = await prisma.recetaInsumo.findMany({ where: { insumoId: ajo.id } });
    for (const u of usos) {
      const enDientes = Math.round((u.cantidad / G_POR_DIENTE) * 100) / 100; // 2 decimales
      await prisma.recetaInsumo.update({ where: { id: u.id }, data: { cantidad: enDientes } });
      recetas++;
    }

    // 2) El insumo: unidad y stock (se conserva el rendimiento)
    const nuevoStock = Math.round(ajo.stockActual / G_POR_DIENTE);
    const nuevoMin = Math.round(ajo.stockMinimo / G_POR_DIENTE);
    await prisma.insumo.update({
      where: { id: ajo.id },
      data: { unidad: 'diente', stockActual: nuevoStock, stockMinimo: nuevoMin }
    });
    cambiados++;
    console.log(`✔ Sucursal ${ajo.sucursalId}: Ajo -> ${nuevoStock} dientes (${usos.length} recetas ajustadas)`);
  }

  console.log(`\nListo. ${cambiados} insumo(s) Ajo migrados, ${recetas} recetas ajustadas, ${yaEstaban} ya estaban en dientes.`);
}

main()
  .catch((e) => { console.error('Error en la migración:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
