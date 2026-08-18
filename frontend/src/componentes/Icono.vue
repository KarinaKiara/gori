<!--
  Ícono de línea reusable. Reemplaza a los emojis en toda la interfaz.
  Uso:  <Icono nombre="buscar" />            (toma el tamaño y color del texto)
        <Icono nombre="alerta" :size="20" />  (tamaño fijo en px)
  El color se hereda del texto (currentColor), así el ícono combina solo.
  Los SVG viven en utilidades/iconos.js (un solo lugar para todo el sistema).
-->
<template>
  <span class="icono" :style="estilo" v-html="html" aria-hidden="true"></span>
</template>

<script setup>
import { computed } from 'vue';
import { iconos } from '../utilidades/iconos';

const props = defineProps({
  nombre: { type: String, required: true },
  size: { type: [Number, String], default: '1em' }, // '1em' = igual que el texto
});

const html = computed(() => iconos[props.nombre] || '');
const estilo = computed(() => {
  const s = typeof props.size === 'number' ? `${props.size}px` : props.size;
  return { fontSize: s };
});
</script>

<style scoped>
.icono { display: inline-flex; align-items: center; justify-content: center; line-height: 0; vertical-align: -0.125em; }
.icono :deep(svg) { width: 1em; height: 1em; }
</style>
