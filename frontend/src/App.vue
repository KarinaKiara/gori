<template>
  <EstadoConexion />
  <router-view></router-view>
  <InstalarApp />
  <DialogoGlobal />
  <!-- Tapa el tótem del local durante un corte largo y manda al cliente a la caja -->
  <TotemBloqueado />
  <!-- Avisa al cliente en su celular si su pedido lleva minutos sin poder enviarse -->
  <AvisoPedidoDemorado />
</template>

<script setup>
import { onMounted } from 'vue';
import { usePedidosOffline } from './almacenes/pedidosOffline';
import InstalarApp from './componentes/InstalarApp.vue';
import EstadoConexion from './componentes/EstadoConexion.vue';
import DialogoGlobal from './componentes/DialogoGlobal.vue';
import TotemBloqueado from './componentes/TotemBloqueado.vue';
import AvisoPedidoDemorado from './componentes/AvisoPedidoDemorado.vue';

const pedidosOffline = usePedidosOffline();

onMounted(() => {
  // Arranca los escuchas de conexión y la sincronización automática de pedidos guardados
  pedidosOffline.iniciar();
});
</script>
