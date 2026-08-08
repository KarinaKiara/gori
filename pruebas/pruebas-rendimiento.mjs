/**
 * Pruebas de rendimiento e integridad del sistema Gori Chicken
 * ------------------------------------------------------------
 * Uso:   node pruebas/pruebas-rendimiento.mjs
 *        BASE=https://mi-app.onrender.com node pruebas/pruebas-rendimiento.mjs
 *
 * Genera: pruebas/RESULTADOS.md  y  pruebas/resultados.json
 */
import { writeFileSync, mkdirSync } from 'fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const PASS = process.env.PASS || 'admin123';
const CONCURRENCIA = Number(process.env.CONC || 50);   // pedidos simultáneos
const REPETICIONES = Number(process.env.REP || 30);    // muestras de latencia

const salida = { base: BASE, fecha: new Date().toISOString(), pruebas: [] };

// ── utilidades ─────────────────────────────────────────────
const ms = () => performance.now();

async function pedir(ruta, { metodo = 'GET', token, cuerpo } = {}) {
  const cab = { 'Content-Type': 'application/json' };
  if (token) cab.Authorization = 'Bearer ' + token;
  const t0 = ms();
  let res, datos = null, error = null;
  try {
    res = await fetch(BASE + ruta, {
      method: metodo, headers: cab,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    datos = await res.json().catch(() => null);
  } catch (e) { error = e.message; }
  return { ms: ms() - t0, estado: res?.status ?? 0, ok: !!res?.ok, datos, error };
}

const login = async (correo) =>
  (await pedir('/api/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena: PASS } })).datos;

function estadisticas(lista) {
  const s = [...lista].sort((a, b) => a - b);
  const suma = s.reduce((a, b) => a + b, 0);
  const p = (q) => s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)];
  return {
    muestras: s.length,
    min: +s[0].toFixed(1),
    media: +(suma / s.length).toFixed(1),
    p95: +p(0.95).toFixed(1),
    max: +s[s.length - 1].toFixed(1),
  };
}

const ref = (p) => `${p}-${Date.now()}-${Math.floor(performance.now() * 1000) % 100000}`;

// ── inicio ─────────────────────────────────────────────────
console.log(`\n═══ PRUEBAS DE RENDIMIENTO — Gori Chicken ═══`);
console.log(`Servidor: ${BASE}\n`);

const caja1 = await login('caja1@gorichicken.com');
const caja2 = await login('caja2@gorichicken.com');
const ger1 = await login('gerente1@gorichicken.com');
if (!caja1?.token) { console.error('✘ No se pudo iniciar sesión. ¿Está corriendo el servidor?'); process.exit(1); }

const productos = (await pedir('/api/gerente/productos', { token: ger1.token })).datos || [];
const PLATO = productos.find((p) => p.estaDisponible)?.nombre;
console.log(`Plato usado en las pruebas: "${PLATO}"\n`);

const stockDe = async () => {
  const ins = (await pedir('/api/gerente/insumos', { token: ger1.token })).datos || [];
  return Object.fromEntries(ins.map((i) => [i.nombre, i.stockActual]));
};

// ══ P1 · TIEMPO DE RESPUESTA ══════════════════════════════
console.log('▸ P1 · Tiempo de respuesta (endpoints clave)');
const endpoints = [
  ['Inicio de sesión', () => pedir('/api/auth/login', { metodo: 'POST', cuerpo: { correo: 'caja1@gorichicken.com', contrasena: PASS } })],
  ['Consultar menú/disponibilidad', () => pedir('/api/productos/disponibilidad', { token: caja1.token })],
  ['Listar pedidos activos (KDS)', () => pedir('/api/pedidos', { token: caja1.token })],
];
const p1 = [];
for (const [nombre, fn] of endpoints) {
  const lat = [];
  for (let i = 0; i < REPETICIONES; i++) { const r = await fn(); if (r.ok) lat.push(r.ms); }
  const e = estadisticas(lat);
  p1.push({ endpoint: nombre, ...e });
  console.log(`   ${nombre.padEnd(32)} media ${String(e.media).padStart(7)} ms  p95 ${String(e.p95).padStart(7)} ms`);
}
salida.pruebas.push({ id: 'P1', nombre: 'Tiempo de respuesta', detalle: p1 });

// ══ P2 · CARGA / CONCURRENCIA ═════════════════════════════
console.log(`\n▸ P2 · Carga: ${CONCURRENCIA} pedidos simultáneos`);
const stockAntes = await stockDe();
const t0 = ms();
const resultados = await Promise.all(
  Array.from({ length: CONCURRENCIA }, () =>
    pedir('/api/pedidos', {
      metodo: 'POST', token: caja1.token,
      cuerpo: { items: [{ nombre: PLATO, cantidad: 1 }], clienteRef: ref('CARGA'), metodoPago: 'efectivo' },
    })
  )
);
const duracion = ms() - t0;
const oks = resultados.filter((r) => r.ok);
const fallos = resultados.filter((r) => !r.ok);
const estL = estadisticas(resultados.map((r) => r.ms));
const p2 = {
  concurrencia: CONCURRENCIA,
  exitosos: oks.length,
  fallidos: fallos.length,
  tasaError: +((fallos.length / CONCURRENCIA) * 100).toFixed(2),
  duracionTotalMs: +duracion.toFixed(1),
  throughput: +(CONCURRENCIA / (duracion / 1000)).toFixed(1),
  latencia: estL,
  erroresEjemplo: [...new Set(fallos.map((f) => `${f.estado}: ${f.datos?.error || f.error}`))].slice(0, 3),
};
console.log(`   Exitosos ${p2.exitosos}/${CONCURRENCIA}   Errores ${p2.tasaError}%   Total ${p2.duracionTotalMs} ms   ${p2.throughput} pedidos/s`);
console.log(`   Latencia: media ${estL.media} ms · p95 ${estL.p95} ms · max ${estL.max} ms`);
if (p2.erroresEjemplo.length) console.log('   Errores:', p2.erroresEjemplo.join(' | '));
salida.pruebas.push({ id: 'P2', nombre: 'Carga / concurrencia', detalle: p2 });

// ══ P3 · IDEMPOTENCIA (cola offline) ══════════════════════
console.log('\n▸ P3 · Idempotencia: reenvío de la cola offline');
const refUnica = ref('OFFLINE');
const reenvios = await Promise.all(
  Array.from({ length: 5 }, () =>
    pedir('/api/pedidos', {
      metodo: 'POST', token: caja1.token,
      cuerpo: { items: [{ nombre: PLATO, cantidad: 1 }], clienteRef: refUnica, metodoPago: 'efectivo' },
    })
  )
);
const creados = reenvios.filter((r) => r.estado === 201).length;
const duplicados = reenvios.filter((r) => r.datos?.duplicado).length;
const idsUnicos = new Set(reenvios.map((r) => r.datos?.id).filter(Boolean)).size;
const p3 = {
  reenvios: 5, pedidosCreados: creados, respuestasDuplicado: duplicados,
  pedidosDistintosEnBD: idsUnicos,
  correcto: idsUnicos === 1 && creados === 1,
};
console.log(`   5 reenvíos del mismo pedido → creados: ${creados} · duplicados detectados: ${duplicados} · pedidos en BD: ${idsUnicos}  ${p3.correcto ? '✔ sin duplicar' : '✘ DUPLICÓ'}`);
salida.pruebas.push({ id: 'P3', nombre: 'Idempotencia offline', detalle: p3 });

// ══ P4 · INTEGRIDAD DE INVENTARIO ═════════════════════════
console.log('\n▸ P4 · Integridad del inventario tras la carga');
const stockDespues = await stockDe();
const cambios = Object.keys(stockAntes)
  .filter((n) => stockAntes[n] !== stockDespues[n])
  .map((n) => ({ insumo: n, antes: stockAntes[n], despues: stockDespues[n], consumido: +(stockAntes[n] - stockDespues[n]).toFixed(3) }));
const negativos = Object.entries(stockDespues).filter(([, v]) => v < 0).map(([n, v]) => `${n}=${v}`);
// pedidos exitosos = P2 + 1 de P3
const pedidosDescontados = oks.length + (creados === 1 ? 1 : 0);
const coherente = cambios.every((c) => Math.abs(c.consumido / pedidosDescontados - Math.round((c.consumido / pedidosDescontados) * 1000) / 1000) < 0.001);
const p4 = {
  insumosAfectados: cambios.length,
  stockNegativo: negativos.length,
  pedidosQueDescontaron: pedidosDescontados,
  descuentoProporcional: coherente,
  muestra: cambios.slice(0, 6),
};
console.log(`   Insumos descontados: ${cambios.length} · Stock negativo: ${negativos.length} ${negativos.length === 0 ? '✔' : '✘ ' + negativos.join(', ')}`);
cambios.slice(0, 5).forEach((c) => console.log(`     ${c.insumo.padEnd(20)} ${c.antes} → ${c.despues}  (-${c.consumido})`));
salida.pruebas.push({ id: 'P4', nombre: 'Integridad de inventario', detalle: p4 });

// ══ P5 · AISLAMIENTO MULTI-TENANT ═════════════════════════
console.log('\n▸ P5 · Aislamiento multi-tenant');
const refOtra = ref('SUC2');
const pedidoSuc2 = await pedir('/api/pedidos', {
  metodo: 'POST', token: caja2.token,
  cuerpo: { items: [{ nombre: (await pedir('/api/gerente/productos', { token: (await login('gerente2@gorichicken.com')).token })).datos?.find(p => p.estaDisponible)?.nombre, cantidad: 1 }], clienteRef: refOtra, metodoPago: 'efectivo' },
});
const listaSuc1 = (await pedir('/api/pedidos', { token: caja1.token })).datos || [];
const filtrado = !listaSuc1.some((p) => p.id === pedidoSuc2.datos?.id);
const rutaGerente = await pedir('/api/gerente/insumos', { token: caja1.token });
const p5 = {
  pedidoCreadoEnSucursal2: pedidoSuc2.ok,
  visibleDesdeSucursal1: !filtrado,
  aislamientoDatos: filtrado,
  cajeroEnRutaDeGerente: rutaGerente.estado,
  rolBloqueado: rutaGerente.estado === 403,
};
console.log(`   Pedido de Sucursal 2 visible desde Sucursal 1: ${!filtrado ? '✘ SÍ (fuga)' : 'NO ✔'}`);
console.log(`   Cajero accediendo a ruta de Gerente: HTTP ${rutaGerente.estado} ${p5.rolBloqueado ? '✔ bloqueado' : '✘ permitido'}`);
salida.pruebas.push({ id: 'P5', nombre: 'Aislamiento multi-tenant', detalle: p5 });

// ── informe ────────────────────────────────────────────────
mkdirSync('pruebas', { recursive: true });
writeFileSync('pruebas/resultados.json', JSON.stringify(salida, null, 2));

const md = `# Resultados de las pruebas de rendimiento

**Sistema:** Gori Chicken · **Servidor:** ${BASE}
**Fecha:** ${new Date().toLocaleString('es-BO')}

## Tabla 1. Tiempo de respuesta de los endpoints críticos

| Petición | Muestras | Mínimo (ms) | Media (ms) | p95 (ms) | Máximo (ms) |
|---|---|---|---|---|---|
${p1.map((e) => `| ${e.endpoint} | ${e.muestras} | ${e.min} | ${e.media} | ${e.p95} | ${e.max} |`).join('\n')}

## Tabla 2. Prueba de carga

| Métrica | Valor |
|---|---|
| Pedidos simultáneos | ${p2.concurrencia} |
| Pedidos procesados con éxito | ${p2.exitosos} |
| Pedidos fallidos | ${p2.fallidos} |
| Tasa de error | ${p2.tasaError} % |
| Tiempo total | ${p2.duracionTotalMs} ms |
| Rendimiento | ${p2.throughput} pedidos/s |
| Latencia media | ${p2.latencia.media} ms |
| Latencia p95 | ${p2.latencia.p95} ms |
| Latencia máxima | ${p2.latencia.max} ms |

## Tabla 3. Verificación de integridad y seguridad

| Prueba | Criterio esperado | Resultado | Cumple |
|---|---|---|---|
| Idempotencia offline | 5 reenvíos → 1 solo pedido | ${p3.pedidosDistintosEnBD} pedido(s) en BD | ${p3.correcto ? '✔' : '✘'} |
| Integridad de inventario | Ningún insumo con stock negativo | ${p4.stockNegativo} insumos negativos | ${p4.stockNegativo === 0 ? '✔' : '✘'} |
| Descuento por receta | Se descuenta al confirmar el pedido | ${p4.insumosAfectados} insumos descontados | ${p4.insumosAfectados > 0 ? '✔' : '✘'} |
| Aislamiento de sucursales | Sucursal 1 no ve pedidos de Sucursal 2 | ${p5.aislamientoDatos ? 'No los ve' : 'FUGA DE DATOS'} | ${p5.aislamientoDatos ? '✔' : '✘'} |
| Control de roles | Cajero no accede a rutas de Gerente | HTTP ${p5.cajeroEnRutaDeGerente} | ${p5.rolBloqueado ? '✔' : '✘'} |

_Fuente: Elaboración propia (${new Date().getFullYear()})._
`;
writeFileSync('pruebas/RESULTADOS.md', md);
console.log('\n✔ Informe generado: pruebas/RESULTADOS.md  y  pruebas/resultados.json\n');
