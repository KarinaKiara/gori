<template>
  <!-- Aviso inferior para instalar la app. Solo aparece cuando el navegador permite
       instalar de un toque (evento beforeinstallprompt). Si no se puede instalar
       directo, NO se muestra nada: nunca aparecen instrucciones de "3 puntos". -->
  <transition name="subir">
    <div v-if="visible" class="pwa-aviso">
      <div class="pwa-icono">🍗</div>
      <div class="pwa-texto">
        <p class="pwa-titulo">Instalá Gori Chicken</p>
        <p class="pwa-sub">Agregala a tu inicio y abrila como app.</p>
      </div>
      <div class="pwa-botones">
        <button class="pwa-btn-primario" @click="instalar">📲 Instalar</button>
        <button class="pwa-btn-ghost" @click="seguirNavegador">Seguir en el navegador</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
// El aviso de "instalar" es SOLO para el CLIENTE (canal /pedir), que puede
// instalarlo en su celular. El tótem-kiosko (/totem) y los empleados NO lo ven.
const enPantallaInicio = computed(() => route.path === '/pedir');

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// El evento de instalación (beforeinstallprompt) ya lo capturó main.js apenas arrancó
// la app y lo dejó en window.__promptInstalar (así no se pierde si llega temprano).
// Lo leemos de ahí y también escuchamos por si llega un instante después.
const promptInstalar = ref(window.__promptInstalar || null);
window.addEventListener('gori-instalable', () => { promptInstalar.value = window.__promptInstalar; });
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar.value = e; });
window.addEventListener('appinstalled', () => { promptInstalar.value = null; window.__promptInstalar = null; });

// Se descartó el aviso en esta sesión ("Seguir en el navegador")
const descartado = ref(!!sessionStorage.getItem('pwa-aviso-visto'));

// El cartel se muestra solo si: estamos en /pedir, aún no está instalada, se puede
// instalar de un toque, y el usuario no lo cerró en esta sesión.
const visible = computed(() =>
  enPantallaInicio.value && !!promptInstalar.value && !yaInstalada() && !descartado.value
);

async function instalar() {
  const p = promptInstalar.value;
  if (!p) return;                 // por seguridad (el botón solo se ve si hay prompt)
  p.prompt();
  await p.userChoice;
  promptInstalar.value = null;
  window.__promptInstalar = null;
}

function seguirNavegador() {
  descartado.value = true;
  sessionStorage.setItem('pwa-aviso-visto', '1'); // no repetir en esta sesión
}
</script>

<style scoped>
.pwa-aviso {
  position: fixed;
  left: 12px; right: 12px; bottom: 12px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(7, 20, 32, 0.96);
  border: 1px solid rgba(255, 69, 0, 0.35);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  flex-wrap: wrap;
}
.pwa-icono {
  width: 46px; height: 46px;
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
  border-radius: 14px;
  background: linear-gradient(135deg, #FF4500, #FF6B35);
  box-shadow: 0 0 15px rgba(255, 69, 0, 0.4);
}
.pwa-texto { flex: 1; min-width: 160px; }
.pwa-titulo { color: #fff; font-weight: 800; font-size: 15px; margin: 0; }
.pwa-sub { color: #9fb3c8; font-size: 12.5px; margin: 3px 0 0; }
.pwa-botones { display: flex; gap: 8px; flex-wrap: wrap; }
.pwa-btn-primario {
  border: none; cursor: pointer;
  padding: 11px 16px; border-radius: 12px;
  font-weight: 800; font-size: 13.5px; color: #fff;
  background: linear-gradient(135deg, #FF4500, #FF6B35);
  box-shadow: 0 4px 14px rgba(255, 69, 0, 0.4);
}
.pwa-btn-ghost {
  border: 1px solid rgba(255,255,255,0.18); cursor: pointer;
  padding: 11px 16px; border-radius: 12px;
  font-weight: 700; font-size: 13.5px; color: #cbd5e1;
  background: transparent;
}

/* Animación de entrada */
.subir-enter-active { transition: all .35s ease; }
.subir-enter-from { opacity: 0; transform: translateY(30px); }
</style>
