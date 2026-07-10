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
          <p class="text-orange-400 text-[10px] font-bold leading-none mt-0.5">Tu Pedido</p>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
        <span class="text-xs text-green-400 font-bold">Revisa tu pedido</span>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto flex items-center justify-center p-4 md:p-6 z-10">
      <div class="pago-card rounded-3xl shadow-2xl border border-white/10 max-w-sm w-full overflow-hidden my-auto">

        <!-- Total con efecto de entrada -->
        <div class="total-header p-6 text-center relative overflow-hidden"
             style="background: linear-gradient(135deg, #FF4500 0%, #c0392b 100%);">
          <!-- Brillo animado -->
          <div class="shimmer absolute inset-0 pointer-events-none"></div>
          <p class="text-red-200 text-sm font-medium mb-1 relative z-10">Total del pedido</p>
          <h2 class="text-5xl font-extrabold text-white mb-1 relative z-10 total-amount">Bs. {{ carrito.total.toFixed(2) }}</h2>
          <p class="text-red-200 text-xs relative z-10">Se paga en Caja</p>
        </div>

        <!-- Resumen del pedido (recibo que se envía a caja) -->
        <div class="p-6">
          <p class="text-gray-400 text-sm mb-4 text-center">Revisa tu pedido. El pago se realiza en <b class="text-orange-400">Caja</b>.</p>

          <div class="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 mb-4 max-h-64 overflow-y-auto">
            <div v-for="item in carrito.items" :key="item.id" class="flex justify-between items-start gap-3 p-3">
              <p class="text-white font-bold text-sm leading-tight break-words min-w-0">{{ item.cantidad }}x {{ item.nombre }}</p>
              <span class="text-orange-300 font-bold text-sm whitespace-nowrap">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl" style="background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.35);">
            <span class="text-2xl">🧾</span>
            <p class="text-orange-200 text-xs leading-snug">Al confirmar, tu pedido llega a <b>Caja</b> con tu número de turno. Ahí pagas y pasa a cocina.</p>
          </div>

          <button @click="confirmarPedido" class="w-full text-white font-bold py-4 rounded-xl shadow-lg transition active:scale-95 text-lg pay-btn">
            ✓ Confirmar y enviar a Caja
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
        <h2 class="text-3xl font-extrabold text-white mb-2">{{ guardadoOffline ? '¡Pedido Guardado!' : '¡Pedido Enviado a Caja!' }}</h2>

        <!-- Turno bien visible: es el número con el que el cliente reclama su pedido -->
        <div class="my-4 mx-auto max-w-[14rem] rounded-2xl border border-orange-500/40 bg-orange-500/10 py-4">
          <p class="text-xs uppercase tracking-widest text-orange-300/80">Tu turno</p>
          <p class="text-6xl font-black text-orange-400 leading-none tabular-nums">{{ ordenNumero }}</p>
        </div>
        <p class="text-gray-300 mb-1">Total: Bs. {{ carrito.total.toFixed(2) }}</p>

        <!-- Aviso cuando se guardó sin internet -->
        <div v-if="guardadoOffline" class="my-3 p-3 rounded-xl text-sm" style="background: rgba(251,146,60,0.12); border: 1px solid rgba(251,146,60,0.4); color: #fdba74;">
          📴 Sin conexión: tu pedido quedó <b>guardado</b> y se enviará <b>automáticamente</b> a la Caja cuando vuelva el internet.
        </div>
        <p v-else class="text-gray-400 text-xs mb-6">Pasa a <b class="text-orange-400">Caja</b> y di tu número de turno para pagar. Cuando pagues, tu pedido entra a cocina 🍗</p>
        <button @click="finalizar" class="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 transition text-lg active:scale-95">
          Cerrar y Volver al Inicio
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
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
const ordenNumero = ref(null) // Número de turno; se asigna al confirmar el pedido

// Genera el siguiente turno en ESTE dispositivo. Se reinicia cada día.
// Vive en localStorage, así funciona 100% sin internet (offline-first).
function siguienteTurno() {
  const hoy = new Date().toDateString()
  let dato
  try { dato = JSON.parse(localStorage.getItem('gori_turno') || '{}') } catch { dato = {} }
  if (dato.fecha !== hoy) dato = { fecha: hoy, contador: 0 }
  dato.contador = (dato.contador || 0) + 1
  localStorage.setItem('gori_turno', JSON.stringify(dato))
  return dato.contador
}

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

async function confirmarPedido() {
  const token = localStorage.getItem('token') || authStore.token
  if (!token) { alert('Sin sesión activa'); return }

  // Etiqueta única del pedido: evita que se duplique si se reenvía al reconectar
  const clienteRef = nuevaEtiqueta()
  // Número de turno: se asigna aquí (funciona offline) y viaja con el pedido a la caja
  ordenNumero.value = siguienteTurno()
  const pedidoData = {
    clienteRef,
    numeroPedido: ordenNumero.value,
    sucursalId: authStore.usuario?.sucursalId,
    montoTotal: carrito.total,
    origen: 'TOTEM',
    items: expandirItems()
  }

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
