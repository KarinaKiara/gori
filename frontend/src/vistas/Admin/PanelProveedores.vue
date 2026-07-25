<!--
  Catálogo de proveedores (lo administra el admin).
  El proveedor es una entidad pasiva: no tiene cuenta ni interfaz propia; acá el
  admin solo mantiene sus datos. El gerente lo referencia al reponer stock.
-->
<template>
  <div class="animate-fade-in flex flex-col lg:flex-row gap-8 items-start">
    <!-- Formulario -->
    <div class="w-full lg:w-1/3 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 sticky top-0">
      <h2 class="text-xl font-bold text-slate-800 mb-1">{{ editando ? 'Editar proveedor' : 'Nuevo proveedor' }}</h2>
      <p class="text-sm text-slate-400 mb-6">Los proveedores no usan el sistema; solo se registran sus datos.</p>
      <form @submit.prevent="guardar" class="space-y-5" novalidate>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Nombre <span class="text-rose-500">*</span></label>
          <input v-model="form.nombre" type="text" required placeholder="Ej. Avícola San Juan" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Rubro / qué provee</label>
          <input v-model="form.rubro" type="text" placeholder="Ej. Pollo y huevo" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Contacto</label>
          <input v-model="form.contacto" type="text" placeholder="Ej. Juan Pérez" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>
        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">Teléfono / WhatsApp</label>
          <input v-model="form.telefono" type="text" placeholder="Ej. 77712345" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
        </div>
        <div class="flex gap-2">
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
      <table class="w-full text-left">
        <thead><tr class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
          <th class="p-5 font-bold">Proveedor</th><th class="p-5 font-bold">Rubro</th>
          <th class="p-5 font-bold">Contacto</th><th class="p-5 font-bold">Teléfono</th>
          <th class="p-5 font-bold text-right">Acciones</th>
        </tr></thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="p in proveedores" :key="p.id" class="hover:bg-slate-50/50 transition-colors">
            <td class="p-5 font-bold text-slate-800">{{ p.nombre }}</td>
            <td class="p-5 text-slate-500">{{ p.rubro || '—' }}</td>
            <td class="p-5 text-slate-500">{{ p.contacto || '—' }}</td>
            <td class="p-5 text-slate-500">{{ p.telefono || '—' }}</td>
            <td class="p-5 text-right whitespace-nowrap">
              <button @click="editar(p)" class="text-indigo-600 hover:text-indigo-800 font-bold text-sm mr-4">Editar</button>
              <button @click="eliminar(p)" class="text-rose-500 hover:text-rose-700 font-bold text-sm">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!proveedores.length"><td colspan="5" class="p-8 text-center text-slate-400">Aún no hay proveedores. Registrá el primero a la izquierda.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="noti.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50', noti.tipo==='ok' ? 'bg-green-500' : 'bg-rose-500']">{{ noti.msg }}</div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '../../almacenes/auth';

const authStore = useAuthStore();
const API = '/api/admin';
const headers = () => ({ 'Authorization': `Bearer ${authStore.token}`, 'Content-Type': 'application/json' });

const proveedores = ref([]);
const form = reactive({ nombre: '', rubro: '', contacto: '', telefono: '' });
const editando = ref(null); // id en edición, o null
const guardando = ref(false);
const noti = reactive({ show: false, msg: '', tipo: 'ok' });
function avisar(msg, err = false) { noti.show = true; noti.msg = msg; noti.tipo = err ? 'err' : 'ok'; setTimeout(() => noti.show = false, 3000); }
const leerJson = async (r) => { try { return await r.json(); } catch { return {}; } };

async function cargar() {
  try { const r = await fetch(`${API}/proveedores`, { headers: headers() }); if (r.ok) proveedores.value = await r.json(); } catch (e) { console.error(e); }
}
function limpiar() { form.nombre = ''; form.rubro = ''; form.contacto = ''; form.telefono = ''; editando.value = null; }
function cancelar() { limpiar(); }
function editar(p) { editando.value = p.id; form.nombre = p.nombre; form.rubro = p.rubro || ''; form.contacto = p.contacto || ''; form.telefono = p.telefono || ''; }

async function guardar() {
  if (!form.nombre.trim()) return avisar('El nombre es obligatorio', true);
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
  if (!confirm(`¿Eliminar al proveedor "${p.nombre}"?`)) return;
  try {
    const r = await fetch(`${API}/proveedores/${p.id}`, { method: 'DELETE', headers: headers() });
    const data = await leerJson(r);
    if (!r.ok) return avisar(data.error || 'No se pudo eliminar', true);
    avisar('Proveedor eliminado');
    await cargar();
  } catch (e) { avisar('Sin conexión. Intentá de nuevo.', true); }
}

onMounted(cargar);
</script>
