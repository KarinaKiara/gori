<template>
  <div class="min-h-screen flex font-sans" style="background: linear-gradient(160deg, #0b0b0d 0%, #17120c 55%, #0a0a0b 100%);">
    <!-- Banners fijos del admin (apilados abajo): solicitudes de las sucursales (verde)
         y alerta de stock bajo (rojo). Se ocultan SOLO en la pestaña "Pedidos de Compra",
         porque ahí las dos cosas ya aparecen como tarjetas dentro del panel. En cualquier
         otra pestaña siguen visibles hasta que el admin las atienda. -->
    <div v-show="currentTab !== 'compras'" class="fixed left-1/2 -translate-x-1/2 bottom-4 z-[60] flex flex-col items-center gap-3" style="width:min(92vw,880px);">
      <SolicitudesAdmin />
      <AlertaStockBajo modo="admin" api-base="/api/admin" inline />
    </div>

    <!-- Sidebar -->
    <aside class="w-72 text-white flex flex-col shadow-2xl z-20" style="background: linear-gradient(180deg, #080705 0%, #12100b 40%, #17120c 100%); border-right: 1px solid rgba(228,192,122,0.15);">
      <div class="p-8 flex items-center gap-4 border-b border-white/10">
        <!-- El logo se queda naranja: es el sello de marca, igual que en el tótem y la caja -->
        <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shadow-lg" style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 15px rgba(255,69,0,0.4);">🦍</div>
        <div>
          <span class="font-black text-xl tracking-wider block" style="font-family: 'Impact','Arial Black',sans-serif;">GORI CHICKEN</span>
          <span class="text-xs font-bold tracking-widest uppercase" style="color: #E4C07A;">Admin Global</span>
        </div>
      </div>
      <nav class="flex-1 px-4 py-8 space-y-2">
        <button v-for="tab in tabs" :key="tab.id" @click="currentTab = tab.id"
          :class="['w-full flex items-center gap-4 px-5 py-4 rounded-xl font-medium transition-all', currentTab === tab.id ? 'text-[#17120c] shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5']"
          :style="currentTab === tab.id ? 'background: linear-gradient(135deg, #E4C07A, #caa24f); box-shadow: 0 4px 15px rgba(228,192,122,0.35);' : ''">
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
      <header class="px-10 py-5 flex justify-between items-center z-10 border-b" style="background: rgba(8,7,5,0.72); backdrop-filter: blur(12px); border-color: rgba(228,192,122,0.15);">
        <div>
          <h1 class="text-2xl font-black text-white tracking-tight">{{ tituloActual }}</h1>
          <p class="text-[#E4C07A] text-xs font-bold mt-0.5 tracking-widest uppercase">Visión Global de la Franquicia</p>
        </div>
        <div class="flex items-center gap-6">
          <div class="text-right">
            <span class="block text-white font-bold">{{ usuario?.nombre }}</span>
            <span class="block text-xs text-[#E4C07A] uppercase tracking-widest">{{ usuario?.rol }}</span>
          </div>
          <div class="w-11 h-11 rounded-full flex items-center justify-center font-black text-lg" style="background: linear-gradient(135deg, #E4C07A, #caa24f); color:#17120c;">
            {{ usuario?.nombre?.charAt(0) || 'A' }}
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-10" style="background: rgba(8,7,5,0.35);">
        <!-- Loading -->
        <div v-if="cargando" class="flex items-center justify-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E4C07A]"></div>
        </div>

        <!-- DASHBOARD CON GRÁFICOS -->
        <div v-else-if="currentTab === 'dashboard'" class="animate-fade-in space-y-6" id="reporte-pdf">

          <!-- Barra de filtro de fecha + PDF -->
          <div class="flex flex-wrap items-center gap-3 p-4 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
            <span class="text-white font-bold text-sm">📅 Ver reporte del:</span>
            <button @click="setFecha('hoy')" :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all', fechaActiva==='hoy' ? 'text-[#17120c] font-black' : 'text-gray-400 border border-white/10']" :style="fechaActiva==='hoy' ? 'background:linear-gradient(135deg,#E4C07A,#caa24f)' : ''">Hoy</button>
            <button @click="setFecha('ayer')" :class="['px-4 py-2 rounded-xl text-xs font-bold transition-all', fechaActiva==='ayer' ? 'text-[#17120c] font-black' : 'text-gray-400 border border-white/10']" :style="fechaActiva==='ayer' ? 'background:linear-gradient(135deg,#E4C07A,#caa24f)' : ''">Ayer</button>
            <input type="date" v-model="fechaPersonalizada" @change="setFecha('custom')"
                   class="px-3 py-2 rounded-xl text-xs font-bold text-white outline-none border"
                   style="background: rgba(255,255,255,0.05); border-color: rgba(228,192,122,0.3);" />
            <span class="text-[#E4C07A] text-xs">{{ reporte.fecha ? 'Datos del: ' + reporte.fecha : '' }}</span>
            <button @click="descargarPDF"
                    class="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-black transition active:scale-95 no-print"
                    style="background: linear-gradient(135deg, #16a34a, #15803d); box-shadow: 0 0 15px rgba(22,163,74,0.3);">
              📄 Descargar PDF
            </button>
          </div>

          <!-- Métricas principales (KPIs premium: borde iluminado + degradado por métrica) -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="kpi-card relative p-6 rounded-3xl overflow-hidden" style="background: linear-gradient(150deg, rgba(16,185,129,0.14), rgba(255,255,255,0.03)); border:1px solid rgba(16,185,129,0.35); box-shadow: 0 0 30px -6px rgba(16,185,129,0.35);">
              <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full" style="background: radial-gradient(circle, rgba(16,185,129,0.25), transparent 70%);"></div>
              <p class="text-emerald-300/80 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">💰 Ingresos del Día</p>
              <p class="text-4xl font-black text-white relative z-10">Bs. {{ reporte.resumen?.totalVentasHoy?.toLocaleString() || 0 }}</p>
            </div>
            <div class="kpi-card relative p-6 rounded-3xl overflow-hidden" style="background: linear-gradient(150deg, rgba(228,192,122,0.14), rgba(255,255,255,0.03)); border:1px solid rgba(228,192,122,0.35); box-shadow: 0 0 30px -6px rgba(228,192,122,0.35);">
              <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full" style="background: radial-gradient(circle, rgba(228,192,122,0.25), transparent 70%);"></div>
              <p class="text-[#E4C07A] text-xs font-bold uppercase tracking-wider mb-2 relative z-10">📋 Pedidos Totales</p>
              <p class="text-4xl font-black text-white relative z-10">{{ reporte.resumen?.totalPedidosHoy || 0 }}</p>
            </div>
            <div class="kpi-card relative p-6 rounded-3xl overflow-hidden" style="background: linear-gradient(150deg, rgba(96,165,250,0.14), rgba(255,255,255,0.03)); border:1px solid rgba(96,165,250,0.35); box-shadow: 0 0 30px -6px rgba(96,165,250,0.35);">
              <div class="absolute -top-8 -right-8 w-24 h-24 rounded-full" style="background: radial-gradient(circle, rgba(96,165,250,0.25), transparent 70%);"></div>
              <p class="text-blue-300/80 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">🏪 Sucursales</p>
              <p class="text-4xl font-black text-white relative z-10">{{ reporte.resumen?.totalSucursales || 0 }}</p>
            </div>
          </div>

          <!-- Gráficos fila 1 -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Gráfico barras horizontales: ventas por sucursal -->
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
              <h3 class="text-white font-black mb-5">📊 Ventas por Sucursal</h3>
              <div v-if="reporte.ventasPorSucursal?.length" class="space-y-4">
                <div v-for="s in reporte.ventasPorSucursal" :key="s.id">
                  <div class="flex justify-between mb-1.5">
                    <span class="text-white text-xs font-bold truncate max-w-[60%]">{{ s.nombre }}</span>
                    <span class="text-[#E4C07A] text-xs font-black">Bs. {{ s.ventasHoy }}</span>
                  </div>
                  <div class="h-3 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.07);">
                    <div class="h-full rounded-full transition-all duration-700"
                         :style="{ width: maxVentaSucursal > 0 ? (s.ventasHoy / maxVentaSucursal * 100) + '%' : '0%', background: 'linear-gradient(90deg,#E4C07A,#caa24f)' }"></div>
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
            <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
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
          <div class="p-6 rounded-2xl border" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
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
                    <span class="text-[#E4C07A] text-3xl font-black">{{ origenStats.totem }}</span>
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
          <div class="rounded-2xl border overflow-hidden" style="background: rgba(255,255,255,0.04); border-color: rgba(228,192,122,0.2);">
            <div class="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 class="text-white font-black">📋 Últimos Pedidos</h3>
            </div>
            <table class="w-full text-left">
              <thead><tr class="text-gray-500 uppercase text-xs border-b border-white/5">
                <th class="p-4 font-bold">Sucursal</th>
                <th class="p-4 font-bold">Monto</th><th class="p-4 font-bold">Fecha/Hora</th>
              </tr></thead>
              <tbody class="divide-y divide-white/5">
                <tr v-for="p in reporte.ultimosPedidos" :key="p.id" @click="pedidoSel = p.id" class="hover:bg-white/5 transition-colors cursor-pointer">
                  <td class="p-4 text-white text-sm font-bold">{{ p.sucursal?.nombre }}</td>
                  <td class="p-4 font-black text-green-400">Bs. {{ p.montoTotal }}</td>
                  <td class="p-4 text-gray-400 text-xs">{{ new Date(p.createdAt).toLocaleString() }}</td>
                  <td class="p-4 text-[#E4C07A] text-xs font-bold whitespace-nowrap">Ver detalle →</td>
                </tr>
                <tr v-if="!reporte.ultimosPedidos?.length"><td colspan="4" class="p-6 text-center text-gray-500">Sin pedidos</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- VENTAS Y PAGOS (global, por periodo) -->
        <div v-else-if="currentTab === 'ventaspagos'" class="animate-fade-in">
          <ReporteVentasPagos api-base="/api/admin" />
        </div>

        <!-- STOCK POR RECETA (elige sucursal) -->
        <div v-else-if="currentTab === 'stockreceta'" class="animate-fade-in">
          <ReporteInventario api-base="/api/admin" />
        </div>

        <!-- SUCURSALES -->
        <div v-else-if="currentTab === 'sucursales'" class="animate-fade-in">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-slate-800">Directorio de Sucursales</h2>
            <button @click="abrirNuevaSucursal" class="bg-gori-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-rose-700 shadow-lg transition-transform active:scale-95 flex items-center gap-2">
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
              <div v-if="!sucursalEditando" class="md:col-span-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/60">
                <label class="block text-sm font-bold text-slate-700 mb-2">Copiar el catálogo de</label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <select v-model="formSucursal.copiarDeId" required
                          class="w-full p-3 border border-amber-200 rounded-xl bg-white outline-none cursor-pointer">
                    <option value="" disabled>Elige una sucursal…</option>
                    <option v-for="suc in sucursales" :key="suc.id" :value="suc.id">{{ suc.nombre }}</option>
                  </select>
                  <input v-model="formSucursal.contrasenaTotem" type="text" minlength="6"
                         placeholder="Contraseña del tótem (mín. 6)"
                         class="w-full p-3 border border-amber-200 rounded-xl bg-white outline-none">
                </div>
                <p class="text-xs text-slate-500 mt-2">
                  Se copian los insumos, los platos y sus recetas, y se crea la <b>cuenta del tótem</b>
                  con esa contraseña, para que la sucursal pueda recibir pedidos del cliente.
                  El <b>stock arranca en cero</b>: el gerente lo carga con una reposición.
                  <br>Después asigná el <b>gerente</b> desde la pestaña «Asignar Gerentes»; él dará de alta
                  a su cajero y su cocinero.
                </p>
              </div>
              <div class="md:col-span-3">
                <label class="block text-sm font-bold text-slate-700 mb-2">Horario de atención</label>
                <p class="text-xs text-slate-400 mb-3">Fuera de este horario la sucursal no acepta pedidos, ni desde el tótem ni desde el celular del cliente.</p>
                <EditorHorario v-model="formSucursal.horario" @validez="horarioValido = $event" />
              </div>
              <div class="flex gap-2 md:col-span-3">
                <button type="submit" :disabled="!horarioValido"
                        class="flex-1 bg-gori-dark text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">{{ sucursalEditando ? 'Actualizar' : 'Crear' }}</button>
                <button type="button" @click="cancelarSucursal" class="px-4 py-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50">Cancelar</button>
              </div>
            </form>
          </div>
          <!-- Usuarios recién creados: el admin los necesita para entregarlos al personal -->
          <div v-if="usuariosCreados.length" class="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 mb-8">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="font-bold text-emerald-900 mb-1">Cuenta del tótem de la sucursal nueva</h3>
                <p class="text-sm text-emerald-700 mb-4">Con estas credenciales se configura el kiosco. La contraseña es la que escribiste al crearla.</p>
                <ul class="space-y-1">
                  <li v-for="u in usuariosCreados" :key="u.correo" class="text-sm">
                    <span class="inline-block w-24 font-bold text-emerald-900">{{ u.rol }}</span>
                    <span class="font-mono text-emerald-800">{{ u.correo }}</span>
                  </li>
                </ul>
              </div>
              <button @click="usuariosCreados = []" class="text-emerald-700 hover:text-emerald-900 font-bold text-sm">Entendido</button>
            </div>
          </div>

          <!-- Tabla sucursales -->
          <div class="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <table class="w-full text-left">
              <thead><tr class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                <th class="p-6 font-bold">Nombre</th><th class="p-6 font-bold">Ubicación</th>
                <th class="p-6 font-bold">Horario de hoy</th>
                <th class="p-6 font-bold text-center">Usuarios</th><th class="p-6 font-bold text-center">Pedidos</th>
                <th class="p-6 font-bold text-right">Acciones</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="suc in sucursales" :key="suc.id" class="hover:bg-slate-50/50 transition-colors">
                  <td class="p-6 font-bold text-slate-800">{{ suc.nombre }}</td>
                  <td class="p-6 text-slate-500">{{ suc.ubicacion || '—' }}</td>
                  <td class="p-6 text-sm" :class="resumenHorario(suc) === 'Hoy cerrado' ? 'text-rose-500 font-bold' : 'text-slate-500'">
                    {{ resumenHorario(suc) || 'Sin configurar' }}
                  </td>
                  <td class="p-6 text-center text-slate-600">{{ suc._count?.usuarios || 0 }}</td>
                  <td class="p-6 text-center text-slate-600">{{ suc._count?.pedidos || 0 }}</td>
                  <td class="p-6 text-right space-x-3">
                    <button @click="editarSucursal(suc)" class="text-indigo-500 hover:text-indigo-700 font-bold text-sm">Editar</button>
                    <button @click="eliminarSucursal(suc.id)" class="text-rose-500 hover:text-rose-700 font-bold text-sm">Eliminar</button>
                  </td>
                </tr>
                <tr v-if="!sucursales.length"><td colspan="6" class="p-6 text-center text-slate-400">No hay sucursales registradas</td></tr>
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

        <!-- PLATOS DEL MENÚ -->
        <div v-else-if="currentTab === 'platos'" class="animate-fade-in flex flex-col lg:flex-row gap-8 items-start">
          <!-- Formulario -->
          <div class="w-full lg:w-2/5 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:sticky lg:top-0">
            <h2 class="text-xl font-bold text-slate-800 mb-6">{{ platoEditando ? '✏️ Editar Plato' : '➕ Nuevo Plato' }}</h2>
            <form @submit.prevent="guardarPlato" class="space-y-4" novalidate>
              <!-- Llevar un plato que ya existe a otra sucursal, sin volver a escribirlo -->
              <div v-if="!platoEditando && platosUnicos.length" class="p-4 rounded-2xl border border-amber-200 bg-amber-50/60">
                <label class="block text-sm font-bold text-slate-700 mb-2">¿Ya existe en otra sucursal?</label>
                <select v-model="platoOrigenId" @change="copiarDesdeExistente"
                        class="w-full p-3 border border-amber-200 rounded-xl bg-white outline-none cursor-pointer">
                  <option value="">Crear un plato nuevo desde cero</option>
                  <option v-for="p in platosUnicos" :key="p.id" :value="p.id">
                    {{ p.nombre }} — Bs {{ p.precio }} ({{ p.enSucursales }})
                  </option>
                </select>
                <p v-if="platoOrigenId" class="text-xs text-slate-500 mt-2">
                  Se copian nombre, precio, descripción, foto y <b>su receta</b>. Marca abajo las sucursales que faltan;
                  las que ya lo tienen se omiten solas.
                </p>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Nombre del plato</label>
                <input v-model="formPlato.nombre" type="text" required placeholder="Ej. Gaseosa 2 Litros" class="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-slate-50 focus:bg-white">
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block text-sm font-bold text-slate-700 mb-2">Tipo</label>
                  <select v-model="formPlato.categoria" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none cursor-pointer">
                    <option v-for="c in categoriasDisponibles" :key="c" :value="c">{{ c }}</option>
                  </select>
                </div>
                <div class="w-32">
                  <label class="block text-sm font-bold text-slate-700 mb-2">Precio (Bs)</label>
                  <input v-model.number="formPlato.precio" type="number" min="0" step="0.5" required placeholder="0.00" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none">
                </div>
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Descripción (opcional)</label>
                <input v-model="formPlato.descripcion" type="text" placeholder="Ej. Botella de 2 litros" class="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none">
              </div>
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Foto del plato</label>
                <div class="flex items-center gap-3">
                  <div class="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img v-if="formPlato.imagen" :src="formPlato.imagen" class="w-full h-full object-cover" />
                    <span v-else class="text-2xl">🍗</span>
                  </div>
                  <input type="file" accept="image/*" @change="seleccionarImagen" class="text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-bold hover:file:bg-amber-100 cursor-pointer">
                </div>
              </div>
              <div v-if="!platoEditando">
                <div class="flex items-center justify-between mb-2">
                  <label class="block text-sm font-bold text-slate-700">¿En qué sucursales aparece?</label>
                  <button type="button" @click="toggleTodasSucursales" class="text-xs font-bold text-gori-primary hover:underline">
                    {{ formPlato.sucursalIds.length === sucursales.length ? 'Quitar todas' : 'Todas' }}
                  </button>
                </div>
                <div class="space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2">
                  <label v-for="suc in sucursales" :key="suc.id"
                         class="flex items-center gap-2 p-2 rounded-lg"
                         :class="yaLoTiene(suc.id) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'">
                    <input type="checkbox" :value="suc.id" v-model="formPlato.sucursalIds"
                           :disabled="yaLoTiene(suc.id)" class="w-4 h-4 accent-[#E4C07A]">
                    <span class="text-sm text-slate-700">{{ suc.nombre }}</span>
                    <span v-if="yaLoTiene(suc.id)" class="text-[11px] font-bold text-emerald-600 ml-auto">ya lo tiene</span>
                  </label>
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <button type="submit" :disabled="guardandoPlato" class="flex-1 bg-gori-dark text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-800 transition active:scale-95 disabled:opacity-60">
                  {{ guardandoPlato ? 'Guardando...' : (platoEditando ? 'Guardar cambios' : 'Crear plato') }}
                </button>
                <button v-if="platoEditando" type="button" @click="cancelarEdicionPlato" class="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancelar</button>
              </div>
            </form>
          </div>
          <!-- Lista -->
          <div class="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden w-full">
            <div class="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 class="text-xl font-bold text-slate-800">Platos agregados</h2>
              <span class="text-sm text-slate-400">{{ platos.length }} en total</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left">
                <thead><tr class="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-xs tracking-wider">
                  <th class="p-4 font-bold">Plato</th><th class="p-4 font-bold">Tipo</th>
                  <th class="p-4 font-bold">Sucursal</th><th class="p-4 font-bold">Precio</th><th class="p-4 font-bold text-right">Acciones</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-50">
                  <tr v-for="p in platos" :key="p.id" class="hover:bg-slate-50/50 transition-colors">
                    <td class="p-4 font-bold text-slate-800">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          <img v-if="p.imagen" :src="p.imagen" class="w-full h-full object-cover" /><span v-else>🍗</span>
                        </div>
                        <span :class="{ 'line-through text-slate-400': !p.estaDisponible }">{{ p.nombre }}</span>
                      </div>
                    </td>
                    <td class="p-4 text-slate-500 text-sm">{{ p.categoria }}</td>
                    <td class="p-4"><span class="bg-orange-50 text-gori-primary border border-orange-100 px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap">{{ p.sucursal?.nombre }}</span></td>
                    <td class="p-4 font-bold text-slate-700 whitespace-nowrap">Bs. {{ p.precio.toFixed(2) }}</td>
                    <td class="p-4 text-right whitespace-nowrap">
                      <button @click="toggleDisponible(p)"
                              :class="p.estaDisponible ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'"
                              class="text-xs font-bold px-2.5 py-1.5 rounded-lg border mr-3 transition-colors active:scale-95">
                        {{ p.estaDisponible ? '🟢 Se vende' : '🔴 Apagado' }}
                      </button>
                      <button @click="abrirReceta(p)" class="text-amber-600 hover:text-amber-800 font-bold text-sm mr-3">🧾 Receta</button>
                      <button @click="editarPlato(p)" class="text-indigo-500 hover:text-indigo-700 font-bold text-sm mr-3">Editar</button>
                      <button @click="eliminarPlato(p)" class="text-rose-500 hover:text-rose-700 font-bold text-sm">Eliminar</button>
                    </td>
                  </tr>
                  <tr v-if="!platos.length"><td colspan="5" class="p-8 text-center text-slate-400">Aún no agregaste platos. Crea uno con el formulario de la izquierda. 🍗</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PROVEEDORES -->
        <div v-else-if="currentTab === 'proveedores'">
          <PanelProveedores />
        </div>

        <!-- PEDIDOS DE COMPRA -->
        <div v-else-if="currentTab === 'compras'">
          <PanelPedidosCompra />
        </div>

        <!-- Notificación -->
        <div v-if="notificacion.show" :class="['fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold z-50 transition-all', notificacion.tipo === 'ok' ? 'bg-green-500' : 'bg-rose-500']">
          {{ notificacion.msg }}
        </div>
      </div>
    </main>

    <!-- Reporte A: detalle del pedido seleccionado -->
    <ModalDetallePedido v-if="pedidoSel" :pedido-id="pedidoSel" api-base="/api/admin" @close="pedidoSel = null" />

    <!-- Editor de receta del plato (admin) -->
    <EditorRecetaAdmin v-if="recetaPlato" :producto-id="recetaPlato.id" :nombre="recetaPlato.nombre"
                       api-base="/api/admin" @close="recetaPlato = null" @guardado="onRecetaGuardada" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../almacenes/auth';
import { confirmar } from '../../utilidades/dialogo';
import { exportarReporteGlobal } from '../../utilidades/reportesPdf';
import EditorHorario from '../../componentes/EditorHorario.vue';
import ModalDetallePedido from '../../componentes/ModalDetallePedido.vue';
import ReporteVentasPagos from '../../componentes/ReporteVentasPagos.vue';
import ReporteInventario from '../../componentes/ReporteInventario.vue';
import AlertaStockBajo from '../../componentes/AlertaStockBajo.vue';
import SolicitudesAdmin from '../../componentes/SolicitudesAdmin.vue';
import EditorRecetaAdmin from '../../componentes/EditorRecetaAdmin.vue';
import PanelProveedores from './PanelProveedores.vue';
import PanelPedidosCompra from './PanelPedidosCompra.vue';
import { resumenHorario } from '../../utilidades/horarios';

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
  // PDF profesional con jsPDF: encabezado corporativo, tablas estilizadas y pie con nº de página
  exportarReporteGlobal(reporte.value);
}

const mostrarFormSucursal = ref(false);
const sucursalEditando = ref(null);
// horario = null hace que el editor arranque con su valor por defecto (12:00 a 21:00 toda la semana)
const formSucursal = reactive({ nombre: '', ubicacion: '', horario: null, copiarDeId: '', contrasenaTotem: '' });
const horarioValido = ref(true);
const usuariosCreados = ref([]); // credenciales del tótem de la última sucursal creada
const formGerente = reactive({ nombre: '', correo: '', contrasena: '', sucursalId: '' });
const notificacion = reactive({ show: false, msg: '', tipo: 'ok' });

const tabs = [
  { id: 'dashboard', label: 'Panel de Control', icon: '📊' },
  { id: 'ventaspagos', label: 'Ventas y Pagos', icon: '📈' },
  { id: 'stockreceta', label: 'Stock por Receta', icon: '📋' },
  { id: 'sucursales', label: 'Sucursales', icon: '🏪' },
  { id: 'gerentes', label: 'Asignar Gerentes', icon: '👥' },
  { id: 'platos', label: 'Platos del Menú', icon: '🍗' },
  { id: 'proveedores', label: 'Proveedores', icon: '🚚' },
  { id: 'compras', label: 'Pedidos de Compra', icon: '🧾' },
];

const tituloActual = computed(() => ({
  dashboard: 'Panel de Control Global',
  ventaspagos: 'Ventas y Pagos (todas las sucursales)',
  stockreceta: 'Stock por Receta',
  sucursales: 'Gestión de Sucursales',
  gerentes: 'Asignación de Personal Directivo',
  platos: 'Gestión de Platos del Menú',
  proveedores: 'Gestión de Proveedores',
  compras: 'Pedidos de Compra a Proveedores',
}[currentTab.value]));

const pedidoSel = ref(null); // pedido abierto en el modal de detalle

function headers() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${authStore.token}` };
}

function notify(msg, tipo = 'ok') {
  notificacion.show = true;
  notificacion.msg = msg;
  notificacion.tipo = tipo;
  setTimeout(() => { notificacion.show = false; }, 3000);
}

// ── PLATOS DEL MENÚ ──
const categoriasDisponibles = ['Brasa Gori', 'Broaster Gori', 'Mixta Gori', 'Extras Gori', 'Refrescos'];

// Editor de receta del plato (modal). recetaPlato = { id, nombre } del plato abierto.
const recetaPlato = ref(null);
function abrirReceta(p) { recetaPlato.value = { id: p.id, nombre: p.nombre }; }
function onRecetaGuardada(r) {
  recetaPlato.value = null;
  if (r?.ok) notify(`Receta guardada y aplicada a ${r.aplicadas} sucursal${r.aplicadas === 1 ? '' : 'es'}`);
  else notify(r?.error || 'No se pudo guardar la receta', 'err');
}
const platos = ref([]);
const platoEditando = ref(null);
const guardandoPlato = ref(false);
const formPlato = reactive({ nombre: '', categoria: 'Extras Gori', precio: null, descripcion: '', imagen: '', sucursalIds: [] });

// ── Llevar un plato existente a otra sucursal ──
// Un mismo plato vive como una fila por sucursal, así que "Gaseosa 2 Litros" en tres
// locales son tres filas. Para el selector se agrupa por nombre y se muestra una sola
// vez, indicando en cuántas sucursales está.
const platoOrigenId = ref('');

const platosUnicos = computed(() => {
  const porNombre = new Map();
  for (const p of platos.value) {
    const grupo = porNombre.get(p.nombre);
    if (grupo) { grupo.sucursalIds.push(p.sucursalId); continue; }
    porNombre.set(p.nombre, { ...p, sucursalIds: [p.sucursalId] });
  }
  return [...porNombre.values()]
    .map(p => ({ ...p, enSucursales: `en ${p.sucursalIds.length} de ${sucursales.value.length}` }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
});

// Sucursales que ya tienen el plato elegido: se desmarcan para no duplicarlo
const sucursalesConElPlato = computed(() => {
  const origen = platosUnicos.value.find(p => p.id === platoOrigenId.value);
  return new Set(origen ? origen.sucursalIds : []);
});
const yaLoTiene = (sucursalId) => sucursalesConElPlato.value.has(sucursalId);

function copiarDesdeExistente() {
  const origen = platosUnicos.value.find(p => p.id === platoOrigenId.value);
  if (!origen) { resetFormPlato(); return; }
  formPlato.nombre = origen.nombre;
  formPlato.categoria = origen.categoria;
  formPlato.precio = origen.precio;
  formPlato.descripcion = origen.descripcion || '';
  formPlato.imagen = origen.imagen || '';
  // Deja marcadas solo las sucursales que todavía NO lo tienen
  formPlato.sucursalIds = sucursales.value.map(s => s.id).filter(id => !origen.sucursalIds.includes(id));
}

async function cargarPlatos() {
  try {
    const res = await fetch(`${API}/admin/productos`, { headers: headers() });
    if (res.ok) platos.value = await res.json();
  } catch (e) { console.error(e); }
}

function resetFormPlato() {
  platoEditando.value = null;
  platoOrigenId.value = '';
  formPlato.nombre = ''; formPlato.categoria = 'Extras Gori'; formPlato.precio = null;
  formPlato.descripcion = ''; formPlato.imagen = ''; formPlato.sucursalIds = [];
}

function toggleTodasSucursales() {
  formPlato.sucursalIds = formPlato.sucursalIds.length === sucursales.value.length
    ? [] : sucursales.value.map(s => s.id);
}

// Comprime la foto elegida (máx 500px, WebP liviano) y la guarda como dato para la base
function seleccionarImagen(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const max = 500;
      let w = img.width, h = img.height;
      if (w > max) { h = Math.round(h * max / w); w = max; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      formPlato.imagen = canvas.toDataURL('image/webp', 0.7);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function guardarPlato() {
  if (!formPlato.nombre || formPlato.precio == null) { notify('Completa nombre y precio', 'error'); return; }
  if (!platoEditando.value && formPlato.sucursalIds.length === 0) { notify('Elige al menos una sucursal', 'error'); return; }
  guardandoPlato.value = true;
  try {
    const url = platoEditando.value ? `${API}/admin/productos/${platoEditando.value}` : `${API}/admin/productos`;
    const method = platoEditando.value ? 'PUT' : 'POST';
    const base = { nombre: formPlato.nombre, categoria: formPlato.categoria, descripcion: formPlato.descripcion, precio: formPlato.precio, imagen: formPlato.imagen };
    // copiarDeId le dice al servidor de qué plato traer la receta
    const body = platoEditando.value
      ? base
      : { ...base, sucursalIds: formPlato.sucursalIds, copiarDeId: platoOrigenId.value || undefined };
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
    if (res.ok) {
      const r = await res.json().catch(() => ({}));
      let msg = platoEditando.value ? 'Plato actualizado ✅' : `Plato creado en ${r.creados} sucursal(es) ✅`;
      if (r.omitidas) msg += ` · ${r.omitidas} ya lo tenía(n)`;
      if (r.sinReceta) msg += ` · ${r.sinReceta} sin receta (faltan insumos)`;
      notify(msg);
      resetFormPlato();
      await cargarPlatos();
    } else {
      const err = await res.json().catch(() => ({}));
      notify(err.error || 'No se pudo guardar', 'error');
    }
  } catch (e) { notify('Error de conexión', 'error'); }
  finally { guardandoPlato.value = false; }
}

function editarPlato(p) {
  platoEditando.value = p.id;
  formPlato.nombre = p.nombre; formPlato.categoria = p.categoria; formPlato.precio = p.precio;
  formPlato.descripcion = p.descripcion || ''; formPlato.imagen = p.imagen || ''; formPlato.sucursalIds = [];
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicionPlato() { resetFormPlato(); }

async function eliminarPlato(p) {
  if (!(await confirmar(`¿Eliminar "${p.nombre}" de ${p.sucursal?.nombre || 'esta sucursal'}?`, { titulo: 'Eliminar plato', textoAceptar: 'Eliminar', peligro: true }))) return;
  try {
    const res = await fetch(`${API}/admin/productos/${p.id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) {
      const r = await res.json();
      notify(r.desactivado ? 'El plato ya tenía ventas: se marcó como no disponible' : 'Plato eliminado');
      await cargarPlatos();
    } else {
      const err = await res.json().catch(() => ({}));
      notify(err.error || 'No se pudo eliminar el plato', 'err');
    }
  } catch (e) { notify('Error de conexión', 'err'); }
}

// Prender/apagar un plato en su sucursal (disponibilidad). Avisa al tótem/caja por socket.
async function toggleDisponible(p) {
  const nuevo = !p.estaDisponible;
  try {
    const res = await fetch(`${API}/admin/productos/${p.id}/disponibilidad`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ estaDisponible: nuevo }),
    });
    if (res.ok) {
      p.estaDisponible = nuevo; // refleja al instante
      notify(nuevo ? `"${p.nombre}" se vende de nuevo` : `"${p.nombre}" apagado en ${p.sucursal?.nombre || 'la sucursal'}`);
    } else {
      const err = await res.json().catch(() => ({}));
      notify(err.error || 'No se pudo cambiar la disponibilidad', 'err');
    }
  } catch (e) { notify('Error de conexión', 'err'); }
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
    const base = { nombre: formSucursal.nombre, ubicacion: formSucursal.ubicacion, horario: formSucursal.horario };
    const body = sucursalEditando.value
      ? base
      : { ...base, copiarDeId: formSucursal.copiarDeId, contrasenaTotem: formSucursal.contrasenaTotem };
    const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
    if (res.ok) {
      const r = await res.json().catch(() => ({}));
      if (sucursalEditando.value) {
        notify('Sucursal actualizada');
      } else {
        const c = r.copiado || {};
        notify(`Sucursal creada: ${c.insumos} insumos, ${c.platos} platos y ${c.recetas} recetas copiados de ${r.copiadoDe}`);
        // Los correos del personal se muestran aparte: el admin los necesita para entregarlos
        usuariosCreados.value = c.usuarios || [];
      }
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
  formSucursal.horario = suc.horario || null;
  mostrarFormSucursal.value = true;
}

function cancelarSucursal() {
  sucursalEditando.value = null;
  formSucursal.nombre = '';
  formSucursal.ubicacion = '';
  formSucursal.horario = null;
  formSucursal.copiarDeId = '';
  formSucursal.contrasenaTotem = '';
  mostrarFormSucursal.value = false;
}

// Abrir el formulario SIEMPRE en modo "nueva": limpia cualquier edición previa,
// para no terminar renombrando una sucursal existente sin querer.
function abrirNuevaSucursal() {
  if (mostrarFormSucursal.value && !sucursalEditando.value) {
    mostrarFormSucursal.value = false; // segundo clic: cerrar
    return;
  }
  sucursalEditando.value = null;
  formSucursal.nombre = '';
  formSucursal.ubicacion = '';
  formSucursal.horario = null;
  formSucursal.copiarDeId = '';
  formSucursal.contrasenaTotem = '';
  mostrarFormSucursal.value = true;
}

async function eliminarSucursal(id) {
  if (!(await confirmar('¿Eliminar esta sucursal? Solo se puede si no tiene datos (pedidos, personal, productos).', { titulo: 'Eliminar sucursal', textoAceptar: 'Eliminar', peligro: true }))) return;
  try {
    const res = await fetch(`${API}/admin/sucursales/${id}`, { method: 'DELETE', headers: headers() });
    if (res.ok) {
      notify('Sucursal eliminada');
      // Recargar también gerentes y platos: podían apuntar a la sucursal borrada
      await Promise.all([cargarSucursales(), cargarGerentes(), cargarPlatos()]);
    } else {
      const err = await res.json().catch(() => ({}));
      notify(err.error || 'Error al eliminar', 'err');
    }
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
  if (!(await confirmar('¿Eliminar este gerente?', { titulo: 'Eliminar gerente', textoAceptar: 'Eliminar', peligro: true }))) return;
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
  await Promise.all([cargarSucursales(), cargarGerentes(), cargarReporte(), cargarPlatos()]);
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
