/**
 * Elimina una sucursal COMPLETA (la sucursal y todo lo que cuelga de ella).
 *
 * Pensado para sacar sucursales de prueba que quedaron en la base, porque el
 * botón "Eliminar" del panel se niega a borrar una sucursal que tenga datos.
 *
 * Uso:
 *   node _limpiarSucursal.mjs "gori5"              → solo informa qué borraría
 *   node _limpiarSucursal.mjs "gori5" --borrar     → borra de verdad
 *
 * La base sobre la que actúa es la de DATABASE_URL (backend/.env). Para tocar
 * la base de producción hay que pasarla en la línea de comando, por ejemplo:
 *   DATABASE_URL="mysql://..." node _limpiarSucursal.mjs "gori5" --borrar
 *
 * Todo el borrado va dentro de una transacción: o se borra todo, o no se borra
 * nada. El orden respeta las llaves foráneas (primero los hijos).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const nombreBuscado = process.argv[2];
const borrarDeVerdad = process.argv.includes('--borrar');

if (!nombreBuscado) {
  console.error('Falta el nombre de la sucursal.\n  node _limpiarSucursal.mjs "gori5" [--borrar]');
  process.exit(1);
}

const main = async () => {
  const candidatas = await prisma.sucursal.findMany({
    where: { nombre: { contains: nombreBuscado } },
    select: { id: true, nombre: true, ubicacion: true, createdAt: true },
  });

  if (!candidatas.length) {
    console.log(`No hay ninguna sucursal cuyo nombre contenga "${nombreBuscado}".`);
    return;
  }
  if (candidatas.length > 1) {
    console.log(`Hay ${candidatas.length} sucursales que coinciden con "${nombreBuscado}":`);
    candidatas.forEach((s) => console.log(`  - ${s.nombre} (${s.ubicacion || 'sin ubicación'})`));
    console.log('Precisá más el nombre: este script borra una sola.');
    return;
  }

  const suc = candidatas[0];
  const sucursalId = suc.id;

  // Qué hay colgando de esta sucursal
  const insumos = await prisma.insumo.findMany({ where: { sucursalId }, select: { id: true } });
  const insumoIds = insumos.map((i) => i.id);
  const recetas = await prisma.receta.findMany({ where: { sucursalId }, select: { id: true } });
  const recetaIds = recetas.map((r) => r.id);
  const pedidos = await prisma.pedido.findMany({ where: { sucursalId }, select: { id: true } });
  const pedidoIds = pedidos.map((p) => p.id);
  const compras = await prisma.pedidoCompra.findMany({ where: { sucursalId }, select: { id: true } });
  const compraIds = compras.map((c) => c.id);

  const conteo = {
    usuarios: await prisma.usuario.count({ where: { sucursalId } }),
    pedidos: pedidoIds.length,
    itemsPedido: pedidoIds.length ? await prisma.itemPedido.count({ where: { pedidoId: { in: pedidoIds } } }) : 0,
    productos: await prisma.producto.count({ where: { sucursalId } }),
    recetas: recetaIds.length,
    lineasDeReceta: recetaIds.length ? await prisma.recetaInsumo.count({ where: { recetaId: { in: recetaIds } } }) : 0,
    insumos: insumoIds.length,
    movimientosInventario: await prisma.movimientoInventario.count({ where: { sucursalId } }),
    pedidosDeCompra: compraIds.length,
    lineasDeCompra: compraIds.length ? await prisma.pedidoCompraItem.count({ where: { pedidoCompraId: { in: compraIds } } }) : 0,
    solicitudesDeInsumo: await prisma.solicitudInsumo.count({ where: { sucursalId } }),
    insumoProveedor: insumoIds.length ? await prisma.insumoProveedor.count({ where: { insumoId: { in: insumoIds } } }) : 0,
  };

  console.log(`\nSucursal: ${suc.nombre}  (${suc.ubicacion || 'sin ubicación'})`);
  console.log(`Creada el ${suc.createdAt.toLocaleDateString('es-BO')}`);
  console.log('\nSe borraría:');
  for (const [k, v] of Object.entries(conteo)) console.log(`  ${String(v).padStart(6)}  ${k}`);

  if (!borrarDeVerdad) {
    console.log('\nEsto fue solo una vista previa. Para borrar de verdad:');
    console.log(`  node _limpiarSucursal.mjs "${nombreBuscado}" --borrar\n`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (pedidoIds.length) await tx.itemPedido.deleteMany({ where: { pedidoId: { in: pedidoIds } } });
    await tx.pedido.deleteMany({ where: { sucursalId } });

    await tx.movimientoInventario.deleteMany({ where: { sucursalId } });
    await tx.solicitudInsumo.deleteMany({ where: { sucursalId } });

    if (compraIds.length) await tx.pedidoCompraItem.deleteMany({ where: { pedidoCompraId: { in: compraIds } } });
    await tx.pedidoCompra.deleteMany({ where: { sucursalId } });

    if (recetaIds.length) await tx.recetaInsumo.deleteMany({ where: { recetaId: { in: recetaIds } } });
    await tx.receta.deleteMany({ where: { sucursalId } });

    await tx.producto.deleteMany({ where: { sucursalId } });

    if (insumoIds.length) await tx.insumoProveedor.deleteMany({ where: { insumoId: { in: insumoIds } } });
    await tx.insumo.deleteMany({ where: { sucursalId } });

    await tx.usuario.deleteMany({ where: { sucursalId } });
    await tx.sucursal.delete({ where: { id: sucursalId } });
  });

  console.log(`\nListo: la sucursal "${suc.nombre}" y todos sus datos fueron eliminados.\n`);
};

main()
  .catch((e) => {
    console.error('\nNo se borró nada. Error:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
