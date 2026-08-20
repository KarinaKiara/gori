<template>
  <!-- Tapa la pantalla ENTERA del tótem durante un corte largo. Sin botón de cerrar:
       es un kiosko y nadie debe poder saltárselo. Se va sola al volver el servidor. -->
  <transition name="aparecer">
    <div v-if="visible" class="bloqueo">
      <div class="contenido">

        <!-- WiFi tachado -->
        <div class="aro">
          <svg viewBox="0 0 120 120" class="icono">
            <path d="M18,42 a62,62 0 0 1 84,0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".35"/>
            <path d="M34,62 a40,40 0 0 1 52,0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".55"/>
            <path d="M49,81 a20,20 0 0 1 22,0" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".8"/>
            <circle cx="60" cy="98" r="7" fill="#fff"/>
            <path d="M14,14 L106,106" stroke="#ef4444" stroke-width="11" stroke-linecap="round"/>
          </svg>
        </div>

        <h1 class="titulo">El autoservicio<br>está sin conexión</h1>

        <div class="raya"></div>

        <p class="invita">Por favor, haz tu pedido en la</p>

        <div class="caja">
          <svg viewBox="0 0 100 100" class="icono-caja">
            <rect x="14" y="30" width="72" height="56" rx="7" fill="#fff"/>
            <rect x="24" y="40" width="52" height="20" rx="3" fill="#17120c"/>
            <rect x="25" y="66" width="12" height="9" rx="2" fill="#17120c"/>
            <rect x="44" y="66" width="12" height="9" rx="2" fill="#17120c"/>
            <rect x="63" y="66" width="12" height="9" rx="2" fill="#17120c"/>
            <path d="M28,30 V14 h44 v16" fill="none" stroke="#fff" stroke-width="7" stroke-linejoin="round"/>
          </svg>
          <svg viewBox="0 0 70 52" class="flecha">
            <path d="M6,26 H62 M44,10 L64,26 L44,42" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="palabra">CAJA</span>
        </div>

        <p class="mostrador">Te atienden ahí mismo, en el mostrador</p>

        <!-- Esta nota no es para el cliente: es para que el cajero y el gerente sepan
             que los pedidos ya tomados no se perdieron. -->
        <div v-if="offline.pendientes > 0" class="nota">
          {{ offline.pendientes }} pedido{{ offline.pendientes === 1 ? '' : 's' }} guardado{{ offline.pendientes === 1 ? '' : 's' }}
          se enviará{{ offline.pendientes === 1 ? '' : 'n' }} automáticamente al volver la conexión
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePedidosOffline } from '../almacenes/pedidosOffline'

const offline = usePedidosOffline()
const route = useRoute()

// Solo dentro del tótem: nunca en caja, cocina, admin ni gerencia. Que sea el kiosko
// y no el celular del cliente ya lo decide el propio almacén (marca totem_modo).
const enTotem = computed(() => route.path.startsWith('/totem'))
const visible = computed(() => offline.bloqueado && enTotem.value)
</script>

<style scoped>
.bloqueo {
  position: fixed;
  inset: 0;
  z-index: 10050; /* por encima de todo, incluso del aviso de conexión */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(165deg, #0b0b0d 0%, #17120c 55%, #0a0a0b 100%);
}
.contenido { text-align: center; max-width: 560px; width: 100%; }

.aro {
  width: 150px; height: 150px;
  margin: 0 auto 34px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(239, 68, 68, 0.13);
  border: 3px solid #ef4444;
}
.icono { width: 96px; height: 96px; }

.titulo {
  margin: 0;
  font-size: clamp(30px, 6vw, 46px);
  font-weight: 800;
  line-height: 1.18;
  color: #fff;
}

.raya {
  width: 240px; height: 4px;
  margin: 30px auto;
  border-radius: 2px;
  background: rgba(228, 192, 122, 0.35);
}

.invita { margin: 0 0 18px; font-size: clamp(16px, 3vw, 21px); color: #cbd5e1; }

.caja {
  display: flex; align-items: center; justify-content: center; gap: 18px;
  padding: 22px 34px;
  border-radius: 20px;
  background: linear-gradient(135deg, #FF4500, #FF6B35);
  box-shadow: 0 12px 40px rgba(255, 69, 0, 0.45);
}
.icono-caja { width: 62px; height: 62px; flex-shrink: 0; }
.flecha { width: 50px; height: 38px; flex-shrink: 0; }
.palabra { font-size: clamp(34px, 7vw, 52px); font-weight: 800; color: #fff; letter-spacing: 2px; }

.mostrador { margin: 26px 0 0; font-size: clamp(14px, 2.6vw, 19px); color: #cbd5e1; }

.nota {
  margin-top: 30px;
  padding: 15px 20px;
  border-radius: 12px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(228, 192, 122, 0.25);
}

.aparecer-enter-active { transition: opacity .35s ease; }
.aparecer-leave-active { transition: opacity .35s ease; }
.aparecer-enter-from, .aparecer-leave-to { opacity: 0; }
</style>
