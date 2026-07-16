import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================
//  MATERIAS PRIMAS (insumos) — unidad base y stock realista
//  (stock inicial = lo que rinde ~1 compra, según los datos reales)
// ============================================================
const INSUMOS = [
  // Pollo por tipo de presa (1 pollo = 2 de cada una). Stock 10 = 5 pollos.
  { nombre: 'Pierna',          unidad: 'presa',  stockActual: 10,    stockMinimo: 2 },
  { nombre: 'Pecho',           unidad: 'presa',  stockActual: 10,    stockMinimo: 2 },
  { nombre: 'Ala',             unidad: 'presa',  stockActual: 10,    stockMinimo: 2 },
  { nombre: 'Entrepierna',     unidad: 'presa',  stockActual: 10,    stockMinimo: 2 },
  { nombre: 'Papa',            unidad: 'g',      stockActual: 11500, stockMinimo: 2000 }, // 1 arroba
  { nombre: 'Arroz',           unidad: 'g',      stockActual: 11500, stockMinimo: 2000 }, // 1 arroba
  { nombre: 'Fideo',           unidad: 'g',      stockActual: 10000, stockMinimo: 1500 }, // 1 bolsón
  { nombre: 'Harina de trigo', unidad: 'g',      stockActual: 11500, stockMinimo: 2000 }, // 1 arroba
  { nombre: 'Huevo',           unidad: 'unidad', stockActual: 30,    stockMinimo: 6 },    // 1 maple
  { nombre: 'Aceite',          unidad: 'ml',     stockActual: 20000, stockMinimo: 3000 }, // 1 bidón (20 L)
  { nombre: 'Tomate',          unidad: 'unidad', stockActual: 250,   stockMinimo: 40 },   // 1 cajón
  { nombre: 'Palta',           unidad: 'unidad', stockActual: 12,    stockMinimo: 3 },    // 1 docena
  { nombre: 'Repollo',         unidad: 'g',      stockActual: 1500,  stockMinimo: 300 },  // 1 cabeza
  { nombre: 'Cebolla',         unidad: 'g',      stockActual: 11500, stockMinimo: 1500 }, // 1 arroba
  { nombre: 'Pimentón',        unidad: 'g',      stockActual: 3000,  stockMinimo: 500 },
  { nombre: 'Cebolla verde',   unidad: 'g',      stockActual: 500,   stockMinimo: 100 },  // 1 atado
  { nombre: 'Plátano macho',   unidad: 'unidad', stockActual: 50,    stockMinimo: 10 },   // 1 racimo
  { nombre: 'Mayonesa',        unidad: 'ml',     stockActual: 4000,  stockMinimo: 800 },  // 1 balde
  { nombre: 'Kétchup',         unidad: 'ml',     stockActual: 4000,  stockMinimo: 800 },  // 1 galón
  { nombre: 'Perejil',         unidad: 'g',      stockActual: 200,   stockMinimo: 40 },   // 1 atado
  { nombre: 'Cilantro',        unidad: 'g',      stockActual: 200,   stockMinimo: 40 },   // 1 atado
  { nombre: 'Sillao',          unidad: 'ml',     stockActual: 1000,  stockMinimo: 200 },
  { nombre: 'Sal',             unidad: 'g',      stockActual: 1000,  stockMinimo: 200 },  // 1 bolsa
  { nombre: 'Pimienta negra',  unidad: 'g',      stockActual: 500,   stockMinimo: 100 },
  { nombre: 'Orégano',         unidad: 'g',      stockActual: 500,   stockMinimo: 100 },
  { nombre: 'Comino',          unidad: 'g',      stockActual: 500,   stockMinimo: 100 },
  { nombre: 'Ajo',             unidad: 'diente', stockActual: 200,   stockMinimo: 40 },   // se cuenta por dientes (no se pesa)
];

// Receta de un plato de pollo según tipo de cocción, número de presas y si el cliente elige la presa.
// - Si NO elige (Octavo surtido, Medio, Entero): las presas se reparten uniformemente en la receta.
// - Si elige (Cuarto, Trica, Presa Extra): la presa se descuenta aparte (ítem "Presa: X") según su elección.
function recetaPollo(tipo, presas, choice) {
  const r = [];
  if (!choice) {
    const c = presas / 4; // 2 de cada tipo por pollo -> reparto uniforme
    r.push(['Pecho', c], ['Ala', c], ['Pierna', c], ['Entrepierna', c]);
  }
  if (tipo === 'Brasa') {
    r.push(['Pimienta negra', 0.25 * presas], ['Orégano', 0.25 * presas],
           ['Comino', 0.125 * presas], ['Ajo', 1 * presas], ['Sal', 1 * presas]); // Ajo en dientes: 1 por presa
  } else if (tipo === 'Broaster') {
    r.push(['Harina de trigo', 50 * presas], ['Huevo', 0.5 * presas],
           ['Aceite', 75 * presas], ['Pimienta negra', 1 * presas], ['Sal', 1 * presas]);
  } else { // Mixta: mitad brasa, mitad broaster
    const h = presas / 2;
    r.push(['Harina de trigo', 50 * h], ['Huevo', 0.5 * h], ['Aceite', 75 * h],
           ['Pimienta negra', 0.25 * h + 1 * h], ['Orégano', 0.25 * h],
           ['Comino', 0.125 * h], ['Ajo', 1 * h], ['Sal', 1 * presas]); // Ajo en dientes
  }
  return r;
}

// Recetas de guarniciones / extras (según los datos reales por plato)
const RECETAS_EXTRAS = {
  'Arroz Chaufa':   [['Arroz', 80], ['Aceite', 20], ['Sillao', 15], ['Cebolla verde', 20], ['Sal', 3]],
  'Papas Rústicas': [['Papa', 300], ['Aceite', 20], ['Sal', 3]],
  'Fideo Salteado': [['Fideo', 150], ['Aceite', 20], ['Sillao', 10], ['Pimentón', 30], ['Cebolla verde', 15], ['Sal', 3]],
  'Ensalada':       [['Tomate', 1], ['Palta', 0.25], ['Repollo', 50], ['Cebolla', 30], ['Pimentón', 40], ['Cebolla verde', 15], ['Sal', 2]],
};

// Platos de pollo (nombre base, presas, y tipos donde existe)
const PLATOS_POLLO = [
  { base: 'Octavo',                      presas: 1, precio: 24,  choice: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Cuarto',                      presas: 2, precio: 36,  choice: true,  tipos: ['Brasa', 'Broaster'] },
  { base: 'Trica',                       presas: 3, precio: 46,  choice: true,  tipos: ['Brasa', 'Broaster'] },
  { base: 'Medio Pollo s/guarnición',    presas: 4, precio: 58,  choice: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Medio Pollo c/guarnición',    presas: 4, precio: 70,  choice: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Pollo Entero s/guarnición',   presas: 8, precio: 105, choice: false, tipos: ['Brasa', 'Broaster'] },
  { base: 'Pollo Entero c/guarnición',   presas: 8, precio: 135, choice: false, tipos: ['Brasa', 'Broaster'] },
  // Mixta (nombres propios)
  { base: 'Cuarto Mixto',                       presas: 2, precio: 36,  choice: true,  tipos: ['Mixta'] },
  { base: 'Trica Mixta',                        presas: 3, precio: 46,  choice: true,  tipos: ['Mixta'] },
  { base: 'Medio Pollo Mixto s/guarnición',     presas: 4, precio: 58,  choice: false, tipos: ['Mixta'] },
  { base: 'Medio Pollo Mixto c/guarnición',     presas: 4, precio: 70,  choice: false, tipos: ['Mixta'] },
  { base: 'Pollo Entero Mixto s/guarnición',    presas: 8, precio: 105, choice: false, tipos: ['Mixta'] },
  { base: 'Pollo Entero Mixto c/guarnición',    presas: 8, precio: 135, choice: false, tipos: ['Mixta'] },
];

// Productos de reventa (sin receta: se compran ya hechos)
const RESALE = [
  ['Horchata de Litro', 15], ['Coca Cola 500ml', 8], ['Fanta 500ml', 8],
  ['Del Valle 1 Litro', 12], ['Alfajor de Chocolate Gorila', 0],
];

// Construye el catálogo de productos (nombre canónico, categoría, precio y receta)
function construirCatalogo() {
  const items = [];
  for (const p of PLATOS_POLLO) {
    for (const tipo of p.tipos) {
      items.push({ nombre: `${p.base} (${tipo})`, categoria: `${tipo} Gori`, precio: p.precio, receta: recetaPollo(tipo, p.presas, p.choice) });
    }
  }
  // Presa Extra (1 presa, el cliente elige el tipo) -> condimentos; la presa va como ítem aparte
  items.push({ nombre: 'Presa Extra', categoria: 'Extras Gori', precio: 14, receta: recetaPollo('Brasa', 1, true) });
  // Productos de presa: descuentan la presa exacta que el cliente eligió (Cuarto/Trica/Presa Extra)
  for (const tipo of ['Pierna', 'Pecho', 'Ala', 'Entrepierna']) {
    items.push({ nombre: `Presa: ${tipo}`, categoria: 'Presas', precio: 0, receta: [[tipo, 1]] });
  }
  // Guarniciones / extras
  for (const [nombre, receta] of Object.entries(RECETAS_EXTRAS)) {
    items.push({ nombre, categoria: 'Extras Gori', precio: nombre === 'Ensalada' ? 12 : 15, receta });
  }
  // Reventa (sin receta)
  for (const [nombre, precio] of RESALE) items.push({ nombre, categoria: 'Refrescos', precio, receta: null });
  return items;
}

async function main() {
  // Limpiar BD (respetando llaves foráneas)
  await prisma.movimientoInventario.deleteMany({});
  await prisma.itemPedido.deleteMany({});
  await prisma.pedido.deleteMany({});
  await prisma.recetaInsumo.deleteMany({});
  await prisma.receta.deleteMany({});
  await prisma.insumo.deleteMany({});
  await prisma.producto.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.sucursal.deleteMany({});

  const passwordHash = await bcrypt.hash('admin123', 10);
  const catalogo = construirCatalogo();

  // Administrador general
  await prisma.usuario.create({
    data: { nombre: 'Administrador General', correo: 'admin@gorichicken.com', contrasena: passwordHash, rol: 'ADMIN' }
  });

  const datosSucursales = [
    { nombre: 'Gori 1 (Parque Lincoln)', ubicacion: 'Parque Lincoln - Atención regular, exceptuando los martes' },
    { nombre: 'Gori 2 (El Prado - Av. Ballivián)', ubicacion: 'El Prado, Av. Ballivián - Centro de mayor exigencia operativa (3500-4200 comensales/mes). Sin atención domingos' },
    { nombre: 'Gori 3 (Recoleta)', ubicacion: 'Recoleta - Atención regular, exceptuando los lunes' },
    { nombre: 'Gori 4 (Centro)', ubicacion: 'Centro - Atención regular, exceptuando los domingos' },
  ];

  for (let i = 0; i < datosSucursales.length; i++) {
    const sucursal = await prisma.sucursal.create({ data: datosSucursales[i] });

    // Personal
    await prisma.usuario.create({ data: { nombre: `Gerente Gori ${i + 1}`, correo: `gerente${i + 1}@gorichicken.com`, contrasena: passwordHash, rol: 'GERENTE', sucursalId: sucursal.id } });
    await prisma.usuario.create({ data: { nombre: `Cajero Gori ${i + 1}`, correo: `caja${i + 1}@gorichicken.com`, contrasena: passwordHash, rol: 'CAJERO', sucursalId: sucursal.id } });
    await prisma.usuario.create({ data: { nombre: `Cocinero Gori ${i + 1}`, correo: `cocina${i + 1}@gorichicken.com`, contrasena: passwordHash, rol: 'COCINERO', sucursalId: sucursal.id } });
    await prisma.usuario.create({ data: { nombre: `Tótem Gori ${i + 1}`, correo: `totem${i + 1}@gorichicken.com`, contrasena: passwordHash, rol: 'TOTEM', sucursalId: sucursal.id } });

    // Insumos de la sucursal
    await prisma.insumo.createMany({ data: INSUMOS.map(x => ({ ...x, sucursalId: sucursal.id })) });
    const insumos = await prisma.insumo.findMany({ where: { sucursalId: sucursal.id } });
    const insumoId = Object.fromEntries(insumos.map(x => [x.nombre, x.id]));

    // Productos de la sucursal
    await prisma.producto.createMany({ data: catalogo.map(p => ({ nombre: p.nombre, categoria: p.categoria, precio: p.precio, sucursalId: sucursal.id })) });
    const productos = await prisma.producto.findMany({ where: { sucursalId: sucursal.id } });
    const productoId = Object.fromEntries(productos.map(x => [x.nombre, x.id]));

    // Recetas de la sucursal
    for (const p of catalogo) {
      if (!p.receta) continue;
      const receta = await prisma.receta.create({ data: { productoId: productoId[p.nombre], sucursalId: sucursal.id } });
      await prisma.recetaInsumo.createMany({
        data: p.receta
          .filter(([n, c]) => insumoId[n] && c > 0)
          .map(([n, c]) => ({ recetaId: receta.id, insumoId: insumoId[n], cantidad: Number(c) }))
      });
    }
  }

  const totalRecetas = catalogo.filter(p => p.receta).length;
  console.log('--- SEED EXITOSO ---');
  console.log(`✅ 4 sucursales, cada una con ${INSUMOS.length} insumos, ${catalogo.length} productos y ${totalRecetas} recetas.`);
  console.log('👑 Admin: admin@gorichicken.com / admin123');
  console.log('   gerente#, caja#, cocina#, totem# @gorichicken.com / admin123  (#=1..4)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
