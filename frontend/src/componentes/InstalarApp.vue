<template>
  <!-- Aviso inferior: elegir cómo usar la app -->
  <transition name="subir">
    <div v-if="visible && enPantallaInicio" class="pwa-aviso">
      <div class="pwa-icono">🍗</div>
      <div class="pwa-texto">
        <p class="pwa-titulo">¿Cómo quieres usar Gori Chicken?</p>
        <p class="pwa-sub">Puedes agregarla a tu pantalla de inicio y abrirla como una app.</p>
      </div>
      <div class="pwa-botones">
        <button class="pwa-btn-primario" @click="instalar">📲 Agregar a inicio</button>
        <button class="pwa-btn-ghost" @click="seguirNavegador">Seguir en el navegador</button>
      </div>
    </div>
  </transition>

  <!-- Instrucciones manuales (cuando el navegador no permite instalar con un toque) -->
  <div v-if="mostrarInstrucciones" class="pwa-overlay" @click.self="cerrarInstrucciones">
    <div class="pwa-instr">
      <div class="pwa-instr-icono">🍗</div>
      <h3>Agregar Gori Chicken a tu inicio</h3>
      <ol v-if="esIOS">
        <li>Toca el botón <b>Compartir</b> (el cuadro con la flecha ↑, abajo en Safari).</li>
        <li>Desliza y toca <b>“Agregar a inicio”</b>.</li>
        <li>Confirma con <b>“Agregar”</b>.</li>
      </ol>
      <ol v-else>
        <li>Toca los <b>3 puntitos ⋮</b> (arriba a la derecha del navegador).</li>
        <li>Toca <b>“Agregar a la pantalla principal”</b>.</li>
        <li>Confirma con <b>“Agregar”</b>.</li>
      </ol>
      <p class="pwa-instr-nota">Aparecerá el iconito del pollito en tu pantalla de inicio 🐔</p>
      <button class="pwa-btn-primario ancho" @click="cerrarInstrucciones">Entendido</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
// El aviso solo aparece en las pantallas de entrada, no mientras el cliente hace su pedido
const enPantallaInicio = computed(() => ['/', '/totem', '/login'].includes(route.path));

const visible = ref(false);
const mostrarInstrucciones = ref(false);
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
let deferredPrompt = null;

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

// Chrome/Android en sitios seguros (https o localhost) dispara este evento:
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
window.addEventListener('appinstalled', () => { visible.value = false; });

onMounted(() => {
  if (yaInstalada()) return;                          // ya está instalada -> no molestar
  if (sessionStorage.getItem('pwa-aviso-visto')) return;
  setTimeout(() => { visible.value = true; }, 700);   // aparece ni bien entra
});

async function instalar() {
  if (deferredPrompt) {
    // Instalación con un toque (sitios seguros / con HTTPS)
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    visible.value = false;
  } else {
    // Sin instalación directa (ej. red WiFi por http, o iPhone) -> mostramos los pasos
    visible.value = false;
    mostrarInstrucciones.value = true;
  }
}

function seguirNavegador() {
  visible.value = false;
  sessionStorage.setItem('pwa-aviso-visto', '1'); // no repetir en esta sesión
}
function cerrarInstrucciones() {
  mostrarInstrucciones.value = false;
  sessionStorage.setItem('pwa-aviso-visto', '1');
}
</script>

<style scoped>
.pwa-aviso {
  position: fixed;
  left: 12px; right: 12px; bottom: 12px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
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
.pwa-btn-primario.ancho { width: 100%; margin-top: 8px; padding: 13px; }
.pwa-btn-ghost {
  border: 1px solid rgba(255,255,255,0.18); cursor: pointer;
  padding: 11px 16px; border-radius: 12px;
  font-weight: 700; font-size: 13.5px; color: #cbd5e1;
  background: transparent;
}

.pwa-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.pwa-instr {
  max-width: 340px; width: 100%;
  background: #0a2234;
  border: 1px solid rgba(255, 69, 0, 0.3);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  color: #e2e8f0;
}
.pwa-instr-icono {
  width: 56px; height: 56px; margin: 0 auto 12px;
  display: flex; align-items: center; justify-content: center; font-size: 30px;
  border-radius: 16px;
  background: linear-gradient(135deg, #FF4500, #FF6B35);
}
.pwa-instr h3 { color: #fff; font-size: 18px; font-weight: 800; margin: 0 0 14px; }
.pwa-instr ol { text-align: left; padding-left: 20px; margin: 0 0 12px; }
.pwa-instr li { font-size: 14px; margin-bottom: 10px; line-height: 1.4; }
.pwa-instr b { color: #FF8C42; }
.pwa-instr-nota { font-size: 12.5px; color: #9fb3c8; margin: 0 0 6px; }

/* Animación de entrada */
.subir-enter-active { transition: all .35s ease; }
.subir-enter-from { opacity: 0; transform: translateY(30px); }
</style>
