<!--
  Editor de la RECETA de un plato (solo admin). Se abre desde la pestaña "Platos del Menú".
  El admin elige qué insumos lleva el plato y cuánto de cada uno (en la unidad base:
  g, ml, unidad). El insumo es COMPARTIDO: el mismo "Arroz" que usa este plato lo usan
  otros platos y descuentan del mismo stock (no se cocina ni se guarda por separado).
  Al guardar, la receta se aplica a ESE plato en TODAS las sucursales que lo tengan.
-->
<template>
  <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4" @click.self="cerrar">
    <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
      <!-- Cabecera -->
      <div class="p-6 border-b border-slate-100 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-xl font-black text-slate-800 flex items-center gap-2"><Icono nombre="factura" /> Receta del plato</h2>
          <p class="text-sm text-slate-500 mt-0.5">{{ nombre }}</p>
        </div>
        <button @click="cerrar" class="text-slate-400 hover:text-slate-700 text-2xl leading-none"><Icono nombre="cerrar" /></button>
      </div>

      <!-- Cuerpo -->
      <div class="p-6 overflow-y-auto flex-1">
        <div v-if="cargando" class="text-center text-slate-400 py-10">Cargando receta…</div>

        <template v-else>
          <p class="text-sm text-slate-500 mb-4">
            Elegí los ingredientes y cuánto se usa de cada uno para <b>preparar 1 {{ nombre }}</b>.
            Se descuenta del stock compartido de cada insumo.
          </p>

          <div class="space-y-2">
            <div v-for="(f, idx) in filas" :key="idx" class="bg-slate-50 rounded-xl p-2.5 space-y-2">
              <div class="flex gap-2 items-center">
                <select v-model="f.insumoId" class="flex-1 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  <option value="">— Ingrediente —</option>
                  <option v-for="ins in insumosParaFila(idx)" :key="ins.id" :value="ins.id">{{ ins.nombre }}</option>
                  <option value="__nuevo__">Crear insumo nuevo…</option>
                </select>
                <input v-model.number="f.cantidad" type="number" min="0" step="any" placeholder="Cantidad"
                       class="w-28 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                <span class="w-12 text-sm font-bold text-slate-500 text-center">{{ unidadDe(f) }}</span>
                <button @click="quitarFila(idx)" class="text-rose-400 hover:text-rose-600 font-bold px-2" title="Quitar"><Icono nombre="cerrar" /></button>
              </div>
              <!-- Datos del insumo NUEVO (se creará en todas las sucursales del plato, con stock 0) -->
              <div v-if="f.insumoId === '__nuevo__'" class="flex gap-2 items-center">
                <input v-model="f.nombreNuevo" type="text" placeholder="Nombre del insumo nuevo (ej. Salsa BBQ)"
                       class="flex-1 p-2.5 border border-amber-200 rounded-lg bg-amber-50/40 outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                <select v-model="f.unidadNueva"
                        class="w-40 p-2.5 border border-amber-200 rounded-lg bg-amber-50/40 outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  <option value="">Unidad…</option>
                  <option v-for="u in UNIDADES_BASE" :key="u" :value="u">{{ u }}</option>
                </select>
              </div>
            </div>
          </div>

          <button @click="agregarFila" class="mt-3 text-sm font-bold text-gori-dark hover:underline">+ Agregar ingrediente</button>

          <div v-if="!filas.some(f => f.insumoId)" class="text-sm text-slate-400 mt-4 bg-slate-50 rounded-xl p-4">
            Este plato todavía no tiene receta. Agregá sus ingredientes. <Icono nombre="plato" />
          </div>
        </template>
      </div>

      <!-- Pie -->
      <div class="p-5 border-t border-slate-100 flex items-center justify-between gap-3">
        <span class="text-xs text-slate-400">Se aplica a este plato en todas las sucursales.</span>
        <div class="flex gap-2">
          <button @click="cerrar" class="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
          <button @click="guardar" :disabled="guardando" class="px-5 py-2.5 rounded-xl bg-gori-dark text-white font-bold hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition">
            {{ guardando ? 'Guardando…' : 'Guardar receta' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Icono from './Icono.vue';
import { useAuthStore } from '../almacenes/auth';

const props = defineProps({
  productoId: { type: String, required: true },
  nombre: { type: String, default: '' },
  apiBase: { type: String, default: '/api/admin' },
});
const emit = defineEmits(['close', 'guardado']);

const auth = useAuthStore();
const headers = () => ({ Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' });

const cargando = ref(true);
const guardando = ref(false);
const insumos = ref([]);            // [{ id, nombre, unidad }] disponibles en la sucursal
// Unidades base YA DEFINIDAS (lista fija, desplegable; el stock siempre vive en una
// de estas). Solo estas 4: son las únicas en las que se maneja el inventario real.
const UNIDADES_BASE = ['g', 'ml', 'unidad', 'presa'];
const filas = ref([]);              // [{ insumoId, cantidad }]

// Unidad a mostrar: si es un insumo nuevo, la que está escribiendo; si no, la del insumo elegido.
const unidadDe = (f) => (f.insumoId === '__nuevo__' ? (f.unidadNueva || '') : (insumos.value.find((i) => i.id === f.insumoId)?.unidad || ''));
// Para cada fila, insumos que no estén ya elegidos en otras filas (evita duplicar).
// El "insumo nuevo" (__nuevo__) no cuenta como usado: se puede agregar más de uno.
function insumosParaFila(idx) {
  const usados = filas.value.filter((_, i) => i !== idx).map((f) => f.insumoId).filter((v) => v && v !== '__nuevo__');
  return insumos.value.filter((i) => !usados.includes(i.id) || filas.value[idx].insumoId === i.id);
}
function agregarFila() { filas.value.push({ insumoId: '', cantidad: null, nombreNuevo: '', unidadNueva: '' }); }
function quitarFila(idx) { filas.value.splice(idx, 1); }
function cerrar() { emit('close'); }

async function cargar() {
  cargando.value = true;
  try {
    const r = await fetch(`${props.apiBase}/productos/${props.productoId}/receta`, { headers: headers() });
    if (r.ok) {
      const data = await r.json();
      insumos.value = data.insumosDisponibles || [];
      filas.value = (data.receta || []).map((ri) => ({ insumoId: ri.insumoId, cantidad: ri.cantidad }));
      if (!filas.value.length) filas.value.push({ insumoId: '', cantidad: null });
    }
  } catch { /* sin conexión */ } finally { cargando.value = false; }
}

async function guardar() {
  // Blindaje: una fila "en uso" (con ingrediente elegido o nombre nuevo escrito) debe
  // tener cantidad válida. Antes se descartaba en silencio; ahora avisamos con claridad.
  for (const f of filas.value) {
    const esNuevo = f.insumoId === '__nuevo__';
    const enUso = esNuevo ? !!String(f.nombreNuevo || '').trim() : !!f.insumoId;
    if (!enUso) continue; // fila vacía: se ignora, como siempre
    if (!(Number(f.cantidad) > 0)) {
      emit('guardado', { ok: false, error: 'Poné una cantidad mayor a 0 en cada ingrediente.' });
      return;
    }
    if (esNuevo && !String(f.unidadNueva || '').trim()) {
      emit('guardado', { ok: false, error: 'Indicá la unidad del insumo nuevo (g, ml o unidad).' });
      return;
    }
  }
  // Arma las líneas: insumos existentes { insumoId, cantidad } y nuevos { nuevo, nombre, unidad, cantidad }.
  const limpias = [];
  for (const f of filas.value) {
    if (f.insumoId === '__nuevo__') {
      if (String(f.nombreNuevo || '').trim() && String(f.unidadNueva || '').trim() && Number(f.cantidad) > 0) {
        limpias.push({ nuevo: true, nombre: f.nombreNuevo.trim(), unidad: f.unidadNueva.trim(), cantidad: Number(f.cantidad) });
      }
    } else if (f.insumoId && Number(f.cantidad) > 0) {
      limpias.push({ insumoId: f.insumoId, cantidad: Number(f.cantidad) });
    }
  }
  guardando.value = true;
  try {
    const r = await fetch(`${props.apiBase}/productos/${props.productoId}/receta`, {
      method: 'PUT', headers: headers(),
      body: JSON.stringify({ insumos: limpias }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { emit('guardado', { ok: false, error: data.error || 'No se pudo guardar' }); return; }
    emit('guardado', { ok: true, aplicadas: data.aplicadas || 0 });
  } catch {
    emit('guardado', { ok: false, error: 'Sin conexión' });
  } finally { guardando.value = false; }
}

onMounted(cargar);
</script>
