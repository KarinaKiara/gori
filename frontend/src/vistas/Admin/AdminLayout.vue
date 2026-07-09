<template>
  <div class="min-h-screen flex font-sans" style="background: linear-gradient(160deg, #071d2c 0%, #0d3347 55%, #091e2e 100%);">
    <!-- Sidebar -->
    <aside class="w-72 text-white flex flex-col shadow-2xl z-20" style="background: linear-gradient(180deg, #040f18 0%, #071d2c 40%, #0a2234 100%); border-right: 1px solid rgba(255,69,0,0.15);">
      <div class="p-8 flex items-center gap-4 border-b border-white/10">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg" style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 15px rgba(255,69,0,0.4);">🦍</div>
        <div>
          <span class="font-black text-xl tracking-wider block" style="font-family: 'Impact','Arial Black',sans-serif;">GORI CHICKEN</span>
          <span class="text-xs font-bold tracking-widest uppercase" style="color: rgba(255,150,80,0.8);">Admin Global</span>
        </div>
      </div>
      <nav class="flex-1 px-4 py-8 space-y-2">
        <button v-for="tab in tabs" :key="tab.id" @click="currentTab = tab.id"
          :class="['w-full flex items-center gap-4 px-5 py-4 rounded-xl font-medium transition-all', currentTab === tab.id ? 'text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5']"
          :style="currentTab === tab.id ? 'background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 4px 15px rgba(255,69,0,0.35);' : ''">
          <span v-html="tab.icon"></span>
          {{ tab.label }}
        </button>
      </nav>
      <div class="p-6 border-t border-white/10">
        <button @click="logout" class="flex items-center gap-4 px-5 py-3 w-full text-slate-400 hover:text-rose-400 hover:bg-white/5 rounded-xl transition-colors">
          ⬅ Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- Main -->
    <main class="flex-1 flex flex-col h-screen overflow-hidden">
      <header class="px-10 py-5 flex justify-between items-center z-10 border-b" style="background: rgba(5,15,25,0.7); backdrop-filter: blur(12px); border-color: rgba(255,69,0,0.15);">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight">{{ tituloActual }}</h1>
          <p class="text-orange-400 text-xs font-bold mt-0.5 tracking-widest uppercase">Visión Global de la Franquicia</p>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <span class="block text-white font-bold">{{ usuario?.nombre }}</span>
            <span class="block text-xs text-orange-400 uppercase tracking-widest">{{ usuario?.rol }}</span>
          </div>
          <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg" style="background: linear-gradient(135deg, #FF4500, #FF6B35);">
            {{ usuario?.nombre?.charAt(0) || 'A' }}
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-10" style="background: rgba(5,15,25,0.3);">
        <!-- Loading -->
        <div v-if="cargando" class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gori-primary"></div>
        </div>

        <!-- DASHBOARD CON GRÁFICOS -->
        <div v-else-if="currentTab === 'dashboard'" class="animate-fade-in space-y-6" id="reporte-pdf">

          <!-- Barra de filtro de fecha + PDF -->
          <div class="flex flex-wrap items-center gap-3 p-4 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
            <span class="text-white font-bold text-sm">📅 Ver reporte del:</span>
            <button @click="setFecha('hoy')" :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all', fechaActiva==='hoy' ? 'text-white' : 'text-gray-400 border border-white/10']" :style="fechaActiva==='hoy' ? 'background:linear-gradient(135deg,#FF4500,#FF6B35)' : ''">Hoy</button>
            <button @click="setFecha('ayer')" :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all', fechaActiva==='ayer' ? 'text-white' : 'text-gray-400 border border-white/10']" :style="fechaActiva==='ayer' ? 'background:linear-gradient(135deg,#FF4500,#FF6B35)' : ''">Ayer</button>
            <input type="date" v-model="fechaPersonalizada" @change="setFecha('custom')"
                   class="px-3 py-2 rounded-xl text-xs font-bold text-white outline-none border"
                   style="background: rgba(255,255,255,0.05); border-color: rgba(255,69,0,0.3);" />
            <span class="text-orange-400 text-xs">{{ reporte.fecha ? 'Datos del: ' + reporte.fecha : '' }}</span>
            <button @click="descargarPDF"
                    class="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-black transition active:scale-95 no-print"
                    style="background: linear-gradient(135deg, #16a34a, #15803d); box-shadow: 0 0 15px rgba(22,163,74,0.3);">
              📄 Descargar PDF
            </button>
          </div>

          <!-- Métricas principales -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
              <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">💰 Ingresos del Día</p>
              <p class="text-4xl font-black text-white">Bs. {{ reporte.resumen?.totalVentasHoy?.toLocaleString() || 0 }}</p>
            </div>
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
              <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">📋 Pedidos Totales</p>
              <p class="text-4xl font-black text-white">{{ reporte.resumen?.totalPedidosHoy || 0 }}</p>
            </div>
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
              <p class="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">🏪 Sucursales</p>
              <p class="text-4xl font-black text-white">{{ reporte.resumen?.totalSucursales || 0 }}</p>
            </div>
          </div>

          <!-- Gráficos fila 1 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Gráfico barras horizontales: ventas por sucursal -->
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
              <h3 class="text-white font-black mb-5">📊 Ventas por Sucursal</h3>
              <div v-if="reporte.ventasPorSucursal?.length" class="space-y-4">
                <div v-for="s in reporte.ventasPorSucursal" :key="s.id">
                  <div class="flex justify-between mb-1.5">
                    <span class="text-white text-xs font-bold truncate max-w-[60%]">{{ s.nombre }}</span>
                    <span class="text-orange-400 text-xs font-black">Bs. {{ s.ventasHoy }}</span>
                  </div>
                  <div class="h-3 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
                    <div class="h-full rounded-full transition-all duration-700"
                         :style="{ width: maxVentaSucursal > 0 ? (s.ventasHoy / maxVentaSucursal * 100) + '%' : '0%', background: 'linear-gradient(90deg,#FF4500,#FF6B35)' }"></div>
                  </div>
                  <div class="flex justify-between mt-1">
                    <span class="text-gray-500 text-xs">{{ s.pedidosHoy }} pedidos</span>
                    <span class="text-gray-500 text-xs">{{ s.totalEmpleados }} empleados</span>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-gray-500 py-8">Sin datos en esta fecha</div>
            </div>

            <!-- Gráfico barras verticales: actividad por hora -->
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
              <h3 class="text-white font-black mb-5">📈 Actividad por Hora</h3>
              <svg viewBox="0 0 500 165" class="w-full" style="height:165px;">
                <line v-for="n in 4" :key="n" x1="0" :y1="n*35" x2="500" :y2="n*35" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
                <g v-for="(h, i) in horasActivasAdmin" :key="i">
                  <rect :x="i*22+4" :y="140 - barHeightAdmin(h.total)" :width="16" :height="barHeightAdmin(h.total)"
                        :fill="h.pedidos>0 ? 'url(#adminBarGrad)' : 'rgba(255,255,255,0.05)'" rx="3"/>
                  <text :x="i*22+12" y="158" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-size="7">{{ h.hora }}h</text>
                </g>
                <defs>
                  <linearGradient id="adminBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#FF6B35"/><stop offset="100%" stop-color="#FF4500" stop-opacity="0.5"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <!-- Gráfico de torta: Canal de pedidos (Tótem vs Cajero) -->
          <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
            <h3 class="text-white font-black mb-6">🥧 Canal de Pedidos — Tótem vs Cajero</h3>
            <div class="flex flex-col md:flex-row items-center gap-8">

              <!-- SVG Donut -->
              <div class="relative flex-shrink-0" style="width:200px;height:200px;">
                <svg viewBox="0 0 200 200" width="200" height="200">
                  <!-- fondo del donut -->
                  <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="32"/>

                  <!-- sin datos -->
                  <template v-if="origenStats.total === 0">
                    <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="32"/>
                    <text x="100" y="104" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="12" font-weight="bold">Sin datos</text>
                  </template>

                  <!-- arco Cajero (POS) - azul -->
                  <template v-else>
                    <circle
                      cx="100" cy="100" r="70"
                      fill="none"
                      stroke="#60a5fa"
                      stroke-width="32"
                      stroke-dasharray="439.82"
                      :stroke-dashoffset="439.82 * (1 - origenStats.pctPOS / 100)"
                      stroke-linecap="round"
                      transform="rotate(-90 100 100)"
                      style="transition: stroke-dashoffset 0.8s ease;"
                    />
                    <!-- arco Tótem - naranja, empieza donde termina el cajero -->
                    <circle
                      cx="100" cy="100" r="70"
                      fill="none"
                      stroke="#fb923c"
                      stroke-width="32"
                      stroke-dasharray="439.82"
                      :stroke-dashoffset="439.82 * (1 - origenStats.pctTotem / 100)"
                      stroke-linecap="round"
                      :transform="`rotate(${-90 + 360 * origenStats.pctPOS / 100} 100 100)`"
                      style="transition: stroke-dashoffset 0.8s ease;"
                    />
                    <!-- texto central -->
                    <text x="100" y="95" text-anchor="middle" fill="white" font-size="22" font-weight="900">{{ origenStats.total }}</text>
                    <text x="100" y="113" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="9">PEDIDOS TOTALES</text>
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
                    <span class="text-blue-400 text-3xl font-black">{{ origenStats.pos }}</span>
                    <span class="text-blue-300 text-lg font-bold">{{ origenStats.pctPOS.toFixed(1) }}%</span>
                  </div>
                  <div class="mt-2 h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
                    <div class="h-full rounded-full bg-blue-400 transition-all duration-700" :style="{ width: origenStats.pctPOS + '%' }"></div>
                  </div>
                </div>

                <div class="p-4 rounded-2xl" style="background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.25);">
                  <div class="flex items-center gap-3 mb-2">
                    <div class="w-3 h-3 rounded-full bg-orange-400"></div>
                    <span class="text-white font-black text-sm">📱 Tótem</span>
                  </div>
                  <div class="flex justify-between items-end">
                    <span class="text-orange-400 text-3xl font-black">{{ origenStats.totem }}</span>
                    <span class="text-orange-300 text-lg font-bold">{{ origenStats.pctTotem.toFixed(1) }}%</span>
                  </div>
                  <div class="mt-2 h-2 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
                    <div class="h-full rounded-full bg-orange-400 transition-all duration-700" :style="{ width: origenStats.pctTotem + '%' }"></div>
                  </div>
                </div>

                <p v-if="origenStats.total > 0" class="text-gray-400 text-xs text-center">
                  {{ origenStats.pos > origenStats.totem ? '🏆 El Cajero lidera los pedidos hoy' : origenStats.totem > origenStats.pos ? '🏆 El Tótem lidera los pedidos hoy' : '⚖️ Empate entre canales' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Tabla últimos pedidos -->
          <div class="rounded-2xl border overflow-hidden" style="background: rgba(255,255,255,0.04); border-color: rgba(255,69,0,0.2);">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="text-white font-black">📋 Últimos Pedidos</h3>
            </div>
            <table class="w-full text-left">
              <thead><tr class="text-gray-500 uppercase text-xs border-b border-white/5">
                <th class="p-4 font-bold">Sucursal</th>
                <th class="p-4 font-bold">Monto</th><th class="p-4 font-bold">Fecha/Hora</th>
              </tr></thead>
              <tbody class="divide-y divide-white/5">
                <tr v-for="p in reporte.ultimosPedidos" :key="p.id" class="hover:bg-white/5 transition-colors">
                  <td class="p-4 text-white text-sm font-bold">{{ p.sucursal?.nombre }}</td>
                  <td class="p-4 font-black text-green-400">Bs. {{ p.montoTotal }}</td>
                  <td class="p-4 text-gray-400 text-xs">{{ new Date(p.createdAt).toLocaleString() }}</td>
                </tr>
                <tr v-if="!reporte.ultimosPedidos?.length"><td colspan="3" class="p-6 text-center text-gray-500">Sin pedidos</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- SUCURSALES -->
        <div v-else-if="currentTab === 'sucursales'" class="animate-fade-in">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-slate-800">Directorio de Sucursales</h2>
            <button @click="mostrarFormSucursal = !mostrarFormSucursal" class="bg-gori-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-700 shadow-lg transition-transform active:scale-95 flex items-center gap-2">
              + Registrar Sucursal
            </button>
          </div>
          <!-- Form crear/editar sucursal -->
          <div v-if="mostrarFormSucursal" class="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
            <h3 class="text-lg font-bold text-slate-800 mb-4">{{ sucursalEditando ? 'Editar Sucursal' : 'Nueva Sucursal' }}</h3>
            <form @submit.prevent="guardarSucursal" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end" novalidate>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Nombre</label>
                <input v-model="formSucursal.nombre" type="text" required placeholder="Ej. Gori 5" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Ubicación</label>
                <input v-model="formSucursal.ubicacion" type="text" placeholder="Ej. Zona Sur" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
              </div>
              <div class="flex gap-2">
                <button type="submit" class="flex-1 bg-gori-dark text-white font-bold py-3 rounded-xl hover:bg-slate-800">{{ sucursalEditando ? 'Actualizar' : 'Crear' }}</button>
                <button type="button" @click="cancelarSucursal" class="px-4 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">Cancelar</button>
              </div>
            </form>
          </div>
          <!-- Tabla sucursales -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table class="w-full text-left">
              <thead><tr class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                <th class="p-6 font-bold">Nombre</th><th class="p-6 font-bold">Ubicación</th>
                <th class="p-6 font-bold text-center">Usuarios</th><th class="p-6 font-bold text-center">Pedidos</th>
                <th class="p-6 font-bold text-right">Acciones</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="suc in sucursales" :key="suc.id" class="hover:bg-slate-50/50 transition-colors">
                  <td class="p-6 font-bold text-slate-800">{{ suc.nombre }}</td>
                  <td class="p-6 text-slate-500">{{ suc.ubicacion || '—' }}</td>
                  <td class="p-6 text-center text-slate-600">{{ suc._count?.usuarios || 0 }}</td>
                  <td class="p-6 text-center text-slate-600">{{ suc._count?.pedidos || 0 }}</td>
                  <td class="p-6 text-right space-x-3">
                    <button @click="editarSucursal(suc)" class="text-indigo-500 hover:text-indigo-700 font-bold text-sm">Editar</button>
                    <button @click="eliminarSucursal(suc.id)" class="text-rose-500 hover:text-rose-700 font-bold text-sm">Eliminar</button>
                  </td>
                </tr>
                <tr v-if="!sucursales.length"><td colspan="5" class="p-6 text-center text-slate-400">No hay sucursales registradas</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- GERENTES -->
        <div v-else-if="currentTab === 'gerentes'" class="animate-fade-in flex gap-8 items-start">
          <!-- Form -->
          <div class="w-1/3 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 sticky top-0">
            <h2 class="text-xl font-bold text-slate-800 mb-6">Nuevo Gerente</h2>
            <form @submit.prevent="crearGerente" class="space-y-5" novalidate>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Nombre Completo</label>
                <input v-model="formGerente.nombre" type="text" required placeholder="Ej. Carlos Pérez" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
                <input v-model="formGerente.correo" type="email" required placeholder="gerente@gorichicken.com" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Contraseña Inicial</label>
                <input v-model="formGerente.contrasena" type="password" required placeholder="••••••••" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Asignar a Sucursal</label>
                <select v-model="formGerente.sucursalId" required class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white cursor-pointer">
                  <option value="" disabled>Seleccione una sucursal...</option>
                  <option v-for="suc in sucursales" :key="suc.id" :value="suc.id">{{ suc.nombre }}</option>
                </select>
              </div>
              <button type="submit" class="w-full bg-gori-dark text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition-transform active:scale-95 mt-4">
                Crear y Asignar
              </button>
            </form>
          </div>
          <!-- Lista -->
          <div class="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-6 border-b border-slate-100"><h2 class="text-xl font-bold text-slate-800">Gerentes Activos</h2></div>
            <table class="w-full text-left">
              <thead><tr class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                <th class="p-6 font-bold">Gerente</th><th class="p-6 font-bold">Correo</th>
                <th class="p-6 font-bold">Sucursal</th><th class="p-6 font-bold text-right">Acciones</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="g in gerentes" :key="g.id" class="hover:bg-slate-50/50 transition-colors">
                  <td class="p-6 font-bold text-slate-800 flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{{ g.nombre?.charAt(0) }}</div>
                    {{ g.nombre }}
                  </td>
                  <td class="p-6 text-slate-500">{{ g.correo }}</td>
                  <td class="p-6">
                    <span class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-lg text-sm font-bold">{{ g.sucursal?.nombre || 'Sin asignar' }}</span>
                  </td>
                  <td class="p-6 text-right">
                    <button @click="eliminarGerente(g.id)" class="text-rose-500 hover:text-rose-700 font-bold text-sm">Eliminar</button>
                  </td>
                </tr>
                <tr v-if="!gerentes.length"><td colspan="4" class="p-6 text-center text-slate-400">No hay gerentes registrados</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Notificación -->
        <div v-if="notificacion.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50 transition-all', notificacion.tipo === 'ok' ? 'bg-green-500' : 'bg-rose-500']">
          {{ notificacion.msg }}
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../almacenes/auth';

const router = useRouter();
const authStore = useAuthStore();
const usuario = computed(() => authStore.usuario);
const API = '/api';

const currentTab = ref('dashboard');
const cargando = ref(false);
const sucursales = ref([]);
const gerentes = ref([]);
const reporte = ref({ resumen: {}, ventasPorSucursal: [], ventasPorHora: [], ultimosPedidos: [] });

const fechaActiva = ref('hoy');
const fechaPersonalizada = ref('');

const maxVentaSucursal = computed(() => Math.max(...(reporte.value.ventasPorSucursal?.map(s => s.ventasHoy) || [1]), 1));
const horasActivasAdmin = computed(() => (reporte.value.ventasPorHora || []).filter(h => h.hora >= 7 && h.hora <= 22));
const maxVentaHoraAdmin = computed(() => Math.max(...(horasActivasAdmin.value.map(h => h.total) || [1]), 1));
function barHeightAdmin(total) { return Math.max((total / maxVentaHoraAdmin.value) * 120, total > 0 ? 4 : 0); }

// Estadísticas de origen: Tótem vs Cajero (Admin global — usa resumen completo del día)
const origenStats = computed(() => {
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

async function setFecha(tipo) {
  fechaActiva.value = tipo;
  let fechaParam = '';
  if (tipo === 'ayer') { const a = new Date(); a.setDate(a.getDate()-1); fechaParam = a.toISOString().split('T')[0]; }
  else if (tipo === 'custom' && fechaPersonalizada.value) { fechaParam = fechaPersonalizada.value; }
  await cargarReporte(fechaParam);
}

function descargarPDF() {
  const titulo = `Reporte Gori Chicken - ${reporte.value.fecha || new Date().toLocaleDateString()}`;
  const ventanaPDF = window.open('', '_blank');
  const sucursalesHTML = (reporte.value.ventasPorSucursal || []).map(s =>
    `<tr><td>${s.nombre}</td><td>Bs. ${s.ventasHoy}</td><td>${s.pedidosHoy}</td><td>${s.totalEmpleados}</td></tr>`
  ).join('');
  const pedidosHTML = (reporte.value.ultimosPedidos || []).map(p =>
    `<tr><td>${p.sucursal?.nombre}</td><td>Bs. ${p.montoTotal}</td><td>${new Date(p.createdAt).toLocaleString()}</td></tr>`
  ).join('');
  ventanaPDF.document.write(`<!DOCTYPE html><html><head><title>${titulo}</title>
    <style>body{font-family:Arial,sans-serif;color:#1a1a1a;padding:30px;}h1{color:#FF4500;font-size:22px;border-bottom:3px solid #FF4500;padding-bottom:10px;}h2{color:#0d3347;font-size:16px;margin-top:20px;}table{width:100%;border-collapse:collapse;margin-top:10px;}th{background:#0d3347;color:white;padding:8px;font-size:12px;text-align:left;}td{padding:8px;border-bottom:1px solid #eee;font-size:12px;}.metric{display:inline-block;margin:8px;padding:12px 20px;background:#f0f0f0;border-radius:8px;min-width:140px;}.metric h3{margin:0;font-size:11px;color:#666;}.metric p{margin:5px 0 0;font-size:22px;font-weight:900;color:#FF4500;}@media print{body{padding:15px;}}</style>
    </head><body>
    <h1>🦍 GORI CHICKEN — Reporte del ${reporte.value.fecha || 'Hoy'}</h1>
    <div><span class="metric"><h3>INGRESOS</h3><p>Bs. ${reporte.value.resumen?.totalVentasHoy || 0}</p></span>
    <span class="metric"><h3>PEDIDOS</h3><p>${reporte.value.resumen?.totalPedidosHoy || 0}</p></span>
    <span class="metric"><h3>SUCURSALES</h3><p>${reporte.value.resumen?.totalSucursales || 0}</p></span></div>
    <h2>Ventas por Sucursal</h2>
    <table><tr><th>Sucursal</th><th>Ventas</th><th>Pedidos</th><th>Empleados</th></tr>${sucursalesHTML}</table>
    <h2>Últimos Pedidos</h2>
    <table><tr><th>Sucursal</th><th>Monto</th><th>Fecha</th></tr>${pedidosHTML}</table>
    <p style="margin-top:30px;color:#999;font-size:10px;">Generado: ${new Date().toLocaleString()} — Gori Chicken Sistema</p>
    </body></html>`);
  ventanaPDF.document.close();
  ventanaPDF.focus();
  setTimeout(() => ventanaPDF.print(), 500);
}

const mostrarFormSucursal = ref(false);
const sucursalEditando = ref(null);
const formSucursal = reactive({ nombre: '', ubicacion: '' });
const formGerente = reactive({ nombre: '', correo: '', contrasena: '', sucursalId: '' });
const notificacion = reactive({ show: false, msg: '', tipo: 'ok' });

const tabs = [
  { id: 'dashboard', label: 'Panel de Control', icon: '📊' },
  { id: 'sucursales', label: 'Sucursales', icon: '🏪' },
  { id: 'gerentes', label: 'Asignar Gerentes', icon: '👥' },
];

const tituloActual = computed(() => ({
  dashboard: 'Panel de Control Global',
  sucursales: 'Gestión de Sucursales',
  gerentes: 'Asignación de Personal Directivo',
}[currentTab.value]));

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` };
}

function notify(msg, tipo = 'ok') {
  notificacion.show = true;
  notificacion.msg = msg;
  notificacion.tipo = tipo;
  setTimeout(() => { notificacion.show = false; }, 3000);
}

// ── SUCURSALES ──
async function cargarSucursales() {
  try {
    const res = await fetch(`${API}/admin/sucursales`, { headers: headers() });
    if (res.ok) sucursales.value = await res.json();
  } catch (e) { console.error(e); }
}

async function guardarSucursal() {
  try {
    const url = sucursalEditando.value
      ? `${API}/admin/sucursales/${sucursalEditando.value}`
      : `${API}/admin/sucursales`;
    const method = sucursalEditando.value ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify({ nombre: formSucursal.nombre, ubicacion: formSucursal.ubicacion }) });
    if (res.ok) {
      notify(sucursalEditando.value ? 'Sucursal actualizada' : 'Sucursal creada');
      cancelarSucursal();
      await cargarSucursales();
    } else {
      const err = await res.json();
      notify(err.error || 'Error', 'err');
    }
  } catch (e) { notify('Error de conexión', 'err'); }
}

function editarSucursal(suc) {
  sucursalEditando.value = suc.id;
  formSucursal.nombre = suc.nombre;
  formSucursal.ubicacion = suc.ubicacion || '';
  mostrarFormSucursal.value = true;
}

function cancelarSucursal() {
  sucursalEditando.value = null;
  formSucursal.nombre = '';
  formSucursal.ubicacion = '';
  mostrarFormSucursal.value = false;
}

async function eliminarSucursal(id) {
  if (!confirm('¿Eliminar esta sucursal? Se eliminarán todos los datos asociados.')) return;
  try {
    const res = await fetch(`${API}/admin/sucursales/${id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) { notify('Sucursal eliminada'); await cargarSucursales(); }
    else { const err = await res.json(); notify(err.error || 'Error al eliminar', 'err'); }
  } catch (e) { notify('Error de conexión', 'err'); }
}

// ── GERENTES ──
async function cargarGerentes() {
  try {
    const res = await fetch(`${API}/admin/gerentes`, { headers: headers() });
    if (res.ok) gerentes.value = await res.json();
  } catch (e) { console.error(e); }
}

async function crearGerente() {
  if (!formGerente.nombre || !formGerente.correo || !formGerente.contrasena || !formGerente.sucursalId) {
    notify('Por favor, completa todos los campos requeridos.', 'err');
    return;
  }

  // Validaciones de formato
  const nombreTrim = formGerente.nombre.trim();
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

  const correoLower = formGerente.correo.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLower)) {
    notify('El formato del correo no es válido.', 'err');
    return;
  }
  if (!correoLower.endsWith('@gmail.com') && !correoLower.endsWith('@gorichicken.com')) {
    notify('El correo debe terminar en @gmail.com o @gorichicken.com.', 'err');
    return;
  }

  try {
    const res = await fetch(`${API}/admin/gerentes`, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ nombre: nombreTrim, correo: correoLower, contrasena: formGerente.contrasena, sucursalId: formGerente.sucursalId })
    });
    if (res.ok) {
      notify('Gerente creado y asignado');
      formGerente.nombre = ''; formGerente.correo = ''; formGerente.contrasena = ''; formGerente.sucursalId = '';
      await cargarGerentes();
    } else {
      const err = await res.json();
      notify(err.error || 'Error al crear gerente', 'err');
    }
  } catch (e) { notify('Error de conexión', 'err'); }
}

async function eliminarGerente(id) {
  if (!confirm('¿Eliminar este gerente?')) return;
  try {
    const res = await fetch(`${API}/admin/gerentes/${id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) { notify('Gerente eliminado'); await cargarGerentes(); }
    else { const err = await res.json(); notify(err.error || 'Error', 'err'); }
  } catch (e) { notify('Error de conexión', 'err'); }
}

async function cargarReporte(fecha = '') {
  try {
    const url = fecha ? `${API}/admin/reportes/global?fecha=${fecha}` : `${API}/admin/reportes/global`;
    const res = await fetch(url, { headers: headers() });
    if (res.ok) reporte.value = await res.json();
  } catch (e) { console.error(e); }
}

// ── INIT ──
onMounted(async () => {
  cargando.value = true;
  await Promise.all([cargarSucursales(), cargarGerentes(), cargarReporte()]);
  cargando.value = false;
});

const logout = () => { authStore.cerrarSesion(); router.push('/login'); };
</script>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.4); border-radius: 4px; }
@media print {
  .no-print { display: none !important; }
  aside { display: none !important; }
}
</style>
