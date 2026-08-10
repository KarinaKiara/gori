// REPARACION de las recetas de PRESAS.
//
// Problema detectado: los productos "Presa: X" tienen la receta VACIA, por lo que al
// pedir un plato con presa a eleccion el sistema descuenta los condimentos pero NO la
// presa. Ademas, en algunas bases la presa quedo metida DENTRO de la receta del plato,
// lo que descontaria una presa fija sin importar cual eligio el cliente.
//
// Este script deja el estado correcto segun el diseño documentado:
//
//   - Platos donde el cliente ELIGE la presa (Cuarto, Trica, Presa Extra y sus mixtos):
//       la receta del plato NO lleva presas. La presa la aporta el item "Presa: X".
//   - Platos donde NO elige (Octavo, Medio Pollo, Pollo Entero):
//       la receta del plato lleva las presas repartidas de forma uniforme.
//   - Productos "Presa: X":
//       receta = 1 unidad del insumo de esa presa.
//
// IMPORTANTE: solo toca las lineas de PRESA. Los condimentos y guarniciones de cada
// receta se dejan intactos, tal como esten hoy.
//
// Uso:
//   node _reparar-recetas-presas.mjs              -> SIMULACRO (no escribe nada)
//   node _reparar-recetas-presas.mjs --confirmar  -> aplica los cambios
//
// Para repararlo en la base de la nube, anteponer la cadena de conexion:
//   DATABASE_URL="mysql://..." node _reparar-recetas-presas.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--confirmar');
const PRESAS = ['Pecho', 'Ala', 'Pierna', 'Entrepierna'];

// Platos de pollo: cuantas presas lleva y si el cliente las elige.
const PLATOS = [
  { base: 'Octavo',                          presas: 1, elige: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Cuarto',                          presas: 2, elige: true,  tipos: ['Brasa', 'Broaster'] },
  { base: 'Trica',                           presas: 3, elige: true,  tipos: ['Brasa', 'Broaster'] },
  { base: 'Medio Pollo s/guarnición',        presas: 4, elige: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Medio Pollo c/guarnición',        presas: 4, elige: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Pollo Entero s/guarnición',       presas: 8, elige: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Pollo Entero c/guarnición',       presas: 8, elige: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Cuarto Mixto',                    presas: 2, elige: true,  tipos: ['Mixta'] },
  { base: 'Trica Mixta',                     presas: 3, elige: true,  tipos: ['Mixta'] },
  { base: 'Medio Pollo Mixto s/guarnición',  presas: 4, elige: false, tipos: ['Mixta'] },
  { base: 'Medio Pollo Mixto c/guarnición',  presas: 4, elige: false, tipos: ['Mixta'] },
  { base: 'Pollo Entero Mixto s/guarnición', presas: 8, elige: false, tipos: ['Mixta'] },
  { base: 'Pollo Entero Mixto c/guarnición', presas: 8, elige: false, tipos: ['Mixta'] },
];

// nombre del producto -> presas que debe llevar su receta (vacio = ninguna)
function presasEsperadas() {
  const mapa = new Map();
  for (const p of PLATOS) {
    for (const tipo of p.tipos) {
      const nombre = `${p.base} (${tipo})`;
      mapa.set(nombre, p.elige ? {} : Object.fromEntries(PRESAS.map(x => [x, p.presas / 4])));
    }
  }
  mapa.set('Presa Extra', {}); // el cliente elige: la presa va como item aparte
  for (const x of PRESAS) mapa.set(`Presa: ${x}`, { [x]: 1 });
  return mapa;
}

async function main() {
  const esperado = presasEsperadas();
  console.log('\n===========================================');
  console.log(' REPARACION DE RECETAS DE PRESAS');
  console.log('===========================================');
  console.log(APLICAR ? 'MODO: APLICANDO CAMBIOS\n' : 'MODO: SIMULACRO (usa --confirmar para aplicar)\n');

  const sucursales = await prisma.sucursal.findMany({ select: { id: true, nombre: true } });
  let totalCambios = 0;

  for (const s of sucursales) {
    console.log(`--- ${s.nombre} ---`);
    const insumos = await prisma.insumo.findMany({
      where: { sucursalId: s.id, nombre: { in: PRESAS } }, select: { id: true, nombre: true }
    });
    const idInsumo = Object.fromEntries(insumos.map(i => [i.nombre, i.id]));
    const faltantes = PRESAS.filter(p => !idInsumo[p]);
    if (faltantes.length) {
      console.log(`  !! No existen los insumos: ${faltantes.join(', ')}. Se omite esta sucursal.`);
      continue;
    }

    let cambiosSucursal = 0;
    for (const [nombreProducto, presasDeseadas] of esperado) {
      const producto = await prisma.producto.findFirst({
        where: { nombre: nombreProducto, sucursalId: s.id },
        include: { receta: { include: { insumos: { include: { insumo: { select: { nombre: true } } } } } } }
      });
      if (!producto) continue;

      const actuales = {};
      for (const ri of producto.receta?.insumos ?? []) {
        if (PRESAS.includes(ri.insumo.nombre)) actuales[ri.insumo.nombre] = ri.cantidad;
      }

      // ¿Coincide lo que hay con lo que deberia haber?
      const nombres = new Set([...Object.keys(actuales), ...Object.keys(presasDeseadas)]);
      const igual = [...nombres].every(n => (actuales[n] ?? 0) === (presasDeseadas[n] ?? 0));
      if (igual) continue;

      const antes = Object.keys(actuales).length ? Object.entries(actuales).map(([n, c]) => `${c} ${n}`).join(', ') : '(ninguna)';
      const despues = Object.keys(presasDeseadas).length ? Object.entries(presasDeseadas).map(([n, c]) => `${c} ${n}`).join(', ') : '(ninguna)';
      console.log(`  ${nombreProducto}`);
      console.log(`      presas antes:   ${antes}`);
      console.log(`      presas despues: ${despues}`);
      cambiosSucursal++;
      totalCambios++;

      if (!APLICAR) continue;

      await prisma.$transaction(async (tx) => {
        let receta = producto.receta;
        if (!receta) {
          receta = await tx.receta.create({ data: { productoId: producto.id, sucursalId: s.id } });
        }
        // Borrar SOLO las lineas de presa (condimentos y guarniciones quedan intactos)
        await tx.recetaInsumo.deleteMany({
          where: { recetaId: receta.id, insumoId: { in: PRESAS.map(p => idInsumo[p]) } }
        });
        const nuevas = Object.entries(presasDeseadas)
          .filter(([, c]) => c > 0)
          .map(([n, c]) => ({ recetaId: receta.id, insumoId: idInsumo[n], cantidad: Number(c) }));
        if (nuevas.length) await tx.recetaInsumo.createMany({ data: nuevas });
      });
    }

    if (cambiosSucursal === 0) console.log('  (ya estaba correcto, sin cambios)');
    console.log('');
  }

  console.log('===========================================');
  console.log(APLICAR
    ? `LISTO. Recetas corregidas: ${totalCambios}`
    : `SIMULACRO. Se corregirian ${totalCambios} recetas. Ejecuta con --confirmar para aplicar.`);
  console.log('===========================================\n');
  await prisma.$disconnect();
}

main().catch(async e => { console.error('FALLO:', e.message); await prisma.$disconnect(); process.exit(1); });
