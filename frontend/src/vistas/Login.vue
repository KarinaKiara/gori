<template>
  <div class="min-h-screen flex overflow-hidden relative"
       style="background: linear-gradient(135deg, #071d2c 0%, #0d3347 50%, #0a2234 100%);">

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
      <!-- Brillo ambiental naranja -->
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-64 pointer-events-none"
           style="background: radial-gradient(ellipse at center bottom, rgba(255,90,30,0.2) 0%, transparent 70%);"></div>

      <!-- Logo gorila SVG -->
      <div class="relative z-10 flex flex-col items-center"
           style="filter: drop-shadow(0 10px 50px rgba(255,80,20,0.45));">
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
          <h2 class="font-black tracking-widest leading-none"
              style="font-size: 2.8rem; font-family: 'Impact','Arial Black',sans-serif; color: #FF4500; text-shadow: 0 3px 20px rgba(255,69,0,0.6);">
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
                class="flex items-center gap-1 text-xs px-3 py-1 rounded-full border border-orange-500/30"
                style="background: rgba(255,69,0,0.1); color: rgba(255,150,80,0.8);">
            <span class="w-3.5 h-3.5 rounded-full bg-orange-500/50 flex items-center justify-center text-[8px] font-bold text-white">{{ n }}</span>
            {{ ['Melchor','El Prado','Recoleta','Centro'][n-1] }}
          </span>
        </div>
      </div>
    </div>

    <!-- Panel derecho: Formulario -->
    <div class="w-full lg:w-[480px] flex flex-col justify-center items-center px-8 py-12 relative z-10"
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
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"/>
                </svg>
              </div>
              <input id="email" v-model="email" type="email" autocomplete="email" required
                     placeholder="tu@gorichicken.com"
                     class="block w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                     style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"
                     @focus="$event.target.style.border='1px solid rgba(255,100,30,0.5)'"
                     @blur="$event.target.style.border='1px solid rgba(255,255,255,0.1)'"/>
            </div>
          </div>

          <div>
            <label for="password" class="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-widest">
              Contraseña
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
              <input id="password" v-model="password" type="password" autocomplete="current-password" required
                     placeholder="••••••••"
                     class="block w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                     style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);"
                     @focus="$event.target.style.border='1px solid rgba(255,100,30,0.5)'"
                     @blur="$event.target.style.border='1px solid rgba(255,255,255,0.1)'"/>
            </div>
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
                  class="w-full py-4 rounded-xl font-black text-sm text-white uppercase tracking-widest transition-all transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden"
                  style="background: linear-gradient(135deg, #FF4500 0%, #FF6B35 100%); box-shadow: 0 4px 20px rgba(255,69,0,0.4);">
            <span v-if="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Verificando...
            </span>
            <span v-else>Iniciar Sesión</span>
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../almacenes/auth'

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')
const router = useRouter()
const authStore = useAuthStore()

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
