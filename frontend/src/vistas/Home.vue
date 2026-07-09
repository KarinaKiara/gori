<template>
  <div class="min-h-screen bg-gori-background flex flex-col relative overflow-hidden">
    <!-- Decoración de fondo suave -->
    <div class="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-gori-primary/10 to-transparent pointer-events-none"></div>
    <div class="absolute -top-40 -right-40 w-96 h-96 bg-gori-primary/10 rounded-full blur-3xl pointer-events-none"></div>

    <header class="pt-12 pb-8 text-center relative z-10 px-4">
      <div class="inline-flex items-center justify-center space-x-3 mb-4">
        <div class="w-12 h-12 bg-gradient-to-tr from-gori-primary to-rose-400 rounded-xl shadow-lg flex items-center justify-center">
          <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        </div>
        <h1 class="text-4xl md:text-5xl font-extrabold text-gori-dark tracking-tight">Gori Chicken</h1>
      </div>
      <p class="text-lg text-slate-500 font-medium max-w-xl mx-auto">
        Sistema centralizado de gestión para sucursales
      </p>
    </header>

    <main class="flex-grow w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 relative z-10">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        <!-- Tarjeta TÓTEM / POS -->
        <div class="group relative bg-gori-surface rounded-3xl p-8 shadow-soft hover:shadow-premium transition-all duration-300 transform hover:-translate-y-2 border border-slate-100 flex flex-col h-full overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          
          <div class="w-14 h-14 rounded-2xl bg-rose-100 text-gori-primary flex items-center justify-center mb-6">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
          </div>
          
          <h2 class="text-2xl font-bold text-gori-dark mb-3">Tótem y Caja</h2>
          <p class="text-slate-500 mb-8 flex-grow leading-relaxed">
            Punto de venta y auto-atención. Toma pedidos rápidamente con soporte offline continuo.
          </p>
          
          <button @click="$router.push('/totem')" class="w-full bg-gori-primary text-white py-3 px-6 rounded-xl font-semibold shadow-md shadow-rose-200 hover:bg-rose-700 hover:shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2">
            Abrir POS
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>

        <!-- Tarjeta KDS -->
        <div class="group relative bg-gori-surface rounded-3xl p-8 shadow-soft hover:shadow-premium transition-all duration-300 transform hover:-translate-y-2 border border-slate-100 flex flex-col h-full overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          
          <div class="w-14 h-14 rounded-2xl bg-amber-100 text-gori-yellow flex items-center justify-center mb-6">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z"></path></svg>
          </div>
          
          <h2 class="text-2xl font-bold text-gori-dark mb-3">Cocina (KDS)</h2>
          <p class="text-slate-500 mb-8 flex-grow leading-relaxed">
            Recepción de comandas en tiempo real vía WebSockets. Optimiza los tiempos de preparación.
          </p>
          
          <button class="w-full bg-gori-yellow text-white py-3 px-6 rounded-xl font-semibold shadow-md shadow-amber-200 hover:bg-amber-600 hover:shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2">
            Ver Comandas
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>

        <!-- Tarjeta ADMIN -->
        <div class="group relative bg-gori-surface rounded-3xl p-8 shadow-soft hover:shadow-premium transition-all duration-300 transform hover:-translate-y-2 border border-slate-100 flex flex-col h-full overflow-hidden">
          <div class="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>
          
          <div class="w-14 h-14 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mb-6">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </div>
          
          <h2 class="text-2xl font-bold text-gori-dark mb-3">Panel Admin</h2>
          <p class="text-slate-500 mb-8 flex-grow leading-relaxed">
            Gestión completa del menú, recetas, control de inventarios y reporte de ventas.
          </p>
          
          <button class="w-full bg-slate-800 text-white py-3 px-6 rounded-xl font-semibold shadow-md shadow-slate-300 hover:bg-slate-900 hover:shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2">
            Administrar
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </div>
        
      </div>
    </main>
    
    <!-- Botón de Cerrar Sesión flotante -->
    <div class="fixed bottom-6 right-6 z-50">
      <button @click="logout" class="bg-white text-slate-500 p-3 rounded-full shadow-lg border border-slate-100 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Cerrar Sesión">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../almacenes/auth';

const router = useRouter();
const authStore = useAuthStore();

const logout = () => {
  authStore.cerrarSesion();
  router.push('/login');
};
</script>
