<!--
  Catálogo de proveedores (lo administra el admin).
  El proveedor es una entidad pasiva: no tiene cuenta ni interfaz propia; acá el
  admin solo mantiene sus datos y marca QUÉ insumos puede abastecer. Esa relación
  valida luego la reposición del gerente (no puede comprarle cebolla al de huevos).
-->
<template>
  <div class="animate-fade-in flex flex-col lg:flex-row gap-8 items-start">
    <!-- Formulario -->
    <div class="w-full lg:w-2/5 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 sticky top-0">
      <h2 class="text-xl font-bold text-slate-800 mb-1">{{ editando ? 'Editar proveedor' : 'Nuevo proveedor' }}</h2>
      <p class="text-sm text-slate-400 mb-6">Los proveedores no usan el sistema; solo se registran sus datos.</p>
      <form @submit.prevent="guardar" class="space-y-5" novalidate>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Nombre <span class="text-rose-500">*</span></label>
          <input v-model="form.nombre" type="text" required placeholder="Ej. Avícola San Juan" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Contacto</label>
          <input v-model="form.contacto" type="text" placeholder="Ej. Juan Pérez" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Teléfono / WhatsApp</label>
          <input v-model="form.telefono" type="text" placeholder="Ej. 77712345" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>

        <!-- Insumos que provee: define qué podrá reponerle el gerente -->
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-1">¿Qué insumos provee?</label>
          <p class="text-xs text-slate-400 mb-3">Marcá solo lo que este proveedor abastece. Al reponer, el gerente únicamente podrá elegirlo para estos insumos.</p>

          <div v-if="!insumos.length" class="text-sm text-slate-400 bg-slate-50 rounded-xl p-4">
            Todavía no hay insumos cargados en ninguna sucursal.
          </div>

          <div v-else class="space-y-4 max-h-72 overflow-y-auto pr-1">
            <div v-for="grupo in insumosPorSucursal" :key="grupo.sucursalId">
              <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{{ grupo.sucursalNombre }}</p>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="ins in grupo.insumos" :key="ins.id"
                  class="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors text-sm"
                  :class="form.insumoIds.includes(ins.id) ? 'border-gori-primary bg-gori-primary/5 text-slate-800 font-semibold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">
                  <input type="checkbox" :value="ins.id" v-model="form.insumoIds" class="accent-gori-primary w-4 h-4 shrink-0">
                  <span class="truncate">{{ ins.nombre }} <span class="text-slate-400 font-normal">({{ ins.unidad }})</span></span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-1">
          <button type="submit" :disabled="guardando" class="flex-1 bg-gori-dark text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-60">
            {{ editando ? 'Guardar cambios' : 'Registrar proveedor' }}
          </button>
          <button v-if="editando" type="button" @click="cancelar" class="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
        </div>
      </form>
    </div>

    <!-- Lista -->
    <div class="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 class="text-xl font-bold text-slate-800">Proveedores</h2>
        <span class="text-slate-400 text-sm">{{ proveedores.length }} registrados</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead><tr class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
            <th class="p-5 font-bold">Proveedor</th>
            <th class="p-5 font-bold">Provee</th>
            <th class="p-5 font-bold">Contacto</th>
            <th class="p-5 font-bold text-right">Acciones</th>
          </tr></thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="p in proveedores" :key="p.id" class="hover:bg-slate-50/50 transition-colors align-top">
              <td class="p-5">
                <div class="font-bold text-slate-800">{{ p.nombre }}</div>
              </td>
              <td class="p-5">
                <div v-if="p.insumos && p.insumos.length" class="flex flex-wrap gap-1.5 max-w-xs">
                  <span v-for="ins in p.insumos" :key="ins.id" class="inline-block bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1 rounded-lg">{{ ins.nombre }}</span>
                </div>
                <span v-else class="text-xs text-amber-500 font-semibold">⚠ Sin insumos asignados</span>
              </td>
              <td class="p-5 text-slate-500 text-sm">
                <div>{{ p.contacto || '—' }}</div>
                <div class="text-slate-400">{{ p.telefono || '' }}</div>
              </td>
              <td class="p-5 text-right whitespace-nowrap">
                <button @click="editar(p)" class="text-indigo-600 hover:text-indigo-800 font-bold text-sm mr-4">Editar</button>
                <button @click="eliminar(p)" class="text-rose-500 hover:text-rose-700 font-bold text-sm">Eliminar</button>
              </td>
            </tr>
            <tr v-if="!proveedores.length"><td colspan="4" class="p-8 text-center text-slate-400">Aún no hay proveedores. Registrá el primero a la izquierda.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="noti.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50', noti.tipo==='ok' ? 'bg-green-500' : 'bg-rose-500']">{{ noti.msg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useAuthStore } from '../../almacenes/auth';
import { confirmar } from '../../utilidades/dialogo';

const authStore = useAuthStore();
const API = '/api/admin';
const headers = () => ({ 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' });

const proveedores = ref([]);
const insumos = ref([]); // catálogo de insumos de todas las sucursales
const form = reactive({ nombre: '', contacto: '', telefono: '', insumoIds: [] });
const editando = ref(null); // id en edición, o null
const guardando = ref(false);
const noti = reactive({ show: false, msg: '', tipo: 'ok' });
function avisar(msg, err = false) { noti.show = true; noti.msg = msg; noti.tipo = err ? 'err' : 'ok'; setTimeout(() => noti.show = false, 3000); }
const leerJson = async (r) => { try { return await r.json(); } catch { return {}; } };

// Insumos agrupados por sucursal (mismo nombre existe por separado en cada una).
const insumosPorSucursal = computed(() => {
  const grupos = {};
  for (const ins of insumos.value) {
    const key = ins.sucursalId;
    if (!grupos[key]) grupos[key] = { sucursalId: key, sucursalNombre: ins.sucursal?.nombre || 'Sucursal', insumos: [] };
    grupos[key].insumos.push(ins);
  }
  return Object.values(grupos).sort((a, b) => a.sucursalNombre.localeCompare(b.sucursalNombre));
});

async function cargar() {
  try { const r = await fetch(`${API}/proveedores`, { headers: headers() }); if (r.ok) proveedores.value = await r.json(); } catch (e) { console.error(e); }
}
async function cargarInsumos() {
  try { const r = await fetch(`${API}/insumos-catalogo`, { headers: headers() }); if (r.ok) insumos.value = await r.json(); } catch (e) { console.error(e); }
}
function limpiar() { form.nombre = ''; form.contacto = ''; form.telefono = ''; form.insumoIds = []; editando.value = null; }
function cancelar() { limpiar(); }
function editar(p) {
  editando.value = p.id;
  form.nombre = p.nombre; form.contacto = p.contacto || ''; form.telefono = p.telefono || '';
  form.insumoIds = (p.insumos || []).map((i) => i.id);
}

// Misma validación que el backend: nombre y contacto sin números; teléfono solo números.
function validarProveedor() {
  const soloLetras = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ .&'\-]+$/;
  const nombre = form.nombre.trim();
  if (!nombre) return 'El nombre es obligatorio';
  if (nombre.length < 2) return 'El nombre es demasiado corto';
  if (/\d/.test(nombre)) return 'El nombre no puede contener números';
  if (!soloLetras.test(nombre)) return 'El nombre solo puede tener letras';
  const contacto = form.contacto.trim();
  if (contacto) {
    if (/\d/.test(contacto)) return 'El contacto no puede contener números';
    if (!soloLetras.test(contacto)) return 'El contacto solo puede tener letras';
  }
  const telefono = form.telefono.trim();
  if (telefono) {
    if (!/^[0-9()+\-\s]+$/.test(telefono)) return 'El teléfono solo puede tener números';
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.length < 7 || digitos.length > 15) return 'El teléfono debe tener entre 7 y 15 dígitos';
  }
  return null;
}

async function guardar() {
  const error = validarProveedor();
  if (error) return avisar(error, true);
  guardando.value = true;
  try {
    const url = editando.value ? `${API}/proveedores/${editando.value}` : `${API}/proveedores`;
    const r = await fetch(url, { method: editando.value ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify({ ...form }) });
    const data = await leerJson(r);
    if (!r.ok) return avisar(data.error || 'No se pudo guardar', true);
    avisar(editando.value ? 'Proveedor actualizado' : 'Proveedor registrado');
    limpiar();
    await cargar();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); } finally { guardando.value = false; }
}

async function eliminar(p) {
  if (!(await confirmar(`¿Eliminar al proveedor "${p.nombre}"?`, { titulo: 'Eliminar proveedor', textoAceptar: 'Eliminar', peligro: true }))) return;
  try {
    const r = await fetch(`${API}/proveedores/${p.id}`, { method: 'DELETE', headers: headers() });
    const data = await leerJson(r);
    if (!r.ok) return avisar(data.error || 'No se pudo eliminar', true);
    avisar('Proveedor eliminado');
    await cargar();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); }
}

onMounted(() => { cargar(); cargarInsumos(); });
</script>
