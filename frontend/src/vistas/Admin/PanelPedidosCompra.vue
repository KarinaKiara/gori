<!--
  Pedidos de compra (los crea el ADMIN).
  El admin arma el pedido una sola vez (sucursal + proveedor + líneas de insumo con
  su cantidad). Queda PENDIENTE hasta que el gerente de esa sucursal confirme el
  ingreso: ahí el stock se suma solo y queda en el kardex. (Gestión de compras.)
-->
<template>
  <div class="animate-fade-in space-y-6">

    <!-- Alerta de stock bajo (rojo): los mismos insumos del banner rojo, pero aquí
         como tarjeta dentro del panel para armar el pedido de compra de una vez. -->
    <div v-if="alertas.length" class="bg-rose-50 border border-rose-200 rounded-3xl p-6 shadow-sm">
      <h2 class="text-lg font-bold text-rose-900 mb-1 flex items-center gap-2">
        ⚠️ Insumos con stock bajo
        <span class="text-xs font-black bg-rose-500 text-white rounded-full px-2 py-0.5">{{ alertas.length }}</span>
      </h2>
      <p class="text-sm text-rose-700/80 mb-4">Estos insumos están por debajo del mínimo. Conviene incluirlos en un pedido de compra.</p>
      <div class="space-y-3">
        <div v-for="g in alertasPorSucursal" :key="g.sucursal" class="bg-white border border-rose-100 rounded-xl px-4 py-3">
          <div class="text-sm font-bold text-slate-800 mb-1">📍 {{ g.sucursal }}</div>
          <div class="flex flex-wrap gap-2">
            <span v-for="i in g.insumos" :key="i.id"
              class="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-100 text-rose-700 rounded-full px-3 py-1">
              {{ i.nombre }}
              <b>{{ i.stockActual }} {{ i.unidad }}</b>
              <em v-if="i.stockActual <= 0" class="not-italic font-black text-rose-800 uppercase">agotado</em>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Solicitudes de insumo que mandaron los gerentes -->
    <div v-if="solicitudes.length" class="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
      <h2 class="text-lg font-bold text-amber-900 mb-1 flex items-center gap-2">
        📩 Solicitudes de insumos de las sucursales
        <span class="text-xs font-black bg-amber-500 text-white rounded-full px-2 py-0.5">{{ solicitudes.length }}</span>
      </h2>
      <p class="text-sm text-amber-700/80 mb-4">Los gerentes pidieron reponer estos insumos. Armá el pedido de compra y luego marcá la solicitud como atendida.</p>
      <div class="space-y-2">
        <div v-for="s in solicitudes" :key="s.id" class="flex items-center justify-between gap-3 bg-white border border-amber-100 rounded-xl px-4 py-3">
          <div class="text-sm">
            <b class="text-slate-800">{{ s.sucursal?.nombre }}</b>
            <span class="text-slate-500"> pide reponer </span>
            <b class="text-gori-primary">{{ s.insumo?.nombre }}</b>
            <span class="text-slate-400 text-xs ml-1">(quedan {{ s.insumo?.stockActual }} {{ s.insumo?.unidad }} · mínimo {{ s.insumo?.stockMinimo }})</span>
          </div>
          <button @click="atenderSolicitud(s)" class="text-xs font-bold px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 whitespace-nowrap active:scale-95 transition">✓ Atendida</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-8 items-start">
    <!-- Formulario: armar pedido -->
    <div class="w-full xl:w-2/5 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <h2 class="text-xl font-bold text-slate-800 mb-1">Nuevo pedido de compra</h2>
      <p class="text-sm text-slate-400 mb-6">Escribí las cantidades una sola vez. El gerente confirmará el ingreso cuando llegue.</p>

      <form @submit.prevent="crear" class="space-y-5" novalidate>
        <!-- Sucursal -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Sucursal <span class="text-rose-500">*</span></label>
          <select v-model="sucursalSel" @change="onSucursalChange" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-gori-primary/30">
            <option value="">— Elegí la sucursal —</option>
            <option v-for="s in sucursales" :key="s.id" :value="s.id">{{ s.nombre }}</option>
          </select>
        </div>

        <!-- Proveedor (solo los que abastecen esa sucursal) -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Proveedor <span class="text-rose-500">*</span></label>
          <select v-model="proveedorSel" :disabled="!sucursalSel" @change="onProveedorChange" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 disabled:opacity-50">
            <option value="">{{ sucursalSel ? '— Elegí el proveedor —' : 'Primero elegí la sucursal' }}</option>
            <option v-for="p in proveedoresDisponibles" :key="p.id" :value="p.id">{{ p.nombre }}</option>
          </select>
          <p v-if="sucursalSel && !proveedoresDisponibles.length" class="text-xs text-amber-500 font-semibold mt-1">
            Ningún proveedor tiene insumos asignados en esta sucursal. Asignalos en la pestaña Proveedores.
          </p>
        </div>

        <!-- Líneas de insumo -->
        <div v-if="proveedorSel">
          <label class="block text-sm font-bold text-slate-700 mb-2">¿Qué se pide?</label>
          <div class="space-y-3">
            <div v-for="(l, idx) in lineas" :key="idx" class="flex gap-2 items-start bg-slate-50 p-3 rounded-xl">
              <div class="flex-1 space-y-2">
                <select v-model="l.insumoId" class="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  <option value="">— Insumo —</option>
                  <option v-for="ins in insumosParaLinea(idx)" :key="ins.id" :value="ins.id">{{ ins.nombre }} ({{ ins.unidad }})</option>
                </select>
                <div class="flex gap-2">
                  <input v-model.number="l.cantidad" type="number" min="0" step="any" placeholder="Cantidad" class="w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  <input v-model.number="l.costo" type="number" min="0" step="any" placeholder="Costo Bs (opcional)" class="w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                </div>
              </div>
              <button type="button" @click="quitarLinea(idx)" class="text-rose-400 hover:text-rose-600 font-bold px-2 py-1" title="Quitar">✕</button>
            </div>
          </div>
          <button type="button" @click="agregarLinea" :disabled="!hayInsumosLibres" class="mt-3 text-sm font-bold text-gori-dark hover:underline disabled:opacity-40 disabled:no-underline">+ Agregar insumo</button>
        </div>

        <!-- Nota -->
        <div v-if="proveedorSel">
          <label class="block text-sm font-bold text-slate-700 mb-2">Nota <span class="text-slate-400 font-normal">(opcional)</span></label>
          <input v-model="nota" type="text" placeholder="Ej. Urgente para el fin de semana" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-gori-primary/30">
        </div>

        <button type="submit" :disabled="!puedeCrear || guardando" class="w-full bg-gori-dark text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-40">
          {{ guardando ? 'Creando…' : 'Crear pedido de compra' }}
        </button>
      </form>
    </div>

    <!-- Lista de pedidos -->
    <div class="flex-1 w-full">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold text-slate-800">Pedidos generados</h2>
        <div class="flex gap-1 bg-white rounded-xl p-1 border border-slate-100 text-sm">
          <button v-for="f in filtros" :key="f.val" @click="filtro = f.val"
            :class="['px-3 py-1.5 rounded-lg font-semibold transition', filtro === f.val ? 'bg-gori-dark text-white' : 'text-slate-500 hover:bg-slate-50']">{{ f.label }}</button>
        </div>
      </div>

      <div v-if="!pedidosFiltrados.length" class="bg-white rounded-3xl border border-slate-100 p-10 text-center text-slate-400">
        No hay pedidos {{ filtro !== 'TODOS' ? estadoTexto(filtro).toLowerCase() : '' }} todavía.
      </div>

      <div v-else class="space-y-4">
        <div v-for="p in pedidosFiltrados" :key="p.id" class="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div class="flex items-start justify-between gap-3 mb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-800">{{ p.proveedor?.nombre }}</span>
                <span :class="['text-xs font-bold px-2.5 py-1 rounded-full', badge(p.estado)]">{{ estadoTexto(p.estado) }}</span>
              </div>
              <div class="text-xs text-slate-400 mt-0.5">
                {{ p.sucursal?.nombre }} · {{ fecha(p.createdAt) }}<span v-if="p.creadoPor"> · por {{ p.creadoPor }}</span>
              </div>
            </div>
            <button v-if="p.estado === 'PENDIENTE'" @click="cancelar(p)" class="text-xs font-bold text-rose-500 hover:text-rose-700 whitespace-nowrap">Cancelar</button>
          </div>

          <table class="w-full text-sm">
            <tbody class="divide-y divide-slate-50">
              <tr v-for="it in p.items" :key="it.id">
                <td class="py-1.5 text-slate-700">{{ it.insumo?.nombre }}</td>
                <td class="py-1.5 text-right text-slate-500 whitespace-nowrap">{{ it.cantidad }} {{ it.insumo?.unidad }}</td>
                <td class="py-1.5 text-right text-slate-400 whitespace-nowrap w-24">{{ it.costo != null ? 'Bs ' + it.costo.toFixed(2) : '—' }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="p.nota" class="text-xs text-slate-400 mt-2 italic">"{{ p.nota }}"</div>
          <div v-if="p.estado === 'RECIBIDO' && p.recibidoEn" class="text-xs text-green-600 font-semibold mt-2">✓ Recibido el {{ fecha(p.recibidoEn) }}</div>
        </div>
      </div>
    </div>

    </div>
    <!-- fin de la fila (formulario + lista de pedidos) -->

    <div v-if="noti.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50', noti.tipo==='ok' ? 'bg-green-500' : 'bg-rose-500']">{{ noti.msg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../../almacenes/auth';

const authStore = useAuthStore();
const API = '/api/admin';
const headers = () => ({ Authorization: `Bearer ${authStore.token}`, 'Content-Type': 'application/json' });
const leerJson = async (r) => { try { return await r.json(); } catch { return {}; } };

const sucursales = ref([]);
const proveedores = ref([]); // cada uno con .insumos [{id,nombre,unidad,sucursalId}]
const pedidos = ref([]);
const solicitudes = ref([]); // solicitudes de insumo que mandaron los gerentes (pendientes)
const alertas = ref([]); // insumos bajo mínimo en todas las sucursales (mismos del banner rojo)

const sucursalSel = ref('');
const proveedorSel = ref('');
const lineas = ref([{ insumoId: '', cantidad: null, costo: null }]);
const nota = ref('');
const guardando = ref(false);
const filtro = ref('TODOS');
const filtros = [
  { val: 'TODOS', label: 'Todos' },
  { val: 'PENDIENTE', label: 'Pendientes' },
  { val: 'RECIBIDO', label: 'Recibidos' },
  { val: 'CANCELADO', label: 'Cancelados' },
];

const noti = reactive({ show: false, msg: '', tipo: 'ok' });
function avisar(msg, err = false) { noti.show = true; noti.msg = msg; noti.tipo = err ? 'err' : 'ok'; setTimeout(() => noti.show = false, 3200); }

// Proveedores que abastecen algún insumo de la sucursal elegida
const proveedoresDisponibles = computed(() =>
  !sucursalSel.value ? [] : proveedores.value.filter((p) => (p.insumos || []).some((i) => i.sucursalId === sucursalSel.value))
);
// Insumos de la sucursal que provee el proveedor elegido
const insumosDelProveedor = computed(() => {
  const p = proveedores.value.find((x) => x.id === proveedorSel.value);
  return p ? (p.insumos || []).filter((i) => i.sucursalId === sucursalSel.value) : [];
});
// Para cada línea, insumos aún no elegidos en otras líneas (evita duplicar)
function insumosParaLinea(idx) {
  const usados = lineas.value.filter((_, i) => i !== idx).map((l) => l.insumoId).filter(Boolean);
  return insumosDelProveedor.value.filter((i) => !usados.includes(i.id) || lineas.value[idx].insumoId === i.id);
}
const hayInsumosLibres = computed(() => {
  const usados = lineas.value.map((l) => l.insumoId).filter(Boolean);
  return insumosDelProveedor.value.some((i) => !usados.includes(i.id));
});
const puedeCrear = computed(() =>
  sucursalSel.value && proveedorSel.value &&
  lineas.value.some((l) => l.insumoId && Number(l.cantidad) > 0)
);

function onSucursalChange() { proveedorSel.value = ''; resetLineas(); }
function onProveedorChange() { resetLineas(); }
function resetLineas() { lineas.value = [{ insumoId: '', cantidad: null, costo: null }]; nota.value = ''; }
function agregarLinea() { if (hayInsumosLibres.value) lineas.value.push({ insumoId: '', cantidad: null, costo: null }); }
function quitarLinea(idx) { lineas.value.splice(idx, 1); if (!lineas.value.length) lineas.value.push({ insumoId: '', cantidad: null, costo: null }); }

const pedidosFiltrados = computed(() =>
  filtro.value === 'TODOS' ? pedidos.value : pedidos.value.filter((p) => p.estado === filtro.value)
);

// Insumos bajos agrupados por sucursal, para la tarjeta roja de arriba
const alertasPorSucursal = computed(() => {
  const m = {};
  for (const i of alertas.value) {
    (m[i.sucursal] ||= []).push(i);
  }
  return Object.entries(m).map(([sucursal, insumos]) => ({ sucursal, insumos }));
});

function estadoTexto(e) { return { PENDIENTE: 'Pendiente', RECIBIDO: 'Recibido', CANCELADO: 'Cancelado' }[e] || e; }
function badge(e) {
  return { PENDIENTE: 'bg-amber-100 text-amber-700', RECIBIDO: 'bg-green-100 text-green-700', CANCELADO: 'bg-slate-200 text-slate-500' }[e] || 'bg-slate-100 text-slate-500';
}
function fecha(iso) { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('es-BO') + ' ' + d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }); }

async function cargarTodo() {
  try {
    const [rs, rp, rped, rsol, rale] = await Promise.all([
      fetch(`${API}/sucursales`, { headers: headers() }),
      fetch(`${API}/proveedores`, { headers: headers() }),
      fetch(`${API}/pedidos-compra`, { headers: headers() }),
      fetch(`${API}/solicitudes`, { headers: headers() }),
      fetch(`${API}/inventario/alertas`, { headers: headers() }),
    ]);
    if (rs.ok) sucursales.value = await rs.json();
    if (rp.ok) proveedores.value = await rp.json();
    if (rped.ok) pedidos.value = await rped.json();
    if (rsol.ok) solicitudes.value = await rsol.json();
    if (rale.ok) alertas.value = await rale.json();
  } catch (e) { console.error(e); }
}

// El admin marca una solicitud como atendida (la saca de la lista)
async function atenderSolicitud(s) {
  try {
    const r = await fetch(`${API}/solicitudes/${s.id}/atender`, { method: 'PUT', headers: headers() });
    if (!r.ok) return avisar('No se pudo actualizar la solicitud', true);
    solicitudes.value = solicitudes.value.filter((x) => x.id !== s.id);
    avisar('Solicitud marcada como atendida');
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); }
}

async function crear() {
  if (!puedeCrear.value) return avisar('Completá sucursal, proveedor y al menos un insumo con cantidad', true);
  const items = lineas.value
    .filter((l) => l.insumoId && Number(l.cantidad) > 0)
    .map((l) => ({ insumoId: l.insumoId, cantidad: Number(l.cantidad), costo: (l.costo === null || l.costo === '') ? null : Number(l.costo) }));
  guardando.value = true;
  try {
    const r = await fetch(`${API}/pedidos-compra`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ sucursalId: sucursalSel.value, proveedorId: proveedorSel.value, nota: nota.value, items }),
    });
    const data = await leerJson(r);
    if (!r.ok) return avisar(data.error || 'No se pudo crear el pedido', true);
    avisar('Pedido de compra creado');
    sucursalSel.value = ''; proveedorSel.value = ''; resetLineas();
    await cargarTodo();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); } finally { guardando.value = false; }
}

async function cancelar(p) {
  if (!confirm(`¿Cancelar el pedido a "${p.proveedor?.nombre}"?`)) return;
  try {
    const r = await fetch(`${API}/pedidos-compra/${p.id}/cancelar`, { method: 'PUT', headers: headers() });
    const data = await leerJson(r);
    if (!r.ok) return avisar(data.error || 'No se pudo cancelar', true);
    avisar('Pedido cancelado');
    await cargarTodo();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); }
}

onMounted(cargarTodo);
</script>
