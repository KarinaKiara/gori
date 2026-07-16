<template>
  <div class="space-y-6">
    <!-- Sub-pestañas -->
    <div class="flex flex-wrap gap-2">
      <button v-for="t in tabs" :key="t.id" @click="subTab = t.id"
              :class="['px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
                       subTab === t.id ? 'text-[#17120c]' : 'text-gray-400 border border-white/10 hover:border-[#E4C07A]/40']"
              :style="subTab === t.id ? 'background: linear-gradient(135deg,#E4C07A,#caa24f);' : ''">
        {{ t.icono }} {{ t.nombre }}
        <span v-if="t.id === 'alertas' && alertas.length"
              class="ml-1 px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">{{ alertas.length }}</span>
      </button>
    </div>

    <p v-if="mensaje" class="p-3 rounded-xl text-sm font-semibold"
       :style="mensajeEsError ? 'background:rgba(239,68,68,.15);color:#fca5a5;' : 'background:rgba(34,197,94,.15);color:#86efac;'">
      {{ mensaje }}
    </p>

    <!-- ===================== INSUMOS ===================== -->
    <section v-show="subTab === 'insumos'" class="space-y-5">
      <!-- Alta de insumo -->
      <div class="p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
        <h3 class="text-white font-bold mb-3">➕ Nuevo insumo</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input v-model="nuevo.nombre" placeholder="Nombre (ej: Presa de pollo)" class="col-span-2 md:col-span-1 in" />
          <input v-model="nuevo.unidad" placeholder="Unidad (g, ml, unidad)" class="in" />
          <input v-model.number="nuevo.stockActual" type="number" min="0" placeholder="Stock inicial" class="in" />
          <input v-model.number="nuevo.stockMinimo" type="number" min="0" placeholder="Stock mínimo" class="in" />
          <button @click="crearInsumo" class="btn-naranja">Agregar</button>
        </div>
      </div>

      <!-- Tabla de insumos -->
      <div class="rounded-2xl border overflow-hidden" style="border-color: rgba(228,192,122,0.2);">
        <table class="w-full text-sm">
          <thead style="background: rgba(255,255,255,0.05);">
            <tr class="text-left text-gray-300">
              <th class="p-3">Insumo</th>
              <th class="p-3">Unidad</th>
              <th class="p-3">Stock actual</th>
              <th class="p-3">Stock mínimo</th>
              <th class="p-3">🍽️ Rinde para</th>
              <th class="p-3">Estado</th>
              <th class="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in insumos" :key="i.id" class="border-t border-white/5"
                :style="bajoMinimo(i) ? 'background: rgba(239,68,68,0.08);' : ''">
              <td class="p-3 text-white font-semibold">{{ i.nombre }}</td>
              <td class="p-3 text-gray-400">{{ i.unidad }}</td>
              <td class="p-3"><input v-model.number="i.stockActual" type="number" class="in w-28" /></td>
              <td class="p-3"><input v-model.number="i.stockMinimo" type="number" class="in w-28" /></td>
              <td class="p-3">
                <span v-if="rindePorInsumo(i) !== null"
                      class="px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                      :style="rindePorInsumo(i) <= 0 ? 'background:#7f1d1d;color:#fff;'
                            : rindePorInsumo(i) <= 5 ? 'background:rgba(234,179,8,.2);color:#fde047;'
                            : 'background:rgba(228,192,122,.18);color:#E4C07A;'">
                  {{ rindePorInsumo(i) <= 0 ? '¡Agotado!' : '~' + rindePorInsumo(i) + ' platos' }}
                </span>
                <span v-else class="text-gray-600 text-xs">sin receta</span>
              </td>
              <td class="p-3">
                <span v-if="bajoMinimo(i)" class="px-2 py-1 rounded-full text-xs font-bold bg-red-600 text-white">⚠ Bajo</span>
                <span v-else class="px-2 py-1 rounded-full text-xs font-bold" style="background:rgba(34,197,94,.2);color:#86efac;">OK</span>
              </td>
              <td class="p-3 text-right whitespace-nowrap">
                <button @click="abrirReponer(i)" class="btn-mini" style="background:rgba(34,197,94,.25);color:#86efac;">➕ Reponer</button>
                <button @click="guardarInsumo(i)" class="btn-mini" style="background:linear-gradient(135deg,#E4C07A,#caa24f);color:#17120c;">Guardar</button>
                <button @click="eliminarInsumo(i)" class="btn-mini" style="background:rgba(239,68,68,.2);color:#fca5a5;">Eliminar</button>
              </td>
            </tr>
            <tr v-if="!insumos.length"><td colspan="7" class="p-6 text-center text-gray-500">Aún no hay insumos. Agrega el primero arriba.</td></tr>
          </tbody>
        </table>
      </div>
      <p class="text-xs text-gray-500">Usa <b class="text-green-400">➕ Reponer</b> cuando compras más (suma al stock). "Guardar" corrige el stock o el mínimo a un valor exacto.</p>
    </section>

    <!-- Modal REPONER stock -->
    <Teleport to="body">
    <div v-if="reponerInsumo" class="pi-overlay" @click.self="reponerInsumo = null">
      <div class="pi-modal">
        <h3 class="text-white font-bold text-lg mb-1">➕ Reponer stock</h3>
        <p class="text-[#E4C07A] font-bold mb-4">{{ reponerInsumo.nombre }}</p>
        <div class="space-y-3">
          <div class="flex justify-between text-sm text-gray-300">
            <span>Stock actual:</span>
            <b>{{ reponerInsumo.stockActual }} {{ reponerInsumo.unidad }}</b>
          </div>
          <label class="block text-sm text-gray-300">¿Cuánto compraste? (en {{ reponerInsumo.unidad }})</label>
          <input v-model.number="cantidadRepone" type="number" min="0" step="any" class="in w-full" placeholder="Ej: 11500" @keyup.enter="confirmarReponer" />
          <div class="flex justify-between text-sm p-2 rounded-lg" style="background:rgba(34,197,94,.1);">
            <span class="text-gray-300">Nuevo stock:</span>
            <b class="text-green-400">{{ (Number(reponerInsumo.stockActual) + (Number(cantidadRepone) || 0)) }} {{ reponerInsumo.unidad }}</b>
          </div>
        </div>
        <div class="flex gap-2 mt-5">
          <button @click="confirmarReponer" class="btn-naranja flex-1">Confirmar reposición</button>
          <button @click="reponerInsumo = null" class="btn-mini" style="background:rgba(255,255,255,.08);color:#cbd5e1;padding:.6rem 1rem;">Cancelar</button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- ===================== RECETAS ===================== -->
    <section v-show="subTab === 'recetas'" class="grid md:grid-cols-3 gap-5">
      <!-- Lista de productos -->
      <div class="rounded-2xl border overflow-hidden md:col-span-1" style="border-color: rgba(228,192,122,0.2); max-height: 60vh; overflow-y:auto;">
        <div class="p-3 text-gray-300 font-bold" style="background: rgba(255,255,255,0.05);">Productos</div>
        <button v-for="p in productos" :key="p.id" @click="abrirReceta(p)"
                :class="['w-full text-left px-4 py-3 border-t border-white/5 flex justify-between items-center',
                         productoSel && productoSel.id === p.id ? 'text-white' : 'text-gray-300 hover:bg-white/5']"
                :style="productoSel && productoSel.id === p.id ? 'background: rgba(228,192,122,0.15);' : ''">
          <span>{{ p.nombre }}</span>
          <span v-if="p.receta && p.receta.insumos && p.receta.insumos.length"
                class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(34,197,94,.2);color:#86efac;">✓ receta</span>
        </button>
      </div>

      <!-- Editor de receta -->
      <div class="md:col-span-2 p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
        <div v-if="!productoSel" class="text-gray-500 text-center py-16">Selecciona un producto para definir su receta.</div>
        <div v-else class="space-y-4">
          <h3 class="text-white font-bold text-lg">📖 Receta de: <span class="text-[#E4C07A]">{{ productoSel.nombre }}</span></h3>
          <p class="text-xs text-gray-400">Define cuánto de cada insumo consume UN plato. Al vender, se descuenta esta cantidad × cantidad pedida.</p>

          <!-- Resumen: para cuántos platos alcanza con el stock actual -->
          <div v-if="rindeReceta !== null" class="flex items-center gap-3 p-4 rounded-2xl"
               :style="rindeReceta <= 0 ? 'background:rgba(127,29,29,.25);border:1px solid rgba(239,68,68,.5);'
                     : rindeReceta <= 5 ? 'background:rgba(234,179,8,.12);border:1px solid rgba(234,179,8,.4);'
                     : 'background:rgba(228,192,122,.1);border:1px solid rgba(228,192,122,.35);'">
            <span class="text-3xl">🍽️</span>
            <div>
              <p class="text-xs uppercase tracking-widest" style="color:rgba(228,192,122,.7);">Con el stock actual, esta receta rinde para</p>
              <p class="text-2xl font-black" :style="rindeReceta <= 0 ? 'color:#fca5a5;' : rindeReceta <= 5 ? 'color:#fde047;' : 'color:#F7E3A1;'">
                {{ rindeReceta <= 0 ? '¡No alcanza para ninguno!' : rindeReceta + ' plato' + (rindeReceta === 1 ? '' : 's') }}
              </p>
            </div>
          </div>

          <div v-for="(fila, idx) in detalle" :key="idx"
               class="flex gap-2 items-center p-2 rounded-xl"
               :style="esCuelloDeBotella(fila) ? 'background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.35);' : ''">
            <span v-if="esPresa(fila.insumoId)" class="text-lg" title="Es una presa de pollo">🍗</span>
            <select v-model="fila.insumoId" class="in flex-1">
              <option value="">— Insumo —</option>
              <optgroup label="🍗 Presas">
                <option v-for="i in insumos.filter(x => x.unidad === 'presa')" :key="i.id" :value="i.id">{{ i.nombre }}</option>
              </optgroup>
              <optgroup label="Otros insumos">
                <option v-for="i in insumos.filter(x => x.unidad !== 'presa')" :key="i.id" :value="i.id">{{ i.nombre }} ({{ i.unidad }})</option>
              </optgroup>
            </select>
            <input v-model.number="fila.cantidad" type="number" min="0" step="0.01" placeholder="Cantidad" class="in w-28" />
            <span class="text-gray-400 text-sm w-12">{{ unidadDe(fila.insumoId) }}</span>
            <!-- Para cuántos platos alcanza ESTE insumo -->
            <span v-if="platosDeFila(fila) !== null" class="text-xs font-bold whitespace-nowrap w-24 text-right"
                  :style="esCuelloDeBotella(fila) ? 'color:#fde047;' : 'color:rgba(228,192,122,.7);'">
              {{ platosDeFila(fila) }} platos {{ esCuelloDeBotella(fila) ? '⚠️' : '' }}
            </span>
            <span v-else class="text-xs text-gray-600 w-24 text-right">—</span>
            <button @click="detalle.splice(idx,1)" class="btn-mini" style="background:rgba(239,68,68,.2);color:#fca5a5;">✕</button>
          </div>
          <p v-if="detalle.some(f => esCuelloDeBotella(f)) && rindeReceta > 0" class="text-xs" style="color:rgba(234,179,8,.85);">
            ⚠️ El insumo marcado es el que se agota primero: es el que limita cuántos platos puedes hacer.
          </p>

          <button @click="detalle.push({ insumoId:'', cantidad:null })" class="text-sm text-[#E4C07A] hover:text-[#E4C07A] font-bold">+ Agregar insumo</button>

          <div class="pt-3 border-t border-white/10">
            <button @click="guardarReceta" class="btn-naranja">💾 Guardar receta</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ===================== ALERTAS ===================== -->
    <section v-show="subTab === 'alertas'" class="space-y-3">
      <div v-if="!alertas.length" class="p-10 text-center text-gray-500 rounded-2xl border" style="border-color: rgba(228,192,122,0.2);">
        ✅ Ningún insumo por debajo del mínimo.
      </div>
      <div v-for="a in alertas" :key="a.id" class="p-4 rounded-2xl border flex justify-between items-center"
           style="background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.4);">
        <div>
          <span class="text-white font-bold">{{ a.nombre }}</span>
          <span class="text-gray-400 text-sm ml-2">Quedan {{ a.stockActual }} {{ a.unidad }} (mínimo {{ a.stockMinimo }})</span>
        </div>
        <span class="px-3 py-1 rounded-full text-xs font-bold text-white"
              :style="a.stockActual <= 0 ? 'background:#7f1d1d;' : 'background:#dc2626;'">
          {{ a.stockActual <= 0 ? 'AGOTADO' : 'STOCK BAJO' }}
        </span>
      </div>
    </section>

    <!-- ===================== CONSUMO ===================== -->
    <section v-show="subTab === 'consumo'" class="space-y-4">
      <div class="flex flex-wrap items-center gap-3 p-4 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
        <span class="text-white font-bold text-sm">📅 Periodo:</span>
        <input type="date" v-model="consumoDesde" class="in" />
        <span class="text-gray-400">a</span>
        <input type="date" v-model="consumoHasta" class="in" />
        <button @click="cargarConsumo" class="btn-naranja">Ver consumo</button>
        <button @click="exportarConsumoPDF" class="btn-mini" style="background:#16a34a;color:#fff;padding:.5rem 1rem;">📄 Exportar PDF</button>
      </div>
      <div class="rounded-2xl border overflow-hidden" style="border-color: rgba(228,192,122,0.2);">
        <table class="w-full text-sm">
          <thead style="background: rgba(255,255,255,0.05);">
            <tr class="text-left text-gray-300"><th class="p-3">Insumo</th><th class="p-3">Total consumido</th><th class="p-3">N° de salidas</th></tr>
          </thead>
          <tbody>
            <tr v-for="(c, idx) in consumo" :key="idx" class="border-t border-white/5">
              <td class="p-3 text-white font-semibold">{{ c.insumo }}</td>
              <td class="p-3 text-[#E4C07A] font-bold">{{ c.totalConsumido }} {{ c.unidad }}</td>
              <td class="p-3 text-gray-400">{{ c.salidas }}</td>
            </tr>
            <tr v-if="!consumo.length"><td colspan="3" class="p-6 text-center text-gray-500">Sin consumo registrado en el periodo.</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../almacenes/auth';
import { exportarReporteInventario } from '../../utilidades/reportesPdf';

const authStore = useAuthStore();
const API = '/api/gerente';
const headers = () => ({ 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' });

const tabs = [
  { id: 'insumos', nombre: 'Insumos', icono: '📦' },
  { id: 'recetas', nombre: 'Recetas', icono: '📖' },
  { id: 'alertas', nombre: 'Alertas de stock', icono: '⚠️' },
  { id: 'consumo', nombre: 'Consumo', icono: '📉' },
];
const subTab = ref('insumos');

const insumos = ref([]);
const productos = ref([]);
const alertas = ref([]);
const consumo = ref([]);
const productoSel = ref(null);
const detalle = ref([]);

const nuevo = ref({ nombre: '', unidad: '', stockActual: null, stockMinimo: null });
const consumoDesde = ref('');
const consumoHasta = ref('');

// Reposición de stock (cuando el gerente compra más materia prima)
const reponerInsumo = ref(null);
const cantidadRepone = ref(null);
const abrirReponer = (i) => { reponerInsumo.value = i; cantidadRepone.value = null; };
// Helper: lee la respuesta como JSON aunque el servidor devuelva HTML (proxy caído),
// para que nunca reviente con SyntaxError.
const leerJson = async (res) => { try { return await res.json(); } catch { return {}; } };

const confirmarReponer = async () => {
  const cant = Number(cantidadRepone.value);
  if (!cant || cant <= 0) return avisar('Ingresa cuánto compraste', true);
  const nombre = reponerInsumo.value.nombre;
  try {
    // Mandamos CUÁNTO se compró, no el total: el servidor lo suma sobre el stock real.
    const res = await fetch(`${API}/insumos/${reponerInsumo.value.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ agregar: cant, motivo: 'Reposición por compra' })
    });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al reponer', true);
    reponerInsumo.value = null;
    await cargarInsumos(); await cargarAlertas();
    avisar(`Repuesto: +${cant} de "${nombre}"`);
  } catch (e) {
    avisar('Sin conexión. Revisa tu internet e intenta de nuevo.', true);
  }
};

// Exportar el reporte de inventario (consumo + stock) a PDF
const exportarConsumoPDF = () => {
  exportarReporteInventario({
    sucursal: authStore.usuario?.sucursal,
    desde: consumoDesde.value,
    hasta: consumoHasta.value,
    consumo: consumo.value,
    insumos: insumos.value
  });
};

const mensaje = ref('');
const mensajeEsError = ref(false);
const avisar = (texto, error = false) => {
  mensaje.value = texto; mensajeEsError.value = error;
  setTimeout(() => { mensaje.value = ''; }, 3500);
};

const bajoMinimo = (i) => Number(i.stockActual) <= Number(i.stockMinimo);
const insumoPorId = (id) => insumos.value.find(i => i.id === id);
const unidadDe = (insumoId) => insumoPorId(insumoId)?.unidad || '';
const esPresa = (id) => insumoPorId(id)?.unidad === 'presa';

// ── "¿Para cuántos platos alcanza?" ──
// Por FILA de receta: stock del insumo ÷ lo que consume un plato (redondeado abajo).
const platosDeFila = (fila) => {
  const ins = insumoPorId(fila.insumoId);
  const cant = Number(fila.cantidad);
  if (!ins || !(cant > 0)) return null;
  return Math.floor(Number(ins.stockActual) / cant);
};
// La receta rinde para = el insumo que se agota PRIMERO (el mínimo de todas las filas).
const rindeReceta = computed(() => {
  const nums = detalle.value.map(platosDeFila).filter(n => n !== null);
  return nums.length ? Math.min(...nums) : null;
});
// ¿Esta fila es la que limita? (la que se agota primero)
const esCuelloDeBotella = (fila) => {
  const n = platosDeFila(fila);
  return n !== null && rindeReceta.value !== null && n === rindeReceta.value;
};

// Para la TABLA de insumos: para cuántos platos alcanza cada insumo, mirando la
// receta que lo consume más rápido (el caso más exigente). null = no está en ninguna receta.
const rindePorInsumo = (insumo) => {
  let min = null;
  for (const p of productos.value) {
    const ri = p.receta?.insumos?.find(x => x.insumoId === insumo.id);
    if (ri && Number(ri.cantidad) > 0) {
      const n = Math.floor(Number(insumo.stockActual) / Number(ri.cantidad));
      min = (min === null) ? n : Math.min(min, n);
    }
  }
  return min;
};

// ---- Cargas ----  (silenciosas: si fallan, no rompen la pantalla)
const cargarInsumos = async () => {
  try { const res = await fetch(`${API}/insumos`, { headers: headers() }); if (res.ok) insumos.value = await res.json(); } catch {}
};
const cargarProductos = async () => {
  try { const res = await fetch(`${API}/productos`, { headers: headers() }); if (res.ok) productos.value = await res.json(); } catch {}
};
const cargarAlertas = async () => {
  try { const res = await fetch(`${API}/inventario/alertas`, { headers: headers() }); if (res.ok) alertas.value = await res.json(); } catch {}
};
const cargarConsumo = async () => {
  try {
    const params = new URLSearchParams();
    if (consumoDesde.value) params.set('desde', consumoDesde.value);
    if (consumoHasta.value) params.set('hasta', consumoHasta.value);
    const res = await fetch(`${API}/reportes/consumo?${params}`, { headers: headers() });
    if (res.ok) consumo.value = (await res.json()).consumo || [];
  } catch {}
};

// ---- Insumos ----
const crearInsumo = async () => {
  if (!nuevo.value.nombre?.trim() || !nuevo.value.unidad?.trim()) return avisar('Nombre y unidad son obligatorios', true);
  try {
    const res = await fetch(`${API}/insumos`, { method: 'POST', headers: headers(), body: JSON.stringify(nuevo.value) });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al crear', true);
    nuevo.value = { nombre: '', unidad: '', stockActual: null, stockMinimo: null };
    await cargarInsumos(); await cargarAlertas();
    avisar('Insumo agregado');
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};
const guardarInsumo = async (i) => {
  // Evita el borrado accidental: una celda vacía NO debe volverse 0.
  if (i.stockActual === '' || i.stockActual === null || i.stockMinimo === '' || i.stockMinimo === null) {
    return avisar('El stock y el mínimo no pueden quedar vacíos', true);
  }
  if (Number(i.stockActual) < 0 || Number(i.stockMinimo) < 0) {
    return avisar('El stock no puede ser negativo', true);
  }
  try {
    const res = await fetch(`${API}/insumos/${i.id}`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ stockActual: i.stockActual, stockMinimo: i.stockMinimo, nombre: i.nombre, unidad: i.unidad })
    });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'Error al guardar', true);
    await cargarAlertas();
    avisar(`"${i.nombre}" actualizado`);
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};
const eliminarInsumo = async (i) => {
  try {
    const res = await fetch(`${API}/insumos/${i.id}`, { method: 'DELETE', headers: headers() });
    const data = await leerJson(res);
    if (!res.ok) return avisar(data.error || 'No se pudo eliminar', true);
    await cargarInsumos(); await cargarAlertas();
    avisar('Insumo eliminado');
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};

// ---- Recetas ----
const abrirReceta = async (p) => {
  productoSel.value = p;
  try {
    const res = await fetch(`${API}/recetas/${p.id}`, { headers: headers() });
    const receta = res.ok ? await res.json() : { insumos: [] };
    detalle.value = (receta.insumos || []).map(ri => ({ insumoId: ri.insumoId, cantidad: ri.cantidad }));
  } catch { detalle.value = []; }
  if (!detalle.value.length) detalle.value = [{ insumoId: '', cantidad: null }];
};
const guardarReceta = async () => {
  const limpio = detalle.value.filter(f => f.insumoId && Number(f.cantidad) > 0);
  try {
    const res = await fetch(`${API}/recetas/${productoSel.value.id}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ insumos: limpio })
    });
    if (!res.ok) { const d = await leerJson(res); return avisar(d.error || 'Error al guardar receta', true); }
    await cargarProductos();
    avisar(`Receta de "${productoSel.value.nombre}" guardada`);
  } catch { avisar('Sin conexión. Intenta de nuevo.', true); }
};

onMounted(async () => {
  // Las fechas se fijan ANTES de cargar, así la pestaña Consumo nunca queda sin fechas
  // aunque una carga falle.
  const hoy = new Date();
  const hace7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  consumoHasta.value = hoy.toISOString().split('T')[0];
  consumoDesde.value = hace7.toISOString().split('T')[0];
  await Promise.all([cargarInsumos(), cargarProductos(), cargarAlertas()]);
  await cargarConsumo();
});
</script>

<style scoped>
.in {
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  color: #fff;
  outline: none;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(228,192,122,0.3);
}
.in::placeholder { color: #6b7280; }
.in option { background: #17120c; }
.btn-naranja {
  padding: 0.5rem 1rem;
  border-radius: 0.6rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: #17120c;
  background: linear-gradient(135deg, #E4C07A, #caa24f);
  border: none;
  cursor: pointer;
}
.btn-mini {
  padding: 0.35rem 0.7rem;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.75rem;
  border: none;
  cursor: pointer;
  margin-left: 0.35rem;
}
.pi-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.pi-modal {
  max-width: 360px; width: 100%;
  background: #17120c;
  border: 1px solid rgba(228,192,122,.35);
  border-radius: 18px;
  padding: 22px;
}
</style>
