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
      <h2 class="text-lg font-bold text-rose-900 mb-4 flex items-center gap-2">
        ⚠️ Insumos con stock bajo
        <span class="text-xs font-black bg-rose-500 text-white rounded-full px-2 py-0.5">{{ alertas.length }}</span>
      </h2>
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
      <div class="space-y-2">
        <div v-for="s in solicitudes" :key="s.id" class="flex items-center justify-between gap-3 bg-white border border-amber-100 rounded-xl px-4 py-3">
          <div class="text-sm">
            <b class="text-slate-800">{{ s.sucursal?.nombre }}</b>
            <span class="text-slate-500"> pide reponer </span>
            <b class="text-gori-primary">{{ s.insumo?.nombre }}</b>
            <span class="text-slate-400 text-xs ml-1">(quedan {{ s.insumo?.stockActual }} {{ s.insumo?.unidad }} · mínimo {{ s.insumo?.stockMinimo }})</span>
          </div>
          <button @click="abrirReponer(s)" class="text-xs font-bold px-3 py-2 rounded-lg bg-gori-dark text-white hover:bg-slate-800 whitespace-nowrap active:scale-95 transition">Reponer</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col xl:flex-row gap-8 items-start">
    <!-- Formulario: armar pedido -->
    <div class="w-full xl:w-2/5 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <h2 class="text-xl font-bold text-slate-800 mb-6">Nuevo pedido de compra</h2>

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
                <select v-model="l.insumoId" @change="onInsumoLinea(l)" class="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  <option value="">— Insumo —</option>
                  <option v-for="ins in insumosParaLinea(idx)" :key="ins.id" :value="ins.id">{{ ins.nombre }} ({{ ins.unidad }})</option>
                </select>

                <!-- Se compra en unidad boliviana (caja, bidón…) y el sistema convierte a la
                     unidad base (ml, g). La equivalencia se define UNA vez por insumo. -->
                <template v-if="l.insumoId">
                  <!-- Ya definida: no se vuelve a pedir. Solo se dice cuántas unidades. -->
                  <div v-if="l.conversionGuardada" class="flex items-center gap-2 text-xs bg-slate-100 rounded-lg px-3 py-2">
                    <span class="text-slate-600">Se compra por <b class="text-slate-800">1 {{ l.unidadPedido }}</b> = <b class="text-slate-800">{{ Number(l.factor).toLocaleString('es-BO') }} {{ baseDe(l) }}</b></span>
                    <button type="button" @click="l.conversionGuardada = false" class="ml-auto text-gori-dark font-bold hover:underline">cambiar</button>
                  </div>
                  <!-- Aún sin definir: se pregunta una sola vez cómo se compra. -->
                  <div v-else class="flex gap-2">
                    <input v-model="l.unidadPedido" list="unidades-compra-bolivia" placeholder="¿Cómo se compra? (ej. caja, bidón)"
                      class="w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                    <input v-model.number="l.factor" type="number" min="0" step="any" :placeholder="`¿Cuánto trae c/u? (${baseDe(l)})`"
                      class="w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  </div>
                  <input v-model.number="l.unidades" type="number" min="0" step="any" :placeholder="`¿Cuántas ${l.unidadPedido || 'unidades'}?`"
                    class="w-full p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
                  <!-- Resultado de la conversión (lo que realmente entra al stock) -->
                  <div v-if="l.unidades > 0 && l.factor > 0" class="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    ✅ Entran al stock: <b>{{ (l.unidades * l.factor).toLocaleString('es-BO') }} {{ baseDe(l) }}</b>
                  </div>
                </template>
              </div>
              <button type="button" @click="quitarLinea(idx)" class="text-rose-400 hover:text-rose-600 font-bold px-2 py-1" title="Quitar">✕</button>
            </div>
          </div>
          <button type="button" @click="agregarLinea" :disabled="!hayInsumosLibres" class="mt-3 text-sm font-bold text-gori-dark hover:underline disabled:opacity-40 disabled:no-underline">+ Agregar insumo</button>

          <!-- Sugerencias de unidades de compra bolivianas (el admin igual puede escribir otra) -->
          <datalist id="unidades-compra-bolivia">
            <option value="caja"></option>
            <option value="bidón"></option>
            <option value="botella"></option>
            <option value="quintal"></option>
            <option value="arroba"></option>
            <option value="carga"></option>
            <option value="bolsa"></option>
            <option value="balde"></option>
            <option value="maple"></option>
            <option value="garrafa"></option>
            <option value="atado"></option>
            <option value="kilo"></option>
            <option value="frasco"></option>
          </datalist>
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

    <!-- Modal: reponer un insumo solicitado (arma el pedido y atiende la solicitud en un paso) -->
    <Teleport to="body">
      <div v-if="modalSol" class="fixed inset-0 z-[9998] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" @click.self="cerrarReponer">
        <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 space-y-5">
          <div>
            <h3 class="text-xl font-black text-slate-800">Reponer insumo</h3>
            <p class="text-sm text-slate-500 mt-1">
              <b class="text-slate-700">{{ modalSol.sucursal?.nombre }}</b> pidió reponer
              <b class="text-gori-primary">{{ modalSol.insumo?.nombre }}</b>
            </p>
            <p class="text-xs text-slate-400 mt-0.5">Quedan {{ modalSol.insumo?.stockActual }} {{ modalSol.insumo?.unidad }} · mínimo {{ modalSol.insumo?.stockMinimo }}</p>
          </div>

          <!-- Proveedor: solo los que proveen ESTE insumo en ESA sucursal -->
          <div>
            <label class="block text-sm font-bold text-slate-700 mb-2">¿A qué proveedor le comprás?</label>
            <select v-model="rep.proveedorId" @change="onProveedorReponer" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-gori-primary/30">
              <option value="">— Elegí el proveedor —</option>
              <option v-for="p in proveedoresParaSolicitud" :key="p.id" :value="p.id">{{ p.nombre }}</option>
            </select>
            <p v-if="!proveedoresParaSolicitud.length" class="text-xs text-amber-500 font-semibold mt-1">
              Ningún proveedor provee este insumo en esta sucursal. Asignalo en la pestaña Proveedores.
            </p>
          </div>

          <!-- Se compra en unidad boliviana (bidón, caja…) y el sistema la convierte a la
               unidad del insumo (ml, g o unidad), que es la que usan las recetas.
               La equivalencia viene pre-cargada si ya se definió antes. -->
          <template v-if="rep.proveedorId">
            <!-- Ya definida: solo se dice cuántas unidades. -->
            <div v-if="rep.conversionGuardada" class="flex items-center gap-2 text-xs bg-slate-100 rounded-lg px-3 py-2">
              <span class="text-slate-600">Se compra por <b class="text-slate-800">1 {{ rep.unidadPedido }}</b> = <b class="text-slate-800">{{ Number(rep.factor).toLocaleString('es-BO') }} {{ modalSol.insumo?.unidad }}</b></span>
              <button type="button" @click="rep.conversionGuardada = false" class="ml-auto text-gori-dark font-bold hover:underline">cambiar</button>
            </div>
            <div v-else class="flex gap-2">
              <input v-model="rep.unidadPedido" list="unidades-compra-modal" placeholder="¿Cómo se compra? (ej. bidón, caja)"
                class="w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
              <input v-model.number="rep.factor" type="number" min="0" step="any" :placeholder="`¿Cuánto trae c/u? (en ${modalSol.insumo?.unidad})`"
                class="w-1/2 p-2.5 border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-gori-primary/30 text-sm">
            </div>
            <input v-model.number="rep.unidades" type="number" min="0" step="any" :placeholder="`¿Cuántas ${rep.unidadPedido || 'unidades'} enviás?`"
              class="w-full p-3 border border-slate-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-gori-primary/30">
            <div v-if="rep.unidades > 0 && rep.factor > 0" class="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              ✅ Entran al stock: <b>{{ (rep.unidades * rep.factor).toLocaleString('es-BO') }} {{ modalSol.insumo?.unidad }}</b>
            </div>
            <datalist id="unidades-compra-modal">
              <option value="caja"></option><option value="bidón"></option><option value="botella"></option>
              <option value="quintal"></option><option value="arroba"></option><option value="carga"></option>
              <option value="bolsa"></option><option value="balde"></option><option value="maple"></option>
              <option value="garrafa"></option><option value="atado"></option><option value="kilo"></option><option value="frasco"></option>
            </datalist>
          </template>

          <div class="flex gap-2 pt-1">
            <button @click="confirmarReponer" :disabled="!repValida || reponiendo"
              class="flex-1 bg-gori-dark text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-40">
              {{ reponiendo ? 'Enviando…' : 'Confirmar y enviar' }}
            </button>
            <button @click="cerrarReponer" class="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition">Cancelar</button>
          </div>
        </div>
      </div>
    </Teleport>

    <div v-if="noti.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50', noti.tipo==='ok' ? 'bg-green-500' : 'bg-rose-500']">{{ noti.msg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../almacenes/auth';
import { confirmar } from '../../utilidades/dialogo';

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
// Cada línea: insumo + cómo se compra (unidadPedido) + cuánto trae c/u (factor) +
// cuántas unidades se compran + costo. La cantidad base = unidades × factor.
const nuevaLinea = () => ({ insumoId: '', unidadPedido: '', factor: null, unidades: null, conversionGuardada: false });
const lineas = ref([nuevaLinea()]);
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
// Unidad BASE del insumo de una línea (ml, g, unidad) — a lo que se convierte.
function baseDe(l) {
  const ins = insumosDelProveedor.value.find((i) => i.id === l.insumoId);
  return ins?.unidad || 'u';
}
// Al elegir un insumo, si ya tiene equivalencia guardada, se pre-carga (definir una vez).
function onInsumoLinea(l) {
  const ins = insumosDelProveedor.value.find((i) => i.id === l.insumoId);
  l.unidadPedido = ins?.unidadPedido || '';
  l.factor = ins?.factorConversion ?? null;
  // Si el insumo ya tiene su equivalencia (ej. 1 caja = 6000 ml), no se vuelve a pedir.
  l.conversionGuardada = !!(ins?.unidadPedido && ins?.factorConversion);
  l.unidades = null;
}
// Para cada línea, insumos aún no elegidos en otras líneas (evita duplicar)
function insumosParaLinea(idx) {
  const usados = lineas.value.filter((_, i) => i !== idx).map((l) => l.insumoId).filter(Boolean);
  return insumosDelProveedor.value.filter((i) => !usados.includes(i.id) || lineas.value[idx].insumoId === i.id);
}
const hayInsumosLibres = computed(() => {
  const usados = lineas.value.map((l) => l.insumoId).filter(Boolean);
  return insumosDelProveedor.value.some((i) => !usados.includes(i.id));
});
// Una línea sirve si tiene insumo, cuántas unidades y cuánto trae cada una.
const lineaValida = (l) => l.insumoId && Number(l.unidades) > 0 && Number(l.factor) > 0;
const puedeCrear = computed(() =>
  sucursalSel.value && proveedorSel.value && lineas.value.some(lineaValida)
);

function onSucursalChange() { proveedorSel.value = ''; resetLineas(); }
function onProveedorChange() { resetLineas(); }
function resetLineas() { lineas.value = [nuevaLinea()]; nota.value = ''; }
function agregarLinea() { if (hayInsumosLibres.value) lineas.value.push(nuevaLinea()); }
function quitarLinea(idx) { lineas.value.splice(idx, 1); if (!lineas.value.length) lineas.value.push(nuevaLinea()); }

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

async function crear() {
  if (!puedeCrear.value) return avisar('Completá sucursal, proveedor y, por cada insumo, cuántas unidades y cuánto trae cada una', true);
  // La cantidad que entra al stock = unidades × factor (ya en la unidad base).
  // Se manda también unidadPedido y factorConversion para RECORDAR la equivalencia.
  const items = lineas.value
    .filter(lineaValida)
    .map((l) => ({
      insumoId: l.insumoId,
      cantidad: Number(l.unidades) * Number(l.factor),
      unidadPedido: (l.unidadPedido || '').trim() || null,
      factorConversion: Number(l.factor),
    }));
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

// ── Reponer desde una solicitud (arma el pedido + atiende la solicitud en un paso) ──
const modalSol = ref(null); // solicitud abierta en el modal
// Se compra en unidad boliviana (unidadPedido) que trae "factor" de la unidad base
// del insumo. La cantidad que entra al stock = unidades × factor.
const rep = reactive({ proveedorId: '', unidadPedido: '', factor: null, unidades: null, conversionGuardada: false });
const reponiendo = ref(false);

// Proveedores que proveen ESTE insumo EN ESA sucursal (los válidos para reponerlo)
const proveedoresParaSolicitud = computed(() => {
  if (!modalSol.value) return [];
  const insId = modalSol.value.insumo?.id;
  const sucId = modalSol.value.sucursalId || modalSol.value.sucursal?.id;
  return proveedores.value.filter((p) => (p.insumos || []).some((i) => i.id === insId && i.sucursalId === sucId));
});

function abrirReponer(s) {
  modalSol.value = s;
  rep.proveedorId = ''; rep.unidadPedido = ''; rep.factor = null; rep.unidades = null; rep.conversionGuardada = false;
}
function cerrarReponer() { modalSol.value = null; }

// Al elegir proveedor, se pre-carga la equivalencia YA definida del insumo
// (ej. 1 bidón = 5000 ml). Así el admin normalmente solo escribe "¿cuántos?".
function onProveedorReponer() {
  const p = proveedores.value.find((x) => x.id === rep.proveedorId);
  const ins = p?.insumos?.find((i) => i.id === modalSol.value?.insumo?.id);
  rep.unidadPedido = ins?.unidadPedido || '';
  rep.factor = ins?.factorConversion ?? null;
  rep.conversionGuardada = !!(ins?.unidadPedido && ins?.factorConversion);
  rep.unidades = null;
}

const repValida = computed(() => rep.proveedorId && Number(rep.unidades) > 0 && Number(rep.factor) > 0);

async function confirmarReponer() {
  if (!repValida.value) return avisar('Elegí proveedor, cómo se compra y cuántas unidades enviás', true);
  reponiendo.value = true;
  try {
    // El sistema hace la conversión: unidades × factor = cantidad en la unidad base
    // (ml, g o unidad), que es la que usan las recetas. Se guarda también la
    // equivalencia (unidadPedido + factor) para recordarla la próxima vez.
    const item = {
      insumoId: modalSol.value.insumo.id,
      cantidad: Number(rep.unidades) * Number(rep.factor),
      unidadPedido: (rep.unidadPedido || '').trim() || null,
      factorConversion: Number(rep.factor),
    };
    const r = await fetch(`${API}/pedidos-compra`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        sucursalId: modalSol.value.sucursalId || modalSol.value.sucursal?.id,
        proveedorId: rep.proveedorId,
        nota: `Reposición pedida por ${modalSol.value.sucursal?.nombre || 'la sucursal'}`,
        items: [item],
      }),
    });
    const data = await leerJson(r);
    if (!r.ok) { avisar(data.error || 'No se pudo crear el pedido', true); return; }
    // El pedido ya está: marcar la solicitud como atendida (que desaparezca de la lista)
    await fetch(`${API}/solicitudes/${modalSol.value.id}/atender`, { method: 'PUT', headers: headers() });
    avisar('Pedido enviado al gerente ✓');
    cerrarReponer();
    await cargarTodo();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); } finally { reponiendo.value = false; }
}

async function cancelar(p) {
  if (!(await confirmar(`¿Cancelar el pedido a "${p.proveedor?.nombre}"?`, { titulo: 'Cancelar pedido', textoAceptar: 'Sí, cancelar', peligro: true }))) return;
  try {
    const r = await fetch(`${API}/pedidos-compra/${p.id}/cancelar`, { method: 'PUT', headers: headers() });
    const data = await leerJson(r);
    if (!r.ok) return avisar(data.error || 'No se pudo cancelar', true);
    avisar('Pedido cancelado');
    await cargarTodo();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); }
}

let socket = null;
onMounted(() => {
  cargarTodo();
  // EN VIVO: cuando un gerente pide un insumo (o se atiende una solicitud), el
  // backend avisa a la sala ADMIN y la tarjeta de solicitudes se refresca al instante.
  socket = io();
  socket.on('connect', () => socket.emit('unirse-admin'));
  socket.on('solicitudes-actualizadas', cargarTodo);
});
onUnmounted(() => { if (socket) socket.disconnect(); });
</script>
