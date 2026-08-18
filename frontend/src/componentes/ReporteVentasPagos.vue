<!--
  Reporte C · Ventas y pagos por periodo.
  Tótem vs Caja y Efectivo vs QR en un rango de fechas. Sirve para gerente
  (su sucursal) y admin (todas, con comparativa por sucursal).
-->
<template>
  <div class="space-y-6">
    <!-- Selector de periodo -->
    <div class="flex flex-wrap items-end gap-3 bg-white/5 rounded-2xl p-4">
      <div>
        <label class="block text-slate-400 text-xs mb-1">Desde</label>
        <input type="date" v-model="desde" class="bg-[#1c1712] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      </div>
      <div>
        <label class="block text-slate-400 text-xs mb-1">Hasta</label>
        <input type="date" v-model="hasta" class="bg-[#1c1712] border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      </div>
      <button @click="cargar" class="px-5 py-2 rounded-lg font-bold text-[#17120c]" style="background: linear-gradient(135deg, #E4C07A, #caa24f);">Ver reporte</button>
      <button v-if="data.totalPedidos !== undefined" @click="descargar" class="px-5 py-2 rounded-lg font-bold text-white bg-white/10 hover:bg-white/20 border border-white/15 inline-flex items-center gap-1"><Icono nombre="documento" /> Descargar PDF</button>
      <button v-if="data.totalPedidos !== undefined" @click="descargarExcel" class="px-5 py-2 rounded-lg font-bold text-white bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/40 inline-flex items-center gap-1"><Icono nombre="reportes" /> Descargar Excel</button>
      <span v-if="data.desde" class="text-[#E4C07A] text-xs self-center inline-flex items-center gap-1">Periodo: {{ data.desde }} <Icono nombre="flecha" /> {{ data.hasta }}</span>
    </div>

    <div v-if="cargando" class="p-10 text-center text-slate-400">Cargando…</div>

    <template v-else-if="data.totalPedidos !== undefined">
      <!-- Tarjetas resumen -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Ventas del periodo</p>
          <p class="text-3xl font-black text-white">Bs {{ (data.totalVentas||0).toFixed(0) }}</p>
        </div>
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Pedidos</p>
          <p class="text-3xl font-black text-white">{{ data.totalPedidos }}</p>
        </div>
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Ticket promedio</p>
          <p class="text-3xl font-black text-[#E4C07A]">Bs {{ (data.ticketPromedio||0).toFixed(1) }}</p>
        </div>
        <div class="bg-white/5 rounded-2xl p-4">
          <p class="text-slate-400 text-xs">Días con venta</p>
          <p class="text-3xl font-black text-white">{{ data.serieDiaria?.length || 0 }}</p>
        </div>
      </div>

      <!-- Canal y método de pago -->
      <div class="grid md:grid-cols-2 gap-4">
        <div class="bg-white/5 rounded-2xl p-5">
          <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase mb-4">Por canal de venta</p>
          <BarraComparativa etiquetaA="Tótem" :valorA="data.canal.totem.monto" :cantA="data.canal.totem.cantidad"
                            etiquetaB="Caja" :valorB="data.canal.caja.monto" :cantB="data.canal.caja.cantidad" colorA="#60a5fa" colorB="#facc15" />
        </div>
        <div class="bg-white/5 rounded-2xl p-5">
          <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase mb-4">Por método de pago</p>
          <BarraComparativa etiquetaA="Efectivo" :valorA="data.pago.efectivo.monto" :cantA="data.pago.efectivo.cantidad"
                            etiquetaB="QR" :valorB="data.pago.qr.monto" :cantB="data.pago.qr.cantidad" colorA="#34d399" colorB="#a78bfa" />
        </div>
      </div>

      <!-- Comparativa por sucursal (solo admin/global) -->
      <div v-if="data.porSucursal?.length" class="bg-white/5 rounded-2xl p-5">
        <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase mb-4">Ventas por sucursal</p>
        <div class="space-y-3">
          <div v-for="s in data.porSucursal" :key="s.nombre">
            <div class="flex justify-between text-sm mb-1">
              <span class="text-white font-medium">{{ s.nombre }}</span>
              <span class="text-slate-300">Bs {{ s.monto.toFixed(0) }} · {{ s.cantidad }} pedidos</span>
            </div>
            <div class="h-3 bg-white/10 rounded-full overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: pct(s.monto) + '%', background: 'linear-gradient(90deg,#E4C07A,#caa24f)' }"></div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, h } from 'vue';
import Icono from './Icono.vue';
import { useAuthStore } from '../almacenes/auth';
import { exportarVentasPagos } from '../utilidades/reportesPdf';
import { excelVentasPagos } from '../utilidades/reportesCsv';

const props = defineProps({ apiBase: { type: String, required: true } });
const authStore = useAuthStore();

function descargar() { exportarVentasPagos(data.value); }
function descargarExcel() { excelVentasPagos(data.value); }

const hoy = new Date();
const hace7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
const iso = (d) => d.toISOString().split('T')[0];
const desde = ref(iso(hace7));
const hasta = ref(iso(hoy));
const data = ref({});
const cargando = ref(false);

const maxSuc = computed(() => Math.max(...(data.value.porSucursal?.map(s => s.monto) || [1]), 1));
const pct = (v) => (v / maxSuc.value) * 100;

async function cargar() {
  cargando.value = true;
  try {
    const r = await fetch(`${props.apiBase}/reportes/ventas-pagos?desde=${desde.value}&hasta=${hasta.value}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (r.ok) data.value = await r.json();
  } catch (e) { console.error(e); } finally { cargando.value = false; }
}
onMounted(cargar);

// Barra comparativa A vs B (componente inline simple)
const BarraComparativa = {
  props: ['etiquetaA', 'valorA', 'cantA', 'etiquetaB', 'valorB', 'cantB', 'colorA', 'colorB'],
  setup(p) {
    return () => {
      const total = (p.valorA || 0) + (p.valorB || 0) || 1;
      const pa = ((p.valorA || 0) / total) * 100;
      const pb = ((p.valorB || 0) / total) * 100;
      const fila = (etq, val, cant, color, pctv) => h('div', { class: 'mb-3' }, [
        h('div', { class: 'flex justify-between text-sm mb-1' }, [
          h('span', { class: 'text-white' }, etq),
          h('span', { class: 'text-slate-300' }, `Bs ${(val || 0).toFixed(0)} · ${cant || 0} ped.`),
        ]),
        h('div', { class: 'h-3 bg-white/10 rounded-full overflow-hidden' }, [
          h('div', { class: 'h-full rounded-full', style: { width: pctv + '%', background: color } }),
        ]),
      ]);
      return h('div', {}, [fila(p.etiquetaA, p.valorA, p.cantA, p.colorA, pa), fila(p.etiquetaB, p.valorB, p.cantB, p.colorB, pb)]);
    };
  },
};
</script>
