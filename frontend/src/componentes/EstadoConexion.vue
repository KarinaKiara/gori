<template>
  <transition name="bajar">
    <div v-if="mostrar" class="estado-conexion" :class="claseEstado">
      <span class="punto"></span>
      <span>{{ texto }}</span>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { usePedidosOffline } from '../almacenes/pedidosOffline'

const offline = usePedidosOffline()

// Se muestra sólo cuando hay algo que avisar: sin conexión, o pedidos por enviar
const mostrar = computed(() => !offline.online || offline.pendientes > 0)

const claseEstado = computed(() => {
  if (!offline.online) return 'sin-conexion'
  if (offline.sincronizando) return 'enviando'
  return 'pendientes'
})

const texto = computed(() => {
  if (!offline.online) {
    return offline.pendientes > 0
      ? `Sin conexión · ${offline.pendientes} pedido(s) guardado(s)`
      : 'Sin conexión — puedes seguir pidiendo'
  }
  if (offline.sincronizando) return 'Enviando pedidos guardados…'
  return `${offline.pendientes} pedido(s) por enviar`
})
</script>

<style scoped>
.estado-conexion {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  text-align: center;
}
.punto {
  width: 9px; height: 9px; border-radius: 50%;
  background: currentColor;
  animation: latido 1.2s ease-in-out infinite;
}
@keyframes latido { 50% { opacity: 0.3; } }

.sin-conexion { background: #b91c1c; }               /* rojo: sin internet */
.enviando     { background: #b45309; }               /* ámbar: sincronizando */
.pendientes   { background: #92400e; }               /* ámbar oscuro: en espera */

.bajar-enter-active, .bajar-leave-active { transition: transform .3s ease, opacity .3s ease; }
.bajar-enter-from, .bajar-leave-to { transform: translateY(-100%); opacity: 0; }
</style>
