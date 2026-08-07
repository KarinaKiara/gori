<template>
  <div class="totem-welcome h-screen w-full flex flex-col items-center relative overflow-y-auto select-none cursor-pointer"
       @click="alTocar" @mousemove="resetInactivity">

    <!-- Ondas doradas donde el cliente toca (feedback táctil) -->
    <span v-for="r in ondas" :key="r.id" class="onda" :style="{ left: r.x + 'px', top: r.y + 'px' }"></span>

    <!-- ═══ FONDO: negro cálido premium (igual que el menú) ═══ -->
    <div class="absolute inset-0" style="background: radial-gradient(ellipse at 50% 70%, #1c1408 0%, #0b0b0d 52%, #030201 100%);"></div>

    <!-- Grid decorativo animado -->
    <div class="absolute inset-0 pointer-events-none grid-bg"></div>

    <!-- Ondas SVG animadas -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <svg class="absolute bottom-0 left-0 w-full" style="height:55%;" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
        <path class="wave wave1" d="M0,200 C240,100 480,300 720,200 C960,100 1200,300 1440,200 L1440,400 L0,400 Z" fill="rgba(45,35,18,0.45)"/>
        <path class="wave wave2" d="M0,260 C240,160 480,360 720,260 C960,160 1200,360 1440,260 L1440,400 L0,400 Z" fill="rgba(30,24,14,0.4)"/>
        <path class="wave wave3" d="M0,310 C240,220 480,380 720,310 C960,230 1200,380 1440,310 L1440,400 L0,400 Z" fill="rgba(15,13,9,0.6)"/>
      </svg>
    </div>

    <!-- Partículas flotantes de fuego -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div v-for="p in particles" :key="p.id"
           class="particle absolute rounded-full"
           :style="{
             left: p.x + '%',
             bottom: '-12px',
             width: p.size + 'px',
             height: p.size + 'px',
             background: p.color,
             animationDuration: p.duration + 's',
             animationDelay: p.delay + 's',
             filter: 'blur(' + p.blur + 'px)',
             opacity: p.opacity
           }">
      </div>
    </div>

    <!-- Orbs de glow -->
    <div class="absolute inset-0 pointer-events-none">
      <!-- Resplandor de BRASA: el pollo se hace al fuego, el fondo también respira fuego -->
      <div class="brasa-glow absolute bottom-0 left-1/2 -translate-x-1/2"
           style="width:1000px;height:340px;background:radial-gradient(ellipse at bottom,rgba(255,110,20,0.26) 0%,rgba(228,192,122,0.10) 42%,transparent 72%);"></div>
      <div class="glow-orb absolute bottom-0 left-1/2 -translate-x-1/2"
           style="width:750px;height:420px;background:radial-gradient(ellipse,rgba(228,192,122,0.18) 0%,transparent 70%);"></div>
      <div class="glow-orb-2 absolute top-0 left-1/2 -translate-x-1/2"
           style="width:520px;height:260px;background:radial-gradient(ellipse,rgba(201,155,63,0.16) 0%,transparent 70%);"></div>
    </div>

    <!-- ═══ CONTENIDO CENTRAL ═══ -->
    <!-- my-auto: se centra cuando hay lugar y se puede desplazar cuando no (sin cortar el logo).
         pb: deja espacio abajo para que el cartel fijo de "Instalar" no tape los botones. -->
    <div class="relative z-10 flex flex-col items-center text-center px-6 my-auto pt-8 pb-40">

      <!-- Logo gorila flotante -->
      <div class="logo-float mb-4 relative">
        <div class="ring-pulse absolute inset-0 rounded-full -m-10"
             style="background:radial-gradient(circle,rgba(255,80,20,0.18) 0%,transparent 70%);"></div>
        <svg class="gorilla-svg" width="210" height="260" viewBox="0 0 220 280" fill="none">
          <defs>
            <radialGradient id="gGrad2" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#FF7A45"/>
              <stop offset="55%" stop-color="#FF4500"/>
              <stop offset="100%" stop-color="#D63200"/>
            </radialGradient>
            <radialGradient id="gDark2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#0D2E3F"/>
              <stop offset="100%" stop-color="#040e18"/>
            </radialGradient>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <ellipse cx="110" cy="268" rx="65" ry="10" fill="rgba(0,0,0,0.35)"/>
          <path d="M110 80 C60 80 25 130 25 185 C25 240 65 265 110 265 C155 265 195 240 195 185 C195 130 160 80 110 80Z" fill="url(#gGrad2)" filter="url(#glow2)"/>
          <path d="M25 185 C15 168 10 150 16 135 C22 122 32 118 36 130 C26 148 25 168 25 185Z" fill="#FF4500"/>
          <path d="M16 152 C6 147 2 134 9 124 C14 116 24 119 21 130Z" fill="#FF4500"/>
          <path d="M195 185 C205 168 210 150 204 135 C198 122 188 118 184 130 C194 148 195 168 195 185Z" fill="#FF4500"/>
          <path d="M204 152 C214 147 218 134 211 124 C206 116 196 119 199 130Z" fill="#FF4500"/>
          <path d="M85 90 C74 74 71 56 80 46 C87 38 95 43 96 55 C96 40 99 26 109 20 C119 26 122 40 122 55 C123 43 131 38 138 46 C147 56 144 74 133 90" fill="#FF4500"/>
          <path d="M96 88 C88 71 87 53 94 44 C100 49 101 65 101 78" fill="#FF6B35" opacity="0.7"/>
          <path d="M122 88 C130 71 131 53 124 44 C118 49 117 65 117 78" fill="#FF6B35" opacity="0.7"/>
          <path d="M110 115 C84 115 67 136 67 163 C67 190 82 206 110 206 C138 206 153 190 153 163 C153 136 136 115 110 115Z" fill="url(#gDark2)"/>
          <path d="M94 201 C89 220 87 237 90 251 C96 256 110 259 110 259 C124 256 130 251 130 251 C133 237 131 220 126 201Z" fill="url(#gDark2)"/>
          <!-- ojos -->
          <circle cx="92" cy="158" r="6" fill="rgba(255,120,50,0.6)"/>
          <circle cx="128" cy="158" r="6" fill="rgba(255,120,50,0.6)"/>
          <circle cx="92" cy="158" r="2.5" fill="white"/>
          <circle cx="128" cy="158" r="2.5" fill="white"/>
          <!-- gorro chef -->
          <rect x="78" y="51" width="64" height="15" rx="7" fill="white"/>
          <ellipse cx="110" cy="34" rx="35" ry="29" fill="white"/>
          <ellipse cx="97" cy="27" rx="13" ry="19" fill="rgba(200,200,200,0.25)"/>
          <ellipse cx="126" cy="21" rx="17" ry="19" fill="white"/>
          <ellipse cx="121" cy="15" rx="9" ry="13" fill="rgba(200,200,200,0.25)"/>
        </svg>
      </div>

      <!-- Título GORI letra por letra -->
      <div class="text-block mb-1">
        <div class="flex justify-center overflow-hidden">
          <span v-for="(letra, i) in 'GORI'" :key="'g'+i"
                class="letter-animate text-white font-black leading-none"
                :style="{ animationDelay: (i * 0.08) + 's', fontSize: 'clamp(4rem,10vw,7rem)', fontFamily:`'Impact','Arial Black',sans-serif`, letterSpacing:'0.06em', textShadow:'0 0 40px rgba(255,255,255,0.2)' }">
            {{ letra }}
          </span>
        </div>
        <div class="flex justify-center overflow-hidden">
          <span v-for="(letra, i) in 'CHICKEN'" :key="'c'+i"
                class="letter-animate letra-oro font-black leading-none"
                :style="{ animationDelay: (0.35 + i * 0.07) + 's', fontSize: 'clamp(3.2rem,8.5vw,6rem)', fontFamily:`'Impact','Arial Black',sans-serif`, letterSpacing:'0.06em' }">
            {{ letra }}
          </span>
        </div>
      </div>

      <!-- Slogan typewriter -->
      <p class="slogan-anim text-sm md:text-base font-bold tracking-[0.3em] uppercase mb-8 mt-2"
         style="color:#E4C07A;">
        {{ sloganVisible }}<span class="cursor-blink">|</span>
      </p>

      <!-- ═══ CTA principal ═══ -->
      <!-- MODO CLIENTE: primero elige su sucursal (se queda aquí), y recién después comienza -->
      <template v-if="modoCliente">
        <!-- (1) Sin sucursal elegida: botón GRANDE para elegir el local -->
        <div v-if="!localActual" class="touch-btn-anim flex flex-col items-center gap-3">
          <div class="relative flex items-center justify-center">
            <div class="cta-halo absolute rounded-full pointer-events-none" style="width:130%;height:170%;background:radial-gradient(ellipse,rgba(228,192,122,0.4) 0%,transparent 70%);"></div>
            <button @click.stop="abrirPicker" class="cta-oro relative overflow-hidden inline-flex items-center gap-3 px-10 md:px-14 py-5 md:py-7 rounded-full">
              <span class="cta-shine absolute inset-0 pointer-events-none"></span>
              <span class="relative z-10 text-2xl md:text-3xl cta-hand">📍</span>
              <span class="relative z-10 font-title text-xl md:text-3xl tracking-wide whitespace-nowrap">ELEGIR MI SUCURSAL</span>
            </button>
          </div>
          <p class="text-xs font-semibold tracking-[0.25em] uppercase animate-pulse-text" style="color:rgba(228,192,122,0.6);">
            Elegí tu local para empezar
          </p>
        </div>

        <!-- (2) Con sucursal elegida: se queda en la pantalla mostrando dónde está -->
        <div v-else class="touch-btn-anim flex flex-col items-center gap-4">
          <!-- Tocar esta caja también abre el selector: así se puede cambiar de sucursal
               aunque el botón de abajo quede tapado por el cartel de instalar. -->
          <div @click.stop="abrirPicker" class="sucursal-actual flex flex-col items-center gap-1 px-8 py-4 rounded-3xl border cursor-pointer active:scale-95 transition" style="border-color:rgba(228,192,122,0.45);background:rgba(228,192,122,0.08);">
            <span class="text-[11px] md:text-xs font-bold tracking-[0.28em] uppercase" style="color:rgba(228,192,122,0.7);">Estás en la sucursal</span>
            <span class="font-black leading-none letra-oro" style="font-size:clamp(2.2rem,7vw,3.6rem);font-family:'Impact','Arial Black',sans-serif;">{{ localActual }}</span>
            <span class="text-[10px] font-bold tracking-widest uppercase mt-1" style="color:rgba(228,192,122,0.55);">✎ Tocá para cambiar de sucursal</span>
          </div>
          <div class="relative flex items-center justify-center">
            <div class="cta-halo absolute rounded-full pointer-events-none" style="width:130%;height:170%;background:radial-gradient(ellipse,rgba(228,192,122,0.35) 0%,transparent 70%);"></div>
            <button @click.stop="irAlMenu" class="cta-oro relative overflow-hidden inline-flex items-center gap-3 px-9 md:px-12 py-4 md:py-5 rounded-full">
              <span class="cta-shine absolute inset-0 pointer-events-none"></span>
              <span class="relative z-10 font-title text-lg md:text-2xl tracking-wide whitespace-nowrap">COMENZAR MI PEDIDO</span>
              <svg class="w-5 h-5 cta-arrow relative z-10 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </button>
          </div>
          <button @click.stop="abrirPicker" class="text-sm underline active:scale-95 transition" style="color:rgba(228,192,122,0.8);">
            Seleccionar otra sucursal
          </button>
        </div>
      </template>

      <!-- MODO KIOSKO: tocar cualquier parte de la pantalla para empezar (comportamiento original) -->
      <div v-else class="touch-btn-anim flex flex-col items-center gap-3">
        <div class="relative flex items-center justify-center">
          <div class="cta-halo absolute rounded-full pointer-events-none" style="width:130%;height:170%;background:radial-gradient(ellipse,rgba(228,192,122,0.35) 0%,transparent 70%);"></div>
          <button class="cta-oro relative overflow-hidden inline-flex items-center gap-3 px-9 md:px-12 py-4 md:py-5 rounded-full">
            <span class="cta-shine absolute inset-0 pointer-events-none"></span>
            <svg class="w-6 h-6 cta-hand relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
            </svg>
            <span class="relative z-10 font-title text-lg md:text-2xl tracking-wide whitespace-nowrap">COMENZAR MI PEDIDO</span>
            <svg class="w-5 h-5 cta-arrow relative z-10 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </button>
        </div>
        <p class="text-xs font-semibold tracking-[0.25em] uppercase animate-pulse-text" style="color:rgba(228,192,122,0.55);">
          Toca la pantalla para empezar
        </p>
      </div>

      <!-- CLIENTE (/pedir): comprobante recuperable + estado del pedido EN VIVO.
           No aparece en el kiosko (/totem), que es un terminal compartido. -->
      <div v-if="modoCliente && comprobanteGuardado" class="mt-5 flex flex-col items-center gap-2 z-30">
        <button @click.stop="verComprobante"
                class="flex items-center gap-2 text-xs px-4 py-2.5 rounded-full border transition-all active:scale-95"
                style="background:rgba(228,192,122,0.14); border-color:rgba(228,192,122,0.5); color:#F7E3A1;">
          🧾 <span class="font-bold">Ver mi comprobante</span>
          <span class="font-black px-1.5 rounded" style="background:#E4C07A; color:#17120c;">Turno {{ comprobanteGuardado.turno }}</span>
        </button>
        <!-- Estado del pedido: se actualiza solo mientras el cocinero avanza la comanda -->
        <div v-if="estadoInfo" class="flex items-center gap-2 text-xs px-4 py-2 rounded-full font-bold" :style="estadoInfo.style">
          <span>{{ estadoInfo.icono }}</span>
          <span>{{ estadoInfo.texto }}</span>
          <button v-if="estadoPedido === 'LISTO'" @click.stop="marcarRecogido" class="ml-1 underline opacity-80">Ya lo recogí</button>
        </div>
      </div>

      <!-- Local actual (solo KIOSKO: en modo cliente ya lo muestra el bloque grande de arriba). -->
      <div v-if="localActual && !modoCliente" class="mt-5 flex items-center gap-2 text-xs bg-white/5 px-4 py-2 rounded-full border z-30" style="border-color:rgba(228,192,122,0.3);" @click.stop>
        <span class="text-gray-300">📍 Pedís en <b style="color:#E4C07A;">{{ localActual }}</b></span>
      </div>

      <!-- Contador de inactividad (cuando está cerca de resetear) -->
      <div v-if="mostrarCountdown" class="inactivity-bar mt-6 w-48 h-1 rounded-full overflow-hidden" style="background:rgba(255,255,255,0.1);">
        <div class="inactivity-fill h-full rounded-full transition-all duration-1000"
             :style="{ width: (inactividad / 30 * 100) + '%', background: inactividad > 10 ? '#FF4500' : '#ef4444' }"></div>
      </div>
    </div>

    <!-- Sucursales decorativas -->
    <div class="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 opacity-35">
      <div v-for="(suc, i) in ['Melchor','El Prado','Recoleta','Centro']" :key="i"
           class="flex items-center gap-1.5 text-xs text-gray-400">
        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
              style="background:rgba(228,192,122,0.85);color:#17120c;">{{ i+1 }}</span>
        <span>{{ suc }}</span>
        <span v-if="i < 3" class="w-px h-3 bg-gray-600 ml-1.5"></span>
      </div>
    </div>

    <!-- ═══ MODAL: selector de local del cliente ═══ -->
    <!-- z alto (por encima del cartel "Agregar a inicio", que es fixed y lo tapaba) -->
    <div v-if="mostrarConfig" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-[10000] flex items-center justify-center p-4" @click.self="mostrarConfig=false">
      <div class="modal-slide rounded-3xl p-8 max-w-sm w-full relative shadow-2xl border"
           style="background:linear-gradient(160deg,#17120c,#0b0b0d);border-color:rgba(228,192,122,0.3);">
        <button @click="mostrarConfig=false" class="absolute top-4 right-4 text-gray-400 hover:text-white transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style="background:linear-gradient(135deg,#E4C07A,#caa24f);">🦍</div>
          <div>
            <h2 class="text-base font-black text-white tracking-widest" style="font-family:'Impact','Arial Black',sans-serif;">GORI CHICKEN</h2>
            <p class="text-xs font-bold" style="color:#E4C07A;">Elige tu local</p>
          </div>
        </div>
        <p class="text-sm text-gray-400 mb-5">
          ¿En qué Gori Chicken estás? Elige tu local para ver el menú y hacer tu pedido.
        </p>
        <div v-if="sinConexionConfig" class="rounded-xl border p-4 text-sm leading-relaxed mb-4" style="border-color:rgba(228,192,122,0.4);background:rgba(228,192,122,0.1);color:#e8d4a8;">
          📵 <b>Sin conexión.</b> Conéctate a internet para elegir tu local.
        </div>

        <div v-if="!sinConexionConfig">
          <div v-if="cargandoSucursales" class="text-center text-gray-400 py-6">
            <div class="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style="border-color:#E4C07A;border-top-color:transparent;"></div>
            Cargando sucursales...
          </div>
          <div v-else class="space-y-2">
            <button v-for="suc in sucursales" :key="suc.id" @click="configurarTerminal(suc)"
                    class="w-full text-left p-4 border rounded-xl transition-all group hover:bg-white/5"
                    style="border-color:rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
              <div class="flex items-center gap-2">
                <span class="font-bold text-white text-sm group-hover:text-[#E4C07A]">{{ suc.nombre }}</span>
                <span v-if="!estadoSucursal(suc).abierto" class="text-[10px] font-black px-1.5 py-0.5 rounded"
                      style="background: rgba(220,38,38,0.18); color:#fca5a5; border:1px solid rgba(248,113,113,0.4);">CERRADO</span>
              </div>
              <div class="text-[11px] mt-1" style="color:rgba(228,192,122,0.7);">🕐 {{ resumenHorario(suc) }}</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { avisar } from '../../utilidades/dialogo'
import { useTotemStore } from '../../almacenes/totem'
import { useCarritoStore } from '../../almacenes/carrito'
import { estadoSucursal, resumenHorario } from '../../utilidades/horarios'

const router = useRouter()
const route = useRoute()
const totemStore = useTotemStore()
const carrito = useCarritoStore()
// Modo CLIENTE (/pedir): elige su sucursal cada vez y puede cambiar.
// Modo KIOSKO (/totem): el staff inicia sesión y queda fijo en su sucursal.
const modoCliente = computed(() => route.path === '/pedir')
const mostrarConfig = ref(false)
const sinConexionConfig = ref(false) // true cuando no hay internet para iniciar/elegir
const sucursales = ref([])            // lista de locales (solo modo cliente)
const cargandoSucursales = ref(false)

// Local elegido actualmente (nombre de la sucursal), para mostrarlo y poder cambiarlo
const localActual = computed(() => totemStore.usuario?.sucursal || '')

// Comprobante de hoy guardado en este celular: permite recuperarlo si el cliente
// cerró el navegador. Lo lee del mismo lugar donde lo dejó la pantalla de Pago.
const comprobanteGuardado = ref(null)
function cargarComprobante() {
  try {
    const c = JSON.parse(localStorage.getItem('gori_comprobante') || 'null')
    comprobanteGuardado.value = (c && c.dia === new Date().toDateString()) ? c : null
  } catch (e) { comprobanteGuardado.value = null }
}
const verComprobante = () => router.push('/totem/pago?ver=1')

// ── Estado del pedido del cliente (seguimiento en vivo, solo modo cliente) ──
// POR_COBRAR (pasa a caja) → PENDIENTE (llegó a cocina) → EN PREPARACION → LISTO.
const estadoPedido = ref(null)
let estadoTimer = null
const estadoInfo = computed(() => {
  switch (estadoPedido.value) {
    case 'POR_COBRAR':     return { icono: '🧾', texto: 'Pasa a la caja a confirmar', style: 'background:rgba(234,179,8,.15);color:#fde047;border:1px solid rgba(234,179,8,.4);' }
    case 'PENDIENTE':      return { icono: '🍳', texto: 'Recibido en cocina', style: 'background:rgba(228,192,122,.15);color:#E4C07A;border:1px solid rgba(228,192,122,.4);' }
    case 'EN PREPARACION': return { icono: '🔥', texto: 'En preparación', style: 'background:rgba(249,115,22,.15);color:#fdba74;border:1px solid rgba(249,115,22,.4);' }
    case 'LISTO':          return { icono: '✅', texto: '¡Listo para recoger!', style: 'background:rgba(34,197,94,.18);color:#86efac;border:1px solid rgba(34,197,94,.5);' }
    default: return null
  }
})
async function consultarEstado() {
  if (!modoCliente.value) return
  const c = comprobanteGuardado.value
  const token = totemStore.token
  if (!c || !c.clienteRef || !token) return
  try {
    const res = await fetch(`/api/pedidos/estado/${encodeURIComponent(c.clienteRef)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.status === 404) { marcarRecogido(); return }   // el pedido ya no existe
    if (res.ok) {
      const data = await res.json()
      estadoPedido.value = data.estado
      if (data.estado === 'ENTREGADO') marcarRecogido()    // ya se completó → desaparece
    }
  } catch (e) { /* sin conexión: se mantiene el último estado mostrado */ }
}
function marcarRecogido() {
  localStorage.removeItem('gori_comprobante')
  comprobanteGuardado.value = null
  estadoPedido.value = null
  if (estadoTimer) { clearInterval(estadoTimer); estadoTimer = null }
}

// ── Partículas ──
const particles = ref([])
function generateParticles() {
  const colors = [
    'rgba(247,227,161,0.6)', 'rgba(228,192,122,0.55)', 'rgba(201,155,63,0.5)',
    'rgba(255,180,60,0.38)', 'rgba(228,192,122,0.35)', 'rgba(255,220,120,0.3)'
  ]
  particles.value = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 9 + 3,
    color: colors[Math.floor(Math.random() * colors.length)],
    duration: Math.random() * 7 + 5,
    delay: Math.random() * 9,
    blur: Math.random() * 2.5 + 0.5,
    opacity: Math.random() * 0.55 + 0.2
  }))
}

// ── Slogan typewriter ──
const SLOGAN = '¡El Pollito del Pueblo!'
const sloganVisible = ref('')
let twIdx = 0
let twTimer = null
function startTypewriter() {
  sloganVisible.value = ''
  twIdx = 0
  twTimer = setInterval(() => {
    if (twIdx < SLOGAN.length) {
      sloganVisible.value += SLOGAN[twIdx++]
    } else {
      clearInterval(twTimer)
    }
  }, 60)
}

// ── Inactividad ──
const inactividad = ref(30)
const mostrarCountdown = ref(false)
let inacTimer = null
function resetInactivity() {
  inactividad.value = 30
  mostrarCountdown.value = false
}
function startInactivity() {
  inacTimer = setInterval(() => {
    inactividad.value--
    if (inactividad.value <= 10) mostrarCountdown.value = true
    if (inactividad.value <= 0) resetInactivity()
  }, 1000)
}

onMounted(() => {
  // Los accesos directos instalados ANTES apuntaban a /totem (kiosko). Un celular con la
  // app instalada que no sea un kiosko configurado pertenece al canal del cliente, así que
  // se lo redirige. Evita tener que desinstalar y reinstalar el acceso directo.
  if (route.path === '/totem'
      && window.matchMedia('(display-mode: standalone)').matches
      && localStorage.getItem('totem_modo') !== 'kiosko') {
    router.replace('/pedir')
    return
  }

  generateParticles()
  setTimeout(() => startTypewriter(), 1400)
  startInactivity()
  cargarComprobante()
  // Recordar por qué canal entró (para que el menú sepa a dónde volver)
  localStorage.setItem('totem_modo', modoCliente.value ? 'cliente' : 'kiosko')
  // Cliente: seguir el estado del pedido en vivo mientras haya un comprobante activo
  if (modoCliente.value && comprobanteGuardado.value) {
    consultarEstado()
    estadoTimer = setInterval(consultarEstado, 8000)
  }
})
onUnmounted(() => {
  clearInterval(twTimer)
  clearInterval(inacTimer)
  if (estadoTimer) clearInterval(estadoTimer)
})

const ingresarComo = () => {
  if (!totemStore.token) {
    // Sin sesión: el cliente elige su local aquí mismo. El kiosko no: se configura
    // una sola vez con las credenciales del tótem en la pantalla de login, como
    // cualquier otro terminal del sistema.
    if (modoCliente.value) abrirPicker()
    else router.push('/login')
    return
  }
  router.push('/totem/menu')
}

// ── Modo CLIENTE: selector de sucursal (elige su local cada vez) ──
const abrirPicker = async () => {
  mostrarConfig.value = true
  sinConexionConfig.value = false
  sucursales.value = []
  if (!navigator.onLine) { sinConexionConfig.value = true; return }
  cargandoSucursales.value = true
  try {
    const res = await fetch('/api/auth/sucursales')
    if (res.ok) sucursales.value = await res.json()
    else sinConexionConfig.value = true
  } catch (e) { sinConexionConfig.value = true }
  finally { cargandoSucursales.value = false }
}
// El servidor abre la sesión del canal cliente para la sucursal elegida. Antes se
// hacía con la contraseña del tótem escrita aquí mismo, visible para cualquiera que
// abriera el navegador.
const configurarTerminal = async (suc) => {
  if (!navigator.onLine) { sinConexionConfig.value = true; return }
  try {
    const res = await fetch('/api/auth/canal-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sucursalId: suc.id })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      await avisar(err.error || 'Este local aún no está disponible para pedidos.')
      return
    }
    const datos = await res.json()
    totemStore.iniciarSesion(datos.usuario, datos.token)
    localStorage.setItem('totem_modo', 'cliente') // el cliente puede volver a cambiar
    carrito.vaciarCarrito()
    mostrarConfig.value = false
    // Ya NO saltamos directo al menú: el cliente se queda en la bienvenida viendo su
    // sucursal elegida ("Estás en la sucursal X") y entra al menú recién cuando toca
    // "COMENZAR MI PEDIDO". Así puede confirmar el local o elegir otro antes de pedir.
  } catch (e) {
    sinConexionConfig.value = true
  }
}

// El cliente entra al menú desde el botón "COMENZAR MI PEDIDO", una vez elegida su sucursal.
const irAlMenu = () => router.push('/totem/menu')

// ── Ondas doradas al tocar ──
// Damos feedback visual donde el cliente toca y entramos un instante después,
// para que alcance a verse la onda (se siente más "vivo" que entrar de golpe).
const ondas = ref([])
let ondaId = 0
const alTocar = (e) => {
  if (mostrarConfig.value) return
  const id = ++ondaId
  ondas.value.push({ id, x: e.clientX, y: e.clientY })
  setTimeout(() => { ondas.value = ondas.value.filter(o => o.id !== id) }, 700)
  resetInactivity()
  // Solo el KIOSKO entra al tocar cualquier parte de la pantalla. En modo CLIENTE la
  // navegación la manejan los botones (elegir sucursal / comenzar / cambiar), para que
  // el cliente pueda ver su sucursal y elegir otra sin saltar de golpe al menú.
  if (!modoCliente.value) setTimeout(() => ingresarComo(), 180)
}

// El tótem ya no se inicia desde esta pantalla: se configura una sola vez con sus
// credenciales en /login, como la caja y la cocina. Aquí solo queda el selector de
// local del cliente.
</script>

<style scoped>
/* ─── Grid decorativo ─── */
.grid-bg {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 50px 50px;
  animation: gridDrift 20s linear infinite;
}
@keyframes gridDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 50px 50px; }
}

/* ─── Ondas ─── */
.wave1 { animation: waveMove 8s ease-in-out infinite; }
.wave2 { animation: waveMove 11s ease-in-out infinite reverse; }
.wave3 { animation: waveMove 14s ease-in-out infinite; }
@keyframes waveMove {
  0%,100% { d: path("M0,200 C240,100 480,300 720,200 C960,100 1200,300 1440,200 L1440,400 L0,400 Z"); }
  50%      { d: path("M0,220 C240,320 480,120 720,220 C960,320 1200,120 1440,220 L1440,400 L0,400 Z"); }
}

/* ─── Partículas ─── */
.particle {
  animation: particleRise linear infinite;
  will-change: transform, opacity;
}
@keyframes particleRise {
  0%   { transform: translateY(0) translateX(0) scale(1);   opacity: 0; }
  10%  { opacity: 1; }
  80%  { opacity: 0.5; }
  100% { transform: translateY(-110vh) translateX(40px) scale(0.2); opacity: 0; }
}

/* ─── Orbs glow ─── */
.glow-orb  { animation: glowPulse 4s ease-in-out infinite; }
.glow-orb-2 { animation: glowPulse 6s ease-in-out infinite reverse; }
@keyframes glowPulse {
  0%,100% { opacity: 0.6; transform: translateX(-50%) scale(1); }
  50%     { opacity: 1;   transform: translateX(-50%) scale(1.18); }
}

/* ─── Logo flotante ─── */
.logo-float {
  animation: logoFloat 4s ease-in-out infinite;
  filter: drop-shadow(0 14px 45px rgba(255,80,20,0.55));
}
@keyframes logoFloat {
  0%,100% { transform: translateY(0); filter: drop-shadow(0 14px 45px rgba(255,80,20,0.55)); }
  50%     { transform: translateY(-16px); filter: drop-shadow(0 28px 60px rgba(255,80,20,0.75)); }
}

/* ─── Gorila glow ─── */
.gorilla-svg { animation: gorillaGlow 3s ease-in-out infinite; }
@keyframes gorillaGlow {
  0%,100% { filter: drop-shadow(0 0 10px rgba(255,80,20,0.45)); }
  50%     { filter: drop-shadow(0 0 28px rgba(255,80,20,0.85)); }
}

/* ─── Ring externo ─── */
.ring-pulse { animation: ringExpand 3.5s ease-out infinite; }
@keyframes ringExpand {
  0%   { transform: scale(0.7); opacity: 0.9; }
  100% { transform: scale(1.8); opacity: 0; }
}

/* ─── Letras animadas ─── */
.letter-animate {
  display: inline-block;
  animation: letterDrop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
}
/* CHICKEN en degradado dorado (igual que el título del menú) */
.letra-oro {
  background: linear-gradient(135deg, #F7E3A1 0%, #E4C07A 45%, #C99B3F 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 30px rgba(228,192,122,0.45));
}
@keyframes letterDrop {
  0%   { transform: translateY(-50px) rotateX(90deg) scale(0.8); opacity: 0; }
  100% { transform: translateY(0) rotateX(0deg) scale(1); opacity: 1; }
}

/* ─── Slogan ─── */
.slogan-anim { animation: fadeUp 0.8s ease-out 1.2s both; }
@keyframes fadeUp {
  0%   { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
.cursor-blink { animation: cursorBlink 0.8s step-end infinite; }
@keyframes cursorBlink {
  0%,100% { opacity: 1; }
  50%     { opacity: 0; }
}

/* ─── CTA principal ─── */
.touch-btn-anim { animation: fadeUp 0.8s ease-out 1.6s both; }

.cta-oro {
  background: linear-gradient(135deg, #F7E3A1 0%, #E4C07A 45%, #C99B3F 100%);
  color: #17120c;
  border: none;
  cursor: pointer;
  box-shadow: 0 10px 40px rgba(228,192,122,0.4), inset 0 1px 0 rgba(255,255,255,0.55);
  animation: ctaBreath 2.8s ease-in-out infinite;
  transition: transform 0.15s ease;
}
.cta-oro:active { transform: scale(0.95); }
@keyframes ctaBreath {
  0%,100% { transform: scale(1);    box-shadow: 0 10px 40px rgba(228,192,122,0.35), inset 0 1px 0 rgba(255,255,255,0.55); }
  50%     { transform: scale(1.045); box-shadow: 0 16px 58px rgba(228,192,122,0.65), inset 0 1px 0 rgba(255,255,255,0.55); }
}

/* Brillo que barre el botón */
.cta-shine {
  background: linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.7) 50%, transparent 80%);
  transform: translateX(-130%);
  animation: ctaShine 3.4s ease-in-out infinite;
}
@keyframes ctaShine {
  0%      { transform: translateX(-130%); }
  55%,100%{ transform: translateX(230%); }
}

/* Halo detrás del botón */
.cta-halo { animation: haloPulse 2.8s ease-in-out infinite; }
@keyframes haloPulse {
  0%,100% { opacity: 0.5; transform: scale(0.9); }
  50%     { opacity: 1;   transform: scale(1.12); }
}

.cta-hand { animation: touchIconBounce 1.8s ease-in-out infinite; }
@keyframes touchIconBounce {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-4px); }
}
.cta-arrow { animation: arrowNudge 1.6s ease-in-out infinite; }
@keyframes arrowNudge {
  0%,100% { transform: translateX(0); }
  50%     { transform: translateX(5px); }
}

/* ─── Onda dorada al tocar ─── */
.onda {
  position: fixed;
  width: 14px; height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 9999px;
  border: 2px solid rgba(228,192,122,0.9);
  pointer-events: none;
  z-index: 40;
  animation: ondaExpand 0.7s ease-out forwards;
}
@keyframes ondaExpand {
  0%   { transform: scale(1);  opacity: 0.9; }
  100% { transform: scale(24); opacity: 0; }
}

/* ─── Resplandor de brasa (fuego) ─── */
.brasa-glow { animation: brasaPulse 3.5s ease-in-out infinite; }
@keyframes brasaPulse {
  0%,100% { opacity: 0.75; transform: translateX(-50%) scaleY(1); }
  50%     { opacity: 1;    transform: translateX(-50%) scaleY(1.12); }
}

.animate-pulse-text { animation: textPulse 2.5s ease-in-out infinite; }
@keyframes textPulse {
  0%,100% { opacity: 0.45; }
  50%     { opacity: 1; }
}

/* ─── Modal ─── */
.modal-slide { animation: modalSlideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes modalSlideIn {
  0%   { transform: scale(0.85) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

/* ─── Barra inactividad ─── */
.inactivity-bar { animation: fadeUp 0.4s ease-out; }

/* Respeta a quien prefiere menos movimiento (accesibilidad) */
@media (prefers-reduced-motion: reduce) {
  .cta-oro, .cta-shine, .cta-halo, .cta-hand, .cta-arrow,
  .brasa-glow, .particle, .logo-float, .gorilla-svg, .ring-pulse { animation: none; }
}
</style>
