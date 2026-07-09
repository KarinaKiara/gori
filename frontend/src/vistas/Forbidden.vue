<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center p-6">
    <div class="text-center max-w-md">
      
      <!-- Icono de candado animado -->
      <div class="w-32 h-32 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/30 animate-pulse">
        <svg class="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
      </div>

      <!-- Código de error -->
      <p class="text-red-500 font-mono text-sm font-bold tracking-widest mb-2">ERROR 403</p>

      <!-- Título -->
      <h1 class="text-4xl font-extrabold text-white mb-3">Acceso Denegado</h1>

      <!-- Descripción -->
      <p class="text-slate-400 mb-2">
        No tienes permiso para acceder a esta sección.
      </p>
      <p class="text-slate-500 text-sm mb-8">
        Tu rol actual es 
        <span class="font-bold text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded">
          {{ rolActual }}
        </span>
        y no tiene acceso a esta área del sistema.
      </p>

      <!-- Separador -->
      <div class="w-16 h-0.5 bg-slate-700 mx-auto mb-8"></div>

      <!-- Botón de regreso -->
      <button @click="regresarAMiVista" 
        class="w-full bg-gori-primary text-white font-bold py-4 rounded-xl hover:bg-rose-700 transition active:scale-95 mb-3">
        Ir a Mi Panel
      </button>
      <button @click="cerrarSesion" 
        class="w-full bg-slate-800 text-slate-400 font-medium py-3 rounded-xl hover:bg-slate-700 hover:text-white transition text-sm">
        Cerrar Sesión
      </button>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../almacenes/auth'

const router = useRouter()
const authStore = useAuthStore()

const rolActual = computed(() => authStore.usuario?.rol || 'DESCONOCIDO')

const regresarAMiVista = () => {
  const rol = authStore.usuario?.rol
  if (rol === 'ADMIN')    return router.push('/admin')
  if (rol === 'GERENTE')  return router.push('/gerente')
  if (rol === 'CAJERO')   return router.push('/pos')
  if (rol === 'COCINERO') return router.push('/kds')
  router.push('/totem')
}

const cerrarSesion = () => {
  authStore.cerrarSesion()
  router.push('/login')
}
</script>
