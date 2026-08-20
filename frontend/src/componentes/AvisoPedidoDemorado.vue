<template>
  <!-- Aviso para el CELULAR DEL CLIENTE cuando su pedido lleva minutos sin poder enviarse.
       No bloquea nada: solo le avisa, porque puede no haberse dado cuenta de que se quedó
       sin señal. El tótem del local tiene su propia pantalla (TotemBloqueado.vue). -->
  <transition name="aparecer">
    <div v-if="visible" class="fondo" @click.self="cerrar">
      <div class="tarjeta">

        <div class="aro">
          <svg viewBox="0 0 120 120" class="icono">
            <path d="M18,42 a62,62 0 0 1 84,0" fill="none" stroke="#fbbf24" stroke-width="9" stroke-linecap="round" opacity=".35"/>
            <path d="M34,62 a40,40 0 0 1 52,0" fill="none" stroke="#fbbf24" stroke-width="9" stroke-linecap="round" opacity=".6"/>
            <path d="M49,81 a20,20 0 0 1 22,0" fill="none" stroke="#fbbf24" stroke-width="9" stroke-linecap="round"/>
            <circle cx="60" cy="98" r="7" fill="#fbbf24"/>
            <path d="M14,14 L106,106" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/>
          </svg>
        </div>

        <h2 class="titulo">Tu pedido aún no se envió</h2>

        <p class="texto">
          Revisa tu conexión a internet. Tu pedido está <b>guardado</b> y se enviará
          solo en cuanto vuelvas a tener señal.
        </p>

        <div v-if="offline.demorado" class="codigo">
          <span class="etiqueta">Tu código</span>
          <span class="valor">{{ offline.demorado.codigo }}</span>
        </div>

        <button class="btn-primario" :disabled="offline.sincronizando" @click="reintentar">
          {{ offline.sincronizando ? 'Enviando…' : 'Reintentar ahora' }}
        </button>
        <button class="btn-ghost" @click="cerrar">Entendido</button>

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

// Solo en las pantallas por las que pasa el cliente. Que sea su celular y no el kiosko
// del local ya lo decide el propio almacén antes de marcar el aviso.
const enCanalCliente = computed(() =>
  route.path === '/pedir' || route.path.startsWith('/totem')
)
const visible = computed(() => !!offline.demorado && enCanalCliente.value)

const cerrar = () => offline.cerrarAvisoDemora()
const reintentar = async () => {
  await offline.sincronizar()
  // Si se envió, la cola queda vacía y el aviso ya no tiene sentido.
  if (offline.pendientes === 0) offline.cerrarAvisoDemora()
}
</script>

<style scoped>
.fondo {
  position: fixed;
  inset: 0;
  z-index: 10040;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(4px);
}
.tarjeta {
  width: 100%;
  max-width: 380px;
  padding: 30px 26px 24px;
  border-radius: 22px;
  text-align: center;
  background: linear-gradient(165deg, #14110c 0%, #1d1710 100%);
  border: 1px solid rgba(228, 192, 122, 0.3);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.aro {
  width: 92px; height: 92px;
  margin: 0 auto 20px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(251, 191, 36, 0.12);
  border: 2px solid rgba(251, 191, 36, 0.55);
}
.icono { width: 56px; height: 56px; }

.titulo { margin: 0 0 12px; font-size: 22px; font-weight: 800; color: #fff; line-height: 1.25; }
.texto  { margin: 0 0 20px; font-size: 14.5px; line-height: 1.55; color: #cbd5e1; }
.texto b { color: #E4C07A; }

.codigo {
  display: flex; flex-direction: column; gap: 4px;
  padding: 12px;
  margin-bottom: 22px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(228, 192, 122, 0.4);
}
.etiqueta { font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(228, 192, 122, 0.75); }
.valor    { font-size: 30px; font-weight: 800; letter-spacing: 4px; color: #F7E3A1; }

.btn-primario {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, #FF4500, #FF6B35);
  box-shadow: 0 6px 20px rgba(255, 69, 0, 0.4);
  transition: transform .15s ease;
}
.btn-primario:active { transform: scale(.96); }
.btn-primario:disabled { opacity: .6; cursor: wait; }

.btn-ghost {
  width: 100%;
  margin-top: 10px;
  padding: 13px;
  border-radius: 14px;
  font-size: 14.5px;
  font-weight: 700;
  color: #cbd5e1;
  cursor: pointer;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.aparecer-enter-active, .aparecer-leave-active { transition: opacity .3s ease; }
.aparecer-enter-from, .aparecer-leave-to { opacity: 0; }
</style>
