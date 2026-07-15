<template>
  <div class="h-screen flex flex-col text-white relative overflow-hidden menu-bg">
    <!-- Atmósfera dorada -->
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at 70% -10%, rgba(228,192,122,0.10) 0%, transparent 55%), radial-gradient(ellipse at 10% 120%, rgba(255,69,0,0.06) 0%, transparent 50%);"></div>
    <div class="absolute inset-0 pointer-events-none grid-drift"></div>

    <header class="px-6 py-3 flex items-center gap-4 border-b border-[#E4C07A]/12 z-20"
            style="background: rgba(8,7,5,0.72); backdrop-filter: blur(12px);">
      <button @click="$router.push('/totem/carrito')"
              class="p-2.5 rounded-full text-white bg-white/5 hover:bg-[#E4C07A]/15 transition flex-shrink-0">
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
          <p class="text-[10px] font-bold leading-none mt-0.5" style="color:#E4C07A;">Tu Pedido</p>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <div class="w-2 h-2 rounded-full bg-[#E4C07A] animate-pulse"></div>
        <span class="text-xs font-bold" style="color:#E4C07A;">Revisa tu pedido</span>
      </div>
    </header>

    <main class="flex-1 overflow-y-auto flex items-center justify-center p-4 md:p-6 z-10">
      <div class="pago-card rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden my-auto">

        <!-- Total con acento dorado -->
        <div class="total-header p-6 text-center relative overflow-hidden">
          <div class="shimmer absolute inset-0 pointer-events-none"></div>
          <p class="text-xs font-semibold uppercase tracking-widest mb-1 relative z-10" style="color:rgba(228,192,122,0.75);">Total del pedido</p>
          <h2 class="text-5xl font-title mb-1 relative z-10 total-amount" style="color:#F7E3A1;">Bs. {{ carrito.total.toFixed(2) }}</h2>
          <p class="text-xs relative z-10" style="color:rgba(228,192,122,0.6);">Se paga en Caja</p>
        </div>

        <!-- Resumen del pedido (recibo que se envía a caja) -->
        <div class="p-6">
          <p class="text-gray-400 text-sm mb-4 text-center">Revisa tu pedido. El pago se realiza en <b style="color:#E4C07A;">Caja</b>.</p>

          <div class="rounded-2xl border border-[#E4C07A]/12 bg-white/5 divide-y divide-white/5 mb-4 max-h-64 overflow-y-auto">
            <div v-for="item in carrito.items" :key="item.id" class="flex justify-between items-start gap-3 p-3">
              <p class="text-white font-bold text-sm leading-tight break-words min-w-0">{{ item.cantidad }}x {{ item.nombre }}</p>
              <span class="font-bold text-sm whitespace-nowrap" style="color:#E4C07A;">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl" style="background: rgba(228,192,122,0.10); border: 1px solid rgba(228,192,122,0.28);">
            <span class="text-2xl">🧾</span>
            <p class="text-xs leading-snug" style="color:#e8d4a8;">Al confirmar, tu pedido llega a <b>Caja</b> con tu número de turno. Ahí pagas y pasa a cocina.</p>
          </div>

          <button @click="confirmarPedido" class="w-full font-title tracking-wide py-4 rounded-xl shadow-lg transition active:scale-95 text-lg pay-btn">
            Confirmar y enviar a Caja
          </button>
        </div>
      </div>
    </main>

    <!-- Modal Éxito: RECIBO tipo ticket con QR -->
    <div v-if="pagoExitoso" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <!-- Confetti dorado -->
      <div class="confetti-container pointer-events-none fixed inset-0 overflow-hidden">
        <div v-for="c in 18" :key="c" class="confetti-piece" :style="{ left: (c * 5.5) + '%', animationDelay: (c * 0.12) + 's', background: ['#E4C07A','#F7E3A1','#C99B3F','#FF6B35','#fff','#E4C07A'][c%6] }"></div>
      </div>

      <div class="recibo-card max-w-sm w-full overflow-hidden animate-pop max-h-[94vh] overflow-y-auto">
        <!-- Encabezado compacto -->
        <div class="px-6 pt-5 pb-3 text-center relative">
          <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 success-ring"
               style="background: rgba(228,192,122,0.14); border: 2px solid #E4C07A;">
            <svg class="w-6 h-6" style="color:#E4C07A;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
          </div>
          <p class="font-black text-xs tracking-[0.3em] uppercase" style="color:#E4C07A;">Recibo</p>
          <h2 class="font-title text-xl leading-tight text-white">{{ guardadoOffline ? 'Pedido Guardado' : 'Enviado a Caja' }}</h2>
        </div>

        <!-- Turno + QR juntos: lo esencial para cobrar, siempre visible sin scroll -->
        <div class="mx-6 mb-3 rounded-2xl px-4 py-3 flex items-center gap-4" style="background: rgba(228,192,122,0.09); border:1px solid rgba(228,192,122,0.3);">
          <!-- QR -->
          <div v-if="qrRecibo" class="rounded-xl p-2 bg-white flex-shrink-0" style="box-shadow: 0 0 0 2px #E4C07A, 0 0 22px rgba(228,192,122,0.4);">
            <img :src="qrRecibo" alt="QR del pedido" class="w-24 h-24 block" />
          </div>
          <!-- Turno -->
          <div class="text-center flex-1 min-w-0">
            <p class="text-[10px] uppercase tracking-widest" style="color:rgba(228,192,122,0.75);">Tu turno</p>
            <p class="text-5xl font-title leading-none tabular-nums" style="color:#F7E3A1;">{{ ordenNumero }}</p>
          </div>
        </div>
        <p class="text-center text-xs font-bold mb-3 px-6" style="color:#E4C07A;">📷 Muestra este QR en Caja para cobrar al instante</p>

        <!-- Línea perforada -->
        <div class="ticket-perf mx-4 mb-3"></div>

        <!-- Detalle del pedido (el "recibo resumido") -->
        <div class="mx-6 rounded-2xl bg-white/[0.04] border border-white/8 px-4 py-2.5 mb-3">
          <div class="flex items-center justify-between text-[11px] uppercase tracking-wider mb-1.5" style="color:rgba(228,192,122,0.65);">
            <span>Detalle</span>
            <span>{{ new Date().toLocaleDateString('es-BO') }}</span>
          </div>
          <div class="space-y-1 max-h-28 overflow-y-auto">
            <div v-for="item in carrito.items" :key="item.id" class="flex justify-between gap-3 text-sm">
              <span class="text-gray-200 leading-tight break-words min-w-0">{{ item.cantidad }}x {{ item.nombre }}</span>
              <span class="font-bold whitespace-nowrap" style="color:#E4C07A;">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
            </div>
          </div>
          <div class="flex justify-between items-center pt-2 mt-2 border-t border-white/10">
            <span class="font-title text-base text-white">TOTAL</span>
            <span class="font-title text-xl" style="color:#F7E3A1;">Bs. {{ carrito.total.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Aviso sin internet -->
        <div v-if="guardadoOffline" class="mx-6 mb-3 p-3 rounded-xl text-xs" style="background: rgba(228,192,122,0.10); border: 1px solid rgba(228,192,122,0.32); color: #e8d4a8;">
          📴 Sin conexión: tu pedido quedó <b>guardado</b> y se enviará <b>solo</b> a la Caja al volver el internet (el QR sirve igual al reconectar).
        </div>
        <p v-else class="text-gray-400 text-xs text-center px-6 mb-3">Al pagar en Caja, tu pedido entra a cocina 🍗</p>

        <div class="px-6 pb-5">
          <button @click="finalizar" class="w-full font-title tracking-wide py-3.5 rounded-xl transition text-base active:scale-95 volver-btn">
            Cerrar y Volver al Inicio
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
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
const qrRecibo = ref('') // Imagen (dataURL) del QR con el código del pedido, para mostrar en caja

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
  // QR del recibo: codifica el código del pedido para que la caja lo escanee y lo cargue al instante.
  // Se genera en el dispositivo (sin internet), por eso el cliente lo ve aunque esté offline.
  try {
    qrRecibo.value = await QRCode.toDataURL(`GORI:${clienteRef}`, {
      margin: 1, width: 260, errorCorrectionLevel: 'M',
      color: { dark: '#12100c', light: '#ffffff' }
    })
  } catch (e) { qrRecibo.value = '' }
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
/* Premium oscuro elegante: negro cálido con acento dorado (igual que el menú) */
.menu-bg { background: linear-gradient(165deg, #0b0b0d 0%, #17120c 52%, #0a0a0b 100%); }

/* ─── Grid fondo ─── */
.grid-drift {
  background-image:
    linear-gradient(rgba(228,192,122,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(228,192,122,0.05) 1px, transparent 1px);
  background-size: 54px 54px;
  opacity: 0.04;
  animation: gridDrift 30s linear infinite;
}
@keyframes gridDrift {
  0%   { background-position: 0 0; }
  100% { background-position: 45px 45px; }
}

/* ─── Card de pago ─── */
.pago-card {
  background: linear-gradient(165deg, rgba(23,18,12,0.96) 0%, rgba(10,10,11,0.98) 100%);
  border: 1px solid rgba(228,192,122,0.18);
  animation: cardEntrada 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes cardEntrada {
  0%   { opacity: 0; transform: scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

/* ─── Header total ─── */
.total-header {
  background: linear-gradient(135deg, rgba(228,192,122,0.14) 0%, rgba(201,155,63,0.06) 100%);
  border-bottom: 1px solid rgba(228,192,122,0.2);
}
.shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(247,227,161,0.14) 50%, transparent 100%);
  animation: shimmerMove 2.8s ease-in-out infinite;
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

/* ─── Botón confirmar (dorado) ─── */
.pay-btn {
  background: linear-gradient(135deg, #E4C07A, #caa24f);
  color: #17120c;
  box-shadow: 0 4px 20px rgba(228,192,122,0.35);
  transition: all 0.25s ease;
}
.pay-btn:hover { box-shadow: 0 6px 30px rgba(228,192,122,0.55); transform: translateY(-1px); }

/* ─── Recibo (ticket) ─── */
.recibo-card {
  background: linear-gradient(170deg, #17120c 0%, #0b0b0d 100%);
  border: 1px solid rgba(228,192,122,0.28);
  border-radius: 1.75rem;
  box-shadow: 0 30px 70px -20px rgba(0,0,0,0.9), inset 0 1px 0 rgba(228,192,122,0.12);
}
.ticket-perf {
  height: 0;
  border-top: 2px dashed rgba(228,192,122,0.35);
}

/* ─── Botón volver ─── */
.volver-btn {
  background: transparent;
  border: 1px solid rgba(228,192,122,0.4);
  color: #E4C07A;
}
.volver-btn:hover { background: rgba(228,192,122,0.1); }

/* ─── Modal pop ─── */
.animate-pop {
  animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes popIn {
  0%   { transform: scale(0.7); opacity: 0; }
  100% { transform: scale(1);   opacity: 1; }
}

/* ─── Ícono de éxito pulsante ─── */
.success-ring { animation: successPulse 1.6s ease-in-out infinite; }
@keyframes successPulse {
  0%,100% { box-shadow: 0 0 15px rgba(228,192,122,0.25); }
  50%     { box-shadow: 0 0 35px rgba(228,192,122,0.6); }
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

@media (prefers-reduced-motion: reduce) {
  .grid-drift, .shimmer, .success-ring, .confetti-piece { animation: none; }
}
</style>
