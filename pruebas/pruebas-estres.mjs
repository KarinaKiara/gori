/**
 * Prueba de ESTRÉS del sistema Gori Chicken
 * ------------------------------------------------------------
 * Somete al servidor a una rampa escalonada de carga creciente hasta
 * hallar su PUNTO DE QUIEBRE: el primer nivel de concurrencia en el que
 * deja de cumplir los criterios de servicio.
 *
 * A diferencia de una prueba de carga (un solo nivel fijo, que el sistema
 * debe soportar), la prueba de estrés busca deliberadamente el límite.
 *
 * Uso:
 *   node pruebas/pruebas-estres.mjs
 *   BASE=https://mi-app.onrender.com node pruebas/pruebas-estres.mjs
 *   NIVELES=10,25,50 node pruebas/pruebas-estres.mjs
 *
 * Genera: pruebas/estres-<entorno>.json  y  pruebas/ESTRES.md
 */
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from 'fs';

// ── Configuración ──────────────────────────────────────────
const BASE = process.env.BASE || 'http://localhost:3000';
const PASS = process.env.PASS || 'admin123';
const ES_LOCAL = /localhost|127\.0\.0\.1/.test(BASE);

// Rampa más corta fuera de local: el plan gratuito de Render no da para más y
// alargarla solo mide la infraestructura, no el sistema.
const NIVELES = (process.env.NIVELES || (ES_LOCAL ? '10,25,50,100,200,400' : '10,25,50,100'))
  .split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => n > 0);

// Criterios de servicio DECLARADOS ANTES DE CORRER. No se ajustan después de
// ver los resultados: eso invalidaría la prueba.
const UMBRAL_ERROR = Number(process.env.UMBRAL_ERROR || 1);      // % de peticiones fallidas
const UMBRAL_P95 = Number(process.env.UMBRAL_P95 || 3000);       // ms, latencia p95

const CORTE_ERROR = Number(process.env.CORTE_ERROR || 25);       // % que aborta la rampa
const TIEMPO_LIMITE = Number(process.env.TIMEOUT || 15000);      // ms por petición
const ENFRIAMIENTO = Number(process.env.ENFRIAMIENTO || 3000);   // ms entre escalones
const STOCK_OBJETIVO = Number(process.env.STOCK || 100000);      // se repone hasta aquí

// La rampa de ESCRITURA crea pedidos reales y repone inventario. Contra un
// servidor que no sea local eso altera datos de producción, así que queda
// desactivada salvo que se pida explícitamente con ESCRITURA=1.
const HACER_ESCRITURA = process.env.ESCRITURA
  ? process.env.ESCRITURA === '1'
  : ES_LOCAL;

const ETIQUETA = process.env.ETIQUETA || (ES_LOCAL ? 'local' : 'render');
const CORRIDA = Date.now();

// Vuelve a mostrar en consola el informe de una corrida ya guardada, sin
// estresar nada. Sirve para capturar la pantalla de una medición concreta sin
// tener que repetirla (y obtener así cifras distintas).
//   node pruebas/pruebas-estres.mjs --reimprimir local
if (process.argv.includes('--reimprimir')) {
  const etq = process.argv[process.argv.indexOf('--reimprimir') + 1] || 'local';
  reimprimir(etq);
  process.exit(0);
}

// Rehace pruebas/ESTRES.md a partir de los estres-*.json ya guardados, sin
// volver a estresar nada. Útil tras editar el formato del informe o después de
// correr los entornos por separado.
if (process.argv.includes('--solo-informe')) {
  generarInforme();
  console.log('\n✔ Informe regenerado desde los datos existentes: pruebas/ESTRES.md\n');
  process.exit(0);
}

// ── Utilidades ─────────────────────────────────────────────
const ms = () => performance.now();
const esperar = (t) => new Promise((r) => setTimeout(r, t));

async function pedir(ruta, { metodo = 'GET', token, cuerpo, limite = TIEMPO_LIMITE } = {}) {
  const cab = { 'Content-Type': 'application/json' };
  if (token) cab.Authorization = 'Bearer ' + token;
  const corte = new AbortController();
  const reloj = setTimeout(() => corte.abort(), limite);
  const t0 = ms();
  let res, datos = null, error = null;
  try {
    res = await fetch(BASE + ruta, {
      method: metodo, headers: cab, signal: corte.signal,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    datos = await res.json().catch(() => null);
  } catch (e) {
    error = e.name === 'AbortError' ? `sin respuesta en ${limite} ms` : e.message;
  } finally {
    clearTimeout(reloj);
  }
  return { ms: ms() - t0, estado: res?.status ?? 0, ok: !!res?.ok, datos, error };
}

const login = async (correo) =>
  (await pedir('/api/auth/login', { metodo: 'POST', cuerpo: { correo, contrasena: PASS } })).datos;

function estadisticas(lista) {
  if (!lista.length) return { muestras: 0, min: 0, media: 0, p95: 0, max: 0 };
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

// Distingue por qué falló cada petición. Sin esto un "20 % de error" no dice
// nada: no es lo mismo que el servidor se caiga (5xx) a que rechace el pedido
// por una regla de negocio (4xx).
function clasificar(r) {
  if (r.estado === 0) return 'red/timeout';
  if (r.estado === 429) return 'límite de peticiones';
  if (r.estado >= 500) return 'error del servidor';
  if (r.estado >= 400) return 'rechazo de negocio';
  return 'ok';
}

function resumirEscalon(nivel, resultados, duracion) {
  const exitosos = resultados.filter((r) => r.ok);
  const fallidos = resultados.filter((r) => !r.ok);
  const porTipo = {};
  fallidos.forEach((r) => { const t = clasificar(r); porTipo[t] = (porTipo[t] || 0) + 1; });
  const tasaError = +((fallidos.length / resultados.length) * 100).toFixed(2);
  const lat = estadisticas(resultados.map((r) => r.ms));
  const incumple = [];
  if (tasaError > UMBRAL_ERROR) incumple.push(`error ${tasaError} % > ${UMBRAL_ERROR} %`);
  if (lat.p95 > UMBRAL_P95) incumple.push(`p95 ${lat.p95} ms > ${UMBRAL_P95} ms`);
  return {
    nivel,
    peticiones: resultados.length,
    exitosos: exitosos.length,
    fallidos: fallidos.length,
    tasaError,
    duracionMs: +duracion.toFixed(1),
    throughput: +(exitosos.length / (duracion / 1000)).toFixed(1),
    latencia: lat,
    fallosPorTipo: porTipo,
    ejemplosError: [...new Set(fallidos.map((f) => `${f.estado || '—'}: ${f.datos?.error || f.error}`))].slice(0, 3),
    cumple: incumple.length === 0,
    incumple,
  };
}

function imprimirEscalon(e) {
  const marca = e.cumple ? 'OK ' : ' X ';
  console.log(`   ${marca} ${String(e.nivel).padStart(4)} simultáneos · éxito ${String(e.exitosos).padStart(4)}/${e.peticiones} · error ${String(e.tasaError).padStart(6)} % · media ${String(e.latencia.media).padStart(7)} ms · p95 ${String(e.latencia.p95).padStart(7)} ms · ${String(e.throughput).padStart(6)} pet/s`);
  if (!e.cumple) console.log(`        incumple: ${e.incumple.join(' | ')}`);
  const tipos = Object.entries(e.fallosPorTipo);
  if (tipos.length) console.log(`        fallos: ${tipos.map(([t, n]) => `${t}=${n}`).join(', ')}`);
  if (e.ejemplosError.length) console.log(`        ejemplo: ${e.ejemplosError[0]}`);
}

// Recorre la rampa aplicando el criterio de quiebre y el corte anticipado.
async function correrRampa(nombre, hacerEscalon, antesDeEscalon) {
  console.log(`\n▸ ${nombre}`);
  const escalones = [];
  let quiebre = null;
  for (const nivel of NIVELES) {
    if (antesDeEscalon) await antesDeEscalon(nivel);
    const t0 = ms();
    const resultados = await hacerEscalon(nivel);
    const e = resumirEscalon(nivel, resultados.flat(), ms() - t0);
    escalones.push(e);
    imprimirEscalon(e);
    if (!e.cumple && quiebre === null) quiebre = nivel;
    if (e.tasaError > CORTE_ERROR) {
      console.log(`        ▸ rampa detenida: ${e.tasaError} % de error supera el corte de ${CORTE_ERROR} %`);
      break;
    }
    if (nivel !== NIVELES[NIVELES.length - 1]) await esperar(ENFRIAMIENTO);
  }
  const cumplidos = escalones.filter((e) => e.cumple).map((e) => e.nivel);
  return {
    nombre,
    escalones,
    puntoQuiebre: quiebre,
    capacidadMaxima: cumplidos.length ? Math.max(...cumplidos) : 0,
    rampaCompletada: escalones.length === NIVELES.length,
  };
}

// ── Inicio ─────────────────────────────────────────────────
console.log('\n═══ PRUEBA DE ESTRÉS — Gori Chicken ═══');
console.log(`Servidor : ${BASE}  (${ETIQUETA})`);
console.log(`Rampa    : ${NIVELES.join(' → ')} peticiones simultáneas`);
console.log(`Criterio : falla el escalón si error > ${UMBRAL_ERROR} % o p95 > ${UMBRAL_P95} ms`);
console.log(`Escritura: ${HACER_ESCRITURA ? 'SÍ (crea pedidos y repone inventario)' : 'NO (solo lectura, no se modifican datos)'}`);

// Calentamiento: en el plan gratuito de Render el servicio se duerme y la
// primera petición paga el arranque en frío. Se mide aparte y NO entra en las
// métricas de la rampa, o el primer escalón saldría falseado.
console.log('\n▸ Calentamiento (arranque en frío, no cuenta en la rampa)');
const calienta = await pedir('/api/auth/login', {
  metodo: 'POST', cuerpo: { correo: 'caja1@gorichicken.com', contrasena: PASS }, limite: 120000,
});
console.log(`   Primera petición: ${Math.round(calienta.ms)} ms (HTTP ${calienta.estado})`);

const caja = await login('caja1@gorichicken.com');
const gerente = await login('gerente1@gorichicken.com');
if (!caja?.token) {
  console.error('\n✘ No se pudo iniciar sesión. ¿Está corriendo el servidor y es correcta la contraseña?');
  process.exit(1);
}

const salida = {
  entorno: ETIQUETA,
  base: BASE,
  fecha: new Date().toISOString(),
  arranqueEnFrioMs: +calienta.ms.toFixed(1),
  criterios: {
    umbralErrorPct: UMBRAL_ERROR,
    umbralP95Ms: UMBRAL_P95,
    corteErrorPct: CORTE_ERROR,
    tiempoLimiteMs: TIEMPO_LIMITE,
  },
  niveles: NIVELES,
  rampas: [],
};

// ══ RAMPA 1 · ESCRITURA (creación de pedidos) ═════════════
if (HACER_ESCRITURA) {
  if (!gerente?.token) {
    console.error('✘ Sin sesión de gerente no se puede reponer el inventario. Se aborta la rampa de escritura.');
    process.exit(1);
  }
  const productos = (await pedir('/api/gerente/productos', { token: gerente.token })).datos || [];
  const plato = productos.find((p) => p.estaDisponible);
  if (!plato) { console.error('✘ No hay ningún producto disponible para la prueba.'); process.exit(1); }

  const receta = (await pedir(`/api/gerente/recetas/${plato.id}`, { token: gerente.token })).datos;
  const idsReceta = new Set((receta?.insumos || []).map((i) => i.insumoId));
  console.log(`\n   Plato de prueba: "${plato.nombre}" · insumos en su receta: ${idsReceta.size || 'sin receta (se repondrán todos)'}`);

  // Antes de cada escalón se repone el stock. Así, si un pedido falla, es por la
  // carga y no porque se acabó la materia prima: sin esto el "punto de quiebre"
  // mediría el inventario, no el rendimiento.
  const reponerStock = async () => {
    const insumos = (await pedir('/api/gerente/insumos', { token: gerente.token })).datos || [];
    const aReponer = insumos.filter((i) =>
      (idsReceta.size === 0 || idsReceta.has(i.id)) && i.stockActual < STOCK_OBJETIVO);
    for (const i of aReponer) {
      await pedir(`/api/gerente/insumos/${i.id}`, {
        metodo: 'PUT', token: gerente.token,
        cuerpo: { agregar: +(STOCK_OBJETIVO - i.stockActual).toFixed(3), motivo: 'Reposición para prueba de estrés' },
      });
    }
    return aReponer.length;
  };

  const rampa = await correrRampa(
    'RAMPA 1 · Escritura: creación de pedidos (POST /api/pedidos)',
    (nivel) => Promise.all(
      Array.from({ length: nivel }, (_, i) =>
        pedir('/api/pedidos', {
          metodo: 'POST', token: caja.token,
          cuerpo: {
            items: [{ nombre: plato.nombre, cantidad: 1 }],
            clienteRef: `ESTRES-${ETIQUETA}-${CORRIDA}-${nivel}-${i}`,
            metodoPago: 'efectivo',
          },
        })
      )
    ),
    async (nivel) => {
      const n = await reponerStock();
      if (n) console.log(`        (inventario repuesto: ${n} insumo(s) antes del escalón de ${nivel})`);
    }
  );
  rampa.tipo = 'escritura';
  rampa.plato = plato.nombre;
  salida.rampas.push(rampa);

  // El inventario nunca debe quedar negativo, por más presión que haya recibido.
  const insumosFinal = (await pedir('/api/gerente/insumos', { token: gerente.token })).datos || [];
  const negativos = insumosFinal.filter((i) => i.stockActual < 0);
  salida.integridadBajoEstres = {
    insumosRevisados: insumosFinal.length,
    insumosNegativos: negativos.length,
    detalle: negativos.map((i) => `${i.nombre}=${i.stockActual}`),
  };
  console.log(`\n   Integridad tras el estrés: ${negativos.length === 0
    ? 'ningún insumo quedó en negativo ✔'
    : '✘ NEGATIVOS: ' + negativos.map((i) => i.nombre).join(', ')}`);
} else {
  console.log('\n▸ RAMPA 1 · Escritura: OMITIDA (servidor remoto; se evita alterar datos reales)');
}

// ══ RAMPA 2 · LECTURA (menú + KDS) ════════════════════════
// Cada usuario simultáneo hace lo mismo que en el local: consulta el menú y
// refresca la pantalla de cocina. No modifica nada, por eso puede correrse
// también contra producción.
const rampaLectura = await correrRampa(
  'RAMPA 2 · Lectura: consulta de menú y pantalla de cocina',
  (nivel) => Promise.all(
    Array.from({ length: nivel }, async () => [
      await pedir('/api/productos/disponibilidad', { token: caja.token }),
      await pedir('/api/pedidos', { token: caja.token }),
    ])
  )
);
rampaLectura.tipo = 'lectura';
salida.rampas.push(rampaLectura);

// ── Guardar e informar ─────────────────────────────────────
mkdirSync('pruebas', { recursive: true });
writeFileSync(`pruebas/estres-${ETIQUETA}.json`, JSON.stringify(salida, null, 2));

console.log('\n═══ RESUMEN ═══');
for (const r of salida.rampas) {
  const q = r.puntoQuiebre ? `${r.puntoQuiebre} simultáneos` : 'no se alcanzó en la rampa ejecutada';
  console.log(`   ${r.tipo.padEnd(10)} → capacidad máxima sostenible: ${r.capacidadMaxima} simultáneos · punto de quiebre: ${q}`);
}

generarInforme();
console.log(`\n✔ Datos: pruebas/estres-${ETIQUETA}.json`);
console.log('✔ Informe: pruebas/ESTRES.md\n');

// ── Reimpresión de una corrida guardada ────────────────────
function reimprimir(etiqueta) {
  let c;
  try {
    c = JSON.parse(readFileSync(`pruebas/estres-${etiqueta}.json`, 'utf8'));
  } catch {
    console.error(`✘ No existe pruebas/estres-${etiqueta}.json`);
    process.exit(1);
  }
  const esc = c.rampas.find((r) => r.tipo === 'escritura');

  console.log('\n═══ PRUEBA DE ESTRÉS — Gori Chicken ═══');
  console.log(`Servidor : ${c.base}  (${c.entorno})`);
  console.log(`Rampa    : ${c.niveles.join(' → ')} peticiones simultáneas`);
  console.log(`Criterio : falla el escalón si error > ${c.criterios.umbralErrorPct} % o p95 > ${c.criterios.umbralP95Ms} ms`);
  console.log(`Escritura: ${esc ? 'SÍ (crea pedidos y repone inventario)' : 'NO (solo lectura, no se modifican datos)'}`);

  console.log('\n▸ Calentamiento (arranque en frío, no cuenta en la rampa)');
  console.log(`   Primera petición: ${Math.round(c.arranqueEnFrioMs)} ms`);
  if (esc?.plato) console.log(`\n   Plato de prueba: "${esc.plato}"`);

  for (const r of c.rampas) {
    console.log(`\n▸ ${r.nombre}`);
    r.escalones.forEach(imprimirEscalon);
    if (!r.rampaCompletada) {
      const ult = r.escalones[r.escalones.length - 1];
      console.log(`        ▸ rampa detenida: ${ult.tasaError} % de error supera el corte de ${c.criterios.corteErrorPct} %`);
    }
    if (r.tipo === 'escritura' && c.integridadBajoEstres) {
      const n = c.integridadBajoEstres.insumosNegativos;
      console.log(`\n   Integridad tras el estrés: ${n === 0
        ? 'ningún insumo quedó en negativo ✔'
        : '✘ NEGATIVOS: ' + c.integridadBajoEstres.detalle.join(', ')}`);
    }
  }

  console.log('\n═══ RESUMEN ═══');
  for (const r of c.rampas) {
    const q = r.puntoQuiebre ? `${r.puntoQuiebre} simultáneos` : 'no se alcanzó en la rampa ejecutada';
    console.log(`   ${r.tipo.padEnd(10)} → capacidad máxima sostenible: ${r.capacidadMaxima} simultáneos · punto de quiebre: ${q}`);
  }
  console.log(`\n(informe reimpreso desde pruebas/estres-${etiqueta}.json, corrida del ${new Date(c.fecha).toLocaleString('es-BO')})\n`);
}

// ── Informe en Markdown ────────────────────────────────────
// Se reconstruye a partir de TODOS los estres-*.json presentes, de modo que
// correr primero local y después Render deja un solo documento con ambos.
function generarInforme() {
  const archivos = readdirSync('pruebas').filter((f) => /^estres-.*\.json$/.test(f)).sort();
  const corridas = archivos.map((f) => JSON.parse(readFileSync(`pruebas/${f}`, 'utf8')));
  if (!corridas.length) {
    console.error('✘ No hay ningún pruebas/estres-*.json del cual generar el informe.');
    process.exit(1);
  }

  const tabla = (r) => [
    '| Usuarios simultáneos | Peticiones | Éxitos | Fallos | Tasa de error (%) | Latencia media (ms) | Latencia p95 (ms) | Latencia máx. (ms) | Rendimiento (pet/s) | Cumple |',
    '|---|---|---|---|---|---|---|---|---|---|',
    ...r.escalones.map((e) =>
      `| ${e.nivel} | ${e.peticiones} | ${e.exitosos} | ${e.fallidos} | ${e.tasaError} | ${e.latencia.media} | ${e.latencia.p95} | ${e.latencia.max} | ${e.throughput} | ${e.cumple ? 'Sí' : 'No'} |`),
  ].join('\n');

  const seccion = (c) => {
    const partes = [
      `## Entorno: ${c.entorno}`,
      '',
      `**Servidor:** ${c.base} · **Fecha:** ${new Date(c.fecha).toLocaleString('es-BO')}`,
      '',
      `**Rampa aplicada:** ${c.niveles.join(' → ')} peticiones simultáneas`,
      '',
      `**Arranque en frío (primera petición, excluida de la rampa):** ${Math.round(c.arranqueEnFrioMs)} ms`,
      '',
    ];
    for (const r of c.rampas) {
      const q = r.puntoQuiebre
        ? `${r.puntoQuiebre} peticiones simultáneas`
        : 'no se alcanzó dentro de la rampa ejecutada';
      partes.push(
        `### Rampa de ${r.tipo}${r.plato ? ` — plato de prueba: "${r.plato}"` : ''}`,
        '',
        tabla(r),
        '',
        `**Capacidad máxima sostenible:** ${r.capacidadMaxima} peticiones simultáneas.`,
        '',
        `**Punto de quiebre:** ${q}.`,
        '',
      );
      const roto = r.escalones.find((e) => !e.cumple);
      if (roto) {
        partes.push(
          `En el escalón de ${roto.nivel} el sistema dejó de cumplir el criterio (${roto.incumple.join('; ')}).`,
          '',
        );
      }
      // Naturaleza de los fallos: sin esto la tasa de error es un número mudo.
      // No es lo mismo que el servidor se caiga a que rechace por regla de negocio.
      const conFallos = r.escalones.filter((e) => e.fallidos > 0);
      if (conFallos.length) {
        partes.push(
          '**Naturaleza de los fallos**',
          '',
          '| Usuarios simultáneos | Fallos | Tipo | Mensaje devuelto |',
          '|---|---|---|---|',
          ...conFallos.map((e) =>
            `| ${e.nivel} | ${e.fallidos} | ${Object.entries(e.fallosPorTipo).map(([t, n]) => `${t}: ${n}`).join(', ')} | ${e.ejemplosError[0] || '—'} |`),
          '',
        );
      }
    }
    if (c.integridadBajoEstres) {
      partes.push(
        '### Integridad del inventario bajo estrés',
        '',
        '| Verificación | Resultado |',
        '|---|---|',
        `| Insumos revisados | ${c.integridadBajoEstres.insumosRevisados} |`,
        `| Insumos con stock negativo | ${c.integridadBajoEstres.insumosNegativos} |`,
        `| Cumple | ${c.integridadBajoEstres.insumosNegativos === 0 ? 'Sí' : 'No — ' + c.integridadBajoEstres.detalle.join(', ')} |`,
        '',
      );
    }
    return partes.join('\n');
  };

  const c0 = corridas[0];
  const md = `# Resultados de la prueba de estrés

**Sistema:** Gori Chicken

## Criterios de aceptación

La prueba somete al servidor a una rampa de carga creciente. Los umbrales se
fijaron **antes** de ejecutarla:

| Parámetro | Valor |
|---|---|
| Tasa de error máxima admitida | ${c0.criterios.umbralErrorPct} % |
| Latencia p95 máxima admitida | ${c0.criterios.umbralP95Ms} ms |
| Tiempo límite por petición | ${c0.criterios.tiempoLimiteMs} ms |
| Corte anticipado de la rampa | error > ${c0.criterios.corteErrorPct} % |

Un escalón **cumple** si respeta ambos umbrales. El primer escalón que los
incumple es el **punto de quiebre**; el último que los cumple define la
**capacidad máxima sostenible**.

${corridas.map(seccion).join('\n')}
_Fuente: Elaboración propia (${new Date().getFullYear()})._
`;
  writeFileSync('pruebas/ESTRES.md', md);
}
