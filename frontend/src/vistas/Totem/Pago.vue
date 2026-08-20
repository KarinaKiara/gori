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
          <p class="text-xs relative z-10" style="color:rgba(228,192,122,0.6);">Elige tu método de pago</p>
        </div>

        <!-- Resumen del pedido (recibo que se envía a caja) -->
        <div class="p-6">
          <div class="rounded-2xl border border-[#E4C07A]/12 bg-white/5 divide-y divide-white/5 mb-5 max-h-40 overflow-y-auto">
            <div v-for="item in carrito.items" :key="item.id" class="flex justify-between items-start gap-3 p-3">
              <p class="text-white font-bold text-sm leading-tight break-words min-w-0">{{ item.cantidad }}x {{ item.nombre }}</p>
              <span class="font-bold text-sm whitespace-nowrap" style="color:#E4C07A;">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
            </div>
          </div>

          <!-- Selector de método de pago: el cajero verá qué eligió el cliente -->
          <p class="text-center text-sm font-title tracking-wide mb-3" style="color:#F7E3A1;">¿Cómo vas a pagar?</p>
          <div class="grid grid-cols-2 gap-3 mb-4">
            <button @click="metodoPago = 'efectivo'"
                    class="metodo-btn flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all"
                    :class="metodoPago === 'efectivo' ? 'metodo-activo' : ''">
              <span class="text-2xl">💵</span>
              <span class="font-bold text-sm">Efectivo</span>
            </button>
            <button @click="metodoPago = 'qr'"
                    class="metodo-btn flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all"
                    :class="metodoPago === 'qr' ? 'metodo-activo' : ''">
              <span class="text-2xl">📱</span>
              <span class="font-bold text-sm">QR</span>
            </button>
          </div>

          <!-- QR #1 (VERDE) = PARA PAGAR. Lo escanea EL CLIENTE con su banco. -->
          <div v-if="metodoPago === 'qr'" class="mb-4 rounded-2xl overflow-hidden" style="border: 1px solid rgba(16,185,129,0.45);">
            <!-- Banda-etiqueta pegada al QR: dice para qué es -->
            <div class="px-4 py-2 text-center" style="background: linear-gradient(135deg,#10b981,#047857);">
              <p class="text-white font-black text-xs tracking-[0.12em] uppercase">📱 QR para PAGAR</p>
              <p class="text-[10px] font-semibold" style="color:rgba(255,255,255,0.85);">Págalo con la app de tu banco</p>
            </div>
            <div class="text-center p-4" style="background: rgba(16,185,129,0.07);">
              <div class="mx-auto w-fit rounded-2xl p-3 bg-white" style="box-shadow: 0 0 0 2px #10b981;">
                <img src="/images/qr_pago.png" alt="QR para pagar" class="w-36 h-36 object-contain block" />
              </div>
              <p class="mt-3 text-sm font-bold text-white">Paga <span style="color:#6ee7b7;">Bs. {{ carrito.total.toFixed(2) }}</span></p>

              <!-- Dos formas de pagar segun donde esté el cliente.
                   Desde su propio celular NO puede escanear su pantalla: debe descargar el QR
                   y subirlo desde la galeria en su app del banco. -->
              <div class="mt-3 rounded-xl p-3 text-left" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(16,185,129,0.3);">
                <p class="text-[11px] font-bold mb-1.5" style="color:#6ee7b7;">📲 ¿Estás en tu celular?</p>
                <a href="/images/qr_pago.png" download="Gori-QR-Pago.png"
                   class="block w-full py-2.5 rounded-lg text-xs font-bold text-center transition active:scale-95"
                   style="background: linear-gradient(135deg,#10b981,#047857); color:#fff;">
                  ⬇ Guardar el QR en mi galería
                </a>
                <p class="text-[10px] mt-1.5 leading-snug" style="color:rgba(255,255,255,0.6);">
                  Luego abre tu banco → <b>Pagar con QR</b> → <b>Subir desde galería</b>.
                </p>
                <p class="text-[11px] font-bold mt-3 mb-0.5" style="color:#6ee7b7;">🖥️ ¿Estás en el tótem del local?</p>
                <p class="text-[10px] leading-snug" style="color:rgba(255,255,255,0.6);">
                  Escanea la pantalla directo con tu celular.
                </p>
              </div>

              <p class="text-[11px] mt-3" style="color:rgba(110,231,183,0.75);">Cuando ya pagaste, toca el botón de abajo</p>

              <!-- Salida sin riesgo: si no le alcanza el saldo, cambia a efectivo aquí mismo
                   (no vuelve al menú, así no agrega otro plato sin querer). -->
              <button @click="metodoPago = 'efectivo'"
                      class="mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition active:scale-95"
                      style="background: rgba(255,255,255,0.06); border: 1px solid rgba(228,192,122,0.4); color:#E4C07A;">
                ¿No te alcanza el saldo? → Cambiar a 💵 Efectivo
              </button>
            </div>
          </div>

          <!-- Aviso según método -->
          <div class="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl" style="background: rgba(228,192,122,0.10); border: 1px solid rgba(228,192,122,0.28);">
            <span class="text-2xl">🧾</span>
            <p class="text-xs leading-snug" style="color:#e8d4a8;">
              <template v-if="metodoPago === 'qr'">Paga con el <b style="color:#6ee7b7;">QR verde</b> de arriba. Al continuar te damos tu <b>comprobante dorado</b> para mostrar en Caja.</template>
              <template v-else-if="metodoPago === 'efectivo'">Al continuar te damos tu <b>comprobante</b>. Lo muestras en Caja, pagas en <b>efectivo</b> y pasa a cocina.</template>
              <template v-else>Elige cómo vas a pagar para continuar.</template>
            </p>
          </div>

          <!-- Acción según método (deshabilitado mientras envía: evita doble pedido) -->
          <button v-if="metodoPago" @click="confirmarPedido" :disabled="enviando"
                  class="w-full font-title tracking-wide py-4 rounded-xl shadow-lg transition active:scale-95 text-lg pay-btn"
                  :class="{ 'opacity-60 cursor-wait': enviando }">
            {{ enviando ? 'Enviando…' : (metodoPago === 'qr' ? 'Ya pagué — ver comprobante' : 'Aceptar y enviar a Caja') }}
          </button>
          <div v-else class="w-full py-4 rounded-xl text-center text-sm font-bold" style="background: rgba(255,255,255,0.05); color: rgba(228,192,122,0.6); border: 1px dashed rgba(228,192,122,0.3);">
            Selecciona un método de pago ☝️
          </div>
        </div>
      </div>
    </main>

    <!-- Modal Éxito: COMPROBANTE tipo ticket con QR -->
    <div v-if="pagoExitoso && comprobante" class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
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
          <h2 class="font-title text-xl leading-tight text-white">{{ comprobante.offline ? 'Pedido Guardado' : 'Enviado a Caja' }}</h2>
        </div>

        <!-- QR #2 (DORADO) = COMPROBANTE. Lo escanea EL CAJERO para cobrar según el detalle. -->
        <div class="mx-6 mb-2 rounded-2xl overflow-hidden" style="border:1px solid rgba(228,192,122,0.45);">
          <!-- Banda-etiqueta pegada al QR: dice para qué es -->
          <div class="px-3 py-2 text-center" style="background: linear-gradient(135deg,#E4C07A,#caa24f);">
            <p class="font-black text-xs tracking-[0.12em] uppercase" style="color:#17120c;">🧾 Comprobante · para la CAJA</p>
            <p class="text-[10px] font-semibold" style="color:rgba(23,18,12,0.72);">NO lo escanees — muéstraselo al cajero</p>
          </div>
          <div class="px-4 py-3 flex items-center gap-4" style="background: rgba(228,192,122,0.09);">
            <div v-if="comprobante.qr" class="rounded-xl p-2 bg-white flex-shrink-0" style="box-shadow: 0 0 0 2px #E4C07A;">
              <img :src="comprobante.qr" alt="QR comprobante del pedido" class="w-24 h-24 block" />
            </div>
            <!-- Con conexión: turno que repartió el servidor. Sin conexión: el código de
                 ESTE pedido, porque un turno inventado por el aparato chocaría con el que
                 el servidor le está dando en ese mismo momento a otro cliente. -->
            <div class="text-center flex-1 min-w-0">
              <template v-if="comprobante.turno">
                <p class="text-[10px] uppercase tracking-widest" style="color:rgba(228,192,122,0.75);">Tu turno</p>
                <p class="text-5xl font-title leading-none tabular-nums" style="color:#F7E3A1;">{{ comprobante.turno }}</p>
              </template>
              <template v-else>
                <p class="text-[10px] uppercase tracking-widest" style="color:rgba(228,192,122,0.75);">Tu código</p>
                <p class="text-4xl font-title leading-none tracking-widest" style="color:#F7E3A1;">{{ comprobante.codigo }}</p>
                <p class="text-[10px] mt-1 leading-snug" style="color:rgba(228,192,122,0.7);">Tu turno aparece al enviarse</p>
              </template>
            </div>
          </div>
        </div>

        <!-- Esto es lo que pidió la tutora: el QR resume el pedido y la caja cobra según este detalle -->
        <p class="text-center text-[11px] font-semibold mb-2 px-6" style="color:rgba(228,192,122,0.85);">
          El cajero lo escanea y cobra según este detalle ↓
        </p>

        <!-- Método elegido (lo verá también la caja) -->
        <div class="flex justify-center mb-3">
          <span class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style="background: rgba(228,192,122,0.12); border:1px solid rgba(228,192,122,0.35); color:#F7E3A1;">
            {{ comprobante.metodoPago === 'qr' ? '📱 Ya pagaste por QR' : '💵 Pagas en efectivo en Caja' }}
          </span>
        </div>

        <!-- Línea perforada -->
        <div class="ticket-perf mx-4 mb-3"></div>

        <!-- Detalle del pedido (el "recibo resumido") -->
        <div class="mx-6 rounded-2xl bg-white/[0.04] border border-white/8 px-4 py-2.5 mb-3">
          <div class="flex items-center justify-between text-[11px] uppercase tracking-wider mb-1.5" style="color:rgba(228,192,122,0.65);">
            <span>Detalle de tu pedido</span>
            <span>{{ comprobante.fecha }}</span>
          </div>
          <div class="space-y-1 max-h-28 overflow-y-auto">
            <div v-for="(item, i) in comprobante.items" :key="i" class="flex justify-between gap-3 text-sm">
              <span class="text-gray-200 leading-tight break-words min-w-0">{{ item.cantidad }}x {{ item.nombre }}</span>
              <span class="font-bold whitespace-nowrap" style="color:#E4C07A;">Bs. {{ (item.precio * item.cantidad).toFixed(2) }}</span>
            </div>
          </div>
          <div class="flex justify-between items-center pt-2 mt-2 border-t border-white/10">
            <span class="font-title text-base text-white">TOTAL</span>
            <span class="font-title text-xl" style="color:#F7E3A1;">Bs. {{ comprobante.total.toFixed(2) }}</span>
          </div>
        </div>

        <!-- Aviso sin internet -->
        <div v-if="comprobante.offline" class="mx-6 mb-3 p-3 rounded-xl text-xs" style="background: rgba(228,192,122,0.10); border: 1px solid rgba(228,192,122,0.32); color: #e8d4a8;">
          📴 Sin conexión: tu pedido quedó <b>guardado</b> y se enviará <b>solo</b> a la Caja al volver el internet.
          Mientras tanto tu pedido se identifica con el código <b>{{ comprobante.codigo }}</b> (y con el QR).
          Tu <b>número de turno</b> aparecerá aquí en cuanto se envíe.

          <!-- Ofrecerle que le avisemos. El permiso se pide desde este toque porque los
               navegadores (Safari en especial) solo lo permiten con un gesto del usuario. -->
          <button v-if="!avisoActivado" @click="activarAviso"
                  class="mt-2 w-full py-2.5 rounded-lg text-[12px] font-bold transition active:scale-95"
                  style="background: rgba(228,192,122,0.16); border: 1px solid rgba(228,192,122,0.45); color:#F7E3A1;">
            🔔 Avísame cuando se envíe
          </button>
          <p v-else class="mt-2 text-[11px] font-bold" style="color:#6ee7b7;">
            ✓ Te avisaremos en cuanto tu pedido llegue a la Caja
          </p>
        </div>
        <p v-else class="text-gray-400 text-xs text-center px-6 mb-3">
          {{ comprobante.metodoPago === 'qr'
            ? 'Muestra este comprobante en Caja. Al verificar tu pago, entra a cocina 🍗'
            : 'Muestra este comprobante en Caja. Al pagar, entra a cocina 🍗' }}
        </p>

        <!-- Guardar: para que no se pierda si cierra el navegador -->
        <div class="mx-6 mb-3 p-3 rounded-xl text-[11px] text-center" style="background: rgba(228,192,122,0.08); border: 1px dashed rgba(228,192,122,0.35); color:#e8d4a8;">
          🔒 Tu comprobante queda <b>guardado en este celular</b>. Si cierras, ábrelo de nuevo y toca <b>“Ver mi comprobante”</b>.
        </div>

        <div class="px-6 pb-5 space-y-2">
          <button @click="guardarImagen" class="w-full font-title tracking-wide py-3.5 rounded-xl transition text-base active:scale-95 pay-btn">
            ⬇ Guardar comprobante (imagen)
          </button>
          <button @click="finalizar" class="w-full font-title tracking-wide py-3.5 rounded-xl transition text-base active:scale-95 volver-btn">
            Cerrar y Volver al Inicio
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import QRCode from 'qrcode'
import { avisar, confirmar } from '../../utilidades/dialogo'
import { useCarritoStore } from '../../almacenes/carrito'
import { useAuthStore } from '../../almacenes/auth'
import { useTotemStore } from '../../almacenes/totem'
import { usePedidosOffline, nuevaEtiqueta, codigoCorto, pedirPermisoNotificaciones } from '../../almacenes/pedidosOffline'
import { estadoSucursal } from '../../utilidades/horarios'

const router = useRouter()
const route = useRoute()
const carrito = useCarritoStore()
const authStore = useAuthStore()
const totemStore = useTotemStore()
const pedidosOffline = usePedidosOffline()

const pagoExitoso = ref(false)
const metodoPago = ref(null) // 'efectivo' | 'qr' — lo elige el cliente y lo ve la caja
const enviando = ref(false)  // evita el doble-toque (dos pedidos por tocar 2 veces)

// Copia del comprobante ya emitido. El recibo se dibuja desde AQUÍ (no del carrito,
// que se vacía al terminar) y se guarda en el celular para que no se pierda
// aunque el cliente cierre Chrome.
const comprobante = ref(null) // { clienteRef, turno, qr, metodoPago, total, items, fecha, offline }
const CLAVE_COMPROBANTE = 'gori_comprobante'

function guardarComprobanteLocal(c) {
  try { localStorage.setItem(CLAVE_COMPROBANTE, JSON.stringify(c)) } catch (e) { /* almacenamiento lleno: no es crítico */ }
}
function leerComprobanteLocal() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_COMPROBANTE) || 'null')
    // Solo vale el comprobante de hoy (los turnos se reinician cada día)
    if (c && c.dia === new Date().toDateString()) return c
  } catch (e) { /* dato corrupto: lo ignoramos */ }
  return null
}

// Si el cliente vuelve a abrir su comprobante (/totem/pago?ver=1), lo recuperamos del celular
onMounted(() => {
  if (route.query.ver === '1') {
    const c = leerComprobanteLocal()
    if (c) { comprobante.value = c; pagoExitoso.value = true }
  }
})

// El CÓDIGO del pedido (lo que ve el cliente mientras no tiene turno) se calcula en el
// almacén de pedidos offline, que es quien también lo usa para los avisos. Se importa de
// ahí para que exista una sola definición.

// Estado del botón que ofrece avisar por notificación cuando el pedido se envíe.
const avisoActivado = ref(false)
async function activarAviso() {
  avisoActivado.value = await pedirPermisoNotificaciones()
}

// Se le PREGUNTA al cliente, con el diálogo de la app, apenas emite un comprobante sin
// conexión. Antes esto era solo un botón dentro del comprobante y quedaba fuera de
// pantalla en el celular: nadie lo veía, así que nunca se concedía el permiso y las
// notificaciones no llegaban jamás. El toque en "Sí" además es el gesto del usuario que
// los navegadores exigen para poder pedir el permiso.
async function ofrecerAviso() {
  if (localStorage.getItem('totem_modo') === 'kiosko') return   // el tótem no lo necesita
  if (!('Notification' in window)) return                       // navegador sin soporte
  if (Notification.permission === 'granted') { avisoActivado.value = true; return }
  if (Notification.permission === 'denied') return              // ya dijo que no

  const quiere = await confirmar(
    'Tu pedido se enviará solo cuando vuelva el internet. ¿Quieres que te avisemos en tu celular cuando llegue a la Caja?',
    { titulo: '¿Te avisamos?', textoAceptar: 'Sí, avísenme', textoCancelar: 'No, gracias' }
  )
  if (quiere) avisoActivado.value = await pedirPermisoNotificaciones()
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

// Arma el comprobante (copia congelada del pedido) y lo guarda en el celular
function emitirComprobante({ clienteRef, turno, qr, offline }) {
  const c = {
    clienteRef,
    turno,                          // null mientras el servidor no lo asigne
    codigo: codigoCorto(clienteRef), // lo que se muestra en su lugar
    qr,
    metodoPago: metodoPago.value,
    total: carrito.total,
    items: carrito.items.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio })),
    fecha: new Date().toLocaleString('es-BO'),
    dia: new Date().toDateString(),
    offline
  }
  comprobante.value = c
  guardarComprobanteLocal(c)
  pagoExitoso.value = true
}

// Texto legible que codifica el QR del COMPROBANTE (NO el de pago).
// Al escanearlo con cualquier celular, el cliente ve su comanda: qué pidió,
// N° de pedido y total, igual que un ticket. Al final lleva el código del
// pedido (GORI:...) para que la caja también pueda cargarlo si lo escanea.
function construirTextoComprobante(clienteRef, turno) {
  const metodo = metodoPago.value === 'efectivo' ? 'Efectivo'
    : metodoPago.value === 'qr' ? 'QR' : '—'
  const sucursal = totemStore.usuario?.sucursal || authStore.usuario?.sucursal || ''
  const fecha = new Date().toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
  const L = []
  L.push('==============================')
  L.push('          GORI CHICKEN')
  if (sucursal) L.push('   ' + sucursal)
  L.push('       Cochabamba - Bolivia')
  L.push('==============================')
  L.push('     COMPROBANTE DE PEDIDO')
  L.push('Fecha: ' + fecha)
  // Sin conexión todavía no hay turno: se muestra el código del pedido, para que nadie
  // confunda este comprobante con el turno que el servidor le dio a otro cliente.
  if (turno) L.push('N° Pedido: ' + turno)
  else L.push('N° Pedido: PENDIENTE (cod. ' + codigoCorto(clienteRef) + ')')
  L.push('Pago: ' + metodo)
  L.push('------------------------------')
  L.push('CANT  DESCRIPCION        TOTAL')
  for (const it of carrito.items) {
    const sub = (it.precio * it.cantidad).toFixed(2)
    L.push(`${it.cantidad}x ${it.nombre}   Bs ${sub}`)
    if (it.presa) L.push('   Presa: ' + it.presa)
    if (Array.isArray(it.guarniciones)) {
      for (const g of it.guarniciones) L.push('   + ' + g)
    }
  }
  L.push('------------------------------')
  L.push('           TOTAL: Bs ' + Number(carrito.total).toFixed(2))
  L.push('==============================')
  L.push('Presenta este comprobante en')
  L.push('caja para recoger tu pedido.')
  L.push('Codigo: GORI:' + clienteRef)
  return L.join('\n')
}

async function confirmarPedido() {
  if (enviando.value) return           // #4: ya se está enviando -> ignora toques extra
  if (!carrito.items.length) { await avisar('Tu carrito está vacío'); return } // #6: nada que enviar

  // Blindaje: si la sucursal cerró mientras el cliente tenía el carrito armado,
  // no se puede enviar el pedido (el menú ya bloquea agregar, esto cierra el paso final).
  const est = estadoSucursal(totemStore.usuario || authStore.usuario)
  if (!est.abierto) { await avisar(`${est.titulo}. ${est.detalle}`); return }

  const token = totemStore.token || authStore.token || sessionStorage.getItem('token')
  if (!token) { await avisar('Sin sesión activa'); return }

  enviando.value = true // bloquea el botón mientras se procesa

  // Etiqueta única del pedido: evita que se duplique si se reenvía al reconectar
  const clienteRef = nuevaEtiqueta()
  const pedidoData = {
    clienteRef,
    metodoPago: metodoPago.value,
    sucursalId: totemStore.usuario?.sucursalId || authStore.usuario?.sucursalId,
    items: expandirItems()
  }

  // QR del comprobante: codifica la COMANDA completa (qué pidió, N° de pedido, total)
  // para que al escanearlo el cliente vea su pedido como un ticket; al final incluye el
  // código (GORI:...) para que la caja también pueda cargarlo. Se dibuja en el propio
  // dispositivo, por eso el cliente lo ve aunque esté sin internet.
  const generarQR = async (turno) => {
    try {
      return await QRCode.toDataURL(construirTextoComprobante(clienteRef, turno), {
        margin: 1, width: 320, errorCorrectionLevel: 'L',
        color: { dark: '#12100c', light: '#ffffff' }
      })
    } catch (e) { return '' }
  }

  // Tiempo límite del envío. Sin esto, fetch se queda esperando para siempre cuando el
  // aparato SÍ tiene red pero no llega al servidor (WiFi sin salida a internet, servidor
  // dormido, base lenta): el botón quedaba en "Enviando…" y ya no aceptaba otro toque.
  // Cortar a los 8 s es seguro porque el pedido lleva su etiqueta única (clienteRef):
  // si el servidor sí lo había recibido, al reenviarse desde la cola no se duplica.
  const corte = new AbortController()
  const temporizador = setTimeout(() => corte.abort(), 8000)

  try {
    const res = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(pedidoData),
      signal: corte.signal
    })
    if (res.ok) {
      // El TURNO lo asigna el SERVIDOR, que es el único que ve todos los pedidos de la
      // sucursal: así el tótem del local y los celulares de los clientes nunca repiten
      // número. Por eso el comprobante se arma recién con la respuesta.
      const creado = await res.json()
      emitirComprobante({ clienteRef, turno: creado.numeroPedido, qr: await generarQR(creado.numeroPedido), offline: false })
    } else {
      // El servidor respondió pero rechazó el pedido (ej. validación) -> permitir reintentar
      const err = await res.json().catch(() => ({}))
      await avisar('Error: ' + (err.error || 'No se pudo registrar el pedido'))
      enviando.value = false
    }
  } catch (e) {
    // SIN CONEXIÓN (o el servidor no contestó a tiempo): nadie puede repartir el turno.
    // NO se inventa un número: el contador de este aparato no ve a los demás, así que
    // chocaría con el turno que el servidor ya le dio a otro cliente conectado. Se
    // entrega el CÓDIGO del pedido, que es único, y el turno real se escribe solo
    // cuando el pedido llega al servidor. La caja lo encuentra por el QR (GORI:...).
    await pedidosOffline.encolar({ clienteRef, token, payload: pedidoData })
    emitirComprobante({ clienteRef, turno: null, qr: await generarQR(null), offline: true })
    ofrecerAviso()   // se le pregunta si quiere que le avisemos cuando el pedido salga
  } finally {
    clearTimeout(temporizador)
  }
}

// Descarga el comprobante como imagen (queda en la galería del celular).
// Se dibuja con canvas puro: sin librerías extra y funciona sin internet.
async function guardarImagen() {
  const c = comprobante.value
  if (!c) return
  const W = 620
  const H = 690 + c.items.length * 30
  const cv = document.createElement('canvas')
  cv.width = W; cv.height = H
  const ctx = cv.getContext('2d')

  // Fondo y marco dorado
  ctx.fillStyle = '#12100c'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#E4C07A'; ctx.lineWidth = 4
  ctx.strokeRect(14, 14, W - 28, H - 28)

  ctx.textAlign = 'center'
  ctx.fillStyle = '#E4C07A'; ctx.font = 'bold 36px Arial'
  ctx.fillText('GORI CHICKEN', W / 2, 74)
  ctx.fillStyle = '#F7E3A1'; ctx.font = 'bold 17px Arial'
  ctx.fillText('COMPROBANTE — MUÉSTRALO EN CAJA', W / 2, 104)

  // QR sobre fondo blanco (para que se lea bien al escanear)
  const qs = 290
  const qx = W / 2 - qs / 2, qy = 128
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(qx - 12, qy - 12, qs + 24, qs + 24)
  if (c.qr) {
    const img = new Image()
    await new Promise(r => { img.onload = r; img.onerror = r; img.src = c.qr })
    try { ctx.drawImage(img, qx, qy, qs, qs) } catch (e) { /* si falla, queda el recuadro blanco */ }
  }

  // Turno (o el código del pedido, si todavía no hay servidor que reparta turno)
  let y = qy + qs + 58
  ctx.fillStyle = 'rgba(228,192,122,0.8)'; ctx.font = 'bold 15px Arial'
  ctx.fillText(c.turno ? 'TU TURNO' : 'TU CÓDIGO', W / 2, y)
  ctx.fillStyle = '#F7E3A1'; ctx.font = 'bold 62px Arial'
  ctx.fillText(c.turno ? String(c.turno) : String(c.codigo || ''), W / 2, y + 58)

  // Método de pago
  y += 96
  ctx.fillStyle = '#E4C07A'; ctx.font = 'bold 17px Arial'
  ctx.fillText(c.metodoPago === 'qr' ? 'Pagado por QR' : 'Paga en efectivo en Caja', W / 2, y)

  // Detalle (el cajero cobra en base a esto)
  y += 40
  ctx.strokeStyle = 'rgba(228,192,122,0.45)'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.setLineDash([8, 6]); ctx.moveTo(40, y); ctx.lineTo(W - 40, y); ctx.stroke()
  ctx.setLineDash([])

  y += 32
  ctx.textAlign = 'left'; ctx.font = 'bold 15px Arial'; ctx.fillStyle = 'rgba(228,192,122,0.75)'
  ctx.fillText('DETALLE DE TU PEDIDO', 46, y)
  ctx.textAlign = 'right'; ctx.fillText(c.fecha, W - 46, y)

  ctx.font = '17px Arial'
  for (const it of c.items) {
    y += 30
    ctx.textAlign = 'left'; ctx.fillStyle = '#e8e8e8'
    ctx.fillText(`${it.cantidad}x ${it.nombre}`.slice(0, 38), 46, y)
    ctx.textAlign = 'right'; ctx.fillStyle = '#E4C07A'
    ctx.fillText(`Bs. ${(it.precio * it.cantidad).toFixed(2)}`, W - 46, y)
  }

  y += 44
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial'
  ctx.fillText('TOTAL', 46, y)
  ctx.textAlign = 'right'; ctx.fillStyle = '#F7E3A1'
  ctx.fillText(`Bs. ${c.total.toFixed(2)}`, W - 46, y)

  const enlace = document.createElement('a')
  enlace.download = c.turno ? `Gori-Comprobante-Turno-${c.turno}.png` : `Gori-Comprobante-${c.codigo}.png`
  enlace.href = cv.toDataURL('image/png')
  enlace.click()
}

const finalizar = () => {
  carrito.vaciarCarrito()
  // Volver por el mismo canal por el que se entró: el CLIENTE regresa a /pedir
  // (donde puede cambiar de sucursal y seguir su pedido) y el KIOSKO a /totem.
  router.push(localStorage.getItem('totem_modo') === 'cliente' ? '/pedir' : '/totem')
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

/* ─── Selector de método de pago ─── */
.metodo-btn {
  background: rgba(255,255,255,0.04);
  border-color: rgba(228,192,122,0.2);
  color: #cbb98f;
}
.metodo-btn:hover { border-color: rgba(228,192,122,0.45); color: #E4C07A; }
.metodo-activo {
  background: rgba(228,192,122,0.14) !important;
  border-color: #E4C07A !important;
  color: #F7E3A1 !important;
  box-shadow: 0 0 22px rgba(228,192,122,0.25);
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
