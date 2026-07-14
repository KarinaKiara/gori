<template>
  <div class="min-h-screen flex flex-col md:flex-row" style="background: linear-gradient(160deg, #071d2c 0%, #0d3347 55%, #091e2e 100%);">
    <!-- Menú Lateral Izquierdo (Simulado para POS) -->
    <aside class="w-full md:w-24 flex flex-row md:flex-col items-center py-4 z-10" style="background: rgba(5,15,25,0.8); border-right: 1px solid rgba(255,69,0,0.2); backdrop-filter: blur(10px);">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm mb-0 md:mb-8 flex-shrink-0" style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 15px rgba(255,69,0,0.4);">
        🦍
      </div>
      <nav class="flex md:flex-col flex-1 justify-center gap-4 w-full px-4 md:px-0">
        <button class="p-3 rounded-xl text-orange-400 transition-all" style="background: rgba(255,69,0,0.15);">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
        </button>
        <button class="p-3 rounded-xl text-gray-500 hover:text-gray-300 transition-all">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
        </button>
      </nav>
      <div class="mt-auto px-4 md:px-0">
        <button @click="logout" class="p-3 rounded-xl text-gray-500 hover:text-orange-400 hover:bg-orange-400/10 transition-all" title="Cerrar Sesión">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>
    </aside>

    <!-- Área de Menú Central -->
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-black text-white" style="font-family: 'Impact','Arial Black',sans-serif; letter-spacing: 0.03em;">Caja / Toma de Pedidos</h1>
          <p class="text-orange-400 text-sm font-medium mt-0.5">Hola, {{ usuario?.nombre || 'Cajero' }} 👋</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Pedidos que llegan del tótem esperando cobro -->
          <button @click="mostrarPorCobrar = true"
                  class="relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-white shadow-md transition active:scale-95"
                  style="background: linear-gradient(135deg,#FF4500,#FF6B35);">
            🧾 Pedidos del tótem
            <span v-if="porCobrar.length"
                  class="ml-1 min-w-[1.6rem] h-6 px-1.5 rounded-full bg-white text-gori-primary text-sm font-black flex items-center justify-center animate-pulse">
              {{ porCobrar.length }}
            </span>
          </button>
          <div class="relative hidden lg:block">
            <input type="text" placeholder="Buscar producto..." class="pl-10 pr-4 py-2 border border-slate-200 rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-gori-primary/50 bg-white shadow-sm">
            <svg class="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
      </header>

      <!-- Filtro de Categorías -->
      <div class="flex gap-2 overflow-x-auto pb-4 mb-4">
        <button v-for="cat in categorias" :key="cat.id"
                @click="categoriaActiva = cat.id"
                :class="['px-6 py-2 rounded-full whitespace-nowrap font-bold transition-all', 
                         categoriaActiva === cat.id ? 'bg-gori-primary text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50']">
          {{ cat.nombre }}
        </button>
      </div>

      <!-- Grilla de Categorías y Productos -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="producto in productosFiltrados" :key="producto.id" @click="agregar(producto)"
             class="bg-white p-3 rounded-2xl shadow-soft border border-slate-100 hover:border-rose-200 cursor-pointer transition-all active:scale-95 group flex flex-col justify-between min-h-[11rem] overflow-hidden">
          <div class="flex gap-3">
            <div v-if="producto.imagen" class="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
              <img :src="producto.imagen" :alt="producto.nombre" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div v-else class="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-xl select-none">
              🍗
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-bold text-slate-800 text-sm leading-tight group-hover:text-gori-primary transition-colors line-clamp-2">{{ producto.nombre }}</h3>
              <p v-if="producto.descripcion" class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-snug">{{ producto.descripcion }}</p>
            </div>
          </div>
          <div class="mt-auto pt-3 flex justify-between items-end">
            <span class="text-gori-primary font-extrabold text-base">Bs. {{ producto.precio.toFixed(2) }}</span>
            <div class="w-7 h-7 rounded-full bg-slate-50 group-hover:bg-gori-primary group-hover:text-white flex items-center justify-center transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Panel de Comanda Derecha -->
    <aside class="w-full md:w-96 bg-white border-l border-slate-200 shadow-xl z-10 flex flex-col h-screen md:sticky md:top-0">
      <div class="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold text-gori-dark">Comanda Actual</h2>
          <p class="text-sm text-slate-500" v-if="carrito.totalItems > 0">{{ carrito.totalItems }} artículos</p>
          <p class="text-sm text-slate-500" v-else>Orden nueva</p>
        </div>
        <button v-if="carrito.totalItems > 0" @click="carrito.vaciarCarrito()" class="text-sm text-red-500 hover:text-red-700 font-medium">Vaciar</button>
      </div>
      
      <div class="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
        <div v-if="carrito.items.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400">
          <svg class="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          <p>No hay productos en la comanda</p>
        </div>
        
        <!-- Ítem de pedido -->
        <div v-for="item in carrito.items" :key="item.id" class="flex justify-between items-center border-b border-slate-50 pb-4">
          <div class="flex-1 pr-2">
            <h4 class="font-bold text-slate-800 text-sm leading-tight">{{ item.nombre }}</h4>
            <p class="text-xs text-slate-500 mt-1">Bs. {{ item.precio.toFixed(2) }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="quitar(item.id)" class="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-red-500">-</button>
            <span class="font-bold w-4 text-center">{{ item.cantidad }}</span>
            <button @click="agregar(item)" class="w-8 h-8 rounded-full bg-rose-50 text-gori-primary font-bold flex items-center justify-center hover:bg-rose-100">+</button>
          </div>
        </div>
      </div>

      <div class="p-6 bg-slate-50 border-t border-slate-100">
        <div class="flex justify-between mb-6 font-bold text-xl text-gori-dark">
          <span>Total</span>
          <span>Bs. {{ carrito.total.toFixed(2) }}</span>
        </div>
        <button @click="abrirModalPago" :disabled="carrito.totalItems === 0" 
                :class="['w-full py-4 rounded-xl font-bold text-lg transition-all', 
                         carrito.totalItems > 0 ? 'bg-gori-primary text-white shadow-premium hover:bg-rose-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed']">
          Cobrar Pedido
        </button>
      </div>
    </aside>
  </div>

  <!-- Modal Personalización POS -->
  <div v-if="modalProducto" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="cerrarModalPers">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
      <!-- Header -->
      <div class="bg-gori-dark text-white px-6 py-5 flex justify-between items-start">
        <div>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Personalizar pedido</p>
          <h3 class="text-xl font-bold">{{ modalProducto.nombre }}</h3>
          <p class="text-gori-yellow font-extrabold text-lg mt-0.5">Bs. {{ modalProducto.precio.toFixed(2) }}</p>
        </div>
        <button @click="cerrarModalPers" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
        <!-- Presas (Combo Excluyente) -->
        <div v-if="modalProducto.grupoPresas">
          <p class="font-bold text-slate-800 flex items-center gap-2 mb-2">
            🍗 Elige presas
          </p>
          <div class="flex flex-col gap-2">
            <button v-for="combo in COMBOS_PRESAS[modalProducto.grupoPresas]" :key="combo"
              @click="presaSeleccionada = combo"
              :class="['py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all text-left flex justify-between items-center',
                presaSeleccionada === combo
                  ? 'border-gori-primary bg-rose-50 text-gori-primary shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50']">
              <span>{{ combo }}</span>
              <span v-if="presaSeleccionada === combo" class="text-gori-primary font-bold text-lg">✓</span>
            </button>
          </div>
        </div>

        <!-- Guarniciones -->
        <div v-if="modalProducto.cantidadGuarniciones > 0">
          <p class="font-bold text-slate-800 flex items-center gap-2 mb-1">
            ⭐ Elige guarniciones
            <span class="text-xs font-normal text-slate-500">({{ guarnicionesSeleccionadas.length }}/2)</span>
          </p>
          <p class="text-amber-600 text-xs mb-2">⚠️ Puede elegir 2 guarniciones (NO mixtas)</p>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="g in GUARNICIONES" :key="g.id"
              @click="toggleGuarnicionPOS(g)"
              :class="['py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all text-left',
                guarnicionesSeleccionadas.find(x => x.id === g.id)
                  ? 'border-gori-primary bg-rose-50 text-gori-primary shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50']">
              <span>{{ g.emoji }} {{ g.nombre }}</span>
              <span v-if="g.nota" class="block text-xs text-slate-400 font-normal">{{ g.nota }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 bg-slate-50 border-t border-slate-100">
        <button @click="confirmarAgregarPOS"
          :disabled="!seleccionCompletaPOS"
          :class="['w-full py-3 rounded-xl font-bold text-lg transition-all',
            seleccionCompletaPOS
              ? 'bg-gori-primary text-white hover:bg-rose-700 active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed']">
          Agregar al Pedido
        </button>
      </div>
    </div>
  </div>

  <!-- Modal de Pago -->
  <div v-if="modalPago" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">

      <!-- Header -->
      <div class="bg-gori-dark text-white p-6 flex justify-between items-center">
        <div>
          <p class="text-slate-400 text-sm">{{ pedidoCobrando ? 'Cobrar Turno ' + (pedidoCobrando.numeroPedido ?? '') + ' (tótem)' : 'Total a cobrar' }}</p>
          <h2 class="text-3xl font-extrabold text-gori-yellow">Bs. {{ montoModal.toFixed(2) }}</h2>
        </div>
        <button @click="cerrarModal" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="p-6">
        <!-- Selección de método (solo si no hay método elegido aún) -->
        <div v-if="!metodoPago">
          <h3 class="text-lg font-bold text-slate-800 mb-4 text-center">Seleccione método de pago</h3>
          <div class="grid grid-cols-2 gap-4">
            <button @click="metodoPago='efectivo'" class="flex flex-col items-center gap-3 p-6 border-2 border-slate-200 rounded-2xl hover:border-gori-primary hover:bg-rose-50 transition-all group">
              <svg class="w-12 h-12 text-slate-400 group-hover:text-gori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              <span class="font-bold text-slate-700 group-hover:text-gori-primary">Efectivo</span>
            </button>
            <button @click="elegirQR" class="flex flex-col items-center gap-3 p-6 border-2 border-slate-200 rounded-2xl hover:border-gori-primary hover:bg-rose-50 transition-all group">
              <svg class="w-12 h-12 text-slate-400 group-hover:text-gori-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
              <span class="font-bold text-slate-700 group-hover:text-gori-primary">QR Simple</span>
            </button>
          </div>
        </div>

        <!-- Método: Efectivo -->
        <div v-else-if="metodoPago==='efectivo'">
          <button @click="metodoPago=null" class="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-4">← Cambiar método</button>
          <div class="bg-slate-50 rounded-2xl p-4 mb-4">
            <label class="block text-sm font-bold text-slate-700 mb-2">Monto Recibido</label>
            <input v-model.number="montoRecibido" type="number" min="0" step="0.5" placeholder="Bs. 0.00"
              class="w-full text-center text-2xl font-bold p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-gori-primary/30 outline-none bg-white">
            <div v-if="montoRecibido >= montoModal" class="mt-3 text-center">
              <p class="text-sm text-slate-500">Cambio a devolver</p>
              <p class="text-2xl font-extrabold text-green-600">Bs. {{ (montoRecibido - montoModal).toFixed(2) }}</p>
            </div>
          </div>
          <button @click="cobrarEfectivo" :disabled="montoRecibido < montoModal"
            :class="['w-full py-4 rounded-xl font-bold text-lg transition-all', montoRecibido >= montoModal ? 'bg-gori-primary text-white hover:bg-rose-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed']">
            Confirmar Cobro en Efectivo
          </button>
        </div>

        <!-- Método: QR -->
        <div v-else-if="metodoPago==='qr'" class="text-center">
          <button @click="metodoPago=null" class="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1 mb-3">← Cambiar método</button>

          <!-- Badge QR estático -->
          <div class="flex items-center justify-center gap-2 mb-3 px-3 py-1.5 rounded-full mx-auto" style="background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.35); width: fit-content;">
            <div class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
            <span class="text-orange-500 text-xs font-bold">QR Estático — cliente ingresa el monto</span>
          </div>

          <p class="text-slate-500 text-xs mb-3">Muestra este código al cliente</p>

          <!-- QR con borde naranja y badge Bs -->
          <div class="relative inline-block mb-3">
            <div class="bg-white border-2 rounded-2xl p-3 shadow-md inline-block" style="border-color: #FF4500;">
              <img src="/images/qr_pago.png" alt="QR de Pago Gori Chicken" class="w-[180px] h-[180px] object-contain" />
            </div>
            <div class="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black" style="background: linear-gradient(135deg,#FF4500,#FF6B35);">Bs</div>
          </div>

          <!-- Monto a pagar -->
          <div class="rounded-xl p-2 mb-3" style="background: rgba(15,23,42,0.06);">
            <p class="text-slate-400 text-xs">Monto que debe ingresar el cliente</p>
            <p class="text-slate-800 font-black text-xl">Bs. {{ montoModal.toFixed(2) }}</p>
            <p class="text-slate-400 text-xs">Gori Chicken</p>
          </div>

          <div class="flex items-center justify-center gap-2 mb-4">
            <div :class="['w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm border-2', contador > 15 ? 'border-gori-primary text-gori-primary bg-rose-50' : 'border-red-500 text-red-500 bg-red-50']">{{ contador }}</div>
            <div class="flex-1 bg-slate-100 rounded-full h-1.5">
              <div :class="['h-1.5 rounded-full transition-all duration-1000', contador > 15 ? 'bg-gori-primary' : 'bg-red-500']" :style="{ width: (contador/120*100)+'%' }"></div>
            </div>
            <span class="text-slate-400 text-xs">seg</span>
          </div>

          <button @click="cobrarQR" class="w-full text-white py-4 rounded-xl font-bold active:scale-95 transition" style="background: linear-gradient(135deg,#16a34a,#15803d);">
            ✓ Confirmar Pago QR
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Éxito -->
  <div v-if="pagoExitoso" class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
      <div class="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 class="text-2xl font-extrabold text-slate-800 mb-1">¡Cobro Exitoso!</h2>
      <p class="text-slate-500 mb-1">Bs. {{ montoModal.toFixed(2) }} — {{ metodoPago === 'efectivo' ? 'Efectivo' : 'QR' }}</p>
      <p class="text-slate-400 text-sm mb-6">Pedido enviado a cocina 🍗</p>
      <button @click="finalizarCobro" class="w-full bg-gori-dark text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition">{{ pedidoCobrando ? 'Listo' : 'Nueva Venta' }}</button>
    </div>
  </div>

  <!-- Modal: Pedidos del tótem por cobrar -->
  <div v-if="mostrarPorCobrar" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="mostrarPorCobrar = false">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
      <div class="bg-gori-dark text-white px-6 py-5 flex justify-between items-center flex-shrink-0">
        <div>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Llegan del tótem</p>
          <h3 class="text-xl font-bold">🧾 Pedidos por cobrar ({{ porCobrar.length }})</h3>
        </div>
        <button @click="mostrarPorCobrar = false" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="p-5 overflow-y-auto space-y-3">
        <div v-if="!porCobrar.length" class="text-center text-slate-400 py-12">
          <div class="text-5xl mb-3">🧾</div>
          <p class="font-medium">No hay pedidos del tótem esperando cobro.</p>
          <p class="text-sm text-slate-400 mt-1">Cuando un cliente confirme en el tótem, aparecerá aquí.</p>
        </div>

        <div v-for="p in porCobrar" :key="p.id" class="border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div class="flex justify-between items-center mb-3">
            <span class="text-lg font-black text-white px-3 py-1 rounded-lg" style="background: linear-gradient(135deg,#FF4500,#FF6B35);">Turno {{ p.numeroPedido ?? '—' }}</span>
            <span class="font-extrabold text-xl text-gori-dark">Bs. {{ p.montoTotal.toFixed(2) }}</span>
          </div>
          <div class="space-y-1 mb-4">
            <div v-for="item in p.items.filter(it => it.detalle !== 'presa')" :key="item.id" class="text-sm">
              <span v-if="item.detalle === 'guarnición'" class="text-slate-400 pl-4">+ {{ item.producto?.nombre || 'Guarnición' }}</span>
              <span v-else class="font-semibold text-slate-700">
                {{ item.cantidad }}x {{ item.producto?.nombre || 'Producto' }}
                <span v-if="item.detalle" class="text-gori-primary font-normal"> — {{ item.detalle }}</span>
              </span>
            </div>
          </div>
          <button @click="abrirCobroTotem(p)" class="w-full py-3 rounded-xl font-bold text-white bg-gori-primary hover:bg-rose-700 active:scale-95 transition">
            Cobrar Bs. {{ p.montoTotal.toFixed(2) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import { useAuthStore } from '../../almacenes/auth';
import { useCarritoStore } from '../../almacenes/carrito';

const router = useRouter();
const authStore = useAuthStore();
const carrito = useCarritoStore();
const usuario = computed(() => authStore.usuario);

// Modal state
const modalPago = ref(false);
const metodoPago = ref(null);
const montoRecibido = ref(0);
const pagoExitoso = ref(false);
const contador = ref(60);
let intervalo = null;

// ── Pedidos del tótem por cobrar ──
const porCobrar = ref([]);            // lista de pedidos del tótem esperando pago
const mostrarPorCobrar = ref(false);  // modal con la lista
const pedidoCobrando = ref(null);     // pedido del tótem que se está cobrando (null = venta normal de caja)
let socket = null;

// Monto que muestra el modal de pago: el del pedido del tótem si se está cobrando uno, si no el del carrito
const montoModal = computed(() => pedidoCobrando.value ? pedidoCobrando.value.montoTotal : carrito.total);

async function cargarPorCobrar() {
  const token = authStore.token || localStorage.getItem('token');
  if (!token) return;
  try {
    const res = await fetch('/api/pedidos/por-cobrar', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) porCobrar.value = await res.json();
  } catch (e) { console.error('No se pudo cargar pedidos por cobrar:', e); }
}

onMounted(() => {
  cargarPorCobrar();
  cargarMenuManual();
  socket = io();
  socket.on('connect', () => {
    const sucursalId = usuario.value?.sucursalId;
    if (sucursalId) socket.emit('unirse-sucursal', sucursalId);
  });
  // Llega un pedido nuevo del tótem → aparece en la lista al instante
  socket.on('pedido-por-cobrar', (pedido) => {
    if (!porCobrar.value.find(p => p.id === pedido.id)) porCobrar.value.push(pedido);
  });
  // Un pedido ya se cobró (aquí u otra caja) → sale de la lista
  socket.on('pedido-cobrado', (pedido) => {
    porCobrar.value = porCobrar.value.filter(p => p.id !== pedido.id);
  });
});

const logout = () => { authStore.cerrarSesion(); router.push('/login'); };

const categorias = [
  { id: 'Brasa Gori', nombre: 'Brasa Gori' },
  { id: 'Broaster Gori', nombre: 'Broaster Gori' },
  { id: 'Mixta Gori', nombre: 'Opción Mixta' },
  { id: 'Extras Gori', nombre: 'Extras Gori' },
  { id: 'Refrescos', nombre: 'Refrescos' }
];
const categoriaActiva = ref('Brasa Gori');

const COMBOS_PRESAS = {
  Cuarto: ['Pecho y Ala', 'Pierna y Entrepierna'],
  Trica: ['Pecho, Ala y Pierna', 'Pierna, Entrepierna y Ala'],
  Extra: ['Pecho', 'Ala', 'Pierna', 'Entrepierna']
}
const GUARNICIONES = [
  { id: 'arroz',    emoji: '🍚', nombre: 'Arroz Chaufa' },
  { id: 'papas',    emoji: '🍟', nombre: 'Papas Rústicas' },
  { id: 'fideo',    emoji: '🍜', nombre: 'Fideo Salteado' },
  { id: 'ensalada', emoji: '🥗', nombre: 'Ensalada', nota: '12:00 - 21:00' },
]
const productos = [
  // Brasa Gori
  { id: 6,  categoriaId: 'Brasa Gori', nombre: 'Octavo',                  precio: 24,  descripcion: 'Presitas surtidas (no a elección)', grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/octavo_brasa.webp' },
  { id: 7,  categoriaId: 'Brasa Gori', nombre: 'Cuarto',                  precio: 36,  descripcion: 'Pecho/ala o pierna/entrepierna + 2 guarniciones', grupoPresas: 'Cuarto', cantidadGuarniciones: 2, imagen: '/images/cuarto_brasa.webp' },
  { id: 8,  categoriaId: 'Brasa Gori', nombre: 'Trica',                   precio: 46,  descripcion: 'Pecho/ala/pierna o pierna/entrepierna/ala + 2 guarniciones', grupoPresas: 'Trica', cantidadGuarniciones: 2, imagen: '/images/trica_brasa.webp' },
  { id: 9,  categoriaId: 'Brasa Gori', nombre: 'Medio Pollo s/guarnición',precio: 58,  descripcion: 'Sin guarnición',                     grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/medio_brasa_conGuarniciones.webp' },
  { id: 10, categoriaId: 'Brasa Gori', nombre: 'Medio Pollo c/guarnición',precio: 70,  descripcion: 'Elige 2 guarniciones',               grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/medio_brasa_conGuarniciones.webp' },
  { id: 11, categoriaId: 'Brasa Gori', nombre: 'Pollo Entero s/guarnición',precio: 105, descripcion: 'Sin guarnición',                    grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/entero_brasa_sinGuarniciones.webp' },
  { id: 12, categoriaId: 'Brasa Gori', nombre: 'Pollo Entero c/guarnición',precio: 135, descripcion: 'Elige 2 guarniciones',              grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/entero_brasa_conGuarniciones.webp' },
  // Broaster Gori
  { id: 13, categoriaId: 'Broaster Gori', nombre: 'Octavo',                   precio: 24,  descripcion: 'Presitas surtidas (no a elección)', grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/octavo_broaster.webp' },
  { id: 14, categoriaId: 'Broaster Gori', nombre: 'Cuarto',                   precio: 36,  descripcion: 'Pecho/ala o pierna/entrepierna + 2 guarniciones', grupoPresas: 'Cuarto', cantidadGuarniciones: 2, imagen: '/images/cuarto_broaster.webp' },
  { id: 15, categoriaId: 'Broaster Gori', nombre: 'Trica',                    precio: 46,  descripcion: 'Pecho/ala/pierna o pierna/entrepierna/ala + 2 guarniciones', grupoPresas: 'Trica', cantidadGuarniciones: 2, imagen: '/images/trica_broaster.webp' },
  { id: 16, categoriaId: 'Broaster Gori', nombre: 'Medio Pollo s/guarnición', precio: 58,  descripcion: 'Sin guarnición',                     grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/medio_broaster_conGuarniciones.webp' },
  { id: 17, categoriaId: 'Broaster Gori', nombre: 'Medio Pollo c/guarnición', precio: 70,  descripcion: 'Elige 2 guarniciones',               grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/medio_broaster_conGuarniciones.webp' },
  { id: 18, categoriaId: 'Broaster Gori', nombre: 'Pollo Entero s/guarnición',precio: 105, descripcion: 'Sin guarnición',                     grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/entero_broaster_sinGuarniciones.webp' },
  { id: 19, categoriaId: 'Broaster Gori', nombre: 'Pollo Entero c/guarnición',precio: 135, descripcion: 'Elige 2 guarniciones',               grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/entero_broaster_conGuarniciones.webp' },
  // Opción Mixta
  { id: 30, categoriaId: 'Mixta Gori', nombre: 'Cuarto Mixto',                   precio: 36,  descripcion: 'Presas brasa y broaster + 2 guarniciones', grupoPresas: 'Cuarto', cantidadGuarniciones: 2, imagen: '/images/cuarto_mixto.webp' },
  { id: 31, categoriaId: 'Mixta Gori', nombre: 'Trica Mixta',                    precio: 46,  descripcion: 'Presas brasa y broaster + 2 guarniciones', grupoPresas: 'Trica', cantidadGuarniciones: 2, imagen: '/images/trica_mixto.webp' },
  { id: 32, categoriaId: 'Mixta Gori', nombre: 'Medio Pollo Mixto s/guarnición', precio: 58,  descripcion: 'Sin guarnición',                     grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/trica_mixto.webp' },
  { id: 33, categoriaId: 'Mixta Gori', nombre: 'Medio Pollo Mixto c/guarnición', precio: 70,  descripcion: 'Elige 2 guarniciones',               grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/trica_mixto.webp' },
  { id: 34, categoriaId: 'Mixta Gori', nombre: 'Pollo Entero Mixto s/guarnición',precio: 105, descripcion: 'Sin guarnición',                     grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/entero_brasa_sinGuarniciones.webp' },
  { id: 35, categoriaId: 'Mixta Gori', nombre: 'Pollo Entero Mixto c/guarnición',precio: 135, descripcion: 'Elige 2 guarniciones',               grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/entero_brasa_conGuarniciones.webp' },
  // Extras Gori
  { id: 1,  categoriaId: 'Extras Gori', nombre: 'Arroz Chaufa extra',              precio: 15, descripcion: 'Guarnición extra',        grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_arroz.webp' },
  { id: 2,  categoriaId: 'Extras Gori', nombre: 'Papas Rústicas extra',            precio: 15, descripcion: 'Guarnición extra',        grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_papasRusticas.webp' },
  { id: 3,  categoriaId: 'Extras Gori', nombre: 'Fideo Salteado extra',            precio: 15, descripcion: 'Guarnición extra',        grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_fideo.webp' },
  { id: 4,  categoriaId: 'Extras Gori', nombre: 'Ensalada extra',                  precio: 12, descripcion: 'Disponible 12:00-21:00', grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_ensalada.webp' },
  { id: 5,  categoriaId: 'Extras Gori', nombre: 'Presa Extra',                    precio: 14, descripcion: 'La presa que usted guste (brasa o broaster)', grupoPresas: 'Extra', cantidadGuarniciones: 0, imagen: '/images/presa_extra.webp' },
  { id: 36, categoriaId: 'Extras Gori', nombre: 'Alfajor de Chocolate Gorila',    precio: 0,  descripcion: 'Consultar precio en caja', grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/alfajor.webp' },
  // Refrescos
  { id: 20, categoriaId: 'Refrescos', nombre: 'Horchata de Litro', precio: 15, descripcion: '1 litro', grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/orchata.webp' },
  { id: 21, categoriaId: 'Refrescos', nombre: 'Coca Cola 500ml',   precio: 8,  descripcion: '',         grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/ColaCola_500ml.webp' },
  { id: 22, categoriaId: 'Refrescos', nombre: 'Fanta 500ml',       precio: 8,  descripcion: '',         grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/fanta_500ml.webp' },
  { id: 23, categoriaId: 'Refrescos', nombre: 'Del Valle 1 Litro', precio: 12, descripcion: '',         grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/delValle_1litro.webp' },
];
// Platos agregados desde el panel de Admin (de la base, por sucursal de la caja)
const productosManual = ref([]);
async function cargarMenuManual() {
  try {
    const token = authStore.token || localStorage.getItem('token');
    const res = await fetch('/api/productos/menu', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) productosManual.value = await res.json();
  } catch (e) { /* sin conexión: solo el menú fijo */ }
}
const mapearManual = (p) => ({
  id: 'm_' + p.id, categoriaId: p.categoria, nombre: p.nombre, precio: p.precio,
  descripcion: p.descripcion || '', grupoPresas: null, cantidadGuarniciones: 0, imagen: p.imagen || ''
});
const productosFiltrados = computed(() =>
  [...productos, ...productosManual.value.map(mapearManual)].filter(p => p.categoriaId === categoriaActiva.value)
);
const agregar = (producto) => {
  if (producto.grupoPresas || producto.cantidadGuarniciones > 0) {
    modalProducto.value = producto
    presaSeleccionada.value = null
    guarnicionesSeleccionadas.value = []
  } else {
    carrito.agregarProducto(producto)
  }
};
const quitar = (id) => carrito.quitarProducto(id);

// ── Modal Personalización ──
const modalProducto = ref(null);
const presaSeleccionada = ref(null);
const guarnicionesSeleccionadas = ref([]);

const seleccionCompletaPOS = computed(() => {
  if (!modalProducto.value) return false
  const presasOk = !modalProducto.value.grupoPresas || presaSeleccionada.value !== null
  const guarOk   = modalProducto.value.cantidadGuarniciones === 0 || guarnicionesSeleccionadas.value.length === 2
  return presasOk && guarOk
})

function toggleGuarnicionPOS(g) {
  const idx = guarnicionesSeleccionadas.value.findIndex(x => x.id === g.id)
  if (idx >= 0) { guarnicionesSeleccionadas.value.splice(idx, 1) }
  else if (guarnicionesSeleccionadas.value.length < 2) { guarnicionesSeleccionadas.value.push(g) }
}
function cerrarModalPers() {
  modalProducto.value = null; presaSeleccionada.value = null; guarnicionesSeleccionadas.value = []
}
function confirmarAgregarPOS() {
  if (!seleccionCompletaPOS.value) return
  
  // 1. Construir el nombre detallado para cocina y carrito
  let nombreDetallado = modalProducto.value.nombre
  if (presaSeleccionada.value) {
    nombreDetallado += ` (${presaSeleccionada.value})`
  }
  if (guarnicionesSeleccionadas.value.length > 0) {
    const guars = guarnicionesSeleccionadas.value.map(g => g.nombre).join(' y ')
    nombreDetallado += ` [G: ${guars}]`
  }

  const item = {
    ...modalProducto.value,
    nombre: nombreDetallado,
    presa: presaSeleccionada.value,
    guarniciones: guarnicionesSeleccionadas.value.map(g => g.nombre),
    id: `${modalProducto.value.id}_${Date.now()}`
  }
  carrito.agregarProducto(item)
  cerrarModalPers()
}

// ── Modal ──
function abrirModalPago() { pedidoCobrando.value = null; modalPago.value = true; metodoPago.value = null; montoRecibido.value = 0; }
// Abrir el cobro de un pedido que vino del tótem
function abrirCobroTotem(pedido) {
  pedidoCobrando.value = pedido;
  mostrarPorCobrar.value = false;
  modalPago.value = true;
  metodoPago.value = null;
  montoRecibido.value = 0;
}
function cerrarModal() { modalPago.value = false; metodoPago.value = null; pedidoCobrando.value = null; limpiarIntervalo(); }
function limpiarIntervalo() { if (intervalo) { clearInterval(intervalo); intervalo = null; } }

async function elegirQR() {
  metodoPago.value = 'qr';
  contador.value = 60;
  limpiarIntervalo();
  intervalo = setInterval(() => { contador.value--; if (contador.value <= 0) limpiarIntervalo(); }, 1000);
}

async function enviarPedido() {
  const token = authStore.token || localStorage.getItem('token');
  if (!token) return false;
  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      montoTotal: carrito.total,
      origen: 'POS',
      items: carrito.items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }))
    })
  });
  return res.ok;
}

// Marca como pagado un pedido que vino del tótem (pasa a cocina y descuenta inventario)
async function cobrarPedidoTotem() {
  const token = authStore.token || localStorage.getItem('token');
  const res = await fetch(`/api/pedidos/${pedidoCobrando.value.id}/cobrar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    // Quitar de la lista local (el socket también lo hará, pero así es inmediato)
    porCobrar.value = porCobrar.value.filter(p => p.id !== pedidoCobrando.value.id);
    return true;
  }
  return false;
}

// Confirma el cobro: si hay un pedido del tótem lo cobra; si no, crea la venta de caja
async function confirmarCobro() {
  const ok = pedidoCobrando.value ? await cobrarPedidoTotem() : await enviarPedido();
  if (ok) { modalPago.value = false; pagoExitoso.value = true; }
  else alert('Error al registrar el cobro');
}

async function cobrarEfectivo() {
  await confirmarCobro();
}

async function cobrarQR() {
  limpiarIntervalo();
  await confirmarCobro();
}

function finalizarCobro() {
  pagoExitoso.value = false;
  metodoPago.value = null;
  // Si era una venta de caja, vaciamos el carrito; si era un pedido del tótem, no hay carrito que tocar
  if (!pedidoCobrando.value) carrito.vaciarCarrito();
  pedidoCobrando.value = null;
}

onUnmounted(() => { limpiarIntervalo(); if (socket) socket.disconnect(); });
</script>
