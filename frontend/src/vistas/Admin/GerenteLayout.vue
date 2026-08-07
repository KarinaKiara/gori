<template>
<div class="min-h-screen flex font-sans" style="background: linear-gradient(160deg, #0b0b0d 0%, #17120c 55%, #0a0a0b 100%);">
  <!-- Cuadro rojo de stock bajo: SIEMPRE visible (fijo abajo), en todas las pestañas -->
  <AlertaStockBajo modo="gerente" api-base="/api/gerente" />

  <aside class="w-72 text-white flex flex-col shadow-2xl z-20" style="background: linear-gradient(180deg, #080705 0%, #12100b 40%, #17120c 100%); border-right: 1px solid rgba(228,192,122,0.15);">
    <div class="p-8 flex items-center gap-4 border-b border-white/10">
      <!-- El logo se queda naranja: es el sello de marca, igual que en el tótem y la caja -->
      <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg" style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 15px rgba(255,69,0,0.4);">🦍</div>
      <div>
        <span class="font-black text-xl tracking-wider block" style="font-family: 'Impact','Arial Black',sans-serif;">GORI CHICKEN</span>
        <span class="text-xs font-bold tracking-widest uppercase" style="color: #E4C07A;">Gerencia</span>
      </div>
    </div>
    <nav class="flex-1 px-4 py-8 space-y-2">
      <button v-for="tab in tabs" :key="tab.id" @click="currentTab = tab.id"
        :class="['w-full flex items-center gap-4 px-5 py-4 rounded-xl font-medium transition-all', currentTab === tab.id ? 'text-[#17120c] shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5']"
        :style="currentTab === tab.id ? 'background: linear-gradient(135deg, #E4C07A, #caa24f);' : ''">
        <span class="shrink-0 flex" v-html="tab.icon"></span>
        {{ tab.label }}
      </button>
    </nav>
    <div class="p-6 border-t border-white/10">
      <button @click="logout" class="flex items-center gap-4 px-5 py-3 w-full text-slate-400 hover:text-[#E4C07A] hover:bg-white/5 rounded-xl transition-colors">
        <span class="shrink-0 flex" v-html="iconos.salir"></span>
        Cerrar Sesión
      </button>
    </div>
  </aside>

  <main class="flex-1 flex flex-col h-screen overflow-hidden">
    <header class="px-10 py-5 flex justify-between items-center z-10 border-b" style="background: rgba(8,7,5,0.72); backdrop-filter: blur(12px); border-color: rgba(228,192,122,0.15);">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight">{{ currentTab==='dashboard' ? 'Reportes Locales' : currentTab==='personal' ? 'Personal de Sucursal' : currentTab==='ventaspagos' ? 'Ventas y Pagos' : 'Inventario por Recetas' }}</h1>
        <p class="text-[#E4C07A] text-xs font-bold mt-0.5 tracking-widest uppercase">{{ reporte.sucursal?.nombre || 'Tu Sucursal' }}</p>
      </div>
      <div class="flex items-center gap-6">
        <div class="text-right">
          <span class="block text-white font-bold">{{ usuario?.nombre }}</span>
          <span class="block text-xs text-[#E4C07A] uppercase tracking-widest">GERENTE</span>
        </div>
        <div class="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg" style="background: linear-gradient(135deg, #E4C07A, #caa24f); color:#17120c;">{{ usuario?.nombre?.charAt(0) || 'G' }}</div>
      </div>
    </header>

    <div class="flex-1 overflow-y-auto p-8" style="background: rgba(8,7,5,0.35);">
      <div v-if="cargando" class="flex items-center justify-center h-64">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: #E4C07A;"></div>
      </div>

      <!-- DASHBOARD CON GRÁFICOS -->
      <div v-else-if="currentTab==='dashboard'" class="space-y-6 animate-fade-in">

        <!-- Filtro de fecha -->
        <div class="flex flex-wrap items-center gap-3 p-4 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
          <span class="text-white font-bold text-sm flex items-center gap-2"><span class="text-[#E4C07A] flex" v-html="iconos.calendario"></span> Ver reporte del:</span>
          <button @click="setFecha('hoy')" :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all', fechaActiva==='hoy' ? 'text-[#17120c] font-black' : 'text-gray-400 border border-white/10 hover:border-[#E4C07A]/40']" :style="fechaActiva==='hoy' ? 'background: linear-gradient(135deg,#E4C07A,#caa24f);' : ''">Hoy</button>
          <button @click="setFecha('ayer')" :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all', fechaActiva==='ayer' ? 'text-[#17120c] font-black' : 'text-gray-400 border border-white/10 hover:border-[#E4C07A]/40']" :style="fechaActiva==='ayer' ? 'background: linear-gradient(135deg,#E4C07A,#caa24f);' : ''">Ayer</button>
          <div class="flex items-center gap-2">
            <input type="date" v-model="fechaPersonalizada" @change="setFecha('custom')"
                   class="px-3 py-2 rounded-xl text-xs font-bold text-white outline-none border"
                   style="background: rgba(255,255,255,0.05); border-color: rgba(228,192,122,0.3);" />
          </div>
          <button @click="exportarVentasPDF" class="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition active:scale-95" style="background: linear-gradient(135deg,#16a34a,#15803d);"><span class="flex" v-html="iconos.documento"></span> Exportar PDF</button>
          <span class="text-[#E4C07A] text-xs">{{ reporte.fecha ? 'Datos de: ' + reporte.fecha : '' }}</span>
        </div>

        <!-- Métricas -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
            <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">💰 Ventas del Día</p>
            <p class="text-3xl font-black text-white">Bs. {{ reporte.resumen?.totalVentas?.toFixed(0) || 0 }}</p>
          </div>
          <div class="p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
            <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">📋 Pedidos</p>
            <p class="text-3xl font-black text-white">{{ reporte.resumen?.totalPedidos || 0 }}</p>
          </div>
          <div class="p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(100,150,255,0.3);">
            <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">🖥 POS</p>
            <p class="text-3xl font-black text-blue-400">{{ reporte.resumen?.pedidosPOS || 0 }}</p>
          </div>
          <div class="p-5 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,200,50,0.3);">
            <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">📱 Tótem</p>
            <p class="text-3xl font-black text-yellow-400">{{ reporte.resumen?.pedidosTotem || 0 }}</p>
          </div>
        </div>

        <!-- Gráficos lado a lado -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <!-- Gráfico: Productos más vendidos (barras horizontales) -->
          <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
            <h3 class="text-white font-black mb-5 flex items-center gap-2">🏆 Productos Más Vendidos</h3>
            <div v-if="reporte.productoTop?.length" class="space-y-3">
              <div v-for="(p, i) in reporte.productoTop" :key="i" class="flex items-center gap-3">
                <span class="text-gray-400 text-xs w-5 text-right font-bold">{{ i+1 }}</span>
                <div class="flex-1">
                  <div class="flex justify-between mb-1">
                    <span class="text-white text-xs font-bold truncate">{{ p.nombre }}</span>
                    <span class="text-[#E4C07A] text-xs font-black ml-2">{{ p.cantidad }}</span>
                  </div>
                  <div class="h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.08);">
                    <div class="h-full rounded-full transition-all duration-700"
                         :style="{ width: (p.cantidad / maxProducto * 100) + '%', background: 'linear-gradient(90deg, #E4C07A, #caa24f)' }"></div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center text-gray-500 py-8">Sin ventas en esta fecha</div>
          </div>

          <!-- Gráfico: Ventas por hora (barras verticales SVG) -->
          <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
            <h3 class="text-white font-black mb-5 flex items-center gap-2">📈 Actividad por Hora</h3>
            <svg viewBox="0 0 500 160" class="w-full" style="height: 160px;">
              <!-- Líneas guía -->
              <line v-for="n in 4" :key="n" :x1="0" :y1="n*35" :x2="500" :y2="n*35" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
              <!-- Barras por hora (solo horas 7-22) -->
              <g v-for="(h, i) in horasActivas" :key="i">
                <rect :x="i * 22 + 4" :y="140 - barHeight(h.total)" :width="16" :height="barHeight(h.total)"
                      :fill="h.pedidos > 0 ? 'url(#barGrad)' : 'rgba(255,255,255,0.05)'" rx="3"/>
                <text :x="i * 22 + 12" y="155" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="8">{{ h.hora }}h</text>
              </g>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#FF6B35"/>
                  <stop offset="100%" stop-color="#FF4500" stop-opacity="0.6"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <!-- Gráfico de torta: Canal de pedidos (Tótem vs Cajero) -->
        <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
          <h3 class="text-white font-black mb-6">🥧 Canal de Pedidos — Tótem vs Cajero</h3>
          <div class="flex flex-col md:flex-row items-center gap-8">

            <!-- SVG Donut -->
            <div class="relative flex-shrink-0" style="width:200px;height:200px;">
              <svg viewBox="0 0 200 200" width="200" height="200">
                <!-- fondo del donut -->
                <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="32"/>

                <!-- sin datos -->
                <template v-if="origenStatsGerente.total === 0">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="32"/>
                  <text x="100" y="104" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="12" font-weight="bold">Sin datos</text>
                </template>

                <template v-else>
                  <!-- arco Cajero (POS) - azul -->
                  <circle
                    cx="100" cy="100" r="70"
                    fill="none"
                    stroke="#60a5fa"
                    stroke-width="32"
                    stroke-dasharray="439.82"
                    :stroke-dashoffset="439.82 * (1 - origenStatsGerente.pctPOS / 100)"
                    stroke-linecap="round"
                    transform="rotate(-90 100 100)"
                    style="transition: stroke-dashoffset 0.8s ease;"
                  />
                  <!-- arco Tótem - naranja -->
                  <circle
                    cx="100" cy="100" r="70"
                    fill="none"
                    stroke="#fb923c"
                    stroke-width="32"
                    stroke-dasharray="439.82"
                    :stroke-dashoffset="439.82 * (1 - origenStatsGerente.pctTotem / 100)"
                    stroke-linecap="round"
                    :transform="`rotate(${-90 + 360 * origenStatsGerente.pctPOS / 100} 100 100)`"
                    style="transition: stroke-dashoffset 0.8s ease;"
                  />
                  <!-- texto central -->
                  <text x="100" y="95" text-anchor="middle" fill="white" font-size="22" font-weight="900">{{ origenStatsGerente.total }}</text>
                  <text x="100" y="113" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">PEDIDOS HOY</text>
                </template>
              </svg>
            </div>

            <!-- Leyenda -->
            <div class="flex-1 space-y-5">
              <div class="p-4 rounded-2xl" style="background: rgba(96,165,250,0.1); border: 1px solid rgba(96,165,250,0.25);">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-3 h-3 rounded-full bg-blue-400"></div>
                  <span class="text-white font-black text-sm">🖥 Cajero (POS)</span>
                </div>
                <div class="flex justify-between items-end">
                  <span class="text-blue-400 text-3xl font-black">{{ origenStatsGerente.pos }}</span>
                  <span class="text-blue-300 text-lg font-bold">{{ origenStatsGerente.pctPOS.toFixed(1) }}%</span>
                </div>
                <div class="mt-2 h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
                  <div class="h-full rounded-full bg-blue-400 transition-all duration-700" :style="{ width: origenStatsGerente.pctPOS + '%' }"></div>
                </div>
              </div>

              <div class="p-4 rounded-2xl" style="background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.25);">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-3 h-3 rounded-full bg-orange-400"></div>
                  <span class="text-white font-black text-sm">📱 Tótem</span>
                </div>
                <div class="flex justify-between items-end">
                  <span class="text-[#E4C07A] text-3xl font-black">{{ origenStatsGerente.totem }}</span>
                  <span class="text-orange-300 text-lg font-bold">{{ origenStatsGerente.pctTotem.toFixed(1) }}%</span>
                </div>
                <div class="mt-2 h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
                  <div class="h-full rounded-full bg-orange-400 transition-all duration-700" :style="{ width: origenStatsGerente.pctTotem + '%' }"></div>
                </div>
              </div>

              <p v-if="origenStatsGerente.total > 0" class="text-gray-400 text-xs text-center">
                {{ origenStatsGerente.pos > origenStatsGerente.totem ? '🏆 El Cajero lidera los pedidos hoy' : origenStatsGerente.totem > origenStatsGerente.pos ? '🏆 El Tótem lidera los pedidos hoy' : '⚖️ Empate entre canales' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Últimos pedidos -->
        <div class="rounded-2xl border overflow-hidden" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
          <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
            <h3 class="text-white font-black">📋 Últimos Pedidos del Día</h3>
            <span class="text-gray-400 text-xs">{{ reporte.ultimosPedidos?.length || 0 }} registros</span>
          </div>
          <table class="w-full text-left">
            <thead><tr class="text-gray-500 uppercase text-xs border-b border-white/5">
              <th class="p-4 font-bold">Origen</th>
              <th class="p-4 font-bold">Monto</th><th class="p-4 font-bold">Hora</th><th class="p-4 font-bold"></th>
            </tr></thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="p in reporte.ultimosPedidos" :key="p.id" @click="pedidoSel = p.id" class="hover:bg-white/5 transition-colors cursor-pointer">
                <td class="p-4"><span :class="['px-2 py-1 rounded-lg text-xs font-bold', p.origen==='POS' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400']">{{ p.origen }}</span></td>
                <td class="p-4 font-black text-green-400">Bs. {{ p.montoTotal }}</td>
                <td class="p-4 text-gray-400 text-xs">{{ new Date(p.createdAt).toLocaleTimeString() }}</td>
                <td class="p-4 text-[#E4C07A] text-xs font-bold whitespace-nowrap">Ver detalle →</td>
              </tr>
              <tr v-if="!reporte.ultimosPedidos?.length"><td colspan="4" class="p-6 text-center text-gray-500">Sin pedidos en esta fecha</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- GESTIONAR PERSONAL -->
      <div v-else-if="currentTab==='personal'" class="animate-fade-in flex gap-8 items-start">
        <div class="w-1/3 p-8 rounded-3xl border sticky top-0" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
          <h2 class="text-xl font-black text-white mb-6">Contratar Personal</h2>
          <form @submit.prevent="crearEmpleado" class="space-y-5" novalidate>
            <div><label class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">Nombre</label>
              <input v-model="form.nombre" type="text" required placeholder="Ej. Ana Gómez" class="w-full p-3 rounded-xl text-white text-sm outline-none" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);"></div>
            <div><label class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">Correo</label>
              <input v-model="form.correo" type="email" required placeholder="empleado@gorichicken.com" class="w-full p-3 rounded-xl text-white text-sm outline-none" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);"></div>
            <div><label class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">Contraseña</label>
              <input v-model="form.contrasena" type="password" required placeholder="••••••••" class="w-full p-3 rounded-xl text-white text-sm outline-none" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);"></div>
            <div><label class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">Rol</label>
              <select v-model="form.rol" required class="w-full p-3 rounded-xl text-white text-sm outline-none cursor-pointer" style="background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);">
                <option value="CAJERO">Cajero (POS)</option><option value="COCINERO">Cocinero (KDS)</option>
              </select></div>
            <button type="submit" class="w-full text-white font-black py-4 rounded-xl transition active:scale-95" style="background: linear-gradient(135deg,#E4C07A,#caa24f);">Añadir Empleado</button>
          </form>
        </div>
        <div class="flex-1 rounded-3xl border overflow-hidden" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
          <div class="p-6 border-b border-white/5"><h2 class="text-xl font-black text-white">Tu Personal</h2></div>
          <table class="w-full text-left">
            <thead><tr class="text-gray-500 uppercase text-xs border-b border-white/5">
              <th class="p-6 font-bold">Empleado</th><th class="p-6 font-bold">Correo</th><th class="p-6 font-bold">Puesto</th><th class="p-6 font-bold text-right">Acciones</th>
            </tr></thead>
            <tbody class="divide-y divide-white/5">
              <tr v-for="emp in personal" :key="emp.id" class="hover:bg-white/5 transition-colors">
                <td class="p-6 font-bold text-white flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                       :class="emp.rol==='TOTEM' ? 'bg-sky-500/20 text-sky-400' : emp.rol==='CAJERO' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'">
                    {{ emp.rol === 'TOTEM' ? '🖥️' : emp.nombre?.charAt(0) }}
                  </div>
                  {{ emp.nombre }}
                </td>
                <td class="p-6 text-gray-400 text-sm">{{ emp.correo }}</td>
                <td class="p-6">
                  <span :class="['px-3 py-1 rounded-lg text-xs font-bold',
                        emp.rol==='TOTEM' ? 'bg-sky-500/20 text-sky-400' : emp.rol==='CAJERO' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400']">
                    {{ emp.rol === 'TOTEM' ? 'TERMINAL' : emp.rol }}
                  </span>
                </td>
                <td class="p-6 text-right space-x-3">
                  <!-- El tótem no es una persona: es la terminal de autoservicio.
                       No se le cambia el rol ni se da de baja (rompería el autoservicio). -->
                  <span v-if="emp.rol === 'TOTEM'" class="text-gray-500 text-xs italic">Terminal de autoservicio</span>
                  <template v-else>
                    <button @click="cambiarRol(emp)" class="text-blue-400 hover:text-blue-300 font-bold text-sm transition">Cambiar Rol</button>
                    <button @click="eliminarEmpleado(emp.id)" class="text-red-400 hover:text-red-300 font-bold text-sm transition">Dar de Baja</button>
                  </template>
                </td>
              </tr>
              <tr v-if="!personal.length"><td colspan="4" class="p-6 text-center text-gray-500">No hay personal registrado</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- INVENTARIO POR RECETAS -->
      <div v-else-if="currentTab==='inventario'" class="animate-fade-in">
        <PanelInventario />
      </div>

      <!-- VENTAS Y PAGOS (por periodo) -->
      <div v-else-if="currentTab==='ventaspagos'" class="animate-fade-in">
        <ReporteVentasPagos api-base="/api/gerente" />
      </div>

      <div v-if="noti.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50', noti.tipo==='ok' ? 'bg-green-500' : 'bg-red-500']">{{ noti.msg }}</div>
    </div>
  </main>

  <!-- Reporte A: detalle del pedido seleccionado -->
  <ModalDetallePedido v-if="pedidoSel" :pedido-id="pedidoSel" api-base="/api/gerente" @close="pedidoSel = null" />
</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../almacenes/auth';
import { confirmar } from '../../utilidades/dialogo';
import PanelInventario from './PanelInventario.vue';
import ModalDetallePedido from '../../componentes/ModalDetallePedido.vue';
import ReporteVentasPagos from '../../componentes/ReporteVentasPagos.vue';
import AlertaStockBajo from '../../componentes/AlertaStockBajo.vue';
import { exportarReporteVentas } from '../../utilidades/reportesPdf';
import { iconos } from '../../utilidades/iconos';

const router = useRouter();
const authStore = useAuthStore();
const usuario = computed(() => authStore.usuario);
const API = '/api/gerente';
const currentTab = ref('dashboard');
const tabs = [
  { id: 'dashboard', label: 'Reportes Locales', icon: iconos.reportes },
  { id: 'personal', label: 'Gestionar Personal', icon: iconos.personas },
  { id: 'inventario', label: 'Inventario por Recetas', icon: iconos.inventario },
  { id: 'ventaspagos', label: 'Ventas y Pagos', icon: iconos.ventas },
];
const cargando = ref(false);
const personal = ref([]);
const reporte = ref({ sucursal: {}, resumen: {}, productoTop: [], ventasPorHora: [], ultimosPedidos: [] });
const exportarVentasPDF = () => exportarReporteVentas(reporte.value);
const form = reactive({ nombre: '', correo: '', contrasena: '', rol: 'CAJERO' });
const noti = reactive({ show: false, msg: '', tipo: 'ok' });
const fechaActiva = ref('hoy');
const fechaPersonalizada = ref('');
const pedidoSel = ref(null); // pedido abierto en el modal de detalle

function hdrs() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` }; }
function notify(msg, tipo='ok') { noti.show=true; noti.msg=msg; noti.tipo=tipo; setTimeout(()=>{ noti.show=false; }, 3000); }

const maxProducto = computed(() => Math.max(...(reporte.value.productoTop?.map(p => p.cantidad) || [1]), 1));

// Estadísticas de origen: Tótem vs Cajero (Gerente local)
const origenStatsGerente = computed(() => {
  const pos = reporte.value.resumen?.pedidosPOS ?? 0;
  const totem = reporte.value.resumen?.pedidosTotem ?? 0;
  const total = pos + totem;
  return {
    pos,
    totem,
    total,
    pctPOS: total > 0 ? (pos / total) * 100 : 0,
    pctTotem: total > 0 ? (totem / total) * 100 : 0,
  };
});


const horasActivas = computed(() => {
  const horas = reporte.value.ventasPorHora || [];
  return horas.filter(h => h.hora >= 7 && h.hora <= 22);
});

const maxVentaHora = computed(() => Math.max(...(horasActivas.value.map(h => h.total) || [1]), 1));

function barHeight(total) {
  return Math.max((total / maxVentaHora.value) * 120, total > 0 ? 4 : 0);
}

async function setFecha(tipo) {
  fechaActiva.value = tipo;
  let fechaParam = '';
  if (tipo === 'ayer') {
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    fechaParam = ayer.toISOString().split('T')[0];
  } else if (tipo === 'custom' && fechaPersonalizada.value) {
    fechaParam = fechaPersonalizada.value;
  }
  await cargarReporte(fechaParam);
}

async function cargarPersonal() {
  try { const r = await fetch(`${API}/personal`, { headers: hdrs() }); if(r.ok) personal.value = await r.json(); } catch(e) { console.error(e); }
}

async function cargarReporte(fecha = '') {
  try {
    const url = fecha ? `${API}/reportes/local?fecha=${fecha}` : `${API}/reportes/local`;
    const r = await fetch(url, { headers: hdrs() });
    if(r.ok) reporte.value = await r.json();
  } catch(e) { console.error(e); }
}

async function crearEmpleado() {
  if (!form.nombre || !form.correo || !form.contrasena || !form.rol) {
    notify('Por favor, completa todos los campos requeridos.', 'err');
    return;
  }

  // Validaciones de formato
  const nombreTrim = form.nombre.trim();
  if (nombreTrim.length < 3) {
    notify('El nombre debe tener al menos 3 caracteres.', 'err');
    return;
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombreTrim)) {
    notify('El nombre solo debe contener letras y espacios.', 'err');
    return;
  }
  if (/([a-zA-ZáéíóúÁÉÍÓÚñÑ])\1{3,}/.test(nombreTrim)) {
    notify('El nombre no puede tener letras repetidas consecutivamente.', 'err');
    return;
  }
  if (/[bcdfghjklmnñpqrstvwxyzBCDFGHJKLMNÑPQRSTVWXYZ]{5}/.test(nombreTrim)) {
    notify('El nombre ingresado es inválido (demasiadas consonantes juntas).', 'err');
    return;
  }

  const correoLower = form.correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLower)) {
    notify('El formato del correo no es válido.', 'err');
    return;
  }
  if (!correoLower.endsWith('@gmail.com') && !correoLower.endsWith('@gorichicken.com')) {
    notify('El correo debe terminar en @gmail.com o @gorichicken.com.', 'err');
    return;
  }

  try {
    const r = await fetch(`${API}/personal`, { method:'POST', headers: hdrs(), body: JSON.stringify({ nombre: nombreTrim, correo: correoLower, contrasena: form.contrasena, rol: form.rol }) });
    if(r.ok) { notify('Empleado creado ✓'); form.nombre=''; form.correo=''; form.contrasena=''; form.rol='CAJERO'; await cargarPersonal(); }
    else { const e = await r.json(); notify(e.error||'Error','err'); }
  } catch(e) { notify('Error de conexión','err'); }
}

async function cambiarRol(emp) {
  const nuevoRol = emp.rol === 'CAJERO' ? 'COCINERO' : 'CAJERO';
  if(!(await confirmar(`¿Cambiar rol de ${emp.nombre} a ${nuevoRol}?`, { titulo: 'Cambiar rol', textoAceptar: 'Cambiar' }))) return;
  try {
    const r = await fetch(`${API}/personal/${emp.id}/rol`, { method:'PUT', headers: hdrs(), body: JSON.stringify({ rol: nuevoRol }) });
    if(r.ok) { notify(`Rol cambiado a ${nuevoRol}`); await cargarPersonal(); }
    else { const e = await r.json(); notify(e.error||'Error','err'); }
  } catch(e) { notify('Error de conexión','err'); }
}

async function eliminarEmpleado(id) {
  if(!(await confirmar('¿Dar de baja a este empleado?', { titulo: 'Dar de baja', textoAceptar: 'Dar de baja', peligro: true }))) return;
  try {
    const r = await fetch(`${API}/personal/${id}`, { method:'DELETE', headers: hdrs() });
    if(r.ok) { notify('Empleado dado de baja'); await cargarPersonal(); }
    else { const e = await r.json(); notify(e.error||'Error','err'); }
  } catch(e) { notify('Error de conexión','err'); }
}

onMounted(async () => { cargando.value=true; await Promise.all([cargarPersonal(), cargarReporte()]); cargando.value=false; });
const logout = () => { authStore.cerrarSesion(); router.push('/login'); };
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.4); border-radius: 4px; }
</style>
