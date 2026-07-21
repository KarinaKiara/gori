<template>
  <div class="h-screen flex flex-col text-white overflow-hidden relative menu-bg">
    <!-- Fondo dinámico de marca -->
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at 65% 115%, rgba(228,192,122,0.10) 0%, transparent 55%), radial-gradient(ellipse at 15% -20%, rgba(255,69,0,0.08) 0%, transparent 50%), linear-gradient(165deg, #0b0b0d 0%, #17120c 52%, #0a0a0b 100%);"></div>
    <!-- Micro rejilla animada -->
    <div class="absolute inset-0 pointer-events-none grid-drift"></div>
    <!-- Glow dorado tenue -->
    <div class="menu-glow absolute bottom-0 right-0 w-[550px] h-[420px] pointer-events-none" style="background: radial-gradient(ellipse at bottom right, rgba(228,192,122,0.09) 0%, transparent 65%);"></div>
    <!-- Toast de producto agregado -->
    <transition name="toast">
      <div v-if="toastVisible" class="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-orange-500/30 toast-card">
        <span class="text-xl">🍗</span>
        <span class="text-white font-bold text-sm">¡{{ toastNombre }} agregado!</span>
        <span class="text-orange-400 font-black text-sm">+1</span>
      </div>
    </transition>

    <!-- Header con Logo de Marca -->
    <header class="px-6 py-3 flex justify-between items-center z-20 border-b border-white/5">
      <!-- Logo + Nombre de Sucursal -->
      <div class="flex items-center gap-3">
        <button @click="volver" class="p-2.5 rounded-full text-white bg-white/5 hover:bg-white/15 transition backdrop-blur-sm flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </button>
        <!-- Mini logo gorila SVG inline -->
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden"
               style="background: linear-gradient(135deg, #FF4500 0%, #FF6B35 100%); box-shadow: 0 0 15px rgba(255,69,0,0.4);">
            <svg width="28" height="28" viewBox="0 0 220 280" fill="none">
              <path d="M110 80 C60 80 25 130 25 185 C25 240 65 265 110 265 C155 265 195 240 195 185 C195 130 160 80 110 80Z" fill="white" opacity="0.95"/>
              <path d="M85 90 C75 75 72 58 80 48 C86 40 94 44 95 55 C95 42 98 28 108 22 C118 28 121 42 121 55 C122 44 130 40 136 48 C144 58 141 75 131 90" fill="white" opacity="0.95"/>
              <path d="M110 115 C85 115 68 135 68 162 C68 188 82 205 110 205 C138 205 152 188 152 162 C152 135 135 115 110 115Z" fill="#FF4500"/>
              <path d="M95 200 C90 218 88 235 90 250 C96 255 110 258 110 258 C124 255 130 250 130 250 C132 235 130 218 125 200Z" fill="#FF4500"/>
              <rect x="78" y="52" width="64" height="10" rx="5" fill="white"/>
              <ellipse cx="110" cy="38" rx="30" ry="24" fill="white"/>
              <ellipse cx="125" cy="24" rx="14" ry="16" fill="white"/>
            </svg>
          </div>
          <div class="hidden sm:block">
            <p class="text-white font-black tracking-widest text-base leading-none"
               style="font-family: 'Impact','Arial Black',sans-serif;">GORI CHICKEN</p>
            <p class="text-orange-400 text-[10px] font-bold tracking-widest leading-none mt-0.5">
              {{ nombreSucursal || 'Menú Digital' }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <!-- Botón Logout Cajero -->
        <button v-if="esCajero" @click="logout" class="text-sm font-bold text-gray-400 hover:text-white transition flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          Salir
        </button>

        <!-- Botón Carrito -->
        <button @click="$router.push('/totem/carrito')"
                class="relative flex items-center gap-2 text-white px-5 py-2.5 rounded-full font-title text-lg tracking-wider transition-all"
                style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 20px rgba(255,69,0,0.45);">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <span class="hidden sm:inline">PEDIDO</span>
          <div v-if="carrito.totalItems > 0"
               class="absolute -top-2 -right-2 bg-white text-orange-500 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-orange-400">
            {{ carrito.totalItems }}
          </div>
        </button>
      </div>
    </header>

    <!-- Categorías horizontales (solo en celular) -->
    <nav class="md:hidden flex gap-2 overflow-x-auto px-4 py-2.5 z-20 no-scrollbar flex-shrink-0">
      <button v-for="cat in categorias" :key="'m' + cat.id" @click="cambiarCategoria(cat.id)"
              class="flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all"
              :class="categoriaActiva === cat.id ? 'shadow-lg' : 'text-gray-300 bg-white/5'"
              :style="categoriaActiva === cat.id ? 'background: linear-gradient(135deg,#E4C07A,#caa24f); color:#17120c;' : ''">
        {{ cat.nombre.split(' ')[0] }}
      </button>
    </nav>

    <div class="flex flex-1 overflow-hidden z-10 mt-0 md:mt-4">
      <!-- Menú Principal Izquierdo -->
      <main class="flex-1 overflow-y-auto px-4 md:px-16 relative">
        <!-- Título de Categoría animado -->
        <transition name="cat-title" mode="out-in">
          <div :key="categoriaActiva" class="mb-6 md:mb-10 pl-1 md:pl-2 pt-2 md:pt-0">
            <h2 class="text-5xl md:text-[5.5rem] font-title text-white uppercase leading-none drop-shadow-lg tracking-tight">{{ tituloPrincipal }}</h2>
            <h3 class="text-3xl md:text-6xl font-title uppercase leading-none tracking-tight" style="background: linear-gradient(135deg,#F7E3A1 0%,#E4C07A 40%,#C99B3F 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; filter: drop-shadow(0 2px 6px rgba(201,155,63,0.35));">{{ subtitulo }}</h3>
          </div>
        </transition>
        
        <!-- Sucursal cerrada: puede ver el menú, pero no pedir -->
        <div v-if="cerrado" class="w-full mb-5 rounded-2xl overflow-hidden aviso-cerrado" style="border:1px solid rgba(248,113,113,0.45);">
          <div class="px-4 py-2.5 text-center" style="background: linear-gradient(135deg,#dc2626,#991b1b);">
            <p class="text-white font-black text-sm tracking-[0.1em] uppercase">🕐 {{ estado.titulo }}</p>
          </div>
          <div class="px-4 py-3 text-center" style="background: rgba(220,38,38,0.08);">
            <p class="text-sm" style="color:#fca5a5;">{{ estado.detalle }}</p>
            <p class="text-xs mt-1.5" style="color:rgba(252,165,165,0.7);">Puedes mirar el menú, pero no agregar platos.</p>
          </div>
        </div>

        <!-- Grilla de Productos: foto protagonista arriba (estilo menú premium).
             Al cambiar de categoría se reemplaza la grilla COMPLETA (mode="out-in"):
             así los platos que salen nunca se enciman con los que entran. -->
        <transition name="grid-swap" mode="out-in">
        <div :key="categoriaActiva" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 w-full pb-10">
          <div v-for="(producto, index) in productosFiltrados" :key="producto.id"
               @click="agregar(producto)"
               class="group rounded-3xl overflow-hidden relative product-card backdrop-blur-md flex flex-col transition-all duration-300"
               :class="estadoProducto(producto).ok ? 'cursor-pointer' : 'card-cerrada'"
               style="background: linear-gradient(165deg, rgba(228,192,122,0.06), rgba(255,255,255,0.02)); border:1px solid rgba(228,192,122,0.16);"
               :style="{ animationDelay: (Math.min(index, 7) * 0.05) + 's' }">

            <!-- Foto protagonista -->
            <div class="relative w-full aspect-[4/3] overflow-hidden" style="background: rgba(0,0,0,0.25);">
              <img v-if="producto.imagen" :src="producto.imagen" :alt="producto.nombre"
                   class="w-full h-full object-cover group-hover:scale-[1.06] transition-transform duration-500 ease-out" />
              <div v-else class="w-full h-full flex items-center justify-center text-6xl select-none">🍗</div>
              <!-- Sello de AGOTADO / fuera de horario sobre la foto -->
              <div v-if="!estadoProducto(producto).ok && estadoProducto(producto).motivo !== 'cerrado'"
                   class="absolute inset-0 flex items-center justify-center" style="background: rgba(10,10,11,0.6);">
                <span class="px-4 py-1.5 rounded-full font-black text-sm uppercase tracking-widest -rotate-6"
                      :style="estadoProducto(producto).motivo === 'horario'
                            ? 'background:#b45309;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.5);'
                            : 'background:#b91c1c;color:#fff;box-shadow:0 4px 14px rgba(0,0,0,.5);'">
                  {{ estadoProducto(producto).motivo === 'horario' ? '⏰ Solo mediodía' : '✕ Agotado' }}
                </span>
              </div>
              <!-- línea dorada superior sutil -->
              <div class="absolute top-0 inset-x-0 h-1" style="background: linear-gradient(90deg, transparent, #E4C07A, transparent); opacity:0.55;"></div>
              <!-- degradado inferior para legibilidad del precio -->
              <div class="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style="background: linear-gradient(to top, rgba(10,10,11,0.9) 0%, transparent 100%);"></div>
              <!-- precio flotante dorado -->
              <div class="absolute bottom-2.5 right-3.5 font-title text-2xl md:text-3xl leading-none" style="color:#E4C07A; text-shadow:0 2px 10px rgba(0,0,0,0.85);">
                <span class="text-sm mr-0.5" style="color:rgba(228,192,122,0.8);">Bs.</span>{{ producto.precio.toFixed(2) }}
              </div>
            </div>

            <!-- Contenido -->
            <div class="p-4 md:p-5 flex flex-col flex-1">
              <h4 class="font-script text-2xl md:text-[1.8rem] leading-tight break-words transition-colors"
                  :class="producto.nombre.includes('Ensalada') ? 'text-emerald-300' : 'text-white group-hover:text-[#E4C07A]'">
                {{ producto.nombre }}
              </h4>
              <p v-if="producto.descripcion" class="text-gray-400 text-xs md:text-sm font-sans mt-1.5 line-clamp-2 flex-1">
                {{ producto.descripcion }}
              </p>
              <div v-if="!estadoProducto(producto).ok" class="mt-4 w-full py-2.5 rounded-2xl text-center text-xs md:text-sm font-black uppercase tracking-wider border"
                   style="border-color: rgba(248,113,113,0.35); color: rgba(252,165,165,0.75); background: rgba(220,38,38,0.06);">
                {{ etiquetaBloqueo(estadoProducto(producto).motivo) }}
              </div>
              <div v-else class="mt-4 w-full py-2.5 rounded-2xl text-center text-xs md:text-sm font-black uppercase tracking-wider border add-btn transition-all duration-300">
                + Agregar
              </div>
            </div>

            <!-- ripple al hacer click -->
            <div class="ripple-effect absolute inset-0 pointer-events-none" :class="{ 'ripple-active': rippleId === producto.id }"></div>
          </div>
        </div>
        </transition>
      </main>

      <!-- Sidebar / Categorías (solo tablet/PC; en celular se usa la barra horizontal de arriba) -->
      <aside class="hidden md:block w-56 border-l border-white/8 overflow-y-auto bg-black/25 backdrop-blur-md">
        <nav class="flex flex-col h-full pt-8">
          <button v-for="cat in categorias" :key="cat.id"
            @click="cambiarCategoria(cat.id)"
            class="w-full text-center md:text-left px-2 md:px-8 py-8 font-title text-2xl md:text-4xl transition-all duration-300 border-r-4 relative overflow-hidden cat-btn"
            :class="categoriaActiva === cat.id
              ? 'border-gori-orange text-white cat-active'
              : 'border-transparent text-gray-500 hover:text-white hover:bg-white/5'">
            <span class="relative z-10">{{ cat.nombre.split(' ')[0] }}</span>
            <!-- Indicador activo animado -->
            <div v-if="categoriaActiva === cat.id" class="cat-indicator absolute inset-0 pointer-events-none"></div>
          </button>
        </nav>
      </aside>
    </div>
  </div>

  <!-- Modal Personalización -->
  <div v-if="modalProducto" class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 modal-fade" @click.self="cerrarModal">
    <div class="bg-[#1a1208]/85 backdrop-blur-2xl border border-gori-orange/30 rounded-[1.75rem] shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)] w-full max-w-lg overflow-hidden modal-pop">
      <!-- Header -->
      <div class="bg-gori-orange/10 px-6 py-5 flex justify-between items-start border-b border-gori-orange/20">
        <div>
          <p class="text-gori-orange text-xs font-bold uppercase tracking-widest mb-1">Personaliza tu pedido</p>
          <h3 class="text-2xl font-title text-white">{{ modalProducto.nombre }}</h3>
          <p class="text-gori-orange font-bold text-xl mt-1">Bs. {{ modalProducto.precio.toFixed(2) }}</p>
        </div>
        <button @click="cerrarModal" class="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
        <!-- Selección de Presas (Combo Excluyente) -->
        <div v-if="modalProducto.grupoPresas">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">🍗</span>
            <div>
              <p class="font-bold text-white text-lg">Elige tus presas</p>
              <p class="text-gray-400 text-sm">Selecciona una de nuestras opciones disponibles</p>
            </div>
          </div>
          <div class="flex flex-col gap-3">
            <button v-for="combo in COMBOS_PRESAS[modalProducto.grupoPresas]" :key="combo"
              @click="comboPresaDisponible(combo) && (presaSeleccionada = combo)"
              :disabled="!comboPresaDisponible(combo)"
              :class="['py-3.5 px-6 rounded-2xl font-bold text-lg border-2 transition-all text-left flex justify-between items-center',
                !comboPresaDisponible(combo)
                  ? 'border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed opacity-60'
                  : presaSeleccionada === combo
                    ? 'border-gori-orange bg-gori-orange/20 text-white shadow-[0_0_10px_rgba(255,140,0,0.3)]'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-gori-orange/50 hover:bg-white/10']">
              <span>{{ combo }}</span>
              <span v-if="!comboPresaDisponible(combo)" class="text-[10px] font-black px-1.5 py-0.5 rounded" style="background:#b91c1c;color:#fff;">AGOTADO</span>
              <span v-else-if="presaSeleccionada === combo" class="text-gori-orange text-xl">✓</span>
            </button>
          </div>
        </div>

        <!-- Selección de Guarniciones -->
        <div v-if="modalProducto.cantidadGuarniciones > 0">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-2xl">⭐</span>
            <div class="flex-1">
              <p class="font-bold text-white text-lg">Elige tus guarniciones</p>
              <p class="text-gray-400 text-sm flex items-center gap-2 flex-wrap">
                Elige exactamente 2
                <span class="flex gap-1">
                  <span v-for="n in 2" :key="n" class="w-2.5 h-2.5 rounded-full transition-all duration-300"
                        :class="guarnicionesSeleccionadas.length >= n ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/15'"></span>
                </span>
                <span class="font-black" :class="guarnicionesSeleccionadas.length === 2 ? 'text-emerald-400' : 'text-gori-orange'">{{ guarnicionesSeleccionadas.length }}/2</span>
              </p>
              <p class="text-yellow-400/70 text-xs mt-0.5">⚠️ Las 2 no se pueden mezclar mitad y mitad</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button v-for="g in GUARNICIONES" :key="g.id"
              @click="toggleGuarnicion(g)"
              :disabled="!estadoItem(g.nombre).ok"
              :class="['py-3 px-4 rounded-2xl font-bold text-sm border-2 transition-all text-left active:scale-95',
                !estadoItem(g.nombre).ok
                  ? 'border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed opacity-60'
                  : guarnicionesSeleccionadas.find(x => x.id === g.id)
                    ? 'border-emerald-400 bg-emerald-500/20 text-white shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-emerald-400/50 hover:bg-white/10']">
              <span class="flex items-center justify-between">
                <span>{{ g.emoji }} {{ g.nombre }}</span>
                <span v-if="!estadoItem(g.nombre).ok" class="text-[10px] font-black px-1.5 py-0.5 rounded"
                      :style="estadoItem(g.nombre).motivo === 'horario' ? 'background:#b45309;color:#fff;' : 'background:#b91c1c;color:#fff;'">
                  {{ estadoItem(g.nombre).motivo === 'horario' ? 'SOLO 12-21' : 'AGOTADO' }}
                </span>
                <span v-else-if="guarnicionesSeleccionadas.find(x => x.id === g.id)" class="text-emerald-400">✓</span>
              </span>
              <span v-if="g.nota" class="block text-xs text-gray-500 font-normal mt-0.5">{{ g.nota }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-white/10 bg-black/30">
        <button @click="confirmarAgregar"
          :disabled="!seleccionCompleta"
          :class="['w-full py-4 rounded-2xl font-title text-xl transition-all',
            seleccionCompleta
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_24px_rgba(16,185,129,0.45)] hover:from-emerald-400 hover:to-emerald-500 active:scale-95'
              : 'bg-white/10 text-gray-500 cursor-not-allowed']">
          {{ seleccionCompleta ? 'Agregar al Pedido ✓' : 'Completa tu elección' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCarritoStore } from '../../almacenes/carrito'
import { useAuthStore } from '../../almacenes/auth'
import { useTotemStore } from '../../almacenes/totem'
import { estadoSucursal, ahoraBolivia } from '../../utilidades/horarios'
import { io } from 'socket.io-client'

const router = useRouter()
const carrito = useCarritoStore()
const authStore = useAuthStore()
const totemStore = useTotemStore()

const esCajero = computed(() => {
  return authStore.usuario?.rol === 'CAJERO' || authStore.usuario?.rol === 'ADMIN'
})

// ── Horario de atención ──
// El horario viaja dentro de la sesión (usuario.horario) y queda guardado en el
// dispositivo, así el tótem sabe si está abierto aunque se caiga el internet.
const sesion = computed(() => totemStore.usuario || authStore.usuario)
const nombreSucursal = computed(() => sesion.value?.sucursal || '')

// La hora se refresca sola cada 30s: si el local cierra mientras el cliente
// mira el menú, la pantalla se bloquea sin que tenga que recargar.
// Se usa la hora de Bolivia, no la del dispositivo.
const ahora = ref(ahoraBolivia())
let relojTimer = null
let socket = null

onMounted(() => {
  relojTimer = setInterval(() => { ahora.value = ahoraBolivia() }, 30000)

  // Si el gerente cambia el horario, el tótem lo aplica sin que nadie lo recargue
  const sucursalId = sesion.value?.sucursalId
  if (!sucursalId) return
  socket = io()
  socket.on('connect', () => socket.emit('unirse-sucursal', sucursalId))
  // El gerente repuso (o se vendió) algo: se refrescan los "Agotado" al instante,
  // sin esperar a la consulta periódica de 30 segundos.
  socket.on('inventario-actualizado', () => cargarDisponibilidad())
  socket.on('horario-actualizado', (horario) => {
    const enTotem = !!totemStore.usuario
    const store = enTotem ? totemStore : authStore
    if (!store.usuario) return
    store.usuario.horario = horario
    localStorage.setItem(enTotem ? 'totem_usuario' : 'usuario', JSON.stringify(store.usuario))
  })
})

onUnmounted(() => {
  if (relojTimer) clearInterval(relojTimer)
  if (socket) socket.disconnect()
})

const estado = computed(() => estadoSucursal(sesion.value, ahora.value))
const cerrado = computed(() => !estado.value.abierto)

const logout = () => {
  authStore.cerrarSesion()
  router.push('/login')
}

// Volver a la pantalla de inicio del canal correcto: cliente (/pedir) o kiosko (/totem)
const volver = () => {
  router.push(localStorage.getItem('totem_modo') === 'cliente' ? '/pedir' : '/totem')
}

// ── Toast al agregar ──
const toastVisible = ref(false)
const toastNombre = ref('')
let toastTimer = null
function mostrarToast(nombre) {
  toastNombre.value = nombre.length > 22 ? nombre.substring(0, 22) + '…' : nombre
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 2000)
}

// ── Ripple effect ──
const rippleId = ref(null)
function triggerRipple(id) {
  rippleId.value = id
  setTimeout(() => { rippleId.value = null }, 500)
}

// ── Cambio de categoría con animación ──
function cambiarCategoria(id) {
  categoriaActiva.value = id
}

// Datos
const categorias = [
  { id: 'Brasa Gori', nombre: 'Brasa Gori' },
  { id: 'Broaster Gori', nombre: 'Broaster Gori' },
  { id: 'Mixta Gori', nombre: 'Mixta Gori' },
  { id: 'Extras Gori', nombre: 'Extras Gori' },
  { id: 'Refrescos', nombre: 'Refrescos' }
]

const categoriaActiva = ref('Brasa Gori')

const tituloPrincipal = computed(() => {
  return categoriaActiva.value.split(' ')[0]
})

const subtitulo = computed(() => {
  const parts = categoriaActiva.value.split(' ')
  return parts.length > 1 ? parts[1] : ''
})

const COMBOS_PRESAS = {
  Cuarto: ['Pecho y Ala', 'Pierna y Entrepierna'],
  Trica: ['Pecho, Ala y Pierna', 'Pierna, Entrepierna y Ala'],
  Extra: ['Pecho', 'Ala', 'Pierna', 'Entrepierna']
}

const GUARNICIONES = [
  { id: 'arroz',   emoji: '🍚', nombre: 'Arroz Chaufa' },
  { id: 'papas',   emoji: '🍟', nombre: 'Papas Rústicas' },
  { id: 'fideo',   emoji: '🍜', nombre: 'Fideo Salteado' },
  { id: 'ensalada',emoji: '🥗', nombre: 'Ensalada', nota: '12:00 - 21:00' },
]

const productos = [
  // Brasa Gori
  { id: 6,  categoriaId: 'Brasa Gori', nombre: 'Octavo',                 precio: 24,  descripcion: 'Presitas surtidas (no a elección)', grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/octavo_brasa.webp' },
  { id: 7,  categoriaId: 'Brasa Gori', nombre: 'Cuarto',                 precio: 36,  descripcion: 'Pecho/ala o pierna/entrepierna + 2 guarniciones', grupoPresas: 'Cuarto', cantidadGuarniciones: 2, imagen: '/images/cuarto_brasa.webp' },
  { id: 8,  categoriaId: 'Brasa Gori', nombre: 'Trica',                  precio: 46,  descripcion: 'Pecho/ala/pierna o pierna/entrepierna/ala + 2 guarniciones', grupoPresas: 'Trica', cantidadGuarniciones: 2, imagen: '/images/trica_brasa.webp' },
  { id: 9,  categoriaId: 'Brasa Gori', nombre: 'Medio Pollo s/guarnición',precio: 58,  descripcion: 'Sin guarnición',                     grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/medio_brasa_conGuarniciones.webp' },
  { id: 10, categoriaId: 'Brasa Gori', nombre: 'Medio Pollo c/guarnición',precio: 70,  descripcion: 'Elige 2 guarniciones',               grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/medio_brasa_conGuarniciones.webp' },
  { id: 11, categoriaId: 'Brasa Gori', nombre: 'Pollo Entero s/guarnición',precio: 105, descripcion: 'Sin guarnición',                    grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/entero_brasa_sinGuarniciones.webp' },
  { id: 12, categoriaId: 'Brasa Gori', nombre: 'Pollo Entero c/guarnición',precio: 135, descripcion: 'Elige 2 guarniciones',              grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/entero_brasa_conGuarniciones.webp' },
  // Broaster Gori
  { id: 13, categoriaId: 'Broaster Gori', nombre: 'Octavo',                  precio: 24,  descripcion: 'Presitas surtidas (no a elección)', grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/octavo_broaster.webp' },
  { id: 14, categoriaId: 'Broaster Gori', nombre: 'Cuarto',                  precio: 36,  descripcion: 'Pecho/ala o pierna/entrepierna + 2 guarniciones', grupoPresas: 'Cuarto', cantidadGuarniciones: 2, imagen: '/images/cuarto_broaster.webp' },
  { id: 15, categoriaId: 'Broaster Gori', nombre: 'Trica',                   precio: 46,  descripcion: 'Pecho/ala/pierna o pierna/entrepierna/ala + 2 guarniciones', grupoPresas: 'Trica', cantidadGuarniciones: 2, imagen: '/images/trica_broaster.webp' },
  { id: 16, categoriaId: 'Broaster Gori', nombre: 'Medio Pollo s/guarnición', precio: 58,  descripcion: 'Sin guarnición',                    grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/medio_broaster_conGuarniciones.webp' },
  { id: 17, categoriaId: 'Broaster Gori', nombre: 'Medio Pollo c/guarnición', precio: 70,  descripcion: 'Elige 2 guarniciones',              grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/medio_broaster_conGuarniciones.webp' },
  { id: 18, categoriaId: 'Broaster Gori', nombre: 'Pollo Entero s/guarnición',precio: 105, descripcion: 'Sin guarnición',                    grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/entero_broaster_sinGuarniciones.webp' },
  { id: 19, categoriaId: 'Broaster Gori', nombre: 'Pollo Entero c/guarnición',precio: 135, descripcion: 'Elige 2 guarniciones',              grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/entero_broaster_conGuarniciones.webp' },
  // Opción Mixta
  { id: 30, categoriaId: 'Mixta Gori', nombre: 'Cuarto Mixto',                  precio: 36,  descripcion: 'Presas brasa y broaster + 2 guarniciones', grupoPresas: 'Cuarto', cantidadGuarniciones: 2, imagen: '/images/cuarto_mixto.webp' },
  { id: 31, categoriaId: 'Mixta Gori', nombre: 'Trica Mixta',                   precio: 46,  descripcion: 'Presas brasa y broaster + 2 guarniciones', grupoPresas: 'Trica', cantidadGuarniciones: 2, imagen: '/images/trica_mixto.webp' },
  { id: 32, categoriaId: 'Mixta Gori', nombre: 'Medio Pollo Mixto s/guarnición',precio: 58,  descripcion: 'Sin guarnición',                    grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/trica_mixto.webp' },
  { id: 33, categoriaId: 'Mixta Gori', nombre: 'Medio Pollo Mixto c/guarnición',precio: 70,  descripcion: 'Elige 2 guarniciones',              grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/trica_mixto.webp' },
  { id: 34, categoriaId: 'Mixta Gori', nombre: 'Pollo Entero Mixto s/guarnición',precio: 105, descripcion: 'Sin guarnición',                   grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/entero_brasa_sinGuarniciones.webp' },
  { id: 35, categoriaId: 'Mixta Gori', nombre: 'Pollo Entero Mixto c/guarnición',precio: 135, descripcion: 'Elige 2 guarniciones',             grupoPresas: null, cantidadGuarniciones: 2, imagen: '/images/entero_brasa_conGuarniciones.webp' },
  // Extras Gori
  { id: 1,  categoriaId: 'Extras Gori', nombre: 'Arroz Chaufa',                  precio: 15, descripcion: 'Guarnición extra',                  grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_arroz.webp' },
  { id: 2,  categoriaId: 'Extras Gori', nombre: 'Papas Rústicas',                precio: 15, descripcion: 'Guarnición extra',                  grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_papasRusticas.webp' },
  { id: 3,  categoriaId: 'Extras Gori', nombre: 'Fideo Salteado',                precio: 15, descripcion: 'Guarnición extra',                  grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_fideo.webp' },
  { id: 4,  categoriaId: 'Extras Gori', nombre: 'Ensalada',                      precio: 12, descripcion: 'Disponible 12:00-21:00',             grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/extra_ensalada.webp' },
  { id: 5,  categoriaId: 'Extras Gori', nombre: 'Presa Extra',                   precio: 14, descripcion: 'La presa que usted guste (brasa o broaster)', grupoPresas: 'Extra', cantidadGuarniciones: 0, imagen: '/images/presa_extra.webp' },
  { id: 36, categoriaId: 'Extras Gori', nombre: 'Alfajor de Chocolate Gorila',   precio: 0,  descripcion: 'Consultar precio en caja',          grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/alfajor.webp' },
  // Refrescos
  { id: 20, categoriaId: 'Refrescos', nombre: 'Horchata de Litro', precio: 15, descripcion: '1 litro', grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/orchata.webp' },
  { id: 21, categoriaId: 'Refrescos', nombre: 'Coca Cola 500ml',   precio: 8,  descripcion: '',         grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/ColaCola_500ml.webp' },
  { id: 22, categoriaId: 'Refrescos', nombre: 'Fanta 500ml',       precio: 8,  descripcion: '',         grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/fanta_500ml.webp' },
  { id: 23, categoriaId: 'Refrescos', nombre: 'Del Valle 1 Litro', precio: 12, descripcion: '',         grupoPresas: null, cantidadGuarniciones: 0, imagen: '/images/delValle_1litro.webp' },
]

// Platos agregados desde el panel de Admin (llegan de la base, por sucursal)
const productosManual = ref([])
onMounted(async () => {
  try {
    const token = totemStore.token || authStore.token || localStorage.getItem('token')
    const res = await fetch('/api/productos/menu', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) productosManual.value = await res.json()
  } catch (e) { /* sin conexión: se usa lo cacheado o solo el menú fijo */ }
})
// Convierte un plato de la base al formato del menú (sin presas/guarniciones)
const mapearManual = (p) => ({
  id: 'm_' + p.id, categoriaId: p.categoria, nombre: p.nombre, precio: p.precio,
  descripcion: p.descripcion || '', grupoPresas: null, cantidadGuarniciones: 0, imagen: p.imagen || ''
})
const todosLosProductos = computed(() => [...productos, ...productosManual.value.map(mapearManual)])
const productosFiltrados = computed(() => todosLosProductos.value.filter(p => p.categoriaId === categoriaActiva.value))

// ── DISPONIBILIDAD: agotado por stock + horario de la ensalada ──
const disponibilidad = ref({}) // { "Nombre en la BD": { disponible, quedan } }
let dispTimer = null
async function cargarDisponibilidad() {
  try {
    const token = totemStore.token || authStore.token || localStorage.getItem('token')
    const res = await fetch('/api/productos/disponibilidad', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) disponibilidad.value = await res.json()
  } catch (e) { /* sin internet: no sabemos el stock -> se permite (política "permitir y alertar") */ }
}
onMounted(() => {
  cargarDisponibilidad()
  // Se refresca solo cada 30s: si algo se agota mientras el cliente mira, aparece "Agotado" sin recargar
  dispTimer = setInterval(cargarDisponibilidad, 30000)
})
onUnmounted(() => { if (dispTimer) clearInterval(dispTimer) })

// Nombre con el que el backend guarda el plato (para casar con la disponibilidad)
const CAT_TIPO = { 'Brasa Gori': 'Brasa', 'Broaster Gori': 'Broaster', 'Mixta Gori': 'Mixta' }
function nombreCanonico(p) {
  const tipo = CAT_TIPO[p.categoriaId]
  return tipo ? `${p.nombre} (${tipo})` : p.nombre
}

// La ensalada solo se sirve fresca en cierto horario (12:00 a 21:00)
const HORARIO_ENSALADA = { desde: 12 * 60, hasta: 21 * 60 } // en minutos del día
const ensaladaEnHorario = computed(() => {
  const m = ahora.value.getHours() * 60 + ahora.value.getMinutes()
  return m >= HORARIO_ENSALADA.desde && m < HORARIO_ENSALADA.hasta
})

// Estado de un ítem por su NOMBRE (plato o guarnición): { ok, motivo }
// motivo: 'agotado' (sin stock) | 'horario' (fuera del horario de la ensalada) | 'cerrado' | null
function estadoItem(nombre) {
  if (nombre === 'Ensalada' && !ensaladaEnHorario.value) return { ok: false, motivo: 'horario' }
  const d = disponibilidad.value[nombre]
  if (d && d.disponible === false) return { ok: false, motivo: 'agotado' }
  return { ok: true, motivo: null }
}
// Para las tarjetas del menú: junta "sucursal cerrada" + stock + horario
function estadoProducto(p) {
  if (cerrado.value) return { ok: false, motivo: 'cerrado' }
  return estadoItem(nombreCanonico(p))
}

// #7: ¿hay stock de TODAS las presas de un combo? (ej. "Pecho y Ala" -> Pecho y Ala)
// Un combo se agota si a cualquiera de sus presas no le queda stock.
function comboPresaDisponible(combo) {
  const presas = combo.replace(/ y /g, ',').split(',').map(s => s.trim()).filter(Boolean)
  return presas.every(nombre => {
    const d = disponibilidad.value['Presa: ' + nombre]
    return !d || d.disponible !== false // si no hay dato (offline), se permite
  })
}
// Texto del botón según el motivo
function etiquetaBloqueo(motivo) {
  if (motivo === 'agotado') return 'Agotado'
  if (motivo === 'horario') return 'Solo 12:00 - 21:00'
  return 'Cerrado'
}

// ── Modal Personalización ──
const modalProducto = ref(null)
const presaSeleccionada = ref(null)
const guarnicionesSeleccionadas = ref([])

const seleccionCompleta = computed(() => {
  if (!modalProducto.value) return false
  const presasOk = !modalProducto.value.grupoPresas || presaSeleccionada.value !== null
  const guarOk   = modalProducto.value.cantidadGuarniciones === 0 || guarnicionesSeleccionadas.value.length === 2
  return presasOk && guarOk
})

function toggleGuarnicion(g) {
  // No se puede elegir una guarnición agotada o fuera de horario (ej. ensalada)
  if (!estadoItem(g.nombre).ok) return
  const idx = guarnicionesSeleccionadas.value.findIndex(x => x.id === g.id)
  if (idx >= 0) {
    guarnicionesSeleccionadas.value.splice(idx, 1)
  } else if (guarnicionesSeleccionadas.value.length < 2) {
    guarnicionesSeleccionadas.value.push(g)
  }
}

const agregar = (producto) => {
  // Bloqueado si: sucursal cerrada, agotado por stock, o fuera de horario (ensalada)
  if (!estadoProducto(producto).ok) return
  triggerRipple(producto.id)
  if (producto.grupoPresas || producto.cantidadGuarniciones > 0) {
    modalProducto.value = producto
    presaSeleccionada.value = null
    guarnicionesSeleccionadas.value = []
  } else {
    carrito.agregarProducto(producto)
    mostrarToast(producto.nombre)
  }
}

function confirmarAgregar() {
  if (!seleccionCompleta.value) return
  
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
  cerrarModal()
}

function cerrarModal() {
  modalProducto.value = null
  presaSeleccionada.value = null
  guarnicionesSeleccionadas.value = []
}
</script>

<style scoped>
/* Premium oscuro elegante: negro cálido con acento dorado */
.menu-bg { background: linear-gradient(165deg, #0b0b0d 0%, #17120c 52%, #0a0a0b 100%); }

/* Barra de categorías en celular: ocultar la barra de scroll */
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* ─── Grid animado ─── */
.grid-drift {
  background-image:
    linear-gradient(rgba(228,192,122,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(228,192,122,0.05) 1px, transparent 1px);
  background-size: 54px 54px;
  opacity: 0.04;
  animation: gridDrift 30s linear infinite;
}
@keyframes gridDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 45px 45px; }
}

/* ─── Glow pulsante ─── */
.menu-glow { animation: menuGlowPulse 5s ease-in-out infinite; }
@keyframes menuGlowPulse {
  0%,100% { opacity: 0.6; transform: scale(1); }
  50%     { opacity: 1;   transform: scale(1.12); }
}

/* ─── Título de categoría ─── */
.cat-title-enter-active { transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
.cat-title-leave-active { transition: all 0.2s ease-in; }
.cat-title-enter-from  { opacity: 0; transform: translateX(-30px); }
.cat-title-leave-to    { opacity: 0; transform: translateX(20px); }

/* ─── Cambio de categoría: la grilla entera se reemplaza ───
   Antes cada tarjeta salía con position:absolute y, dentro de una cuadrícula,
   se amontonaban todas encima de las nuevas (se veía "fantasmeado"). */
.grid-swap-enter-active { transition: opacity 0.3s ease-out, transform 0.3s ease-out; }
.grid-swap-leave-active { transition: opacity 0.18s ease-in, transform 0.18s ease-in; }
.grid-swap-enter-from   { opacity: 0; transform: translateY(16px); }
.grid-swap-leave-to     { opacity: 0; transform: translateY(-10px); }

/* ─── Card de producto (grilla, foto arriba) ─── */
.product-card {
  animation: cardSlideIn 0.45s ease-out both;
}
@keyframes cardSlideIn {
  0%   { opacity: 0; transform: translateY(16px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.product-card:hover {
  border-color: rgba(228,192,122,0.5) !important;
  box-shadow: 0 22px 55px -15px rgba(0,0,0,0.8), inset 0 1px 0 rgba(228,192,122,0.15);
  transform: translateY(-6px);
}

/* Sucursal cerrada: la tarjeta se ve apagada y no reacciona (pero se puede mirar) */
.card-cerrada { cursor: not-allowed; opacity: 0.55; filter: grayscale(0.5); }
.card-cerrada:hover { transform: none; border-color: rgba(228,192,122,0.16) !important; box-shadow: none; }
.card-cerrada img { transform: none !important; }

/* Aviso de cerrado: entra suave */
.aviso-cerrado { animation: cardSlideIn 0.4s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .product-card { animation: none; }
  .product-card:hover { transform: none; }
}

/* ─── Botón agregar (dorado refinado) ─── */
.add-btn {
  background: transparent;
  border-color: rgba(228,192,122,0.35) !important;
  color: #E4C07A !important;
  transition: all 0.25s ease;
}
.group:hover .add-btn {
  background: linear-gradient(135deg, #E4C07A, #caa24f);
  color: #17120c !important;
  border-color: transparent !important;
  box-shadow: 0 6px 18px rgba(228,192,122,0.3);
  transform: scale(1.04);
}

/* ─── Ripple ─── */
.ripple-effect { border-radius: inherit; }
.ripple-active {
  animation: rippleBurst 0.5s ease-out forwards;
}
@keyframes rippleBurst {
  0%   { background: rgba(255,80,20,0); }
  30%  { background: rgba(255,80,20,0.18); }
  100% { background: rgba(255,80,20,0); }
}

/* ─── Sidebar categorías (dorado refinado) ─── */
.cat-btn { transition: all 0.25s ease; letter-spacing: 0.02em; }
.cat-active { background: rgba(228,192,122,0.06) !important; border-color: #E4C07A !important; }
.cat-indicator {
  background: linear-gradient(90deg, rgba(228,192,122,0.14) 0%, transparent 100%);
  animation: catGlow 3s ease-in-out infinite;
}
@keyframes catGlow {
  0%,100% { opacity: 0.7; }
  50%     { opacity: 1; }
}

/* ─── Toast ─── */
.toast-card {
  background: linear-gradient(135deg, rgba(10,30,45,0.95), rgba(15,45,65,0.95));
  backdrop-filter: blur(16px);
}
.toast-enter-active { transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1); }
.toast-leave-active { transition: all 0.25s ease-in; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(-20px) scale(0.85); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(-12px); }

/* ─── Modal de personalización (aparición premium) ─── */
.modal-fade { animation: modalFade 0.25s ease-out; }
@keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
.modal-pop { animation: modalPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
@keyframes modalPop {
  0%   { transform: translateY(16px) scale(0.96); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .modal-pop, .modal-fade { animation: none; }
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
::-webkit-scrollbar-thumb { background: rgba(228,192,122,0.4); border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: rgba(228,192,122,0.7); }
</style>
