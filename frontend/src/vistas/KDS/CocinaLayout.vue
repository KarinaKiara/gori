<template>
  <div class="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
    <header class="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center shadow-md">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-slate-900">
          KDS
        </div>
        <div>
          <h1 class="text-xl font-bold text-amber-400">Cocina - Gori Chicken</h1>
          <p class="text-xs text-slate-400">Usuario: {{ usuario?.nombre || 'Cocinero' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class="flex gap-2 flex-wrap">
          <span class="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-semibold border border-green-500/30">Nuevos: {{ pedidosNuevos }}</span>
          <span class="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-semibold border border-amber-500/30">En Proceso: {{ pedidosEnProceso }}</span>
          <span v-if="retrasados > 0" class="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-semibold border border-red-500/40">Retrasados: {{ retrasados }}</span>
          <span v-if="enDemora > 0" class="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm font-semibold border border-red-500/40">En demora: {{ enDemora }}</span>
        </div>
        <button @click="logout" class="p-2 bg-slate-700 hover:bg-rose-600 rounded-lg transition-colors" title="Cerrar Sesión">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>
    </header>

    <main class="flex-1 p-6 overflow-x-auto">
      <div class="flex gap-6 h-full min-w-max">

        <!-- Tarjeta de Comanda (ordenadas: pendientes con más espera primero) -->
        <div v-for="pedido in pedidosOrdenados" :key="pedido.id"
             class="w-80 rounded-xl border-t-4 shadow-lg flex flex-col overflow-hidden"
             :class="claseTarjeta(pedido)">

          <!-- Franja de alerta (crítico / demora) -->
          <div v-if="etiquetaAlerta(pedido)"
               class="bg-red-600 text-white text-center text-xs font-extrabold tracking-widest py-1">
            {{ etiquetaAlerta(pedido) }}
          </div>

          <div class="p-4 border-b border-slate-700 flex justify-between items-center">
            <div>
              <span class="text-xl font-bold text-white uppercase" :title="pedido.id">#{{ pedido.id.substring(0, 5) }}</span>
              <span class="ml-2 px-2 py-0.5 rounded text-xs font-bold inline-flex items-center gap-1 tabular-nums"
                    :class="claseCrono(pedido)">
                {{ textoCrono(pedido) }}
              </span>
            </div>
            <div class="text-right">
              <span class="text-sm font-medium text-slate-400 block">{{ pedido.origen === 'TOTEM' ? 'Tótem' : 'Caja' }}</span>
              <span class="text-[0.68rem] text-slate-500">{{ etiquetaSecundaria(pedido) }}</span>
            </div>
          </div>

          <div class="p-4 flex-1 overflow-y-auto space-y-3">
            <div v-for="item in pedido.items.filter(it => it.detalle !== 'presa')" :key="item.id" class="flex justify-between items-start border-b border-slate-700 pb-2">
              <span v-if="item.detalle === 'guarnición'" class="text-slate-400 text-base pl-3">+ {{ item.producto?.nombre || 'Guarnición' }}</span>
              <span v-else class="font-bold text-lg text-slate-200">
                {{ item.cantidad }}x {{ item.producto?.nombre || 'Producto' }}
                <span v-if="item.detalle" class="text-amber-400 text-sm font-normal"> — {{ item.detalle }}</span>
              </span>
            </div>
          </div>

          <div class="p-4 border-t border-slate-700">
            <button @click="actualizarEstado(pedido)" class="w-full py-3 rounded-lg font-bold text-slate-900 transition-colors" :class="pedido.estado === 'EN PREPARACION' ? 'bg-amber-500 hover:bg-amber-400' : 'bg-green-500 hover:bg-green-400'">
              {{ pedido.estado === 'EN PREPARACION' ? 'Completar' : 'Empezar Preparación' }}
            </button>
          </div>
        </div>


      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../almacenes/auth';
import { io } from 'socket.io-client';

const router = useRouter();
const authStore = useAuthStore();
const usuario = computed(() => authStore.usuario);

// --- Parámetros de las alertas (ajustables) ---
// Espera de un pedido PENDIENTE, medida desde createdAt (minutos)
const UMBRAL_AMARILLO = 3;
const UMBRAL_ROJO = 5;
const UMBRAL_CRITICO = 7;
// Límite de preparación de un pedido EN PREPARACION, medido desde updatedAt (minutos)
const LIMITE_SIMPLE = 10;
const LIMITE_GRANDE = 20;
const AVISO_PREP = 2; // minutos antes del límite en que empieza el aviso
// Reglas para clasificar el tamaño del pedido
const UNIDADES_GRANDE = 4;       // total de platos para considerarlo grande
const PRECIO_PLATO_GRANDE = 50;  // Bs; un plato de este precio (o más) lo vuelve grande

const pedidos = ref([]);
const ahora = ref(Date.now()); // reloj reactivo; se refresca cada segundo
let socket = null;
let reloj = null;

// --- Contadores de la cabecera ---
const pedidosNuevos = computed(() => pedidos.value.filter(p => p.estado === 'PENDIENTE').length);
const pedidosEnProceso = computed(() => pedidos.value.filter(p => p.estado === 'EN PREPARACION').length);
const retrasados = computed(() => pedidos.value.filter(p => p.estado === 'PENDIENTE' && ['red', 'critico'].includes(nivelEspera(p))).length);
const enDemora = computed(() => pedidos.value.filter(p => p.estado === 'EN PREPARACION' && estadoPrep(p) === 'demora').length);

// --- Helpers de tiempo ---
const minutosDesde = (fecha) => (ahora.value - new Date(fecha).getTime()) / 60000;
const formatoCrono = (minutos) => {
  const totalSeg = Math.max(0, Math.floor(minutos * 60));
  const m = Math.floor(totalSeg / 60);
  const s = totalSeg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// --- Espera (pedidos PENDIENTE) ---
const nivelEspera = (pedido) => {
  const m = minutosDesde(pedido.createdAt);
  if (m >= UMBRAL_CRITICO) return 'critico';
  if (m >= UMBRAL_ROJO) return 'red';
  if (m >= UMBRAL_AMARILLO) return 'amber';
  return 'green';
};

// --- Clasificación del tamaño del pedido ---
const totalUnidades = (pedido) => (pedido.items || []).reduce((n, it) => n + (it.cantidad || 1), 0);
const incluyePlatoGrande = (pedido) => (pedido.items || []).some(it => {
  const nombre = (it.producto?.nombre || '').toLowerCase();
  const precio = it.producto?.precio ?? it.precio ?? 0;
  return precio >= PRECIO_PLATO_GRANDE || nombre.includes('medio') || nombre.includes('entero');
});
const esGrande = (pedido) => totalUnidades(pedido) >= UNIDADES_GRANDE || incluyePlatoGrande(pedido);
const limitePrep = (pedido) => (esGrande(pedido) ? LIMITE_GRANDE : LIMITE_SIMPLE);

// --- Preparación (pedidos EN PREPARACION) ---
const estadoPrep = (pedido) => {
  const m = minutosDesde(pedido.updatedAt);
  const limite = limitePrep(pedido);
  if (m >= limite) return 'demora';
  if (m >= limite - AVISO_PREP) return 'aviso';
  return 'normal';
};

// --- Presentación por pedido ---
const claseTarjeta = (pedido) => {
  if (pedido.estado === 'PENDIENTE') {
    const n = nivelEspera(pedido);
    if (n === 'critico') return 'bg-red-950 border-red-600 ring-2 ring-red-500 parpadeo-fuerte';
    if (n === 'red') return 'bg-slate-800 border-red-500 ring-1 ring-red-500 parpadeo';
    return 'bg-slate-800 border-green-500';
  }
  // EN PREPARACION
  if (estadoPrep(pedido) === 'demora') return 'bg-slate-800 border-red-500 ring-1 ring-red-500 parpadeo';
  return 'bg-slate-800 border-amber-500';
};

const claseCrono = (pedido) => {
  if (pedido.estado === 'PENDIENTE') {
    const n = nivelEspera(pedido);
    if (n === 'critico') return 'bg-red-700 text-white parpadeo-fuerte';
    if (n === 'red') return 'bg-red-500 text-white parpadeo';
    if (n === 'amber') return 'bg-amber-500 text-slate-900';
    return 'bg-green-500 text-slate-900';
  }
  // EN PREPARACION
  const e = estadoPrep(pedido);
  if (e === 'demora') return 'bg-red-500 text-white parpadeo';
  if (e === 'aviso') return 'bg-amber-500 text-slate-900 parpadeo';
  return 'bg-amber-500 text-slate-900';
};

const textoCrono = (pedido) => {
  if (pedido.estado === 'PENDIENTE') {
    const n = nivelEspera(pedido);
    const icono = n === 'critico' ? '⚠⚠ ' : (n === 'red' ? '⚠ ' : '');
    return icono + formatoCrono(minutosDesde(pedido.createdAt));
  }
  // EN PREPARACION: transcurrido / límite
  const e = estadoPrep(pedido);
  const icono = e === 'demora' ? '⚠ ' : '';
  return `${icono}${formatoCrono(minutosDesde(pedido.updatedAt))} / ${String(limitePrep(pedido)).padStart(2, '0')}:00`;
};

const etiquetaSecundaria = (pedido) => {
  if (pedido.estado === 'PENDIENTE') return 'esperando';
  return esGrande(pedido) ? 'grande · 20 min' : 'simple · 10 min';
};

const etiquetaAlerta = (pedido) => {
  if (pedido.estado === 'PENDIENTE' && nivelEspera(pedido) === 'critico') return '¡ATRASADO!';
  if (pedido.estado === 'EN PREPARACION' && estadoPrep(pedido) === 'demora') return '¡DEMORA!';
  return '';
};

// --- Orden de las tarjetas: pendientes (más espera primero), luego en preparación (más cerca del límite primero) ---
const pedidosOrdenados = computed(() => {
  return [...pedidos.value].sort((a, b) => {
    const aPend = a.estado === 'PENDIENTE';
    const bPend = b.estado === 'PENDIENTE';
    if (aPend && !bPend) return -1;
    if (!aPend && bPend) return 1;
    if (aPend) {
      // el más antiguo (más espera) va primero
      return new Date(a.createdAt) - new Date(b.createdAt);
    }
    // ambos EN PREPARACION: el que está más cerca (o encima) de su límite va primero
    return (minutosDesde(b.updatedAt) / limitePrep(b)) - (minutosDesde(a.updatedAt) / limitePrep(a));
  });
});

const cargarPedidos = async () => {
  try {
    const res = await fetch('/api/pedidos', {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });
    if (res.ok) {
      pedidos.value = await res.json();
    }
  } catch (error) {
    console.error('Error cargando pedidos:', error);
  }
};

const actualizarEstado = async (pedido) => {
  const nuevoEstado = pedido.estado === 'PENDIENTE' ? 'EN PREPARACION' : 'LISTO';
  try {
    const res = await fetch(`/api/pedidos/${pedido.id}/estado`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    // Actualización optimista (el socket también sincroniza)
    if (res.ok) {
      if (nuevoEstado === 'LISTO') {
        pedidos.value = pedidos.value.filter(p => p.id !== pedido.id);
      } else {
        pedido.estado = nuevoEstado;
        // El cronómetro de preparación arranca ahora (updatedAt = ahora)
        pedido.updatedAt = new Date().toISOString();
      }
    }
  } catch (error) {
    console.error('Error actualizando pedido:', error);
  }
};

onMounted(() => {
  cargarPedidos();

  // Reloj reactivo: refresca los cronómetros cada segundo
  reloj = setInterval(() => { ahora.value = Date.now(); }, 1000);

  socket = io();

  socket.on('connect', () => {
    console.log('KDS conectado a WebSockets');
    // Si tenemos la sucursal del usuario, nos unimos a esa sala, o a una global.
    const sucursalId = usuario.value?.sucursalId || 'd7515d08-01ad-4676-905e-aab10de4bbdb'; // Usar la misma genérica
    socket.emit('unirse-sucursal', sucursalId);
  });

  socket.on('pedido-recibido', (nuevoPedido) => {
    // Evitar duplicados
    if (!pedidos.value.find(p => p.id === nuevoPedido.id)) {
      pedidos.value.push(nuevoPedido);
    }
  });

  socket.on('pedido-actualizado', (pedidoActualizado) => {
    if (pedidoActualizado.estado === 'LISTO' || pedidoActualizado.estado === 'ENTREGADO') {
      pedidos.value = pedidos.value.filter(p => p.id !== pedidoActualizado.id);
    } else {
      const index = pedidos.value.findIndex(p => p.id === pedidoActualizado.id);
      if (index !== -1) {
        pedidos.value[index] = pedidoActualizado;
      }
    }
  });
});

onUnmounted(() => {
  if (socket) {
    socket.disconnect();
  }
  if (reloj) {
    clearInterval(reloj);
  }
});

const logout = () => {
  authStore.cerrarSesion();
  router.push('/login');
};
</script>

<style scoped>
@keyframes parpadeo { 50% { opacity: 0.35; } }
@keyframes parpadeoFuerte { 50% { opacity: 0.25; } }
.parpadeo { animation: parpadeo 1s steps(1, end) infinite; }
.parpadeo-fuerte { animation: parpadeoFuerte 0.6s steps(1, end) infinite; }
@media (prefers-reduced-motion: reduce) {
  .parpadeo, .parpadeo-fuerte { animation: none; }
}
</style>
