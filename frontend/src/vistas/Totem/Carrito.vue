<template>
  <div class="h-screen flex flex-col text-white overflow-hidden relative"
       style="background: linear-gradient(160deg, #071d2c 0%, #0d3347 50%, #0a2234 100%);">
    <!-- Fondo animado -->
    <div class="absolute inset-0 pointer-events-none grid-anim"></div>
    <div class="absolute bottom-0 left-0 w-[500px] h-[350px] pointer-events-none" style="background:radial-gradient(ellipse at bottom left,rgba(255,69,0,0.09) 0%,transparent 65%);"></div>
    <!-- Header con Logo -->
    <header class="px-6 py-3 flex items-center gap-4 border-b border-white/8 z-20"
            style="background: rgba(5,15,25,0.7); backdrop-filter: blur(12px);">
      <button @click="$router.push('/totem/menu')"
              class="p-2.5 rounded-full text-white bg-white/5 hover:bg-white/15 transition flex-shrink-0">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </button>

      <!-- Logo mini -->
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
             style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 0 12px rgba(255,69,0,0.4);">
          <svg width="24" height="24" viewBox="0 0 220 280" fill="none">
            <path d="M110 80 C60 80 25 130 25 185 C25 240 65 265 110 265 C155 265 195 240 195 185 C195 130 160 80 110 80Z" fill="white" opacity="0.95"/>
            <path d="M110 115 C85 115 68 135 68 162 C68 188 82 205 110 205 C138 205 152 188 152 162 C152 135 135 115 110 115Z" fill="#FF4500"/>
            <rect x="78" y="52" width="64" height="10" rx="5" fill="white"/>
            <ellipse cx="110" cy="38" rx="30" ry="24" fill="white"/>
            <ellipse cx="125" cy="24" rx="14" ry="16" fill="white"/>
          </svg>
        </div>
        <div>
          <p class="text-white font-black text-sm tracking-widest leading-none"
             style="font-family: 'Impact','Arial Black',sans-serif;">GORI CHICKEN</p>
          <p class="text-orange-400 text-[10px] font-bold leading-none mt-0.5">Resumen del Pedido</p>
        </div>
      </div>

      <div class="ml-auto">
        <span class="text-white font-black text-base">{{ carrito.totalItems }} items</span>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full">
      <div v-if="carrito.items.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <div class="w-24 h-24 mb-6 rounded-3xl flex items-center justify-center text-5xl"
             style="background: rgba(255,69,0,0.1); border: 2px solid rgba(255,69,0,0.2);">🛒</div>
        <h2 class="text-2xl font-bold text-white">Tu carrito está vacío</h2>
        <p class="mt-2 text-gray-400">Regresa al menú para añadir un delicioso pollo.</p>
        <button @click="$router.push('/totem/menu')"
                class="mt-6 text-white px-8 py-3 rounded-xl font-bold transition"
                style="background: linear-gradient(135deg, #FF4500, #FF6B35);">
          Ir al Menú
        </button>
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Lista de Items animada -->
        <div class="lg:col-span-2">
          <transition-group name="cart-item" tag="div" class="space-y-4">
            <div v-for="item in carrito.items" :key="item.id"
                 class="cart-card flex items-center gap-4 p-4 rounded-2xl border transition-all relative overflow-hidden group"
                 style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.08);">
              <!-- Glow hover -->
              <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                   style="background:linear-gradient(135deg,rgba(255,80,20,0.06) 0%,transparent 60%);"></div>
              <img :src="item.imagen" :alt="item.nombre"
                   class="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-300"
                   style="background: rgba(255,69,0,0.15);">

              <div class="flex-1 min-w-0">
                <h3 class="text-base font-bold text-white truncate group-hover:text-orange-300 transition-colors">{{ item.nombre }}</h3>
                <p class="text-orange-400 font-bold text-sm">Bs. {{ item.precio.toFixed(2) }}
                  <span v-if="item.cantidad > 1" class="text-gray-500 text-xs font-normal ml-1">× {{ item.cantidad }}</span>
                </p>
              </div>

              <!-- Controles cantidad -->
              <div class="flex items-center gap-2 px-2 py-1 rounded-xl"
                   style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);">
                <button @click="carrito.quitarProducto(item.id)"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                </button>
                <span class="font-black text-white w-6 text-center text-lg">{{ item.cantidad }}</span>
                <button @click="carrito.agregarProducto(item)"
                        class="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-green-400 hover:bg-green-500/10 transition-all active:scale-90">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                </button>
              </div>

              <div class="hidden sm:block w-24 text-right font-black text-white">
                Bs. {{ (item.precio * item.cantidad).toFixed(2) }}
              </div>
            </div>
          </transition-group>
        </div>

        <!-- Resumen Total -->
        <div class="lg:col-span-1">
          <div class="rounded-2xl p-6 sticky top-6 border"
               style="background: rgba(255,255,255,0.05); border-color: rgba(255,100,30,0.3);">
            <!-- Badge sello Gori -->
            <div class="flex items-center gap-3 mb-5 pb-5 border-b border-white/10">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center"
                   style="background: linear-gradient(135deg, #FF4500, #FF6B35);">🦍</div>
              <div>
                <p class="text-white font-black text-sm">Tu pedido</p>
                <p class="text-orange-400 text-xs">{{ carrito.totalItems }} productos</p>
              </div>
            </div>

            <div class="space-y-3 mb-5">
              <div class="flex justify-between text-gray-400 text-sm">
                <span>Subtotal</span>
                <span class="text-white font-bold">Bs. {{ carrito.total.toFixed(2) }}</span>
              </div>
              <div class="flex justify-between text-gray-400 text-sm">
                <span>Impuestos</span>
                <span class="text-white font-bold">Incluidos</span>
              </div>
            </div>

            <div class="flex justify-between items-center mb-6 pt-4 border-t border-white/10">
              <span class="text-white font-black text-xl">TOTAL</span>
              <span class="font-black text-2xl" style="color: #FF6B35;">Bs. {{ carrito.total.toFixed(2) }}</span>
            </div>

            <button @click="$router.push('/totem/pago')"
                    class="w-full text-white text-base font-black py-4 rounded-xl transition transform hover:-translate-y-0.5 active:scale-95"
                    style="background: linear-gradient(135deg, #FF4500, #FF6B35); box-shadow: 0 4px 20px rgba(255,69,0,0.4);">
              Proceder al Pago →
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>



</template>

<script setup>
import { useCarritoStore } from '../../almacenes/carrito'

const carrito = useCarritoStore()
</script>

<style scoped>
/* ─── Grid fondo ─── */
.grid-anim {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 45px 45px;
  opacity: 0.05;
  animation: gridDrift 28s linear infinite;
}
@keyframes gridDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 45px 45px; }
}

/* ─── Cart items transition-group ─── */
.cart-item-enter-active { transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.cart-item-leave-active { transition: all 0.25s ease-in; position: absolute; width: 100%; }
.cart-item-enter-from   { opacity: 0; transform: translateX(-30px) scale(0.95); }
.cart-item-leave-to     { opacity: 0; transform: translateX(30px) scale(0.95); }
.cart-item-move         { transition: transform 0.35s ease; }

/* ─── Cart card hover ─── */
.cart-card:hover {
  border-color: rgba(255,80,20,0.3) !important;
  box-shadow: 0 4px 20px rgba(255,69,0,0.1);
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
::-webkit-scrollbar-thumb { background: rgba(255,80,20,0.4); border-radius: 4px; }
</style>
