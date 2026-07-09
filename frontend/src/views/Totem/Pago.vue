<template>
  <div class="h-screen flex flex-col text-white"
       style="background: linear-gradient(160deg, #071d2c 0%, #0d3347 50%, #0a2234 100%);">

    <header class="px-6 py-3 flex items-center gap-4 border-b border-white/8"
            style="background: rgba(5,15,25,0.7); backdrop-filter: blur(12px);">
      <button @click="$router.push('/totem/carrito')"
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
          <p class="text-orange-400 text-[10px] font-bold leading-none mt-0.5">Pago Seguro</p>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
        <span class="text-xs text-green-400 font-bold">Escanea y Paga</span>
      </div>
    </header>

    <main class="flex-1 flex items-center justify-center p-6">
      <div class="bg-gray-800 rounded-3xl shadow-2xl border border-white/10 max-w-md w-full overflow-hidden">

        <!-- Total -->
        <div class="bg-gradient-to-r from-gori-primary to-rose-700 p-6 text-center">
          <p class="text-rose-200 text-sm font-medium mb-1">Total a Pagar</p>
          <h2 class="text-5xl font-extrabold text-white mb-1">Bs. {{ carrito.total.toFixed(2) }}</h2>
          <p class="text-rose-200 text-xs">Orden #{{ ordenNumero }}</p>
        </div>

        <!-- QR -->
        <div class="p-6 flex flex-col items-center">

          <!-- Badge QR estático -->
          <div class="flex items-center gap-2 mb-4 px-4 py-2 rounded-full" style="background: rgba(251,146,60,0.15); border: 1px solid rgba(251,146,60,0.4);">
            <div class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
            <span class="text-orange-400 text-xs font-bold">QR Estático — Ingresa el monto en tu app de banco</span>
          </div>

          <p class="text-gray-400 text-sm mb-4 text-center">Escanea con tu app bancaria y paga el monto exacto</p>

          <!-- imagen QR -->
          <div class="relative mb-4">
            <div class="bg-white p-4 rounded-2xl shadow-xl" style="border: 3px solid #FF4500;">
              <img src="/images/qr_pago.png" alt="QR de Pago Gori Chicken" class="w-[200px] h-[200px] object-contain" />
            </div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg" style="background: linear-gradient(135deg,#FF4500,#FF6B35);">Bs</div>
          </div>

          <!-- Monto a pagar -->
          <div class="w-full rounded-xl p-3 mb-4 text-center" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
            <p class="text-gray-400 text-xs mb-1">Ingresa este monto en tu app</p>
            <p class="text-white font-black text-3xl">Bs. {{ carrito.total.toFixed(2) }}</p>
            <p class="text-orange-400 text-xs mt-1">Gori Chicken</p>
          </div>

          <!-- Contador -->
          <div class="flex items-center gap-2 mb-3 w-full">
            <div :class="['w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 flex-shrink-0', contador > 15 ? 'border-gori-primary text-gori-primary bg-gori-primary/10' : 'border-red-500 text-red-400 bg-red-500/10']">{{ contador }}</div>
            <div class="flex-1 bg-gray-700 rounded-full h-1.5">
              <div :class="['h-1.5 rounded-full transition-all duration-1000', contador > 15 ? 'bg-gori-primary' : 'bg-red-500']" :style="{ width: (contador / 120 * 100) + '%' }"></div>
            </div>
            <span class="text-gray-500 text-xs">seg</span>
          </div>

          <button @click="simularPago" class="w-full text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 text-lg" style="background: linear-gradient(135deg,#16a34a,#15803d);">
            ✓ Simular Pago Exitoso
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Éxito -->
    <div v-if="pagoExitoso" class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-gray-800 border border-white/10 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl animate-pop">
        <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500">
          <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 class="text-3xl font-extrabold text-white mb-2">¡Pago Exitoso!</h2>
        <p class="text-gray-400 mb-2">Bs. {{ carrito.total.toFixed(2) }} recibidos</p>
        <p class="text-gray-500 text-sm mb-8">Tu pedido ya está siendo preparado en cocina 🍗</p>
        <button @click="finalizar" class="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition text-lg">
          Cerrar y Volver al Inicio
        </button>
      </div>
    </div>

    <!-- QR Expirado -->
    <div v-if="expirado" class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div class="bg-gray-800 border border-white/10 rounded-3xl p-10 max-w-sm w-full text-center">
        <div class="text-5xl mb-4">⏱️</div>
        <h2 class="text-2xl font-bold text-white mb-2">QR Expirado</h2>
        <p class="text-gray-400 mb-6">El código ha vencido. Genera uno nuevo.</p>
        <button @click="regenerarQR" class="w-full bg-gori-primary text-white py-4 rounded-xl font-bold hover:bg-rose-700 transition">
          Generar Nuevo QR
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCarritoStore } from '../../stores/carrito'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const carrito = useCarritoStore()
const authStore = useAuthStore()

const pagoExitoso = ref(false)
const expirado = ref(false)
const contador = ref(60)
const ordenNumero = ref(Math.floor(Math.random() * 9000) + 1000)

let intervalo = null

function iniciarContador() {
  contador.value = 60
  expirado.value = false
  intervalo = setInterval(() => {
    contador.value--
    if (contador.value <= 0) {
      clearInterval(intervalo)
      expirado.value = true
    }
  }, 1000)
}

function regenerarQR() {
  ordenNumero.value = Math.floor(Math.random() * 9000) + 1000
  expirado.value = false
  iniciarContador()
}

async function simularPago() {
  try {
    const token = localStorage.getItem('token') || authStore.token
    if (!token) { alert('Sin sesión activa'); return }

    const pedidoData = {
      sucursalId: authStore.usuario?.sucursalId,
      montoTotal: carrito.total,
      origen: 'TOTEM',
      items: carrito.items.map(i => ({ id: i.id, nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }))
    }

    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(pedidoData)
    })

    clearInterval(intervalo)
    if (res.ok) {
      pagoExitoso.value = true
    } else {
      const err = await res.json()
      alert('Error: ' + (err.error || 'Desconocido'))
    }
  } catch (e) {
    alert('No se pudo conectar con el servidor')
  }
}

const finalizar = () => {
  carrito.vaciarCarrito()
  router.push('/totem')
}

onMounted(() => {
  iniciarContador()
})

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo)
})
</script>

<style scoped>
.animate-pop {
  animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes pop {
  0% { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
