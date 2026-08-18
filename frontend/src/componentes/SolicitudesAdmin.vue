<!--
  Banner VERDE, solo para el ADMIN: muestra las solicitudes de insumo que mandaron
  los gerentes ("El Prado pide: Aceite"). Se apila junto a la alerta de stock (rojo).
  El admin toca "Atender" cuando ya armó el pedido de compra y la solicitud desaparece.
  Pensado para ir DENTRO de un contenedor fijo (posición estática, ancho 100%).
-->
<template>
  <transition name="sol-slide">
    <div v-if="solicitudes.length" class="sol-banner" :class="{ min: minimizado }">
      <button class="sol-cab" @click="minimizado = !minimizado">
        <span class="sol-ic"><Icono nombre="enviar" /></span>
        <span class="sol-ti">Solicitudes de las sucursales</span>
        <span class="sol-ct">{{ solicitudes.length }}</span>
        <span class="sol-ch">{{ minimizado ? '▲' : '▼' }}</span>
      </button>
      <div v-show="!minimizado" class="sol-body">
        <div v-for="s in solicitudes" :key="s.id" class="sol-item">
          <span class="sol-txt">
            <Icono nombre="ubicacion" /> <b>{{ s.sucursal?.nombre }}</b> pide <b>{{ s.insumo?.nombre }}</b>
            <em>(quedan {{ s.insumo?.stockActual }} {{ s.insumo?.unidad }} · mín {{ s.insumo?.stockMinimo }})</em>
          </span>
          <button class="sol-btn inline-flex items-center gap-1" @click="atender(s)"><Icono nombre="check" /> Atender</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from '../almacenes/auth'
import Icono from './Icono.vue'

const auth = useAuthStore()
const solicitudes = ref([])
const minimizado = ref(false)
let timer = null
let socket = null

const cargar = async () => {
  try {
    const res = await fetch('/api/admin/solicitudes', { headers: { Authorization: `Bearer ${auth.token}` } })
    if (res.ok) solicitudes.value = await res.json()
  } catch { /* sin conexión: se mantiene lo último */ }
}
const atender = async (s) => {
  try {
    const res = await fetch(`/api/admin/solicitudes/${s.id}/atender`, {
      method: 'PUT', headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) solicitudes.value = solicitudes.value.filter((x) => x.id !== s.id)
  } catch { /* ignora */ }
}

onMounted(() => {
  cargar()
  // EN VIVO: apenas un gerente pide un insumo, el backend avisa a la sala ADMIN y
  // el banner se refresca al instante (como la cocina con los pedidos).
  socket = io()
  socket.on('connect', () => socket.emit('unirse-admin'))
  socket.on('solicitudes-actualizadas', cargar)
  // Respaldo por si el socket se cae: refresco cada 20 s.
  timer = setInterval(cargar, 20000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (socket) socket.disconnect()
})
</script>

<style scoped>
.sol-banner {
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #15803d, #22c55e);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 40px rgba(34, 197, 94, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3);
  color: #fff;
}
.sol-cab {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #fff;
  text-align: left;
}
.sol-ic { font-size: 1.2rem; }
.sol-ti { font-weight: 800; letter-spacing: 0.03em; font-size: 0.95rem; }
.sol-ct { background: #fff; color: #15803d; font-weight: 900; border-radius: 999px; padding: 1px 9px; font-size: 0.8rem; }
.sol-ch { margin-left: auto; font-size: 0.75rem; opacity: 0.85; }
.sol-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 16px 14px;
  max-height: 34vh;
  overflow-y: auto;
}
.sol-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 0.85rem;
}
.sol-txt b { font-weight: 800; }
.sol-txt em { font-style: normal; opacity: 0.85; font-size: 0.78rem; margin-left: 4px; }
.sol-btn {
  flex-shrink: 0;
  background: #fff;
  color: #15803d;
  font-weight: 800;
  border: none;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 0.78rem;
  cursor: pointer;
}
.sol-btn:active { transform: scale(0.95); }
.sol-slide-enter-active, .sol-slide-leave-active { transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.sol-slide-enter-from, .sol-slide-leave-to { transform: translateY(120%); opacity: 0; }
</style>
