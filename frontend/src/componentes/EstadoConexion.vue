<template>
  <transition name="subir">
    <div v-if="mostrar" class="estado-conexion" :class="claseEstado"
         :title="offline.motivoDescarte" @click="descartar">
      <span class="punto"></span>
      <span class="texto">{{ texto }}</span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { usePedidosOffline } from '../almacenes/pedidosOffline'

const offline = usePedidosOffline()

// Se muestra sólo cuando hay algo que avisar: sin conexión, pedidos por enviar,
// o pedidos que el servidor rechazó y se sacaron de la cola.
const mostrar = computed(() => !offline.online || offline.pendientes > 0 || offline.descartados > 0)

const claseEstado = computed(() => {
  if (offline.descartados > 0) return 'rechazado'
  if (!offline.online) return 'sin-conexion'
  if (offline.sincronizando) return 'enviando'
  return 'pendientes'
})

const texto = computed(() => {
  // Se avisa del rechazo primero: es lo único que exige atención del usuario.
  if (offline.descartados > 0) {
    return `${offline.descartados} pedido(s) no se pudieron enviar — toca para cerrar`
  }
  if (!offline.online) {
    return offline.pendientes > 0
      ? `Sin conexión · ${offline.pendientes} guardado(s)`
      : 'Sin conexión — puedes seguir pidiendo'
  }
  if (offline.sincronizando) return 'Enviando pedidos guardados…'
  return `${offline.pendientes} pedido(s) por enviar`
})

// Al tocar el aviso de rechazo se da por enterado y desaparece.
const descartar = () => {
  if (offline.descartados > 0) { offline.descartados = 0; offline.motivoDescarte = '' }
}
</script>

<style scoped>
/* Píldora flotante ABAJO: no tapa el header ni el carrito */
.estado-conexion {
  position: fixed;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
  transform: translateX(-50%);
  z-index: 10001;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #fff;
  max-width: 92vw;
  white-space: nowrap;
  box-shadow: 0 12px 34px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.14);
}
.texto { overflow: hidden; text-overflow: ellipsis; }

.punto {
  width: 9px; height: 9px; border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  box-shadow: 0 0 8px currentColor;
  animation: latido 1.2s ease-in-out infinite;
}
@keyframes latido { 50% { opacity: 0.3; transform: scale(0.85); } }

/* rojo: sin internet */
.sin-conexion { background: linear-gradient(135deg, #dc2626, #991b1b); }
/* ámbar: sincronizando */
.enviando     { background: linear-gradient(135deg, #d97706, #b45309); }
/* dorado: en espera (combina con el menú) */
.pendientes   { background: linear-gradient(135deg, #C99B3F, #8a6a24); }
/* gris oscuro: el servidor rechazó el pedido y ya no se reintenta */
.rechazado    { background: linear-gradient(135deg, #57534e, #292524); cursor: pointer; }

.subir-enter-active, .subir-leave-active { transition: transform .35s cubic-bezier(0.34,1.56,0.64,1), opacity .3s ease; }
.subir-enter-from, .subir-leave-to { transform: translateX(-50%) translateY(140%); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .punto { animation: none; }
}
</style>
