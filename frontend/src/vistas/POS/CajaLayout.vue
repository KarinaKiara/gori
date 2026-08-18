<template>
  <div class="min-h-screen flex flex-col md:flex-row" style="background: linear-gradient(160deg, #0b0b0d 0%, #17120c 55%, #0a0a0b 100%);">
    <!-- Barra lateral: marca, sucursal y salir (sin botones decorativos) -->
    <aside class="w-full md:w-24 flex flex-row md:flex-col items-center py-4 px-4 md:px-0 z-10" style="background: rgba(8,7,5,0.85); border-right: 1px solid rgba(228,192,122,0.22); backdrop-filter: blur(10px);">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0" style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 15px rgba(255,69,0,0.4);">
        <Icono nombre="pollo" />
      </div>
      <!-- Sucursal en la que está cobrando: dato util, siempre a la vista -->
      <div class="hidden md:block mt-5 text-center px-1">
        <p class="text-[9px] font-bold uppercase tracking-widest" style="color:rgba(228,192,122,0.5);">Local</p>
        <p class="text-[10px] font-bold leading-tight mt-0.5" style="color:#E4C07A;">{{ nombreSucursal || '—' }}</p>
      </div>
      <div class="md:mt-auto ml-auto md:ml-0">
        <button @click="logout" class="p-3 rounded-xl text-gray-500 hover:text-[#E4C07A] hover:bg-[#E4C07A]/10 transition-all" title="Cerrar Sesión">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
      </div>
    </aside>

    <!-- Área de Menú Central -->
    <main class="flex-1 p-6 overflow-y-auto">
      <header class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-black text-white" style="font-family: 'Impact','Arial Black',sans-serif; letter-spacing: 0.03em;">Caja / Toma de Pedidos</h1>
          <p class="text-sm font-medium mt-0.5" style="color:#E4C07A;">Hola, {{ usuario?.nombre || 'Cajero' }}</p>
        </div>
        <!-- Un solo acceso: los pedidos del tótem (adentro se busca por turno) -->
        <button @click="mostrarPorCobrar = true"
                class="relative flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-white shadow-lg transition active:scale-95"
                style="background: linear-gradient(135deg,#FF4500,#FF6B35); box-shadow: 0 6px 22px rgba(255,69,0,0.35);">
          <Icono nombre="factura" /> Pedidos del tótem
          <span v-if="porCobrar.length"
                class="min-w-[1.6rem] h-6 px-1.5 rounded-full bg-white text-sm font-black flex items-center justify-center animate-pulse"
                style="color:#FF4500;">
            {{ porCobrar.length }}
          </span>
        </button>
      </header>

      <!-- Filtro de Categorías -->
      <div class="flex gap-2 overflow-x-auto pb-4 mb-4">
        <button v-for="cat in categorias" :key="cat.id"
                @click="categoriaActiva = cat.id"
                :class="['px-6 py-2 rounded-full whitespace-nowrap font-bold transition-all',
                         categoriaActiva === cat.id ? 'cat-oro-activa shadow-md' : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10']">
          {{ cat.nombre }}
        </button>
      </div>

      <!-- Grilla de Categorías y Productos -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <!-- Un plato agotado no se puede agregar: el cajero lo ve marcado, igual que en el tótem -->
        <div v-for="producto in productosFiltrados" :key="producto.id"
             @click="estadoProducto(producto).ok && agregar(producto)"
             :class="['bg-white p-3 rounded-2xl shadow-soft border transition-all group flex flex-col justify-between min-h-[11rem] overflow-hidden relative',
                      estadoProducto(producto).ok
                        ? 'border-slate-100 hover:border-rose-200 cursor-pointer active:scale-95'
                        : 'border-slate-200 opacity-60 cursor-not-allowed']">
          <!-- Cinta de estado sobre la tarjeta -->
          <span v-if="!estadoProducto(producto).ok"
                class="absolute top-2 right-2 z-10 text-[10px] font-black px-2 py-0.5 rounded text-white"
                :style="estadoProducto(producto).motivo === 'horario' ? 'background:#b45309;' : 'background:#b91c1c;'">
            {{ etiquetaBloqueo(estadoProducto(producto).motivo) }}
          </span>
          <div class="flex gap-3">
            <div v-if="producto.imagen" class="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 border border-slate-100">
              <img :src="producto.imagen" :alt="producto.nombre" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            </div>
            <div v-else class="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 text-xl select-none">
              <Icono nombre="pollo" />
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
            <Icono nombre="pollo" /> Elige presas
          </p>
          <div class="flex flex-col gap-2">
            <button v-for="combo in COMBOS_PRESAS[modalProducto.grupoPresas]" :key="combo"
              @click="comboPresaDisponible(combo) && (presaSeleccionada = combo)"
              :disabled="!comboPresaDisponible(combo)"
              :class="['py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all text-left flex justify-between items-center',
                !comboPresaDisponible(combo)
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : presaSeleccionada === combo
                  ? 'border-gori-primary bg-rose-50 text-gori-primary shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50']">
              <span>{{ combo }}</span>
              <span v-if="!comboPresaDisponible(combo)"
                    class="text-[10px] font-black px-1.5 py-0.5 rounded text-white" style="background:#b91c1c;">AGOTADO</span>
              <span v-else-if="presaSeleccionada === combo" class="text-gori-primary font-bold text-lg"><Icono nombre="check" /></span>
            </button>
          </div>
        </div>

        <!-- Guarniciones -->
        <div v-if="modalProducto.cantidadGuarniciones > 0">
          <p class="font-bold text-slate-800 flex items-center gap-2 mb-1">
            Elige guarniciones
            <span class="text-xs font-normal text-slate-500">({{ guarnicionesSeleccionadas.length }}/2)</span>
          </p>
          <p class="text-amber-600 text-xs mb-2"><Icono nombre="alerta" /> Puede elegir 2 guarniciones (NO mixtas)</p>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="g in GUARNICIONES" :key="g.id"
              @click="toggleGuarnicionPOS(g)"
              :disabled="!estadoItem(g.nombre).ok"
              :class="['py-2.5 px-4 rounded-xl font-bold text-sm border-2 transition-all text-left',
                !estadoItem(g.nombre).ok
                  ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                  : guarnicionesSeleccionadas.find(x => x.id === g.id)
                  ? 'border-gori-primary bg-rose-50 text-gori-primary shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50']">
              <span>{{ g.nombre }}</span>
              <span v-if="!estadoItem(g.nombre).ok"
                    class="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded text-white"
                    :style="estadoItem(g.nombre).motivo === 'horario' ? 'background:#b45309;' : 'background:#b91c1c;'">
                {{ estadoItem(g.nombre).motivo === 'horario' ? 'SOLO 12-21' : 'AGOTADO' }}
              </span>
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
        <!-- Detalle del pedido del tótem: el cajero cobra EN BASE a este detalle (recomendación de la tutora) -->
        <div v-if="!metodoPago && pedidoCobrando && pedidoCobrando.items?.length"
             class="mb-5 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-100">
            <span class="text-sm font-black text-white px-2.5 py-1 rounded-lg" style="background: linear-gradient(135deg,#FF4500,#FF6B35);">Turno {{ pedidoCobrando.numeroPedido ?? '—' }}</span>
            <span v-if="pedidoCobrando.metodoPago"
                  class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                  :class="pedidoCobrando.metodoPago === 'qr' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'">
              {{ pedidoCobrando.metodoPago === 'qr' ? 'Pagó por QR' : 'Efectivo' }}
            </span>
            <span v-else class="text-xs font-bold text-slate-400 uppercase tracking-widest">Detalle</span>
          </div>
          <div class="px-4 py-3 space-y-1 max-h-44 overflow-y-auto">
            <div v-for="item in pedidoCobrando.items.filter(it => it.detalle !== 'presa')" :key="item.id" class="text-sm flex justify-between gap-3">
              <span v-if="item.detalle === 'guarnición'" class="text-slate-400 pl-4">+ {{ item.producto?.nombre || 'Guarnición' }}</span>
              <span v-else class="font-semibold text-slate-700">
                {{ item.cantidad }}x {{ item.producto?.nombre || 'Producto' }}
                <span v-if="item.detalle" class="text-gori-primary font-normal"> — {{ item.detalle }}</span>
              </span>
              <span v-if="item.detalle !== 'guarnición' && item.precio" class="font-bold text-slate-500 whitespace-nowrap">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
            </div>
          </div>
          <div class="flex justify-between items-center px-4 py-2.5 bg-white border-t border-slate-100">
            <span class="font-bold text-slate-700">Total a cobrar</span>
            <span class="font-black text-lg text-gori-dark">Bs. {{ montoModal.toFixed(2) }}</span>
          </div>
        </div>

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
              <!-- El contador arranca en 60, así que se divide entre 60: antes se dividía
                   entre 120 y la barra nacía por la mitad y nunca llegaba a llenarse. -->
              <div :class="['h-1.5 rounded-full transition-all duration-1000', contador > 15 ? 'bg-gori-primary' : 'bg-red-500']" :style="{ width: (contador/60*100)+'%' }"></div>
            </div>
            <span class="text-slate-400 text-xs">seg</span>
          </div>

          <button @click="cobrarQR" class="w-full text-white py-4 rounded-xl font-bold active:scale-95 transition" style="background: linear-gradient(135deg,#16a34a,#15803d);">
            <Icono nombre="check" /> Confirmar Pago QR
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
      <p class="text-slate-400 text-sm mb-6">Pedido enviado a cocina <Icono nombre="pollo" /></p>
      <button @click="finalizarCobro" class="w-full bg-gori-dark text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition">{{ pedidoCobrando ? 'Listo' : 'Nueva Venta' }}</button>
    </div>
  </div>

  <!-- Modal: Pedidos del tótem por cobrar (con búsqueda por turno integrada) -->
  <div v-if="mostrarPorCobrar" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="mostrarPorCobrar = false">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
      <div class="bg-gori-dark text-white px-6 py-5 flex justify-between items-center flex-shrink-0">
        <div>
          <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Llegan del tótem</p>
          <h3 class="text-xl font-bold"><Icono nombre="factura" /> Pedidos por cobrar ({{ porCobrar.length }})</h3>
        </div>
        <button @click="mostrarPorCobrar = false" class="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Buscar por turno: filtra al instante mientras el cajero escribe.
           Si hay lector laser, el codigo del QR llega aqui y con Enter carga el pedido. -->
      <div v-if="porCobrar.length > 1" class="px-5 pt-4 flex-shrink-0">
        <input v-model="codigoEscaneado" @keyup.enter="procesarCodigo" type="text" placeholder="Buscar por turno…"
               class="w-full text-center text-lg font-bold p-2.5 border-2 border-slate-200 rounded-xl focus:border-gori-primary outline-none" />
        <p v-if="errorEscaner" class="text-rose-500 text-xs font-bold mt-2 text-center">{{ errorEscaner }}</p>
      </div>

      <div class="p-5 overflow-y-auto space-y-3">
        <div v-if="!porCobrar.length" class="text-center text-slate-400 py-12">
          <div class="text-5xl mb-3"><Icono nombre="factura" /></div>
          <p class="font-medium">No hay pedidos del tótem esperando cobro.</p>
          <p class="text-sm text-slate-400 mt-1">Cuando un cliente confirme en el tótem, aparecerá aquí.</p>
        </div>
        <div v-else-if="!porCobrarFiltrados.length" class="text-center text-slate-400 py-10">
          <p class="font-medium">No hay ningún pedido con el turno «{{ codigoEscaneado }}».</p>
        </div>

        <div v-for="p in porCobrarFiltrados" :key="p.id" class="border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-slate-300 transition">
          <!-- Turno + como va a pagar: lo primero que el cajero necesita saber -->
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-lg font-black text-white px-3 py-1 rounded-lg" style="background: linear-gradient(135deg,#FF4500,#FF6B35);">Turno {{ p.numeroPedido ?? '—' }}</span>
              <span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                    :class="p.metodoPago === 'qr' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : p.metodoPago === 'efectivo' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'">
                {{ p.metodoPago === 'qr' ? 'Pagó por QR' : p.metodoPago === 'efectivo' ? 'Efectivo' : '— Sin método' }}
              </span>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="font-extrabold text-xl text-gori-dark block leading-none">Bs. {{ p.montoTotal.toFixed(2) }}</span>
              <span class="text-[11px] text-slate-400">{{ new Date(p.createdAt).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) }}</span>
            </div>
          </div>

          <!-- Aviso para el de QR: no se le cobra de nuevo, se verifica -->
          <p v-if="p.metodoPago === 'qr'" class="text-[11px] text-emerald-600 font-semibold mb-2">
            <Icono nombre="alerta" /> Ya pagó por QR: pídele el comprobante y verifica antes de confirmar.
          </p>

          <div class="space-y-1 mb-4 pt-2 border-t border-slate-100">
            <div v-for="item in p.items.filter(it => it.detalle !== 'presa')" :key="item.id" class="text-sm">
              <span v-if="item.detalle === 'guarnición'" class="text-slate-400 pl-4">+ {{ item.producto?.nombre || 'Guarnición' }}</span>
              <span v-else class="font-semibold text-slate-700">
                {{ item.cantidad }}x {{ item.producto?.nombre || 'Producto' }}
                <span v-if="item.detalle" class="text-gori-primary font-normal"> — {{ item.detalle }}</span>
              </span>
            </div>
          </div>
          <button @click="abrirCobroTotem(p)" class="w-full py-3 rounded-xl font-bold text-white bg-gori-primary hover:bg-rose-700 active:scale-95 transition">
            {{ p.metodoPago === 'qr' ? 'Verificar y enviar a cocina' : `Cobrar Bs. ${p.montoTotal.toFixed(2)}` }}
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
import { avisar } from '../../utilidades/dialogo';
import { useAuthStore } from '../../almacenes/auth';
import { useCarritoStore } from '../../almacenes/carrito';
import Icono from '../../componentes/Icono.vue';

const router = useRouter();
const authStore = useAuthStore();
const carrito = useCarritoStore();
const usuario = computed(() => authStore.usuario);
// usuario.sucursal es el NOMBRE de la sucursal (texto), no un objeto
const nombreSucursal = computed(() => authStore.usuario?.sucursal || '');

// Modal state
const modalPago = ref(false);
const metodoPago = ref(null);
const montoRecibido = ref(0);
const ultimoErrorCobro = ref(''); // motivo real del ultimo rechazo del servidor
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
  const token = authStore.token || sessionStorage.getItem('token');
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
  // El inventario cambió por una venta → se revisa si algún plato quedó agotado
  socket.on('inventario-actualizado', () => cargarDisponibilidad());
  // El gerente cambió el horario: se refresca la copia guardada en esta sesión
  socket.on('horario-actualizado', (horario) => {
    if (!authStore.usuario) return;
    authStore.usuario.horario = horario;
    sessionStorage.setItem('usuario', JSON.stringify(authStore.usuario));
  });

  // Qué está agotado: al abrir la caja y luego cada 30 s
  cargarDisponibilidad();
  dispTimer = setInterval(cargarDisponibilidad, 30000);
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
  { id: 1,  categoriaId: 'Extras Gori', nombre: 'Arroz Chaufa',                    precio: 15, descripcion: 'Guarnición extra',        grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_arroz.webp' },
  { id: 2,  categoriaId: 'Extras Gori', nombre: 'Papas Rústicas',                  precio: 15, descripcion: 'Guarnición extra',        grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_papasRusticas.webp' },
  { id: 3,  categoriaId: 'Extras Gori', nombre: 'Fideo Salteado',                  precio: 15, descripcion: 'Guarnición extra',        grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_fideo.webp' },
  { id: 4,  categoriaId: 'Extras Gori', nombre: 'Ensalada',                        precio: 12, descripcion: 'Disponible 12:00-21:00', grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_ensalada.webp' },
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
    const token = authStore.token || sessionStorage.getItem('token');
    const res = await fetch('/api/productos/menu', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) productosManual.value = await res.json();
  } catch (e) { /* sin conexión: solo el menú fijo */ }
}
const mapearManual = (p) => ({
  id: 'm_' + p.id, categoriaId: p.categoria, nombre: p.nombre, precio: p.precio,
  descripcion: p.descripcion || '', grupoPresas: null, cantidadGuarniciones: 0, imagen: p.imagen || ''
});
// Oculta los platos que el gerente apagó en esta sucursal (activo === false),
// igual que el tótem: la caja no ofrece lo que la sucursal no vende.
function platoActivo(p) {
  const d = disponibilidad.value[nombreCanonicoCaja(p)];
  return !d || d.activo !== false;
}
const productosFiltrados = computed(() =>
  [...productos, ...productosManual.value.map(mapearManual)]
    .filter(p => p.categoriaId === categoriaActiva.value && platoActivo(p))
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
    nombreBase: modalProducto.value.nombre, // nombre sin personalizar (para casar con la receta)
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
  // El cliente ya eligió su método en el tótem: lo dejamos pre-seleccionado (el cajero puede cambiarlo)
  metodoPago.value = (pedido.metodoPago === 'efectivo' || pedido.metodoPago === 'qr') ? pedido.metodoPago : null;
  montoRecibido.value = 0;
}

// ── Buscar el pedido del cliente (dentro del panel de "Pedidos del tótem") ──
const codigoEscaneado = ref('');
const errorEscaner = ref('');

// Filtra la lista mientras el cajero escribe el turno. Si no escribe nada, salen todos.
const porCobrarFiltrados = computed(() => {
  const q = (codigoEscaneado.value || '').trim();
  if (!q || !/^\d+$/.test(q)) return porCobrar.value;
  return porCobrar.value.filter(p => String(p.numeroPedido ?? '').startsWith(q));
});

// Se dispara con Enter en el buscador del panel.
async function procesarCodigo() {
  let codigo = (codigoEscaneado.value || '').trim();
  if (!codigo) return;
  errorEscaner.value = '';

  // CASO 1: el cajero escribió un TURNO. La lista ya está filtrada en pantalla;
  // si queda un único pedido, Enter lo abre directo para cobrar.
  if (/^\d+$/.test(codigo)) {
    if (porCobrarFiltrados.value.length === 1) {
      abrirCobroTotem(porCobrarFiltrados.value[0]);
      codigoEscaneado.value = '';
    } else if (!porCobrarFiltrados.value.length) {
      errorEscaner.value = `No hay ningún pedido por cobrar con el turno ${codigo}`;
    }
    return;
  }

  // CASO 2 (opcional, con lector láser USB): llega el QR del comprobante. Puede ser solo
  // el código ("GORI:xxxx") o toda la comanda con el código al final ("...Codigo: GORI:xxxx").
  // Extraemos el código que sigue a "GORI:"; si no está, tomamos lo último tras ":".
  const m = codigo.match(/GORI:([^\s]+)/i);
  if (m) codigo = m[1];
  else if (codigo.includes(':')) codigo = codigo.split(':').pop();
  try {
    const token = authStore.token || sessionStorage.getItem('token');
    const res = await fetch(`/api/pedidos/buscar/${encodeURIComponent(codigo)}`, 
    { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const pedido = await res.json();
      abrirCobroTotem(pedido); // abre el cobro con todo precargado
      codigoEscaneado.value = '';
    } else {
      const err = await res.json().catch(() => ({}));
      errorEscaner.value = err.error || 'No se encontró el pedido';
    }
  } catch (e) {
    errorEscaner.value = 'Sin conexión con el servidor';
  }
}
function cerrarModal() { modalPago.value = false; metodoPago.value = null; pedidoCobrando.value = null; limpiarIntervalo(); }
function limpiarIntervalo() { if (intervalo) { clearInterval(intervalo); intervalo = null; } }

async function elegirQR() {
  metodoPago.value = 'qr';
  contador.value = 60;
  limpiarIntervalo();
  intervalo = setInterval(() => { contador.value--; if (contador.value <= 0) limpiarIntervalo(); }, 1000);
}

// ── DISPONIBILIDAD: agotado por stock + horario de la ensalada ──
// La caja consulta lo mismo que el tótem, para que el cajero no pueda vender un plato
// cuyo insumo ya se acabó. Antes solo el tótem lo sabía y la caja vendía a ciegas.
const disponibilidad = ref({}); // { "Nombre en la BD": { disponible, quedan } }
let dispTimer = null;
async function cargarDisponibilidad() {
  try {
    const token = authStore.token || sessionStorage.getItem('token');
    const res = await fetch('/api/productos/disponibilidad', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) disponibilidad.value = await res.json();
  } catch (e) { /* sin internet: no sabemos el stock -> se permite ("permitir y alertar") */ }
}

// La ensalada solo se sirve fresca en cierto horario (12:00 a 21:00), igual que en el tótem
const HORARIO_ENSALADA = { desde: 12 * 60, hasta: 21 * 60 };
const ensaladaEnHorario = computed(() => {
  const ahora = new Date();
  const m = ahora.getHours() * 60 + ahora.getMinutes();
  return m >= HORARIO_ENSALADA.desde && m < HORARIO_ENSALADA.hasta;
});

// Estado de un ítem por su NOMBRE (plato o guarnición): { ok, motivo }
function estadoItem(nombre) {
  if (nombre === 'Ensalada' && !ensaladaEnHorario.value) return { ok: false, motivo: 'horario' };
  const d = disponibilidad.value[nombre];
  if (d && d.disponible === false) return { ok: false, motivo: 'agotado' };
  return { ok: true, motivo: null };
}
function estadoProducto(p) { return estadoItem(nombreCanonicoCaja(p)); }

// ¿Hay stock de TODAS las presas del combo? (ej. "Pecho y Ala" -> Pecho y Ala)
// Un combo se agota si a cualquiera de sus presas no le queda stock. Sin esto la caja
// podía vender una presa agotada que el tótem sí bloqueaba.
function comboPresaDisponible(combo) {
  const presas = combo.replace(/ y /g, ',').split(',').map(s => s.trim()).filter(Boolean);
  return presas.every(nombre => {
    const d = disponibilidad.value['Presa: ' + nombre];
    return !d || d.disponible !== false; // sin dato (offline) -> se permite
  });
}
function etiquetaBloqueo(motivo) { return motivo === 'horario' ? 'Solo 12:00 - 21:00' : 'Agotado'; }

// Nombre canónico del plato para casar con el producto/receta real (igual que el tótem)
const CAT_TIPO = { 'Brasa Gori': 'Brasa', 'Broaster Gori': 'Broaster', 'Mixta Gori': 'Mixta' };
function nombreCanonicoCaja(item) {
  const base = item.nombreBase || item.nombre;
  const tipo = CAT_TIPO[item.categoriaId];
  return tipo ? `${base} (${tipo})` : base;
}
function tiposDePresaCaja(presaStr) {
  return presaStr.replace(/ y /g, ',').split(',').map(s => s.trim()).filter(Boolean);
}
// Expande cada plato en base + presas + guarniciones (con precio 0), como el tótem,
// para que los nombres coincidan con productos reales y el inventario descuente exacto.
function expandirItemsCaja() {
  const salida = [];
  for (const it of carrito.items) {
    salida.push({ nombre: nombreCanonicoCaja(it), cantidad: it.cantidad, precio: it.precio, detalle: it.presa || null });
    if (it.presa) {
      for (const tipo of tiposDePresaCaja(it.presa)) {
        salida.push({ nombre: `Presa: ${tipo}`, cantidad: it.cantidad, precio: 0, detalle: 'presa' });
      }
    }
    if (Array.isArray(it.guarniciones)) {
      for (const g of it.guarniciones) {
        salida.push({ nombre: g, cantidad: it.cantidad, precio: 0, detalle: 'guarnición' });
      }
    }
  }
  return salida;
}

async function enviarPedido() {
  const token = authStore.token || sessionStorage.getItem('token');
  if (!token) return false;
  const res = await fetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      // El método que eligió el cajero: sin esto la venta quedaba guardada sin método
      // y el desglose de efectivo frente a QR de los reportes salía vacío.
      // El monto y el origen los calcula el servidor a partir del token.
      metodoPago: metodoPago.value,
      items: expandirItemsCaja()
    })
  });
  if (!res.ok) {
    // Se muestra el motivo real del servidor: un "Error al registrar el cobro" a secas
    // dejaba al cajero sin saber qué plato del carrito era el del problema.
    const err = await res.json().catch(() => ({}));
    ultimoErrorCobro.value = err.error || `El servidor rechazó el cobro (${res.status})`;
    return false;
  }
  return true;
}

// Marca como pagado un pedido que vino del tótem (pasa a cocina y descuenta inventario)
async function cobrarPedidoTotem() {
  const token = authStore.token || sessionStorage.getItem('token');
  const res = await fetch(`/api/pedidos/${pedidoCobrando.value.id}/cobrar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
  });
  if (res.ok) {
    // Quitar de la lista local (el socket también lo hará, pero así es inmediato)
    porCobrar.value = porCobrar.value.filter(p => p.id !== pedidoCobrando.value.id);
    return true;
  }
  // Se muestra el motivo real del servidor ("es de otra sucursal", "ya fue cobrado").
  // Antes se devolvía false a secas y el cajero solo veía "Error al registrar el cobro",
  // sin ninguna pista de qué hacer.
  const err = await res.json().catch(() => ({}));
  ultimoErrorCobro.value = err.error || `El servidor rechazó el cobro (${res.status})`;
  return false;
}

// Confirma el cobro: si hay un pedido del tótem lo cobra; si no, crea la venta de caja
async function confirmarCobro() {
  ultimoErrorCobro.value = '';
  const ok = pedidoCobrando.value ? await cobrarPedidoTotem() : await enviarPedido();
  if (ok) { modalPago.value = false; pagoExitoso.value = true; }
  else await avisar(ultimoErrorCobro.value || 'Error al registrar el cobro');
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

onUnmounted(() => {
  limpiarIntervalo();
  if (dispTimer) clearInterval(dispTimer);
  if (socket) socket.disconnect();
});
</script>

<style scoped>
/* Categoría activa en dorado (marco premium de la caja) */
.cat-oro-activa {
  background: linear-gradient(135deg, #E4C07A, #caa24f);
  color: #17120c;
}
</style>
