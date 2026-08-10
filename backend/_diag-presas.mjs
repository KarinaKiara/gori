// DIAGNOSTICO DE SOLO LECTURA (segunda pasada): alcance real del problema.
// Responde: el problema es SOLO de las presas, o hay mas recetas vacias?
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== ALCANCE DE LAS RECETAS VACIAS (solo lectura) ===\n');

  const sucursales = await prisma.sucursal.findMany({ select: { id: true, nombre: true } });

  for (const s of sucursales) {
    const recetas = await prisma.receta.findMany({
      where: { sucursalId: s.id },
      include: { producto: { select: { nombre: true } }, insumos: true }
    });
    const vacias = recetas.filter(r => r.insumos.length === 0);
    const conLineas = recetas.length - vacias.length;

    console.log(`--- ${s.nombre} ---`);
    console.log(`  recetas totales: ${recetas.length} | con lineas: ${conLineas} | VACIAS: ${vacias.length}`);
    if (vacias.length) {
      console.log('  Productos con receta vacia:');
      for (const r of vacias) console.log(`     - ${r.producto?.nombre}`);
    }

    // Productos SIN ningun registro de receta
    const productos = await prisma.producto.findMany({
      where: { sucursalId: s.id }, select: { nombre: true, receta: { select: { id: true } } }
    });
    const sinReceta = productos.filter(p => !p.receta).map(p => p.nombre);
    console.log(`  productos sin registro de receta: ${sinReceta.length}`);
    if (sinReceta.length && sinReceta.length <= 12) console.log(`     ${sinReceta.join(', ')}`);
    console.log('');
  }

  // Detalle de una receta que SI funciona, para comparar
  const s0 = sucursales[0];
  const ejemplo = await prisma.producto.findFirst({
    where: { sucursalId: s0.id, nombre: 'Cuarto (Brasa)' },
    include: { receta: { include: { insumos: { include: { insumo: true } } } } }
  });
  console.log(`--- RECETA REAL DE "Cuarto (Brasa)" en ${s0.nombre} ---`);
  if (!ejemplo?.receta) console.log('  (no tiene receta)');
  else for (const ri of ejemplo.receta.insumos) {
    console.log(`  ${ri.cantidad} ${ri.insumo.unidad.padEnd(7)} de ${ri.insumo.nombre}`);
  }

  console.log('\n--- ¿ALGUNA RECETA USA LOS INSUMOS DE PRESA? ---');
  const usos = await prisma.recetaInsumo.findMany({
    where: { insumo: { nombre: { in: ['Pierna', 'Pecho', 'Ala', 'Entrepierna'] } } },
    include: { insumo: { select: { nombre: true } }, receta: { include: { producto: { select: { nombre: true } } } } }
  });
  if (!usos.length) console.log('  NINGUNA. Los insumos de presa no se descuentan por ningun producto.');
  else {
    const resumen = new Map();
    for (const u of usos) {
      const k = `${u.receta?.producto?.nombre} -> ${u.insumo.nombre} (${u.cantidad})`;
      resumen.set(k, (resumen.get(k) || 0) + 1);
    }
    for (const [k, n] of resumen) console.log(`  ${k}   [en ${n} sucursal(es)]`);
  }

  console.log('\n=== fin (no se modifico nada) ===\n');
  await prisma.$disconnect();
}

main().catch(async e => { console.error('FALLO:', e.message); await prisma.$disconnect(); process.exit(1); });
