<template>
  <div class="min-h-screen flex overflow-hidden relative"
       style="background: linear-gradient(135deg, #071d2c 0%, #0d3347 50%, #0a2234 100%);"
       @mousemove="moverMouse" @mouseleave="resetMouse">

    <!-- Panel izquierdo decorativo con logo (visible en pantallas grandes) -->
    <div class="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden"
         style="background: linear-gradient(160deg, #091e2e 0%, #0f3347 60%, #071d2c 100%);">
      <!-- Ondas de fondo -->
      <div class="absolute inset-0 opacity-15 pointer-events-none">
        <svg viewBox="0 0 500 700" class="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <path d="M0,100 Q125,60 250,100 T500,100 L500,0 L0,0Z" fill="#1a5276"/>
          <path d="M0,200 Q125,160 250,200 T500,200 L500,100 Q375,140 250,100 T0,100Z" fill="#154360"/>
          <path d="M0,320 Q125,280 250,320 T500,320 L500,200 Q375,240 250,200 T0,200Z" fill="#0d2c3e"/>
        </svg>
      </div>

      <!-- Orbes de luz que flotan (juego de luces ambiental) -->
      <div class="orbe orbe-1 pointer-events-none"></div>
      <div class="orbe orbe-2 pointer-events-none"></div>

      <!-- Brasas que suben (a la brasa 🔥) -->
      <div class="brasas pointer-events-none">
        <span v-for="b in 14" :key="'br'+b" class="brasa" :style="brasaStyle(b)"></span>
      </div>

      <!-- Brillo ambiental naranja que respira -->
      <div class="brillo-respira absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none"
           style="background: radial-gradient(ellipse at center bottom, rgba(255,90,30,0.2) 0%, transparent 70%);"></div>

      <!-- Logo gorila SVG -->
      <div class="logo-entra relative z-10 flex flex-col items-center"
           style="filter: drop-shadow(0 10px 50px rgba(255,80,20,0.45)); perspective: 900px;">
        <!-- Halo giratorio detrás del logo -->
        <div class="halo pointer-events-none"></div>
        <!-- Envoltorio que se inclina siguiendo el mouse (parallax 3D) -->
        <div class="logo-tilt" :style="tiltStyle">
        <div class="logo-flota flex flex-col items-center">
        <svg width="180" height="230" viewBox="0 0 220 280" fill="none">
          <defs>
            <radialGradient id="lg1" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="#FF6B35"/>
              <stop offset="60%" stop-color="#FF4500"/>
              <stop offset="100%" stop-color="#E83200"/>
            </radialGradient>
            <radialGradient id="lg2" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#0D2E3F"/>
              <stop offset="100%" stop-color="#071824"/>
            </radialGradient>
          </defs>
          <ellipse cx="110" cy="260" rx="70" ry="12" fill="rgba(0,0,0,0.3)"/>
          <path d="M110 80 C60 80 25 130 25 185 C25 240 65 265 110 265 C155 265 195 240 195 185 C195 130 160 80 110 80 Z" fill="url(#lg1)"/>
          <path d="M25 185 C15 170 10 155 15 140 C20 125 30 120 35 130 C25 145 25 165 25 185Z" fill="#FF4500"/>
          <path d="M15 150 C5 145 2 135 8 125 C12 118 22 120 20 130Z" fill="#FF4500"/>
          <path d="M18 165 C8 160 3 148 10 140 C14 135 24 138 22 148Z" fill="#FF4500"/>
          <path d="M195 185 C205 170 210 155 205 140 C200 125 190 120 185 130 C195 145 195 165 195 185Z" fill="#FF4500"/>
          <path d="M205 150 C215 145 218 135 212 125 C208 118 198 120 200 130Z" fill="#FF4500"/>
          <path d="M202 165 C212 160 217 148 210 140 C206 135 196 138 198 148Z" fill="#FF4500"/>
          <path d="M85 90 C75 75 72 58 80 48 C86 40 94 44 95 55 C95 42 98 28 108 22 C118 28 121 42 121 55 C122 44 130 40 136 48 C144 58 141 75 131 90" fill="#FF4500"/>
          <path d="M110 115 C85 115 68 135 68 162 C68 188 82 205 110 205 C138 205 152 188 152 162 C152 135 135 115 110 115Z" fill="url(#lg2)"/>
          <path d="M95 200 C90 218 88 235 90 250 C96 255 110 258 110 258 C110 258 124 255 130 250 C132 235 130 218 125 200Z" fill="url(#lg2)"/>
          <rect x="78" y="52" width="64" height="14" rx="7" fill="white"/>
          <ellipse cx="110" cy="35" rx="34" ry="28" fill="white"/>
          <ellipse cx="98" cy="28" rx="12" ry="18" fill="rgba(200,200,200,0.3)"/>
          <ellipse cx="125" cy="22" rx="16" ry="18" fill="white"/>
          <ellipse cx="120" cy="17" rx="8" ry="12" fill="rgba(200,200,200,0.3)"/>
        </svg>

        <div class="mt-4 text-center">
          <h1 class="text-white font-black tracking-widest leading-none"
              style="font-size: 3.2rem; font-family: 'Impact','Arial Black',sans-serif; text-shadow: 0 3px 15px rgba(0,0,0,0.5);">
            GORI
          </h1>
          <h2 class="texto-brasa font-black tracking-widest leading-none"
              style="font-size: 2.8rem; font-family: 'Impact','Arial Black',sans-serif; color: #FF4500;">
            CHICKEN
          </h2>
          <p class="text-xs font-bold tracking-widest mt-2 uppercase"
             style="color: rgba(255,150,80,0.8); letter-spacing: 0.3em;">
            ¡El Pollito del Pueblo!
          </p>
        </div>

        <!-- Badge de sucursales -->
        <div class="mt-8 flex items-center gap-2 flex-wrap justify-center">
          <span v-for="n in 4" :key="n"
                class="badge-sucursal flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-orange-500/30"
                :style="`background: rgba(255,69,0,0.1); color: rgba(255,150,80,0.8); animation-delay: ${0.6 + n * 0.12}s;`">
            <span class="w-3.5 h-3.5 rounded-full bg-orange-500/50 flex items-center justify-center text-[8px] font-bold text-white">{{ n }}</span>
            {{ ['Melchor','El Prado','Recoleta','Centro'][n-1] }}
          </span>
        </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Panel derecho: Formulario -->
    <div class="panel-entra w-full lg:w-[480px] flex flex-col justify-center items-center px-8 py-12 relative z-10"
         style="background: rgba(5,15,25,0.85); backdrop-filter: blur(20px);">

      <!-- Logo pequeño (solo en móvil) -->
      <div class="flex lg:hidden items-center gap-3 mb-8">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
             style="background: linear-gradient(135deg, #FF4500, #FF6B35);">🦍</div>
        <div>
          <p class="text-white font-black text-xl tracking-widest"
             style="font-family: 'Impact','Arial Black',sans-serif;">GORI CHICKEN</p>
          <p class="text-orange-400 text-xs font-bold tracking-wider">¡El Pollito del Pueblo!</p>
        </div>
      </div>

      <div class="w-full max-w-sm">
        <!-- Título del formulario -->
        <div class="mb-8">
          <h2 class="text-2xl font-black text-white mb-1">Bienvenido al Sistema</h2>
          <p class="text-gray-400 text-sm">Ingresa con tus credenciales de acceso</p>
          <!-- Línea decorativa naranja -->
          <div class="mt-3 w-12 h-1 rounded-full" style="background: linear-gradient(90deg, #FF4500, #FF6B35);"></div>
        </div>

        <!-- Formulario -->
        <form class="space-y-5" @submit.prevent="handleLogin" novalidate>
          <div>
            <label for="email" class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">
              Correo Electrónico
            </label>
            <div class="campo-input relative">
              <div class="icono absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
              </div>
              <input id="email" v-model="email" type="email" autocomplete="email" required
                     placeholder="tu@gorichicken.com"
                     class="entrada block w-full pl-11 pr-4 py-4 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"/>
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">
              Contraseña
            </label>
            <div class="campo-input relative">
              <div class="icono absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <input id="password" v-model="password" :type="mostrarPassword ? 'text' : 'password'"
                     autocomplete="current-password" required
                     placeholder="••••••••" @keyup="detectarCaps" @keydown="detectarCaps"
                     class="entrada block w-full pl-11 pr-12 py-4 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"/>
              <!-- Ojo: mostrar / ocultar contraseña -->
              <button type="button" @click="mostrarPassword = !mostrarPassword"
                      :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                      class="ojo absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg v-if="!mostrarPassword" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
            <!-- Aviso de Bloq Mayús -->
            <transition name="caps-fade">
              <p v-if="capsOn" class="flex items-center gap-1.5 mt-2 text-xs font-semibold" style="color:#FFB27A;">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7M5 19h14"/>
                </svg>
                Bloq Mayús está activado
              </p>
            </transition>
          </div>

          <!-- Error -->
          <div v-if="errorMessage"
               class="flex items-center gap-3 p-4 rounded-xl text-sm border"
               style="background: rgba(255,69,0,0.12); border-color: rgba(255,69,0,0.3); color: #FF8C60;">
            <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            {{ errorMessage }}
          </div>

          <!-- Botón -->
          <button type="submit" :disabled="loading"
                  class="boton-brasa w-full py-4 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
                  style="background: linear-gradient(135deg, #FF4500 0%, #FF6B35 100%); box-shadow: 0 4px 20px rgba(255,69,0,0.4);">
            <!-- Barrido de luz -->
            <span v-if="!loading" class="barrido pointer-events-none"></span>
            <span v-if="loading" class="flex items-center justify-center gap-2 relative z-10">
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Verificando...
            </span>
            <span v-else class="relative z-10 flex items-center justify-center gap-2">
              Iniciar Sesión
              <svg class="flecha h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
              </svg>
            </span>
          </button>
        </form>

        <p class="text-center mt-8 text-xs text-gray-600">
          © 2026 Gori Chicken. Sistema de Gestión Interno.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../almacenes/auth'
import { useTotemStore } from '../almacenes/totem'

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const router = useRouter()
const authStore = useAuthStore()
const totemStore = useTotemStore()

// Mostrar / ocultar contraseña
const mostrarPassword = ref(false)

// Aviso de Bloq Mayús mientras escribe la contraseña
const capsOn = ref(false)
const detectarCaps = (e) => {
  if (e.getModifierState) capsOn.value = e.getModifierState('CapsLock')
}

// ── Parallax 3D: el logo se inclina siguiendo el mouse ──
const inclinaX = ref(0)
const inclinaY = ref(0)
const moverMouse = (e) => {
  const x = e.clientX / window.innerWidth - 0.5   // -0.5 .. 0.5
  const y = e.clientY / window.innerHeight - 0.5
  inclinaX.value = +(y * -10).toFixed(2)          // rotateX
  inclinaY.value = +(x * 12).toFixed(2)           // rotateY
}
const resetMouse = () => { inclinaX.value = 0; inclinaY.value = 0 }
const tiltStyle = computed(() => ({
  transform: `rotateX(${inclinaX.value}deg) rotateY(${inclinaY.value}deg)`,
  transition: 'transform 0.2s ease-out',
  transformStyle: 'preserve-3d',
}))

// Posición/ritmo de cada brasa (determinista por índice, sin saltos al recargar)
const brasaStyle = (i) => {
  const izq = (i * 37) % 100            // reparte las brasas a lo ancho
  const dur = 6 + (i % 5) * 1.4         // duración del ascenso (6s a 11.6s)
  const delay = (i % 7) * 0.9           // arranque escalonado
  const escala = 0.5 + ((i % 4) * 0.35) // tamaños variados
  return `left:${izq}%; animation-duration:${dur}s; animation-delay:${delay}s; transform:scale(${escala});`
}

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  const correoLower = email.value.trim().toLowerCase();

  // Validaciones de campos vacíos
  if (!correoLower || !password.value) {
    errorMessage.value = 'Por favor, completa todos los campos para continuar.';
    loading.value = false;
    return;
  }

  // Validaciones del correo
  if (!correoLower.includes('@')) {
    errorMessage.value = 'El correo debe contener el símbolo "@" (Ej: usuario@gmail.com).';
    loading.value = false;
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLower)) {
    errorMessage.value = 'El formato del correo electrónico no es válido.';
    loading.value = false;
    return;
  }
  if (!correoLower.endsWith('@gmail.com') && !correoLower.endsWith('@gorichicken.com')) {
    errorMessage.value = 'Acceso denegado: Usa un correo @gmail.com o @gorichicken.com.';
    loading.value = false;
    return;
  }

  try {
    const success = await authStore.login(correoLower, password.value)
    if (success) {
      const rol = authStore.usuario?.rol
      if (rol === 'ADMIN') router.push('/admin')
      else if (rol === 'GERENTE') router.push('/gerente')
      else if (rol === 'COCINERO') router.push('/kds')
      else if (rol === 'CAJERO') router.push('/pos')
      else if (rol === 'TOTEM') {
        // El tótem guarda su sesión en llaves propias (totem_*), no en las del
        // operador. Sin este traspaso la sesión quedaba en el lugar equivocado y
        // la pantalla de inicio del tótem, que mira las suyas, volvía a pedir
        // credenciales cada vez que un cliente terminaba su pedido.
        totemStore.iniciarSesion(authStore.usuario, authStore.token)
        authStore.cerrarSesion()
        localStorage.setItem('totem_modo', 'kiosko')
        router.push('/totem')
      }
      else router.push('/totem/menu')
    } else {
      errorMessage.value = 'Credenciales inválidas o error en el servidor.'
    }
  } catch {
    errorMessage.value = 'Ocurrió un error al intentar iniciar sesión.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* ── Entrada del logo (aparece y sube suave) ── */
.logo-entra {
  animation: entraArriba 1s cubic-bezier(0.22, 1, 0.36, 1) both;
}
/* ── Entrada del panel del formulario (desliza desde la derecha) ── */
.panel-entra {
  animation: entraDerecha 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes entraArriba {
  from { opacity: 0; transform: translateY(28px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes entraDerecha {
  from { opacity: 0; transform: translateX(40px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* ── El logo flota lentamente ── */
.logo-flota { animation: flotar 5.5s ease-in-out infinite; }
@keyframes flotar {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-12px); }
}

/* ── Halo giratorio detrás del logo ── */
.halo {
  position: absolute;
  top: 30px;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    transparent 0deg,
    rgba(255,90,30,0.28) 60deg,
    transparent 140deg,
    rgba(255,140,60,0.22) 220deg,
    transparent 320deg);
  filter: blur(26px);
  animation: girar 14s linear infinite;
}
@keyframes girar { to { transform: rotate(360deg); } }

/* ── "CHICKEN" con latido de brasa ── */
.texto-brasa {
  animation: latido 2.8s ease-in-out infinite;
}
@keyframes latido {
  0%, 100% { text-shadow: 0 3px 18px rgba(255,69,0,0.45); }
  50%      { text-shadow: 0 3px 32px rgba(255,90,30,0.95), 0 0 12px rgba(255,140,60,0.6); }
}

/* ── Brillo ambiental que respira ── */
.brillo-respira { animation: respirar 4.5s ease-in-out infinite; }
@keyframes respirar {
  0%, 100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
  50%      { opacity: 1;    transform: translateX(-50%) scale(1.12); }
}

/* ── Orbes de luz que se desplazan ── */
.orbe {
  position: absolute;
  border-radius: 50%;
  filter: blur(70px);
  opacity: 0.5;
}
.orbe-1 {
  width: 320px; height: 320px;
  top: -60px; left: -40px;
  background: radial-gradient(circle, rgba(255,90,30,0.35), transparent 70%);
  animation: derivar1 16s ease-in-out infinite;
}
.orbe-2 {
  width: 260px; height: 260px;
  bottom: -50px; right: -30px;
  background: radial-gradient(circle, rgba(26,82,118,0.5), transparent 70%);
  animation: derivar2 20s ease-in-out infinite;
}
@keyframes derivar1 {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(50px, 40px); }
}
@keyframes derivar2 {
  0%, 100% { transform: translate(0, 0); }
  50%      { transform: translate(-40px, -50px); }
}

/* ── Brasas que suben ── */
.brasas { position: absolute; inset: 0; overflow: hidden; }
.brasa {
  position: absolute;
  bottom: -20px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: radial-gradient(circle, #FFC27A 0%, #FF6B35 55%, rgba(255,69,0,0) 75%);
  box-shadow: 0 0 8px rgba(255,120,40,0.8);
  animation-name: subirBrasa;
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
}
@keyframes subirBrasa {
  0%   { opacity: 0; transform: translateY(0) scale(1); }
  15%  { opacity: 1; }
  70%  { opacity: 0.9; }
  100% { opacity: 0; transform: translateY(-105vh) translateX(24px) scale(0.4); }
}

/* ── Badges de sucursal que aparecen escalonados ── */
.badge-sucursal { animation: aparecerBadge 0.5s ease-out both; }
@keyframes aparecerBadge {
  from { opacity: 0; transform: translateY(10px) scale(0.9); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* ── Botón: barrido de luz que cruza ── */
.barrido {
  position: absolute;
  top: 0; left: -60%;
  width: 50%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.45), transparent);
  transform: skewX(-20deg);
  animation: cruzar 3.2s ease-in-out infinite;
}
@keyframes cruzar {
  0%   { left: -60%; }
  60%  { left: 130%; }
  100% { left: 130%; }
}
.boton-brasa:hover { box-shadow: 0 8px 32px rgba(255,90,30,0.65) !important; }
/* Flecha que se desliza al pasar el mouse */
.flecha { transition: transform 0.25s ease; }
.boton-brasa:hover .flecha { transform: translateX(5px); }

/* ── Campos que se iluminan al escribir/enfocar ── */
.entrada {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}
.campo-input .icono { color: #6b7280; transition: color 0.25s ease, transform 0.25s ease; }
.campo-input:focus-within .entrada {
  border-color: rgba(255,110,40,0.65);
  background: rgba(255,90,30,0.06);
  box-shadow: 0 0 0 4px rgba(255,90,30,0.12), 0 0 22px rgba(255,90,30,0.18);
}
.campo-input:focus-within .icono { color: #FF6B35; transform: scale(1.08); }

/* Botón del ojo (mostrar/ocultar contraseña) */
.ojo { color: #6b7280; transition: color 0.2s ease, transform 0.2s ease; cursor: pointer; }
.ojo:hover { color: #FF8C60; transform: scale(1.12); }
.ojo:active { transform: scale(0.94); }

/* Aviso de Bloq Mayús: entra suave */
.caps-fade-enter-active, .caps-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.caps-fade-enter-from, .caps-fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Chips de sucursal con reacción al pasar el mouse ── */
.badge-sucursal {
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  cursor: default;
}
.badge-sucursal:hover {
  transform: translateY(-3px) scale(1.05) !important;
  background: rgba(255,69,0,0.22) !important;
  border-color: rgba(255,120,50,0.7) !important;
  box-shadow: 0 6px 18px rgba(255,69,0,0.3) !important;
}

/* ── Accesibilidad: quien pida menos movimiento, lo obtiene ── */
@media (prefers-reduced-motion: reduce) {
  .logo-entra, .panel-entra, .logo-flota, .halo, .texto-brasa,
  .brillo-respira, .orbe-1, .orbe-2, .brasa, .badge-sucursal, .barrido {
    animation: none !important;
  }
  .logo-entra, .panel-entra, .badge-sucursal { opacity: 1 !important; transform: none !important; }
  .brasas { display: none; }
}
</style>
