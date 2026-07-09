<template>
  <div class="totem-welcome h-screen w-full flex flex-col items-center justify-center relative overflow-hidden select-none cursor-pointer"
       @click="ingresarComo('cliente')" @mousemove="resetInactivity">

    <!-- ═══ FONDO: gradiente oscuro base ═══ -->
    <div class="absolute inset-0" style="background: radial-gradient(ellipse at 50% 70%, #0f3d5a 0%, #071d2c 50%, #030c14 100%);"></div>

    <!-- Grid decorativo animado -->
    <div class="absolute inset-0 pointer-events-none grid-bg"></div>

    <!-- Ondas SVG animadas -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <svg class="absolute bottom-0 left-0 w-full" style="height:55%;" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
        <path class="wave wave1" d="M0,200 C240,100 480,300 720,200 C960,100 1200,300 1440,200 L1440,400 L0,400 Z" fill="rgba(13,51,71,0.45)"/>
        <path class="wave wave2" d="M0,260 C240,160 480,360 720,260 C960,160 1200,360 1440,260 L1440,400 L0,400 Z" fill="rgba(10,34,52,0.35)"/>
        <path class="wave wave3" d="M0,310 C240,220 480,380 720,310 C960,230 1200,380 1440,310 L1440,400 L0,400 Z" fill="rgba(7,20,36,0.55)"/>
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
      <div class="glow-orb absolute bottom-0 left-1/2 -translate-x-1/2"
           style="width:750px;height:420px;background:radial-gradient(ellipse,rgba(255,80,20,0.18) 0%,transparent 70%);"></div>
      <div class="glow-orb-2 absolute top-0 left-1/2 -translate-x-1/2"
           style="width:520px;height:260px;background:radial-gradient(ellipse,rgba(20,100,170,0.22) 0%,transparent 70%);"></div>
    </div>

    <!-- ═══ CONTENIDO CENTRAL ═══ -->
    <div class="relative z-10 flex flex-col items-center text-center px-6">

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
                class="letter-animate font-black leading-none"
                :style="{ animationDelay: (0.35 + i * 0.07) + 's', fontSize: 'clamp(3.2rem,8.5vw,6rem)', fontFamily:`'Impact','Arial Black',sans-serif`, letterSpacing:'0.06em', color:'#FF4500', textShadow:'0 0 35px rgba(255,80,20,0.6)' }">
            {{ letra }}
          </span>
        </div>
      </div>

      <!-- Slogan typewriter -->
      <p class="slogan-anim text-sm md:text-base font-bold tracking-[0.3em] uppercase mb-8 mt-2"
         style="color:rgba(255,160,80,0.9);">
        {{ sloganVisible }}<span class="cursor-blink">|</span>
      </p>

      <!-- Botón touch pulsante -->
      <div class="touch-btn-anim flex flex-col items-center gap-4">
        <div class="relative flex items-center justify-center">
          <div class="pulse-ring-lg absolute w-32 h-32 rounded-full border border-orange-400/20"></div>
          <div class="pulse-ring absolute w-24 h-24 rounded-full border border-orange-400/35"></div>
          <div class="pulse-ring-2 absolute w-20 h-20 rounded-full border border-orange-400/25"></div>
          <div class="touch-circle w-16 h-16 rounded-full flex items-center justify-center border-2 border-orange-400/80"
               style="background:rgba(255,69,0,0.18);backdrop-filter:blur(10px);box-shadow:0 0 40px rgba(255,80,20,0.4);">
            <svg class="w-7 h-7 text-orange-400 touch-icon" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 11.24V7.5C9 6.12 10.12 5 11.5 5S14 6.12 14 7.5v3.74c1.21-.81 2-2.18 2-3.74C16 5.01 13.99 3 11.5 3S7 5.01 7 7.5c0 1.56.79 2.93 2 3.74zm9.84 4.63l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6c0-.83-.67-1.5-1.5-1.5S10 6.67 10 7.5v10.74l-3.43-.72c-.08-.01-.15-.03-.24-.03-.31 0-.59.13-.79.33l-.79.8 4.94 4.94c.27.27.65.44 1.06.44h6.79c.75 0 1.33-.55 1.44-1.28l.75-5.27c.01-.07.02-.14.02-.2 0-.62-.38-1.16-.91-1.38z"/>
            </svg>
          </div>
        </div>
        <p class="text-white/70 text-sm font-semibold tracking-[0.25em] uppercase animate-pulse-text">
          Toca para comenzar tu pedido
        </p>
      </div>

      <!-- Local elegido (se puede cambiar) -->
      <div v-if="localActual" class="mt-5 flex items-center gap-2 text-xs bg-white/5 px-4 py-2 rounded-full border border-orange-500/25 z-30" @click.stop>
        <span class="text-gray-300">📍 Pedís en <b class="text-orange-400">{{ localActual }}</b></span>
        <button @click.stop="abrirConfiguracion" class="text-white/60 hover:text-white underline">cambiar</button>
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
        <span class="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style="background:rgba(255,69,0,0.55);">{{ i+1 }}</span>
        <span>{{ suc }}</span>
        <span v-if="i < 3" class="w-px h-3 bg-gray-600 ml-1.5"></span>
      </div>
    </div>

    <!-- Botón config oculto -->
    <div class="absolute bottom-5 right-5 z-50">
      <button @click.stop="abrirConfiguracion"
              class="text-xs text-gray-700 hover:text-gray-400 opacity-0 hover:opacity-100 transition-all duration-500 p-2">⚙</button>
    </div>

    <!-- ═══ MODAL CONFIGURACIÓN ═══ -->
    <div v-if="mostrarConfig" class="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" @click.self="mostrarConfig=false">
      <div class="modal-slide rounded-3xl p-8 max-w-sm w-full relative shadow-2xl border"
           style="background:linear-gradient(160deg,#071d2c,#0a2234);border-color:rgba(255,69,0,0.3);">
        <button @click="mostrarConfig=false" class="absolute top-4 right-4 text-gray-400 hover:text-white transition">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
               style="background:linear-gradient(135deg,#FF4500,#FF6B35);">🦍</div>
          <div>
            <h2 class="text-base font-black text-white tracking-widest" style="font-family:'Impact','Arial Black',sans-serif;">GORI CHICKEN</h2>
            <p class="text-xs text-orange-400 font-bold">Elige tu local</p>
          </div>
        </div>
        <p class="text-sm text-gray-400 mb-5">¿En qué Gori Chicken estás? Elige tu local para ver el menú y hacer tu pedido.</p>
        <div v-if="cargandoSucursales" class="text-center text-gray-400 py-6">
          <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Cargando sucursales...
        </div>
        <div v-else class="space-y-2">
          <button v-for="suc in sucursales" :key="suc.id" @click="configurarTerminal(suc)"
                  class="w-full text-left p-4 border rounded-xl transition-all group hover:border-orange-500/50 hover:bg-white/5"
                  style="border-color:rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);">
            <div class="font-bold text-white group-hover:text-orange-400 transition text-sm">{{ suc.nombre }}</div>
            <div class="text-xs text-gray-500 mt-0.5">{{ suc.ubicacion || 'Sin ubicación' }}</div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../almacenes/auth'

const router = useRouter()
const authStore = useAuthStore()
const mostrarConfig = ref(false)
const sucursales = ref([])
const cargandoSucursales = ref(false)

// Local elegido actualmente (nombre de la sucursal), para mostrarlo y poder cambiarlo
const localActual = computed(() => authStore.usuario?.sucursal || '')

// ── Partículas ──
const particles = ref([])
function generateParticles() {
  const colors = [
    'rgba(255,80,20,0.65)', 'rgba(255,140,30,0.5)', 'rgba(255,60,10,0.45)',
    'rgba(255,180,60,0.38)', 'rgba(200,50,10,0.42)', 'rgba(255,220,80,0.3)'
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
  generateParticles()
  setTimeout(() => startTypewriter(), 1400)
  startInactivity()
})
onUnmounted(() => {
  clearInterval(twTimer)
  clearInterval(inacTimer)
})

const ingresarComo = () => {
  if (!authStore.token) { abrirConfiguracion(); return }
  router.push('/totem/menu')
}

const abrirConfiguracion = async () => {
  mostrarConfig.value = true
  cargandoSucursales.value = true
  try {
    const res = await fetch('/api/auth/sucursales')
    if (res.ok) sucursales.value = await res.json()
  } catch (e) { console.error(e) }
  finally { cargandoSucursales.value = false }
}

const configurarTerminal = async (suc) => {
  const u = suc.usuarios?.find(u => u.correo)
  if (!u) { alert('Este local aún no está disponible para pedidos.'); return }
  const ok = await authStore.login(u.correo, 'admin123')
  if (ok) {
    mostrarConfig.value = false
    router.push('/totem/menu') // al elegir el local, va directo al menú
  } else {
    alert('No se pudo conectar con el local. Intenta de nuevo.')
  }
}
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

/* ─── Botón touch ─── */
.touch-btn-anim { animation: fadeUp 0.8s ease-out 1.6s both; }

.pulse-ring-lg { animation: pulseRing 3s ease-out 0.4s infinite; }
.pulse-ring    { animation: pulseRing 2.5s ease-out infinite; }
.pulse-ring-2  { animation: pulseRing 2.5s ease-out 0.7s infinite; }
@keyframes pulseRing {
  0%   { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.7); opacity: 0; }
}

.touch-circle { animation: touchPulse 2s ease-in-out infinite; }
@keyframes touchPulse {
  0%,100% { box-shadow: 0 0 25px rgba(255,80,20,0.3); }
  50%     { box-shadow: 0 0 50px rgba(255,80,20,0.6); }
}

.touch-icon { animation: touchIconBounce 2s ease-in-out infinite; }
@keyframes touchIconBounce {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-3px); }
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
</style>
