<!--
  Cuadro de alerta de stock bajo, SIEMPRE visible (fijo abajo) en el panel del
  gerente y del admin, sin importar en qué pestaña estén.
  - Gerente (modo="gerente"): lista los insumos bajo mínimo de SU sucursal.
  - Admin   (modo="admin"):   agrupa por sucursal → "insumos bajos de la sucursal X".
  Se refresca solo cada 20 s. Si no hay ninguno bajo, no se muestra.
-->
<template>
  <transition name="alerta-slide">
    <div v-if="bajos.length" class="alerta-stock" :class="{ min: minimizado, inline }">
      <!-- Barra de título (siempre visible) -->
      <button class="alerta-cabecera" @click="minimizado = !minimizado">
        <span class="alerta-icono">⚠</span>
        <span class="alerta-titulo">Alerta de stock bajo</span>
        <span class="alerta-count">{{ bajos.length }}</span>
        <span class="alerta-chevron">{{ minimizado ? '▲' : '▼' }}</span>
      </button>

      <!-- Detalle (se puede minimizar) -->
      <div v-show="!minimizado" class="alerta-cuerpo">
        <!-- GERENTE: insumos de su sucursal -->
        <template v-if="modo === 'gerente'">
          <span v-for="i in bajos" :key="i.id" class="alerta-chip">
            {{ i.nombre }}
            <b>{{ i.stockActual }} {{ i.unidad }}</b>
            <em v-if="i.stockActual <= 0">agotado</em>
          </span>
        </template>
        <!-- ADMIN: agrupado por sucursal -->
        <template v-else>
          <div v-for="g in porSucursal" :key="g.sucursal" class="alerta-suc">
            <span class="alerta-suc-nombre">📍 Insumos bajos en {{ g.sucursal }}:</span>
            <span class="alerta-suc-lista">{{ g.nombres }}</span>
          </div>
        </template>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../almacenes/auth'

const props = defineProps({
  // Base de la API según el rol: '/api/gerente' o '/api/admin'
  apiBase: { type: String, default: '/api/gerente' },
  modo: { type: String, default: 'gerente' }, // 'gerente' | 'admin'
  // inline=true: no se posiciona solo (fixed), se apila dentro de un contenedor
  inline: { type: Boolean, default: false },
})

const auth = useAuthStore()
const bajos = ref([])
const minimizado = ref(false)
let timer = null

const cargar = async () => {
  try {
    const res = await fetch(`${props.apiBase}/inventario/alertas`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    if (res.ok) bajos.value = await res.json()
  } catch { /* sin conexión: se mantiene lo último */ }
}

// Admin: agrupa los insumos bajos por sucursal
const porSucursal = computed(() => {
  const m = {}
  for (const i of bajos.value) {
    ;(m[i.sucursal] ||= []).push(i.nombre)
  }
  return Object.entries(m).map(([sucursal, nombres]) => ({ sucursal, nombres: nombres.join(', ') }))
})

onMounted(() => {
  cargar()
  timer = setInterval(cargar, 20000) // se refresca solo cada 20 s
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
/* Apilada dentro de un contenedor (no se posiciona sola) */
.alerta-stock.inline {
  position: static;
  left: auto;
  transform: none;
  bottom: auto;
  width: 100%;
}
.alerta-stock {
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: 16px;
  z-index: 60;
  width: min(92vw, 880px);
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(135deg, #b91c1c, #dc2626);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 12px 40px rgba(220, 38, 38, 0.45), 0 2px 8px rgba(0, 0, 0, 0.3);
  color: #fff;
  animation: alertaPulso 2.4s ease-in-out infinite;
}
@keyframes alertaPulso {
  0%, 100% { box-shadow: 0 12px 40px rgba(220, 38, 38, 0.40), 0 2px 8px rgba(0,0,0,0.3); }
  50%      { box-shadow: 0 16px 54px rgba(220, 38, 38, 0.75), 0 2px 8px rgba(0,0,0,0.3); }
}

.alerta-cabecera {
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
.alerta-icono { font-size: 1.25rem; animation: alertaParpadeo 1.2s step-end infinite; }
@keyframes alertaParpadeo { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.alerta-titulo { font-weight: 800; letter-spacing: 0.03em; font-size: 0.95rem; }
.alerta-count {
  background: #fff; color: #b91c1c; font-weight: 900;
  border-radius: 999px; padding: 1px 9px; font-size: 0.8rem;
}
.alerta-chevron { margin-left: auto; font-size: 0.75rem; opacity: 0.85; }

.alerta-cuerpo {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 14px;
  max-height: 34vh;
  overflow-y: auto;
}
/* Gerente: chips por insumo */
.alerta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.82rem;
}
.alerta-chip b { font-weight: 800; }
.alerta-chip em { font-style: normal; font-weight: 800; color: #fde68a; font-size: 0.72rem; text-transform: uppercase; }
/* Admin: una línea por sucursal */
.alerta-suc {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  padding: 4px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.85rem;
}
.alerta-suc:first-child { border-top: none; }
.alerta-suc-nombre { font-weight: 800; }
.alerta-suc-lista { opacity: 0.95; }

/* Entrada/salida */
.alerta-slide-enter-active, .alerta-slide-leave-active { transition: all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.alerta-slide-enter-from, .alerta-slide-leave-to { transform: translate(-50%, 120%); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .alerta-stock, .alerta-icono { animation: none; }
}
</style>
