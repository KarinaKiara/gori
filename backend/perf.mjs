// Banco de pruebas de RENDIMIENTO de Gori Chicken.
// Mide tiempos de respuesta, carga concurrente y estres sobre el backend local.
// Al terminar restaura el stock de insumos y borra los pedidos de prueba.
import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3000';

// SEGURO: este banco crea pedidos de prueba y luego los borra y restaura el stock.
// Solo puede correr contra la base LOCAL. Si apunta a la nube (Aiven/Render), aborta.
const url = process.env.DATABASE_URL || '';
if (!/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error('ABORTADO: perf.mjs solo corre contra la base de datos LOCAL.');
  console.error('DATABASE_URL no apunta a localhost. No se ejecuta nada.');
  process.exit(1);
}

const prisma = new PrismaClient();
const R = (x, d = 1) => Number(x.toFixed(d));

function stats(ms) {
  const a = [...ms].sort((x, y) => x - y);
  const q = p => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  return {
    n: a.length,
    min: R(a[0]), avg: R(a.reduce((s, v) => s + v, 0) / a.length),
    p50: R(q(0.50)), p90: R(q(0.90)), p95: R(q(0.95)), max: R(a[a.length - 1])
  };
}

async function login(correo) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena: 'admin123' })
  });
  const j = await r.json();
  if (!j.token) throw new Error('login fallo: ' + correo);
  return j;
}

async function medir(fn) {
  const t0 = performance.now();
  let ok = true;
  try { ok = await fn(); } catch (e) { ok = false; }
  return { ms: performance.now() - t0, ok: ok !== false };
}

const GET = (ruta, tk) => async () => {
  const r = await fetch(BASE + ruta, { headers: { Authorization: 'Bearer ' + tk } });
  return r.ok;
};

async function main() {
  const salida = { equipo: {}, pruebas: {} };

  // ── Preparacion ──────────────────────────────────────────────────────────
  const caja = await login('caja2@gorichicken.com');
  const tk = caja.token;
  const sucursalId = caja.usuario.sucursalId;
  const prod = await prisma.producto.findFirst({ where: { sucursalId }, select: { nombre: true } });

  // Foto del stock ANTES, para restaurarlo al final
  const stockAntes = await prisma.insumo.findMany({
    where: { sucursalId }, select: { id: true, stockActual: true }
  });
  const pedidosAntes = new Set((await prisma.pedido.findMany({ select: { id: true } })).map(p => p.id));

  console.log('== Preparacion lista. Sucursal:', caja.usuario.sucursal, '| Plato:', prod.nombre);

  // Calentamiento (descarta el arranque en frio del pool de conexiones)
  for (let i = 0; i < 10; i++) await fetch(BASE + '/api/productos/menu', { headers: { Authorization: 'Bearer ' + tk } });

  // ── PRUEBA 1: tiempo de respuesta por endpoint (40 llamadas secuenciales) ─
  const endpoints = [
    ['Menu de la sucursal', '/api/productos/menu'],
    ['Disponibilidad por stock', '/api/productos/disponibilidad'],
    ['Pedidos activos (KDS)', '/api/pedidos'],
    ['Pedidos por cobrar (caja)', '/api/pedidos/por-cobrar'],
  ];
  salida.pruebas.tiempoRespuesta = [];
  for (const [nombre, ruta] of endpoints) {
    const ms = [];
    for (let i = 0; i < 40; i++) ms.push((await medir(GET(ruta, tk))).ms);
    const s = stats(ms);
    salida.pruebas.tiempoRespuesta.push({ nombre, ruta, ...s });
    console.log(`T1 ${nombre.padEnd(28)} avg=${s.avg}ms p95=${s.p95}ms max=${s.max}ms`);
  }
  // El login se mide aparte porque bcrypt lo hace deliberadamente lento
  {
    const ms = [];
    for (let i = 0; i < 15; i++) ms.push((await medir(async () => { await login('caja2@gorichicken.com'); return true; })).ms);
    const s = stats(ms);
    salida.pruebas.tiempoRespuesta.push({ nombre: 'Inicio de sesion (bcrypt)', ruta: '/api/auth/login', ...s });
    console.log(`T1 ${'Inicio de sesion'.padEnd(28)} avg=${s.avg}ms p95=${s.p95}ms max=${s.max}ms`);
  }

  // ── PRUEBA 2: carga concurrente de LECTURA ───────────────────────────────
  salida.pruebas.carga = [];
  for (const nivel of [10, 25, 50, 100]) {
    const t0 = performance.now();
    const res = await Promise.all(Array.from({ length: nivel }, () => medir(GET('/api/productos/menu', tk))));
    const total = performance.now() - t0;
    const s = stats(res.map(r => r.ms));
    const errores = res.filter(r => !r.ok).length;
    const fila = { usuarios: nivel, ...s, errores, exito: R(100 * (nivel - errores) / nivel), rps: R(nivel / (total / 1000)) };
    salida.pruebas.carga.push(fila);
    console.log(`T2 ${nivel} simultaneos: avg=${fila.avg}ms p95=${fila.p95}ms ${fila.rps} pet/s errores=${errores}`);
  }

  // ── PRUEBA 3: ESCRITURA concurrente (pedidos simultaneos) ────────────────
  // Verifica ademas que no se repita el numero de turno bajo concurrencia.
  salida.pruebas.escritura = [];
  for (const nivel of [5, 10, 20]) {
    const t0 = performance.now();
    const res = await Promise.all(Array.from({ length: nivel }, (_, i) => (async () => {
      const t1 = performance.now();
      const r = await fetch(BASE + '/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk },
        body: JSON.stringify({
          clienteRef: `PERF-${nivel}-${i}-${Date.now()}`,
          numeroPedido: 1, metodoPago: 'efectivo', montoTotal: 0,
          items: [{ nombre: prod.nombre, cantidad: 1 }]
        })
      });
      const j = await r.json().catch(() => ({}));
      return { ms: performance.now() - t1, ok: r.ok, turno: j.numeroPedido };
    })()));
    const total = performance.now() - t0;
    const s = stats(res.map(r => r.ms));
    const turnos = res.filter(r => r.ok).map(r => r.turno);
    const unicos = new Set(turnos).size;
    const fila = {
      pedidos: nivel, ...s, errores: res.filter(r => !r.ok).length,
      turnosUnicos: unicos, turnosRepetidos: turnos.length - unicos,
      rps: R(nivel / (total / 1000))
    };
    salida.pruebas.escritura.push(fila);
    console.log(`T3 ${nivel} pedidos simultaneos: avg=${fila.avg}ms p95=${fila.p95}ms turnos unicos=${unicos}/${turnos.length}`);
  }

  // ── PRUEBA 4: ESTRES (subir hasta degradar) ──────────────────────────────
  salida.pruebas.estres = [];
  for (const nivel of [100, 200, 400, 800]) {
    const t0 = performance.now();
    const res = await Promise.all(Array.from({ length: nivel }, () => medir(GET('/api/productos/menu', tk))));
    const total = performance.now() - t0;
    const s = stats(res.map(r => r.ms));
    const errores = res.filter(r => !r.ok).length;
    const fila = { usuarios: nivel, ...s, errores, exito: R(100 * (nivel - errores) / nivel), rps: R(nivel / (total / 1000)) };
    salida.pruebas.estres.push(fila);
    console.log(`T4 ${nivel} simultaneos: avg=${fila.avg}ms p95=${fila.p95}ms ${fila.rps} pet/s errores=${errores}`);
  }

  // ── Volumen actual de la base ────────────────────────────────────────────
  salida.pruebas.volumen = {
    pedidos: await prisma.pedido.count(),
    items: await prisma.itemPedido.count(),
    productos: await prisma.producto.count(),
    insumos: await prisma.insumo.count(),
    movimientos: await prisma.movimientoInventario.count().catch(() => null),
    sucursales: await prisma.sucursal.count(),
  };
  console.log('T5 Volumen:', JSON.stringify(salida.pruebas.volumen));

  // ── LIMPIEZA: borrar pedidos de prueba y restaurar el stock ──────────────
  const nuevos = (await prisma.pedido.findMany({ select: { id: true } }))
    .map(p => p.id).filter(id => !pedidosAntes.has(id));
  await prisma.itemPedido.deleteMany({ where: { pedidoId: { in: nuevos } } });
  await prisma.pedido.deleteMany({ where: { id: { in: nuevos } } });
  for (const s of stockAntes) {
    await prisma.insumo.update({ where: { id: s.id }, data: { stockActual: s.stockActual } });
  }
  await prisma.movimientoInventario.deleteMany({ where: { pedidoId: { in: nuevos } } }).catch(() => {});
  console.log(`== Limpieza: ${nuevos.length} pedidos de prueba borrados y stock restaurado.`);

  console.log('\n===JSON===');
  console.log(JSON.stringify(salida, null, 2));
  await prisma.$disconnect();
}

main().catch(async e => { console.error('FALLO:', e); await prisma.$disconnect(); process.exit(1); });
