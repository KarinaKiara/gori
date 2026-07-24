<!--
  Reporte A · Detalle de una venta.
  Muestra quién atendió, qué pidió, cómo pagó y —lo importante para la tesis—
  el consumo EXACTO de insumos de ese pedido (tomado del kardex).
  Sirve para gerente y admin: solo cambia `apiBase`.
-->
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="bg-[#1c1712] border border-[#E4C07A]/30 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
      <!-- Encabezado -->
      <div class="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-[#1c1712]">
        <div>
          <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase">Detalle de la venta</p>
          <h3 class="text-white text-xl font-black">Pedido {{ detalle?.numeroPedido ? '#' + detalle.numeroPedido : '' }}</h3>
        </div>
        <div class="flex items-center gap-3">
          <button v-if="detalle" @click="exportarDetallePedido(detalle)" class="px-3 py-1.5 rounded-lg text-xs font-bold text-[#17120c]" style="background: linear-gradient(135deg, #E4C07A, #caa24f);">📄 PDF</button>
          <button v-if="detalle" @click="excelDetallePedido(detalle)" class="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600/80 hover:bg-emerald-600 border border-emerald-500/40">📊 Excel</button>
          <button @click="$emit('close')" class="text-slate-400 hover:text-white text-2xl leading-none">✕</button>
        </div>
      </div>

      <div v-if="cargando" class="p-10 text-center text-slate-400">Cargando…</div>
      <div v-else-if="error" class="p-10 text-center text-red-400">{{ error }}</div>

      <div v-else-if="detalle" class="p-5 space-y-5">
        <!-- Datos generales -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-white/5 rounded-xl p-3">
            <p class="text-slate-400 text-xs">Canal</p>
            <p class="text-white font-bold">{{ detalle.canal }}</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3">
            <p class="text-slate-400 text-xs">Método de pago</p>
            <p class="text-white font-bold capitalize">{{ detalle.metodoPago }}</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3">
            <p class="text-slate-400 text-xs">Quién atendió</p>
            <p class="text-white font-bold">{{ detalle.atendio }}</p>
          </div>
          <div class="bg-white/5 rounded-xl p-3">
            <p class="text-slate-400 text-xs">Fecha y hora</p>
            <p class="text-white font-bold text-sm">{{ formatoFecha(detalle.fecha) }}</p>
          </div>
        </div>

        <!-- Qué pidió -->
        <div>
          <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase mb-2">Qué pidió</p>
          <div class="space-y-2">
            <div v-for="(it, i) in detalle.items" :key="i" class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
              <span class="text-white text-sm"><b>{{ it.cantidad }}×</b> {{ it.producto }}<span v-if="it.detalle" class="text-slate-400"> · {{ it.detalle }}</span></span>
              <span class="text-slate-300 text-sm">Bs {{ it.precio?.toFixed(2) }}</span>
            </div>
          </div>
          <div class="flex justify-between mt-3 pt-3 border-t border-white/10">
            <span class="text-white font-bold">Total</span>
            <span class="text-[#E4C07A] font-black text-lg">Bs {{ detalle.montoTotal?.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Consumo exacto de insumos -->
        <div>
          <p class="text-[#E4C07A] text-xs font-bold tracking-widest uppercase mb-2">Consumo de inventario de este pedido</p>
          <div v-if="detalle.consumoInsumos?.length" class="grid grid-cols-2 gap-2">
            <div v-for="(c, i) in detalle.consumoInsumos" :key="i" class="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
              <span class="text-slate-200 text-sm">{{ c.insumo }}</span>
              <span class="text-emerald-300 font-bold text-sm">−{{ formatoCantidad(c.cantidad) }} {{ c.unidad }}</span>
            </div>
          </div>
          <p v-else class="text-slate-500 text-sm italic">Este pedido no descontó insumos (producto sin receta).</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../almacenes/auth';
import { exportarDetallePedido } from '../utilidades/reportesPdf';
import { excelDetallePedido } from '../utilidades/reportesCsv';

const props = defineProps({
  pedidoId: { type: String, required: true },
  apiBase: { type: String, required: true }, // '/api/gerente' | '/api/admin'
});
defineEmits(['close']);

const authStore = useAuthStore();
const detalle = ref(null);
const cargando = ref(true);
const error = ref('');

function formatoFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  return d.toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatoCantidad(n) {
  return Number.isInteger(n) ? n : parseFloat(n.toFixed(3));
}

onMounted(async () => {
  try {
    const r = await fetch(`${props.apiBase}/reportes/pedido/${props.pedidoId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    });
    if (!r.ok) throw new Error('No se pudo cargar el detalle del pedido');
    detalle.value = await r.json();
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
});
</script>
