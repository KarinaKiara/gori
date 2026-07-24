<!--
  Reporte B · Inventario por receta.
  Muestra el stock de cada insumo (con lo consumido en el periodo y si está bajo
  el mínimo) y cuántos platos rinde el stock actual. Muy alineado al tema:
  inventario controlado por recetas.
  - Gerente: automáticamente su sucursal.
  - Admin: elige la sucursal (el backend pide selección si no se manda).
-->
<template>
  <div class="space-y-6">
    <!-- Selector de sucursal (solo admin) + descarga -->
    <div class="flex items-end gap-3 bg-white/5 rounded-2xl p-4" v-if="sucursales.length || data.resumen">
      <div v-if="sucursales.length">
        <label class="block text-slate-400 text-xs mb-1">Sucursal</label>
        <select v-model="sucursalId" @change="cargar" class="bg-[#1c1712] border border-white/10 rounded-lg px-3 py-2 text-white text-sm min-w-[220px]">
          <option value="">— Elegí una sucursal —</option>
          <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
        </select>
      </div>
      <button v-if="data.resumen" @click="descargar" class="px-5 py-2 rounded-lg font-bold text-[#17120c]" style="background: linear-gradient(135deg, #E4C07A, #caa24f);">📄 Descargar PDF</button>
      <button v-if="data.resumen" @click="descargarExcel" class="px-5 py-2 rounded-lg font-bold text-white bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/40">📊 Descargar Excel</button>
    </div>

    <div v-if="cargando" class="p-10 text-center text-slate-400">Cargando…</div>
    <div v-else-if="sucursales.length && !sucursalId" class="p-10 text-center text-slate-500">Elegí una sucursal para ver su inventario por receta.</div>

    <template v-else-if="data.resumen">
      <!-- Resumen -->
      <div class="grid grid-cols-3 gap-4">
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Insumos</p>
          <p class="text-3xl font-black text-white">{{ data.resumen.totalInsumos }}</p>
        </div>
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Bajo el mínimo</p>
          <p class="text-3xl font-black" :class="data.resumen.bajoMinimo ? 'text-red-400' : 'text-emerald-400'">{{ data.resumen.bajoMinimo }}</p>
        </div>
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Platos agotados</p>
          <p class="text-3xl font-black" :class="data.resumen.productosAgotados ? 'text-red-400' : 'text-emerald-400'">{{ data.resumen.productosAgotados }}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <!-- Insumos -->
        <div class="bg-white/5 rounded-2xl overflow-hidden">
          <div class="px-5 py-3 border-b border-white/10 flex justify-between items-center">
            <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase">Stock de insumos</p>
            <span class="text-slate-400 text-xs">consumo del periodo</span>
          </div>
          <div class="max-h-[420px] overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="text-slate-400 text-xs sticky top-0 bg-[#211b14]">
                <tr><th class="text-left p-2 pl-5">Insumo</th><th class="text-right p-2">Stock</th><th class="text-right p-2">Mínimo</th><th class="text-right p-2 pr-5">Consumido</th></tr>
              </thead>
              <tbody>
                <tr v-for="(i, k) in data.insumos" :key="k" class="border-t border-white/5" :class="i.bajoMinimo ? 'bg-red-500/10' : ''">
                  <td class="p-2 pl-5 text-white">{{ i.nombre }}<span v-if="i.bajoMinimo" class="ml-1 text-red-400 text-xs">⚠</span></td>
                  <td class="p-2 text-right text-white font-medium">{{ fmt(i.stockActual) }} {{ i.unidad }}</td>
                  <td class="p-2 text-right text-slate-400">{{ fmt(i.stockMinimo) }}</td>
                  <td class="p-2 pr-5 text-right text-emerald-300">{{ fmt(i.consumido) }} {{ i.unidad }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Productos: cuántos rinde -->
        <div class="bg-white/5 rounded-2xl overflow-hidden">
          <div class="px-5 py-3 border-b border-white/10">
            <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase">Cuántos platos rinde el stock</p>
          </div>
          <div class="max-h-[420px] overflow-y-auto">
            <table class="w-full text-sm">
              <thead class="text-slate-400 text-xs sticky top-0 bg-[#211b14]">
                <tr><th class="text-left p-2 pl-5">Producto</th><th class="text-left p-2">Categoría</th><th class="text-right p-2 pr-5">Rinde</th></tr>
              </thead>
              <tbody>
                <tr v-for="(p, k) in productosConReceta" :key="k" class="border-t border-white/5">
                  <td class="p-2 pl-5 text-white">{{ p.nombre }}</td>
                  <td class="p-2 text-slate-400">{{ p.categoria }}</td>
                  <td class="p-2 pr-5 text-right font-bold" :class="p.rinde === 0 ? 'text-red-400' : p.rinde !== null && p.rinde < 10 ? 'text-yellow-400' : 'text-emerald-300'">
                    {{ p.rinde === null ? '—' : p.rinde + ' platos' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useAuthStore } from '../almacenes/auth';
import { exportarStockPorReceta } from '../utilidades/reportesPdf';
import { excelStockPorReceta } from '../utilidades/reportesCsv';

const props = defineProps({ apiBase: { type: String, required: true } });
const authStore = useAuthStore();

function descargar() { exportarStockPorReceta(data.value); }
function descargarExcel() { excelStockPorReceta(data.value); }

const data = ref({});
const sucursales = ref([]);   // solo se llena en modo admin
const sucursalId = ref('');
const cargando = ref(false);

const productosConReceta = computed(() => (data.value.productos || []).filter(p => p.tieneReceta));
const fmt = (n) => (n == null ? '—' : (Number.isInteger(n) ? n : parseFloat(n.toFixed(2))));

async function cargar() {
  cargando.value = true;
  try {
    const q = sucursalId.value ? `?sucursalId=${sucursalId.value}` : '';
    const r = await fetch(`${props.apiBase}/reportes/inventario${q}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (r.ok) {
      const j = await r.json();
      if (j.requiereSeleccion) {   // admin sin sucursal elegida
        sucursales.value = j.sucursales;
        data.value = {};
      } else {
        data.value = j;
      }
    }
  } catch (e) { console.error(e); } finally { cargando.value = false; }
}
onMounted(cargar);
</script>
