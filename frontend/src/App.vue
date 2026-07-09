<template>
  <EstadoConexion />
  <router-view></router-view>
  <InstalarApp />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from './almacenes/auth';
import { usePedidosOffline } from './almacenes/pedidosOffline';
import InstalarApp from './componentes/InstalarApp.vue';
import EstadoConexion from './componentes/EstadoConexion.vue';

const authStore = useAuthStore();
const pedidosOffline = usePedidosOffline();

onMounted(() => {
  // Arranca los escuchas de conexión y la sincronización automática de pedidos guardados
  pedidosOffline.iniciar();
});
</script>
