<!--
  Modal global de confirmación / aviso. Se monta UNA vez en App.vue y reemplaza
  a las ventanitas del navegador (window.confirm / window.alert). Lee su contenido
  del estado compartido en utilidades/dialogo.js.
  - tipo 'confirmar': dos botones (Cancelar / Aceptar).
  - tipo 'aviso':     un solo botón.
  - peligro=true:     el botón de acción se pinta en rojo (eliminar, cancelar…).
-->
<template>
  <transition name="dlg-fade">
    <div v-if="estado.visible" class="dlg-fondo" @click.self="cancelar">
      <transition name="dlg-pop" appear>
        <div class="dlg-caja" role="dialog" aria-modal="true" :aria-label="estado.titulo || 'Mensaje'">
          <div class="dlg-icono" :class="estado.peligro ? 'peligro' : (estado.tipo === 'aviso' ? 'aviso' : 'pregunta')">
            <span v-if="estado.peligro">🗑️</span>
            <span v-else-if="estado.tipo === 'aviso'">ℹ️</span>
            <span v-else>❓</span>
          </div>

          <h3 v-if="estado.titulo" class="dlg-titulo">{{ estado.titulo }}</h3>
          <p class="dlg-mensaje">{{ estado.mensaje }}</p>

          <div class="dlg-acciones">
            <button
              v-if="estado.tipo === 'confirmar'"
              type="button"
              class="dlg-btn dlg-cancelar"
              @click="cancelar"
            >{{ estado.textoCancelar }}</button>
            <button
              ref="btnAceptar"
              type="button"
              class="dlg-btn dlg-aceptar"
              :class="{ peligro: estado.peligro }"
              @click="aceptar"
            >{{ estado.textoAceptar }}</button>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup>
import { watch, nextTick, ref, onMounted, onUnmounted } from 'vue'
import { estadoDialogo, responderDialogo } from '../utilidades/dialogo'

const estado = estadoDialogo
const btnAceptar = ref(null)

const aceptar = () => responderDialogo(true)
// En un aviso (un solo botón) cerrar equivale a "Entendido"; en una confirmación es "no".
const cancelar = () => responderDialogo(estado.tipo === 'aviso')

// Enfoca el botón principal al abrir, para poder responder con Enter.
watch(() => estado.visible, (v) => {
  if (v) nextTick(() => btnAceptar.value?.focus())
})

// Teclado: Escape cierra/cancela, Enter acepta.
const alPresionar = (e) => {
  if (!estado.visible) return
  if (e.key === 'Escape') { e.preventDefault(); cancelar() }
  else if (e.key === 'Enter') { e.preventDefault(); aceptar() }
}
onMounted(() => window.addEventListener('keydown', alPresionar))
onUnmounted(() => window.removeEventListener('keydown', alPresionar))
</script>

<style scoped>
.dlg-fondo {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(9, 9, 12, 0.62);
  backdrop-filter: blur(4px);
}
.dlg-caja {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border-radius: 22px;
  padding: 30px 26px 24px;
  text-align: center;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45), 0 4px 14px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(0, 0, 0, 0.05);
}
.dlg-icono {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.9rem;
}
.dlg-icono.pregunta { background: #fff4e6; }
.dlg-icono.aviso    { background: #e6f2ff; }
.dlg-icono.peligro  { background: #fde8e8; }

.dlg-titulo {
  font-size: 1.15rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 6px;
}
.dlg-mensaje {
  font-size: 0.98rem;
  line-height: 1.5;
  color: #475569;
  margin: 0 0 24px;
  white-space: pre-line;
}
.dlg-acciones {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.dlg-btn {
  flex: 1;
  max-width: 200px;
  padding: 12px 18px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  border: none;
  transition: transform 0.12s ease, filter 0.12s ease, background 0.12s ease;
}
.dlg-btn:active { transform: scale(0.96); }
.dlg-cancelar {
  background: #f1f5f9;
  color: #475569;
}
.dlg-cancelar:hover { background: #e2e8f0; }
.dlg-aceptar {
  background: linear-gradient(135deg, #FF4500, #FF6B35);
  color: #fff;
  box-shadow: 0 8px 22px rgba(255, 69, 0, 0.35);
}
.dlg-aceptar:hover { filter: brightness(1.05); }
.dlg-aceptar.peligro {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  box-shadow: 0 8px 22px rgba(220, 38, 38, 0.4);
}
.dlg-btn:focus-visible { outline: 3px solid rgba(59, 130, 246, 0.5); outline-offset: 2px; }

/* Animaciones */
.dlg-fade-enter-active, .dlg-fade-leave-active { transition: opacity 0.2s ease; }
.dlg-fade-enter-from, .dlg-fade-leave-to { opacity: 0; }
.dlg-pop-enter-active { transition: transform 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s ease; }
.dlg-pop-enter-from { transform: scale(0.85) translateY(10px); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .dlg-pop-enter-active, .dlg-fade-enter-active, .dlg-fade-leave-active { transition: none; }
}
</style>
