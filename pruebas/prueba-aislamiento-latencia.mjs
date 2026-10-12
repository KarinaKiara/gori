/**
 * Prueba de aislamiento entre sucursales y de latencia de la comanda (caja → cocina)
 * --------------------------------------------------------------------------------
 * Uso:   node pruebas/prueba-aislamiento-latencia.mjs
 *        BASE=https://gori-chicken.onrender.com node pruebas/prueba-aislamiento-latencia.mjs
 *
 * A · Aislamiento: un usuario de la sucursal 1 intenta leer y modificar un pedido de
 *     la sucursal 2. Se espera 404 (para él ese pedido no existe).
 * B · Latencia: se registran N pedidos cobrados y se mide el tiempo desde que se
 *     envía cada pedido hasta que la pantalla de cocina recibe el evento por socket.
 *     Criterio: p95 ≤ 2000 ms.
 *
 * Los pedidos de prueba llevan clienteRef con prefijo PRUEBA-V4- para poder borrarlos
 * y devolver el stock al terminar (backend/_limpiarPruebaV4.mjs).
 * Genera: pruebas/aislamiento-latencia.json
 */
import { writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(new URL('../frontend/package.json', import.meta.url));
const { io } = require('socket.io-client');

const BASE = process.env.BASE || 'http://localhost:3000';
const PASS = process.env.PASS || 'admin123';
const N = Number(process.env.N || 100);
const ms = () => performance.now();

async function pedir(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const cab = { 'Content-Type': 'application/json' };
  if (token) cab.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + ruta, { method: metodo, headers: cab, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  return { estado: res.status, datos: await res.json().catch(() => null) };
}
const login = async (c) => (await pedir('/api/auth/login', { metodo: 'POST', cuerpo: { correo: c, contrasena: PASS } })).datos;
const ref = (p) => `PRUEBA-V4-${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const salida = { base: BASE, fecha: new Date().toISOString() };

const caja1 = await login('caja1@gorichicken.com');
const caja2 = await login('caja2@gorichicken.com');
const ger1 = await login('gerente1@gorichicken.com');
const ger2 = await login('gerente2@gorichicken.com');
const coc1 = await login('cocina1@gorichicken.com');
const prods = (await pedir('/api/gerente/productos', { token: ger1.token })).datos || [];
const PLATO = prods.find((p) => p.estaDisponible && p.precio > 0)?.nombre;
console.log(`Servidor ${BASE} · plato de prueba: ${PLATO}`);

// ══ A · AISLAMIENTO ENTRE SUCURSALES ══════════════════════════
console.log('\n▸ A · Acceso a datos de otra sucursal');
const ajeno = await pedir('/api/pedidos', { metodo: 'POST', token: caja2.token, cuerpo: { items: [{ nombre: PLATO, cantidad: 1 }], clienteRef: ref('AJENO'), metodoPago: 'efectivo' } });
const idAjeno = ajeno.datos?.id;
const insumosG2 = (await pedir('/api/gerente/insumos', { token: ger2.token })).datos || [];
const insumoAjeno = insumosG2[0];
const casos = [
  ['Cocina de Gori 1 cambia el estado de un pedido de Gori 2', () => pedir(`/api/pedidos/${idAjeno}/estado`, { metodo: 'PUT', token: coc1.token, cuerpo: { estado: 'EN PREPARACION' } }), 404],
  ['Gerente de Gori 1 abre el detalle de un pedido de Gori 2', () => pedir(`/api/gerente/reportes/pedido/${idAjeno}`, { token: ger1.token }), 404],
  ['Gerente de Gori 1 edita un insumo de Gori 2', () => pedir(`/api/gerente/insumos/${insumoAjeno?.id}`, { metodo: 'PUT', token: ger1.token, cuerpo: { stockMinimo: 1 } }), 404],
  ['Control: la cocina de Gori 2 sí cambia el estado de su pedido', async () => pedir(`/api/pedidos/${idAjeno}/estado`, { metodo: 'PUT', token: (await login('cocina2@gorichicken.com')).token, cuerpo: { estado: 'EN PREPARACION' } }), 200],
];
const resA = [];
for (const [nombre, fn, esperado] of casos) {
  const r = await fn();
  resA.push({ caso: nombre, esperado, obtenido: r.estado, cumple: r.estado === esperado });
  console.log(`   ${r.estado === esperado ? '✔' : '✘'} ${nombre}: ${r.estado} (esperado ${esperado})`);
}
const activos1 = (await pedir('/api/pedidos', { token: coc1.token })).datos || [];
const noVe = !activos1.some((p) => p.id === idAjeno);
resA.push({ caso: 'La cocina de Gori 1 no ve el pedido de Gori 2 en su lista', esperado: 'no aparece', obtenido: noVe ? 'no aparece' : 'aparece', cumple: noVe });
console.log(`   ${noVe ? '✔' : '✘'} La cocina de Gori 1 no ve el pedido de Gori 2`);
salida.aislamiento = resA;

// ══ B · LATENCIA CAJA → COCINA ═══════════════════════════════
console.log(`\n▸ B · Latencia de la comanda: ${N} pedidos`);
const socket = io(BASE, { transports: ['websocket'] });
await new Promise((ok) => socket.on('connect', ok));
socket.emit('unirse-sucursal', caja1.usuario.sucursalId);
await new Promise((ok) => setTimeout(ok, 500));
const enviados = new Map(), tiempos = [];
socket.on('pedido-recibido', (p) => {
  const t0 = enviados.get(p.clienteRef);
  if (t0 !== undefined) { tiempos.push(ms() - t0); enviados.delete(p.clienteRef); }
});
let fallidos = 0;
for (let i = 0; i < N; i++) {
  const cr = ref('LAT');
  enviados.set(cr, ms());
  const r = await pedir('/api/pedidos', { metodo: 'POST', token: caja1.token, cuerpo: { items: [{ nombre: PLATO, cantidad: 1 }], clienteRef: cr, metodoPago: 'efectivo' } });
  if (r.estado !== 201) { fallidos++; enviados.delete(cr); if (fallidos <= 3) console.log('   fallo:', r.estado, JSON.stringify(r.datos)); }
}
await new Promise((ok) => setTimeout(ok, 2000));
socket.close();
const s = [...tiempos].sort((a, b) => a - b);
const q = (x) => s[Math.min(s.length - 1, Math.ceil(x * s.length) - 1)];
const lat = { pedidos: N, recibidos: s.length, fallidos, perdidos: enviados.size, minMs: +s[0].toFixed(1), p50Ms: +q(0.5).toFixed(1), p95Ms: +q(0.95).toFixed(1), maxMs: +s[s.length - 1].toFixed(1), mediaMs: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1) };
lat.cumple = lat.p95Ms <= 2000 && lat.recibidos === N;
salida.latencia = lat;
console.log(`   Recibidos ${lat.recibidos}/${N} · p50 ${lat.p50Ms} ms · p95 ${lat.p95Ms} ms · máx ${lat.maxMs} ms → ${lat.cumple ? 'CUMPLE' : 'NO CUMPLE'} (p95 ≤ 2000 ms)`);

writeFileSync('pruebas/aislamiento-latencia.json', JSON.stringify(salida, null, 2));
console.log('\n✔ Resultados en pruebas/aislamiento-latencia.json');
process.exit(0);
