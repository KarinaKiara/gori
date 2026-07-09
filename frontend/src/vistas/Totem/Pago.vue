<template>
  <div class="h-screen flex flex-col text-white relative overflow-hidden"
       style="background: linear-gradient(160deg, #071d2c 0%, #0d3347 50%, #0a2234 100%);">
    <div class="absolute inset-0 pointer-events-none grid-anim"></div>
    <div class="absolute top-0 right-0 w-[400px] h-[350px] pointer-events-none" style="background:radial-gradient(ellipse at top right,rgba(255,69,0,0.08) 0%,transparent 65%);"></div>

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

    <main class="flex-1 overflow-y-auto flex items-center justify-center p-4 md:p-6 z-10">
      <div class="pago-card rounded-3xl shadow-2xl border border-white/10 max-w-sm w-full overflow-hidden my-auto">

        <!-- Total con efecto de entrada -->
        <div class="total-header p-6 text-center relative overflow-hidden"
             style="background: linear-gradient(135deg, #FF4500 0%, #c0392b 100%);">
          <!-- Brillo animado -->
          <div class="shimmer absolute inset-0 pointer-events-none"></div>
          <p class="text-red-200 text-sm font-medium mb-1 relative z-10">Total a Pagar</p>
          <h2 class="text-5xl font-extrabold text-white mb-1 relative z-10 total-amount">Bs. {{ carrito.total.toFixed(2) }}</h2>
          <p class="text-red-200 text-xs relative z-10">Orden #{{ ordenNumero }}</p>
        </div>

        <!-- QR -->
        <div class="p-6 flex flex-col items-center">

          <!-- Badge estado -->
          <div class="flex items-center gap-2 mb-4 px-4 py-2 rounded-full" style="background: rgba(251,146,60,0.15); border: 1px solid rgba(251,146,60,0.4);">
            <div class="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
            <span class="text-orange-400 text-xs font-bold">QR Estático — Ingresa el monto en tu app</span>
          </div>

          <p class="text-gray-400 text-sm mb-4 text-center">Escanea con tu app bancaria y paga el monto exacto</p>

          <!-- Marco QR con animación de escaneo -->
          <div class="relative mb-4">
            <div class="bg-white p-4 rounded-2xl shadow-xl qr-frame">
              <img src="/images/qr_pago.png" alt="QR de Pago Gori Chicken" class="w-[200px] h-[200px] object-contain" />
            </div>
            <!-- Línea de escaneo animada -->
            <div class="scan-line absolute left-4 right-4 h-0.5 rounded-full" style="top:16px;"></div>
            <!-- Esquinas del frame -->
            <div class="corner corner-tl"></div>
            <div class="corner corner-tr"></div>
            <div class="corner corner-bl"></div>
            <div class="corner corner-br"></div>
            <div class="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shadow-lg" style="background: linear-gradient(135deg,#FF4500,#FF6B35);">Bs</div>
          </div>

          <!-- Monto -->
          <div class="w-full rounded-xl p-3 mb-4 text-center" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
            <p class="text-gray-400 text-xs mb-1">Ingresa este monto en tu app</p>
            <p class="text-white font-black text-3xl">Bs. {{ carrito.total.toFixed(2) }}</p>
            <p class="text-orange-400 text-xs mt-1">Gori Chicken</p>
          </div>

          <!-- Contador dramatizado -->
          <div class="flex items-center gap-3 mb-4 w-full">
            <div class="countdown-circle flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg border-2 transition-all duration-1000"
                 :class="contador > 20 ? 'border-orange-400 text-orange-400' : contador > 10 ? 'border-yellow-400 text-yellow-400 countdown-warn' : 'border-red-500 text-red-400 countdown-urgent'">
              {{ contador }}
            </div>
            <div class="flex-1">
              <div class="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div class="h-2 rounded-full transition-all duration-1000"
                     :class="contador > 20 ? 'bg-orange-400' : contador > 10 ? 'bg-yellow-400' : 'bg-red-500'"
                     :style="{ width: (contador / 60 * 100) + '%' }"></div>
              </div>
              <p class="text-gray-500 text-xs mt-1">segundos restantes para que expire el QR</p>
            </div>
          </div>

          <button @click="simularPago" class="w-full text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 text-lg pay-btn">
            ✓ He realizado la transferencia
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Éxito con confetti -->
    <div v-if="pagoExitoso" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <!-- Confetti CSS -->
      <div class="confetti-container pointer-events-none fixed inset-0 overflow-hidden">
        <div v-for="c in 18" :key="c" class="confetti-piece" :style="{ left: (c * 5.5) + '%', animationDelay: (c * 0.12) + 's', background: ['#FF4500','#FF6B35','#FFD700','#FF8C00','#fff','#FF4500'][c%6] }"></div>
      </div>
      <div class="bg-gradient-to-b from-[#0d2a1a] to-[#071d2c] border border-green-500/30 rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl animate-pop">
        <div class="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-500 success-ring">
          <svg class="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 class="text-3xl font-extrabold text-white mb-2">{{ guardadoOffline ? '¡Pedido Guardado!' : '¡Pedido Registrado!' }}</h2>
        <p class="text-gray-300 mb-1">Orden #{{ ordenNumero }} — Bs. {{ carrito.total.toFixed(2) }}</p>

        <!-- Aviso cuando se guardó sin internet -->
        <div v-if="guardadoOffline" class="my-3 p-3 rounded-xl text-sm" style="background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.4); color: #fdba74;">
          📴 Sin conexión: tu pedido quedó <b>guardado</b> y se enviará <b>automáticamente</b> a la cocina cuando vuelva el internet.
        </div>
        <p v-else class="text-gray-400 text-xs mb-6">Por favor, muestra tu pantalla o comprobante en Caja para validar el pago por QR y autorizar tu pedido en cocina 🍗</p>
        <button @click="finalizar" class="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition text-lg active:scale-95">
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
import { useCarritoStore } from '../../almacenes/carrito'
import { useAuthStore } from '../../almacenes/auth'
import { usePedidosOffline, nuevaEtiqueta } from '../../almacenes/pedidosOffline'

const router = useRouter()
const carrito = useCarritoStore()
const authStore = useAuthStore()
const pedidosOffline = usePedidosOffline()

const pagoExitoso = ref(false)
const guardadoOffline = ref(false) // true si el pedido se guardó para enviar al reconectar
const expirado = ref(false)
const contador = ref(60)
const ordenNumero = ref(Math.floor(Math.random() * 9000) + 1000)

let intervalo = null

// Nombre canónico del plato para casar con la receta en el backend
// (ej: base "Cuarto" + categoría "Brasa Gori" -> "Cuarto (Brasa)")
const CAT_TIPO = { 'Brasa Gori': 'Brasa', 'Broaster Gori': 'Broaster', 'Mixta Gori': 'Mixta' }
function nombreCanonico(item) {
  const base = item.nombreBase || item.nombre
  const tipo = CAT_TIPO[item.categoriaId]
  return tipo ? `${base} (${tipo})` : base
}
// Separa el texto de presas elegidas en tipos individuales
// (ej: "Pierna, Entrepierna y Ala" -> ['Pierna','Entrepierna','Ala'])
function tiposDePresa(presaStr) {
  return presaStr.replace(/ y /g, ',').split(',').map(s => s.trim()).filter(Boolean)
}

// Expande cada plato del carrito en: (base) + (cada presa elegida) + (cada guarnición), todo a Bs 0
// para que el inventario descuente cada parte exacta por separado.
function expandirItems() {
  const salida = []
  for (const it of carrito.items) {
    salida.push({ nombre: nombreCanonico(it), cantidad: it.cantidad, precio: it.precio, detalle: it.presa || null })
    // Presa elegida (Cuarto/Trica/Presa Extra) -> descuenta la presa exacta
    if (it.presa) {
      for (const tipo of tiposDePresa(it.presa)) {
        salida.push({ nombre: `Presa: ${tipo}`, cantidad: it.cantidad, precio: 0, detalle: 'presa' })
      }
    }
    // Guarniciones elegidas
    if (Array.isArray(it.guarniciones)) {
      for (const g of it.guarniciones) {
        salida.push({ nombre: g, cantidad: it.cantidad, precio: 0, detalle: 'guarnición' })
      }
    }
  }
  return salida
}

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
  const token = localStorage.getItem('token') || authStore.token
  if (!token) { alert('Sin sesión activa'); return }

  // Etiqueta única del pedido: evita que se duplique si se reenvía al reconectar
  const clienteRef = nuevaEtiqueta()
  const pedidoData = {
    clienteRef,
    sucursalId: authStore.usuario?.sucursalId,
    montoTotal: carrito.total,
    origen: 'TOTEM',
    items: expandirItems()
  }

  clearInterval(intervalo)

  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(pedidoData)
    })
    if (res.ok) {
      guardadoOffline.value = false
      pagoExitoso.value = true
    } else {
      // El servidor respondió pero rechazó el pedido (ej. validación)
      const err = await res.json().catch(() => ({}))
      alert('Error: ' + (err.error || 'No se pudo registrar el pedido'))
      iniciarContador() // permitir reintentar
    }
  } catch (e) {
    // SIN CONEXIÓN: guardamos el pedido en el celular; se enviará solo al reconectar
    await pedidosOffline.encolar({ clienteRef, token, payload: pedidoData })
    guardadoOffline.value = true
    pagoExitoso.value = true
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
/* ─── Grid fondo ─── */
.grid-anim {
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 45px 45px;
  opacity: 0.05;
  animation: gridDrift 30s linear infinite;
}
@keyframes gridDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 45px 45px; }
}

/* ─── Card de pago ─── */
.pago-card {
  background: linear-gradient(160deg, #0f2538 0%, #0a1e30 100%);
  animation: cardEntrada 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes cardEntrada {
  0%   { opacity: 0; transform: scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* ─── Header shimmer ─── */
.shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%);
  animation: shimmerMove 2.5s ease-in-out infinite;
}
@keyframes shimmerMove {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

/* ─── Total amount entrada ─── */
.total-amount {
  animation: totalPop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both;
}
@keyframes totalPop {
  0%   { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

/* ─── QR frame ─── */
.qr-frame { border: 3px solid #FF4500; animation: qrPulse 3s ease-in-out infinite; }
@keyframes qrPulse {
  0%,100% { box-shadow: 0 0 15px rgba(255,69,0,0.3); }
  50%     { box-shadow: 0 0 35px rgba(255,69,0,0.6); }
}

/* ─── Línea de escaneo ─── */
.scan-line {
  background: linear-gradient(90deg, transparent, rgba(255,150,0,0.8), transparent);
  animation: scanDown 2s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(255,150,0,0.6);
}
@keyframes scanDown {
  0%   { top: 16px; opacity: 1; }
  50%  { top: calc(100% - 20px); opacity: 1; }
  100% { top: 16px; opacity: 1; }
}

/* ─── Esquinas del QR ─── */
.corner {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: #FF4500;
  border-style: solid;
}
.corner-tl { top: 8px; left: 8px; border-width: 3px 0 0 3px; border-radius: 3px 0 0 0; }
.corner-tr { top: 8px; right: 8px; border-width: 3px 3px 0 0; border-radius: 0 3px 0 0; }
.corner-bl { bottom: 8px; left: 8px; border-width: 0 0 3px 3px; border-radius: 0 0 0 3px; }
.corner-br { bottom: 8px; right: 8px; border-width: 0 3px 3px 0; border-radius: 0 0 3px 0; }

/* ─── Countdown urgente ─── */
.countdown-warn  { animation: warnPulse 1s ease-in-out infinite; }
.countdown-urgent { animation: urgentShake 0.4s ease-in-out infinite; }
@keyframes warnPulse {
  0%,100% { box-shadow: 0 0 8px rgba(250,204,21,0.4); }
  50%     { box-shadow: 0 0 18px rgba(250,204,21,0.8); }
}
@keyframes urgentShake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-2px); }
  75%     { transform: translateX(2px); }
}

/* ─── Botón de pago ─── */
.pay-btn {
  background: linear-gradient(135deg, #16a34a, #15803d);
  box-shadow: 0 4px 20px rgba(22,163,74,0.4);
  transition: all 0.25s ease;
}
.pay-btn:hover { box-shadow: 0 6px 30px rgba(22,163,74,0.6); transform: translateY(-1px); }

/* ─── Modal pop ─── */
.animate-pop {
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn {
  0%   { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}

/* ─── Ícono de éxito pulsante ─── */
.success-ring { animation: successPulse 1.5s ease-in-out infinite; }
@keyframes successPulse {
  0%,100% { box-shadow: 0 0 15px rgba(34,197,94,0.3); }
  50%     { box-shadow: 0 0 35px rgba(34,197,94,0.7); }
}

/* ─── Confetti ─── */
.confetti-piece {
  position: absolute;
  width: 10px;
  height: 14px;
  border-radius: 3px;
  top: -20px;
  animation: confettiFall 2s ease-in forwards;
  opacity: 0.9;
}
@keyframes confettiFall {
  0%   { top: -20px; transform: rotate(0deg) translateX(0); opacity: 1; }
  100% { top: 110vh; transform: rotate(540deg) translateX(60px); opacity: 0; }
}
</style>
