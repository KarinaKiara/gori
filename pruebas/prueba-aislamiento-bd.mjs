/**
 * Prueba del aislamiento por sucursal dentro de la base de datos
 * ---------------------------------------------------------------
 * Uso:   node pruebas/prueba-aislamiento-bd.mjs
 *
 * Escribe SQL directo en MySQL, sin pasar por el servidor ni por la extensión de
 * Prisma, como si un programador hubiera olvidado el filtro por sucursal. Las llaves
 * foráneas compuestas (id, sucursalId) deben rechazar todo enlace entre sucursales
 * con el error 1452, y aceptar el mismo enlace dentro de una sola sucursal.
 * Los registros de control se borran al terminar.
 */
import { randomUUID } from 'crypto';
import { prismaBase as prisma } from '../backend/src/db.js';

const [g1] = await prisma.$queryRaw`SELECT id, nombre FROM Sucursal WHERE nombre LIKE 'Gori 1%' LIMIT 1`;
const [g2] = await prisma.$queryRaw`SELECT id, nombre FROM Sucursal WHERE nombre LIKE 'Gori 2%' LIMIT 1`;
const [insG1] = await prisma.$queryRaw`SELECT id, nombre FROM Insumo WHERE sucursalId = ${g1.id} LIMIT 1`;
const [insG2] = await prisma.$queryRaw`SELECT id, nombre FROM Insumo WHERE sucursalId = ${g2.id} LIMIT 1`;
console.log(`Sucursal A: ${g1.nombre} · Sucursal B: ${g2.nombre}`);

const intentar = async (sql) => {
  try { await prisma.$executeRawUnsafe(sql); return { ok: true }; }
  catch (e) { return { ok: false, codigo: e.meta?.code || e.code, mensaje: (e.meta?.message || e.message).split('\n').pop() }; }
};
const movimiento = (suc, ins, id) => `INSERT INTO MovimientoInventario (id, sucursalId, insumoId, tipo, cantidad, stockAntes, stockDespues, motivo, createdAt)
  VALUES ('${id}', '${suc}', '${ins}', 'PRUEBA', 0, 0, 0, 'prueba de aislamiento', NOW(3))`;
const solicitud = (suc, ins, id) => `INSERT INTO SolicitudInsumo (id, sucursalId, insumoId, estado, createdAt)
  VALUES ('${id}', '${suc}', '${ins}', 'PENDIENTE', NOW(3))`;

const casos = [
  ['Movimiento de inventario de Gori 1 con un insumo de Gori 2', movimiento(g1.id, insG2.id, randomUUID()), false],
  ['Solicitud de insumo de Gori 1 con un insumo de Gori 2', solicitud(g1.id, insG2.id, randomUUID()), false],
  ['Control: movimiento de Gori 1 con un insumo de Gori 1', movimiento(g1.id, insG1.id, randomUUID()), true],
];
console.log('\n▸ SQL directo en MySQL, sin pasar por el sistema');
let cumple = true;
for (const [nombre, sql, debeAceptar] of casos) {
  const r = await intentar(sql);
  const bien = r.ok === debeAceptar;
  cumple &&= bien;
  console.log(`   ${bien ? '✔' : '✘'} ${nombre}: ${r.ok ? 'aceptado' : `rechazado (error ${r.codigo})`}`);
  if (!r.ok) console.log(`      bloqueado por la llave ${(r.mensaje.match(/CONSTRAINT `([^`]+)`/) || [, '?'])[1]}`);
}
await prisma.$executeRaw`DELETE FROM MovimientoInventario WHERE tipo = 'PRUEBA' AND motivo = 'prueba de aislamiento'`;
console.log(`\n${cumple ? '✔ MySQL rechaza los enlaces entre sucursales' : '✘ La base aceptó un enlace entre sucursales'}`);
await prisma.$disconnect();
