<template>
  <EstadoConexion />
  <router-view></router-view>
  <InstalarApp />
  <DialogoGlobal />
</template>

<script setup>
import { onMounted } from 'vue';
import { usePedidosOffline } from './almacenes/pedidosOffline';
import InstalarApp from './componentes/InstalarApp.vue';
import EstadoConexion from './componentes/EstadoConexion.vue';
import DialogoGlobal from './componentes/DialogoGlobal.vue';

const pedidosOffline = usePedidosOffline();

onMounted(() => {
  // Arranca los escuchas de conexión y la sincronización automática de pedidos guardados
  pedidosOffline.iniciar();
});
</script>
